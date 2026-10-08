/** EXIF/XMP container handling. Only used by the image converter's worker. */
import { Unzlib } from 'fflate';
import { XMLValidator } from 'fast-xml-parser';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';
type Bytes = Uint8Array;
type Transform = { rotation?: number; mirror?: number };
export interface ImageMetadata {
    exif?: Bytes;
    xmp?: Bytes;
    orientation: number;
    transforms: Transform[];
    incomplete: boolean;
}
const LIMIT = 16 * 1024 * 1024;
const utf8 = new TextEncoder();
const text = (b: Bytes) => new TextDecoder('utf-8', { fatal: true }).decode(b);
const ascii = (s: string) => utf8.encode(s);
const EXIF = ascii('Exif\0\0');
const XMP = ascii('http://ns.adobe.com/xap/1.0/\0');
const EXTENDED_XMP = 'http://ns.adobe.com/xmp/extension/';
function check(b: Bytes, p: number, n: number) {
    if (!Number.isSafeInteger(p) || !Number.isSafeInteger(n) || p < 0 || n < 0 || p + n > b.length) throw new Error('Invalid metadata bounds');
}
function number(b: Bytes, p: number, n: number, little = false): number {
    check(b, p, n);
    let v = 0;
    for (let i = 0; i < n; i++) v = v * 256 + b[p + (little ? n - 1 - i : i)];
    if (!Number.isSafeInteger(v)) throw new Error('Metadata integer overflow');
    return v;
}
function uint(v: number, n = 4, little = false): Bytes {
    if (!Number.isSafeInteger(v) || v < 0 || v >= 256 ** n) throw new Error('Metadata integer overflow');
    const b = new Uint8Array(n);
    for (let i = 0; i < n; i++) { b[little ? i : n - 1 - i] = v % 256; v = Math.floor(v / 256); }
    return b;
}
function join(...parts: Bytes[]): Bytes {
    const b = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let p = 0;
    for (const part of parts) { b.set(part, p); p += part.length; }
    return b;
}
function starts(b: Bytes, prefix: Bytes) { return prefix.every((v, i) => b[i] === v); }
function take(b: Bytes, p: number, n: number) { check(b, p, n); return b.slice(p, p + n); }
function store(m: ImageMetadata, key: 'exif' | 'xmp', data: Bytes) {
    if (data.length > LIMIT || m[key]) { m.incomplete = true; return; }
    m[key] = data;
}

/** Walk classic TIFF IFDs while retaining the original bytes and offsets. */
function visitExif(data: Bytes, cb: (tag: number, type: number, count: number, value: number, little: boolean) => void) {
    const little = data[0] === 73 && data[1] === 73;
    if (!little && !(data[0] === 77 && data[1] === 77)) throw new Error('Invalid TIFF header');
    if (number(data, 2, 2, little) !== 42) throw new Error('Unsupported TIFF');
    const sizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    const seen = new Set<number>();
    const walk = (p: number, depth = 0) => {
        if (!p) return;
        if (depth > 16 || seen.has(p)) throw new Error('Invalid TIFF IFD chain');
        seen.add(p);
        const count = number(data, p, 2, little);
        check(data, p + 2, count * 12 + 4);
        for (let i = 0; i < count; i++) {
            const e = p + 2 + i * 12;
            const tag = number(data, e, 2, little), type = number(data, e + 2, 2, little), count = number(data, e + 4, 4, little);
            if (!sizes[type]) throw new Error('Unsupported TIFF field');
            const length = count * sizes[type];
            const v = length <= 4 ? e + 8 : number(data, e + 8, 4, little);
            check(data, v, length);
            cb(tag, type, count, v, little);
            if ([0x8769, 0x8825, 0xa005].includes(tag) && type === 4 && count === 1) walk(number(data, v, 4, little), depth + 1);
        }
        // Thumbnail IFDs are not part of the re-encoded image; validate but don't copy their association.
    };
    walk(number(data, 4, 4, little));
}
function normalizeExif(data: Bytes, width: number, height: number): Bytes {
    const b = data.slice();
    visitExif(b, (tag, type, count, p, little) => {
        if (count !== 1 || (type !== 3 && type !== 4)) return;
        const value = tag === 0x112 ? 1 : [0x100, 0xa002].includes(tag) ? width : [0x101, 0xa003].includes(tag) ? height : undefined;
        if (value !== undefined) b.set(uint(value, type === 3 ? 2 : 4, little), p);
    });
    const little = b[0] === 73, root = number(b, 4, 4, little);
    if (!root) return b;
    const entries: Bytes[] = Array.from({ length: number(b, root, 2, little) }, (_, i) => take(b, root + 2 + i * 12, 12));
    for (const [tag, value] of [[0x112, 1], [0x100, width], [0x101, height]]) {
        if (!entries.some(e => number(e, 0, 2, little) === tag)) {
            const type = tag === 0x112 ? 3 : 4;
            entries.push(join(uint(tag, 2, little), uint(type, 2, little), uint(1, 4, little), uint(value, type === 3 ? 2 : 4, little), new Uint8Array(type === 3 ? 2 : 0)));
        }
    }
    entries.sort((a, c) => number(a, 0, 2, little) - number(c, 0, 2, little));
    b.set(uint(b.length, 4, little), 4);
    return join(b, uint(entries.length, 2, little), ...entries, uint(0, 4, little));
}
function xmpPrefixes(xml: string, standard: string, uri: string): string[] {
    const prefixes = new Set([standard]);
    for (const match of xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])(.*?)\2/g)) if (match[3] === uri) prefixes.add(match[1]);
    return [...prefixes].map(prefix => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}
function normalizeXmp(data: Bytes, width: number, height: number): Bytes {
    let xml = text(data);
    if (XMLValidator.validate(xml) !== true) throw new Error('Invalid XMP');
    const fields: Record<string, number> = {};
    for (const prefix of xmpPrefixes(xml, 'tiff', 'http://ns.adobe.com/tiff/1.0/')) Object.assign(fields, { [`${prefix}:Orientation`]: 1, [`${prefix}:ImageWidth`]: width, [`${prefix}:ImageLength`]: height });
    for (const prefix of xmpPrefixes(xml, 'exif', 'http://ns.adobe.com/exif/1.0/')) Object.assign(fields, { [`${prefix}:PixelXDimension`]: width, [`${prefix}:PixelYDimension`]: height });
    for (const [name, value] of Object.entries(fields)) {
        xml = xml.replace(new RegExp(`(${name}\\s*=\\s*)(["'])[^"']*\\2`, 'g'), `$1"${value}"`);
        xml = xml.replace(new RegExp(`(<${name}(?:\\s[^>]*)?>)[\\s\\S]*?(</${name}>)`, 'g'), `$1${value}$2`);
    }
    // Stale embedded thumbnails should not describe the newly encoded image.
    for (const prefix of xmpPrefixes(xml, 'xmp', 'http://ns.adobe.com/xap/1.0/')) xml = xml.replace(new RegExp(`<${prefix}:Thumbnails\\b[^>]*>[\\s\\S]*?</${prefix}:Thumbnails>`, 'g'), '');
    return ascii(xml);
}

type Chunk = { type: string; start: number; end: number; payload: number };
function crc(b: Bytes): number {
    let value = 0xffffffff;
    for (const byte of b) {
        value ^= byte;
        for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
    }
    return (value ^ 0xffffffff) >>> 0;
}
function pngChunks(b: Bytes): Chunk[] {
    if (!starts(b, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Invalid PNG');
    const chunks: Chunk[] = [];
    for (let p = 8; p < b.length;) {
        const n = number(b, p, 4); check(b, p, n + 12);
        chunks.push({ type: text(take(b, p + 4, 4)), start: p, payload: p + 8, end: p + n + 12 });
        p += n + 12;
    }
    return chunks;
}
function pngChunk(type: string, payload: Bytes) {
    const data = join(ascii(type), payload);
    return join(uint(payload.length), data, uint(crc(data)));
}
function webpChunks(b: Bytes): Chunk[] {
    if (text(take(b, 0, 4)) !== 'RIFF' || text(take(b, 8, 4)) !== 'WEBP') throw new Error('Invalid WebP');
    const end = number(b, 4, 4, true) + 8; check(b, 0, end);
    const chunks: Chunk[] = [];
    for (let p = 12; p < end;) {
        const n = number(b, p + 4, 4, true); check(b, p, n + 8 + (n % 2));
        chunks.push({ type: text(take(b, p, 4)), start: p, payload: p + 8, end: p + n + 8 + n % 2 });
        p += n + 8 + n % 2;
    }
    return chunks;
}
function webpChunk(type: string, data: Bytes) { return join(ascii(type), uint(data.length, 4, true), data, new Uint8Array(data.length % 2)); }
function jpegChunks(b: Bytes): Chunk[] {
    if (b[0] !== 255 || b[1] !== 216) throw new Error('Invalid JPEG');
    const chunks: Chunk[] = [];
    for (let p = 2; p < b.length;) {
        const start = p;
        if (b[p++] !== 255) throw new Error('Invalid JPEG marker');
        while (b[p] === 255) p++;
        const marker = b[p++];
        if (marker === 218 || marker === 217) break;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        const n = number(b, p, 2); if (n < 2) throw new Error('Invalid JPEG segment');
        check(b, p, n);
        chunks.push({ type: String(marker), start, payload: p + 2, end: p + n });
        p += n;
    }
    return chunks;
}
function jpegSegment(payload: Bytes) {
    if (payload.length > 65533) throw new Error('Metadata exceeds JPEG segment limit');
    return join(new Uint8Array([255, 225]), uint(payload.length + 2, 2), payload);
}

// AVIF stores metadata as HEIF items. Preserve image payload offsets by leaving
// the original meta box in place as a free box and appending a replacement meta.
function boxes(b: Bytes, start = 0, end = b.length): Chunk[] {
    const result: Chunk[] = [];
    for (let p = start; p < end;) {
        let n = number(b, p, 4), header = 8;
        if (n === 1) { n = number(b, p + 8, 8); header = 16; }
        else if (n === 0) n = end - p;
        if (n < header || p + n > end) throw new Error('Invalid AVIF box');
        result.push({ type: text(take(b, p + 4, 4)), start: p, payload: p + header, end: p + n });
        p += n;
    }
    return result;
}
function box(type: string, data: Bytes) { return join(uint(data.length + 8), ascii(type), data); }
function fullBox(type: string, version: number, data: Bytes) { return box(type, join(new Uint8Array([version, 0, 0, 0]), data)); }
interface Location { id: number; method: number; base: number; extents: { offset: number; length: number }[] }
function locations(b: Bytes, c: Chunk): Location[] {
    const version = b[c.payload]; if (version > 2) throw new Error('Unsupported iloc');
    let p = c.payload + 4;
    const offsetSize = b[p] >> 4, lengthSize = b[p++] & 15;
    const baseSize = b[p] >> 4, indexSize = version ? b[p] & 15 : 0; p++;
    if ([offsetSize, lengthSize, baseSize, indexSize].some(n => n > 8)) throw new Error('Invalid iloc widths');
    const read = (n: number) => { const v = number(b, p, n); p += n; return v; };
    const count = read(version < 2 ? 2 : 4), result: Location[] = [];
    if (count > 65536) throw new Error('Too many AVIF items');
    for (let i = 0; i < count; i++) {
        const id = read(version < 2 ? 2 : 4), method = version ? read(2) & 15 : 0;
        if (read(2) !== 0 || method > 1) throw new Error('Unsupported external AVIF item');
        const base = read(baseSize), count = read(2), extents: Location['extents'] = [];
        for (let j = 0; j < count; j++) { if (indexSize) read(indexSize); extents.push({ offset: read(offsetSize), length: read(lengthSize) }); }
        result.push({ id, method, base, extents });
    }
    if (p > c.end) throw new Error('Invalid iloc');
    return result;
}
function writeLocations(items: Location[]) {
    return fullBox('iloc', 2, join(new Uint8Array([0x44, 0x40]), uint(items.length), ...items.map(item => join(uint(item.id), uint(item.method, 2), uint(0, 2), uint(item.base), uint(item.extents.length, 2), ...item.extents.map(e => join(uint(e.offset), uint(e.length)))))));
}
function avifStructure(b: Bytes) {
    const meta = boxes(b).find(c => c.type === 'meta'); if (!meta) throw new Error('Missing AVIF metadata container');
    const children = boxes(b, meta.payload + 4, meta.end);
    const find = (type: string) => { const c = children.find(c => c.type === type); if (!c) throw new Error(`Missing ${type}`); return c; };
    const iinf = find('iinf'), pitm = find('pitm');
    const entries = boxes(b, iinf.payload + 4 + (b[iinf.payload] === 0 ? 2 : 4), iinf.end);
    const primary = number(b, pitm.payload + 4, b[pitm.payload] === 0 ? 2 : 4);
    return { meta, children, entries, primary, items: locations(b, find('iloc')) };
}
function avifTransforms(b: Bytes, children: Chunk[], primary: number): Transform[] {
    const iprp = children.find(c => c.type === 'iprp'); if (!iprp) return [];
    const child = boxes(b, iprp.payload, iprp.end), ipco = child.find(c => c.type === 'ipco'); if (!ipco) return [];
    const props = boxes(b, ipco.payload, ipco.end), transforms: Transform[] = [];
    for (const ipma of child.filter(c => c.type === 'ipma')) {
        let p = ipma.payload + 4;
        const count = number(b, p, 4); p += 4;
        if (count > 65536) throw new Error('Too many AVIF associations');
        const size = b[ipma.payload + 3] & 1 ? 2 : 1;
        for (let i = 0; i < count; i++) {
            const idSize = b[ipma.payload] ? 4 : 2, id = number(b, p, idSize); p += idSize;
            const n = number(b, p++, 1);
            for (let j = 0; j < n; j++) {
                const index = number(b, p, size) & (size === 1 ? 127 : 32767); p += size;
                const prop = props[index - 1];
                if (id !== primary || !prop) continue;
                if (prop.type === 'irot') transforms.push({ rotation: number(b, prop.payload, 1) & 3 });
                if (prop.type === 'imir') transforms.push({ mirror: number(b, prop.payload, 1) & 1 });
            }
        }
        if (p > ipma.end) throw new Error('Invalid AVIF associations');
    }
    return transforms;
}
function readAvif(b: Bytes, m: ImageMetadata) {
    const { children, entries, primary, items } = avifStructure(b);
    m.transforms = avifTransforms(b, children, primary);
    const idat = children.find(c => c.type === 'idat');
    const refs = children.find(c => c.type === 'iref');
    const associated = new Set<number>();
    if (refs) for (const ref of boxes(b, refs.payload + 4, refs.end)) {
        if (ref.type !== 'cdsc') continue;
        const size = b[refs.payload] ? 4 : 2, from = number(b, ref.payload, size), count = number(b, ref.payload + size, 2);
        for (let i = 0; i < count; i++) if (number(b, ref.payload + size + 2 + i * size, size) === primary) associated.add(from);
    }
    for (const entry of entries) {
        if (entry.type !== 'infe' || ![2, 3].includes(b[entry.payload])) continue;
        const size = b[entry.payload] === 2 ? 2 : 4, id = number(b, entry.payload + 4, size);
        if (!associated.has(id)) continue;
        const typePos = entry.payload + 4 + size + 2, type = text(take(b, typePos, 4));
        if (type !== 'Exif' && type !== 'mime') continue;
        try {
            if (type === 'mime' && !text(take(b, typePos + 4, entry.end - typePos - 4)).includes('application/rdf+xml\0')) continue;
            const location = items.find(i => i.id === id); if (!location) throw new Error('Missing AVIF item');
            if (location.extents.reduce((n, e) => n + e.length, 0) > LIMIT) throw new Error('Metadata too large');
            if (location.method === 1 && !idat) throw new Error('Missing idat');
            const data = join(...location.extents.map(e => take(b, (location.method === 1 ? idat!.payload : 0) + location.base + e.offset, e.length)));
            if (type === 'Exif') { const offset = 4 + number(data, 0, 4); store(m, 'exif', take(data, offset, data.length - offset)); }
            else store(m, 'xmp', data);
        } catch { m.incomplete = true; }
    }
}
function writeAvif(b: Bytes, m: ImageMetadata): Bytes {
    const { meta, children, entries, primary, items } = avifStructure(b);
    const idOf = (entry: Chunk) => number(b, entry.payload + 4, b[entry.payload] === 2 ? 2 : 4);
    let id = Math.max(primary, ...items.map(i => i.id), ...entries.filter(e => e.type === 'infe').map(idOf)) + 1;
    const additional: Bytes[] = [], refs: { id: number; size: number }[] = [], payloads: Bytes[] = [];
    for (const type of ['exif', 'xmp'] as const) {
        const data = m[type]; if (!data) continue;
        const payload = type === 'exif' ? join(uint(0), data) : data;
        additional.push(fullBox('infe', 3, join(uint(id), uint(0, 2), ascii(type === 'exif' ? 'Exif' : 'mime'), ascii('\0'), ...(type === 'xmp' ? [ascii('application/rdf+xml\0\0')] : []))));
        payloads.push(payload); refs.push({ id: id++, size: payload.length });
    }
    const oldRef = children.find(c => c.type === 'iref');
    const refVersion = oldRef ? b[oldRef.payload] : 1;
    const refSize = refVersion ? 4 : 2;
    const iref = fullBox('iref', refVersion, join(oldRef ? take(b, oldRef.payload + 4, oldRef.end - oldRef.payload - 4) : new Uint8Array(), ...refs.map(ref => box('cdsc', join(uint(ref.id, refSize), uint(1, 2), uint(primary, refSize))))));
    const iinf = fullBox('iinf', 1, join(uint(entries.length + additional.length), ...entries.map(c => take(b, c.start, c.end - c.start)), ...additional));
    const metadataLocations: Location[] = refs.map(ref => ({ id: ref.id, method: 0, base: 0, extents: [{ offset: 0, length: ref.size }] }));
    const newMeta = () => fullBox('meta', 0, join(...children.filter(c => !['iloc', 'iinf', 'iref'].includes(c.type)).map(c => take(b, c.start, c.end - c.start)), iinf, writeLocations([...items, ...metadataLocations]), iref));
    let offset = b.length + newMeta().length + 8;
    for (const loc of metadataLocations) { loc.extents[0].offset = offset; offset += loc.extents[0].length; }
    const original = b.slice(); original.set(ascii('free'), meta.start + 4);
    for (const c of boxes(b)) if (number(b, c.start, 4) === 0) original.set(uint(c.end - c.start), c.start);
    return join(original, newMeta(), box('mdat', join(...payloads)));
}

export function readMetadata(buffer: ArrayBuffer, format: ImageFormat): ImageMetadata {
    const b = new Uint8Array(buffer), m: ImageMetadata = { orientation: 1, transforms: [], incomplete: false };
    try {
        if (format === 'jpeg') for (const c of jpegChunks(b)) {
            if (c.type !== '225') continue;
            const data = take(b, c.payload, c.end - c.payload);
            if (starts(data, EXIF)) store(m, 'exif', data.slice(EXIF.length));
            else if (starts(data, XMP)) store(m, 'xmp', data.slice(XMP.length));
            else if (starts(data, ascii(EXTENDED_XMP))) m.incomplete = true;
        }
        if (format === 'webp') for (const c of webpChunks(b)) {
            if (!['EXIF', 'XMP '].includes(c.type)) continue;
            const data = take(b, c.payload, number(b, c.start + 4, 4, true));
            store(m, c.type === 'EXIF' ? 'exif' : 'xmp', c.type === 'EXIF' && starts(data, EXIF) ? data.slice(6) : data);
        }
        if (format === 'png') for (const c of pngChunks(b)) {
            if (!['eXIf', 'iTXt'].includes(c.type)) continue;
            try {
                const data = take(b, c.payload, c.end - c.payload - 4);
                if (data.length > LIMIT) throw new Error('Metadata too large');
                if (crc(take(b, c.start + 4, c.end - c.start - 8)) !== number(b, c.end - 4, 4)) throw new Error('Invalid metadata CRC');
                if (c.type === 'eXIf') store(m, 'exif', data);
                else {
                    const keywordEnd = data.indexOf(0); if (keywordEnd < 0) throw new Error('Invalid PNG text');
                    if (text(data.slice(0, keywordEnd)) !== 'XML:com.adobe.xmp') continue;
                    let p = keywordEnd + 3;
                    if (data[keywordEnd + 2] !== 0 || data[keywordEnd + 1] > 1) throw new Error('Unsupported PNG compression');
                    for (let i = 0; i < 2; i++) { const end = data.indexOf(0, p); if (end < 0) throw new Error('Invalid PNG text'); p = end + 1; }
                    let xmp: Bytes = data.slice(p);
                    if (data[keywordEnd + 1] === 1) {
                        const parts: Bytes[] = []; let size = 0;
                        const stream = new Unzlib(part => { size += part.length; if (size > LIMIT) throw new Error('Metadata too large'); parts.push(part); });
                        for (let i = 0; i < xmp.length; i += 1024) stream.push(xmp.subarray(i, i + 1024), i + 1024 >= xmp.length);
                        xmp = join(...parts);
                    }
                    store(m, 'xmp', xmp);
                }
            } catch { m.incomplete = true; }
        }
        if (format === 'avif') readAvif(b, m);
    } catch { m.incomplete = true; }
    let hasExifOrientation = false;
    if (m.exif) {
        try { visitExif(m.exif, (tag, type, count, p, little) => { if (tag === 0x112 && type === 3 && count === 1) { m.orientation = number(m.exif!, p, 2, little); hasExifOrientation = true; } }); }
        catch { m.exif = undefined; m.incomplete = true; }
    }
    if (m.xmp) {
        try {
            const xml = text(m.xmp);
            if (XMLValidator.validate(xml) !== true) throw new Error('Invalid XMP');
            for (const prefix of xmpPrefixes(xml, 'tiff', 'http://ns.adobe.com/tiff/1.0/')) {
                const match = xml.match(new RegExp(`${prefix}:Orientation\\s*=\\s*["']([1-8])["']`)) || xml.match(new RegExp(`<${prefix}:Orientation>\\s*([1-8])\\s*</${prefix}:Orientation>`));
                if (match && !hasExifOrientation) m.orientation = Number(match[1]);
            }
        } catch { m.xmp = undefined; m.incomplete = true; }
    }
    if (m.orientation < 1 || m.orientation > 8) { m.orientation = 1; m.incomplete = true; }
    return m;
}

/** Normalize pixels, including AVIF container transforms (libavif returns untransformed pixels). */
export function orientPixels(image: ImageData, m: ImageMetadata): ImageData {
    const apply = (orientation: number) => {
        if (orientation === 1) return;
        const w = image.width, h = image.height, swap = orientation >= 5;
        const width = swap ? h : w, height = swap ? w : h, data = new Uint8ClampedArray(image.data.length);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            let dx = x, dy = y;
            switch (orientation) {
                case 2: dx = w - 1 - x; break;
                case 3: dx = w - 1 - x; dy = h - 1 - y; break;
                case 4: dy = h - 1 - y; break;
                case 5: dx = y; dy = x; break;
                case 6: dx = h - 1 - y; dy = x; break;
                case 7: dx = h - 1 - y; dy = w - 1 - x; break;
                case 8: dx = y; dy = w - 1 - x; break;
            }
            const from = (y * w + x) * 4, to = (dy * width + dx) * 4;
            for (let c = 0; c < 4; c++) data[to + c] = image.data[from + c];
        }
        image = new ImageData(data, width, height);
    };
    if (m.transforms.length) {
        for (const transform of m.transforms) {
            if (transform.rotation !== undefined) apply([1, 8, 3, 6][transform.rotation]);
            if (transform.mirror !== undefined) apply(transform.mirror === 0 ? 4 : 2);
        }
    } else apply(m.orientation);
    return image;
}

export function writeMetadata(buffer: ArrayBuffer, format: ImageFormat, original: ImageMetadata, width: number, height: number): { buffer: ArrayBuffer; incomplete: boolean } {
    const b = new Uint8Array(buffer), m = { ...original };
    try { if (m.exif) m.exif = normalizeExif(m.exif, width, height); } catch { m.exif = undefined; m.incomplete = true; }
    try { if (m.xmp) m.xmp = normalizeXmp(m.xmp, width, height); } catch { m.xmp = undefined; m.incomplete = true; }
    try {
        let result: Bytes = b;
        if (format === 'jpeg') {
            const segments: Bytes[] = [];
            for (const key of ['exif', 'xmp'] as const) if (m[key]) {
                try { segments.push(jpegSegment(join(key === 'exif' ? EXIF : XMP, m[key]!))); } catch { m.incomplete = true; }
            }
            result = join(b.slice(0, 2), ...segments, b.slice(2));
        } else if (format === 'png') {
            const chunks = pngChunks(b), at = chunks.find(c => c.type === 'IDAT')?.start;
            if (at === undefined) throw new Error('Missing PNG image data');
            result = join(b.slice(0, at), ...(m.exif ? [pngChunk('eXIf', m.exif)] : []), ...(m.xmp ? [pngChunk('iTXt', join(ascii('XML:com.adobe.xmp\0\0\0\0\0'), m.xmp))] : []), b.slice(at));
        } else if (format === 'webp' && (m.exif || m.xmp)) {
            const chunks = webpChunks(b), existing = chunks.find(c => c.type === 'VP8X');
            const vp8x = existing ? take(b, existing.payload, 10) : join(new Uint8Array(4), uint(width - 1, 3, true), uint(height - 1, 3, true));
            const lossless = chunks.find(c => c.type === 'VP8L');
            if (chunks.some(c => c.type === 'ALPH') || (lossless && (b[lossless.payload + 4] & 16))) vp8x[0] |= 16;
            if (m.exif) vp8x[0] |= 8;
            if (m.xmp) vp8x[0] |= 4;
            const payload = join(ascii('WEBP'), webpChunk('VP8X', vp8x), ...chunks.filter(c => c.type !== 'VP8X').map(c => take(b, c.start, c.end - c.start)), ...(m.exif ? [webpChunk('EXIF', m.exif)] : []), ...(m.xmp ? [webpChunk('XMP ', m.xmp)] : []));
            result = join(ascii('RIFF'), uint(payload.length, 4, true), payload);
        } else if (format === 'avif' && (m.exif || m.xmp)) result = writeAvif(b, m);
        return { buffer: result.slice().buffer as ArrayBuffer, incomplete: m.incomplete };
    } catch { return { buffer, incomplete: true }; }
}
