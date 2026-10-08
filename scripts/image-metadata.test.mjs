import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import fs from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import ExifReader from 'exifreader';
import { readMetadata, writeMetadata, orientPixels } from '../src/lib/image-metadata.ts';

globalThis.ImageData = class ImageData {
    constructor(data, width, height) { this.data = data; this.width = width; this.height = height; }
};
const decoders = {};
for (const format of ['jpeg', 'png', 'webp', 'avif']) {
    const codec = await import(`@jsquash/${format}/decode.js`);
    const name = {jpeg:'mozjpeg_dec',png:'squoosh_png_bg',webp:'webp_dec',avif:'avif_dec'}[format];
    const binary = fs.readFileSync(`public/wasm/${name}.wasm`);
    await codec.init(format === 'png' ? binary : {wasmBinary:binary});
    decoders[format] = codec.default;
}
const formats = ['jpeg', 'png', 'webp', 'avif'];
const arrayBuffer = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const xmp = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:tiff="http://ns.adobe.com/tiff/1.0/" xmlns:exif="http://ns.adobe.com/exif/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" tiff:Orientation="6" tiff:ImageWidth="3" tiff:ImageLength="2" exif:PixelXDimension="3" exif:PixelYDimension="2"><dc:rights>Copyright Test</dc:rights></rdf:Description></rdf:RDF></x:xmpmeta>';
const pixels = Buffer.from([255,0,0,255, 0,255,0,200, 0,0,255,0, 255,255,0,255, 0,255,255,100, 255,0,255,255]);
function image() { return sharp(pixels, {raw:{width:3,height:2,channels:4}}); }
async function fixture(format, orientation = 6) {
    const output = await image().withMetadata({orientation}).withExifMerge({
        IFD0:{Make:'Camera Test',Model:'Metadata Test',Copyright:'Copyright Test'},
        IFD2:{DateTimeOriginal:'2026:10:08 10:00:00'},
        IFD3:{GPSLatitudeRef:'N',GPSLatitude:'13/1 45/1 0/1',GPSLongitudeRef:'E',GPSLongitude:'100/1 30/1 0/1'}
    }).withXmp(xmp.replace('tiff:Orientation="6"', `tiff:Orientation="${orientation}"`)).toFormat(format).toBuffer();
    if (format !== 'png') return output;
    return addPngXmp(output, xmp.replace('tiff:Orientation="6"', `tiff:Orientation="${orientation}"`));
}
function addPngXmp(png, xml, compressed = false) {
    const payload = Buffer.concat([Buffer.from(`XML:com.adobe.xmp\0${compressed ? '\x01' : '\0'}\0\0\0`), compressed ? deflateSync(xml) : Buffer.from(xml)]);
    const data = Buffer.concat([Buffer.from('iTXt'), payload]);
    const length = Buffer.alloc(4); length.writeUInt32BE(payload.length);
    const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(data));
    return Buffer.concat([png.subarray(0, -12), length, data, checksum, png.subarray(-12)]);
}
function tags(b) { return ExifReader.load(b, {expanded:true}); }

test('all 16 format pairs preserve camera, date, GPS and copyright; normalize output geometry', async () => {
    for (const input of formats) {
        const source = await fixture(input);
        const metadata = readMetadata(arrayBuffer(source), input);
        assert.equal(metadata.incomplete, false, input);
        for (const output of formats) {
            const clean = await image().rotate(90).toFormat(output).toBuffer();
            const result = writeMetadata(arrayBuffer(clean), output, metadata, 2, 3);
            assert.equal(result.incomplete, false, `${input} -> ${output}`);
            const t = tags(result.buffer);
            assert.equal(t.exif.Make.description, 'Camera Test');
            assert.equal(t.exif.Model.description, 'Metadata Test');
            assert.equal(t.exif.DateTimeOriginal.description, '2026:10:08 10:00:00');
            assert.equal(t.exif.Copyright.description, 'Copyright Test');
            assert.equal(t.exif.Orientation.value, 1);
            assert.equal(t.gps.Latitude, 13.75);
            assert.equal(t.gps.Longitude, 100.5);
            assert.equal(t.xmp.rights.description, 'Copyright Test');
            assert.equal(t.xmp.Orientation.value, '1');
            assert.equal(t.xmp.ImageWidth.value, '2');
            assert.equal(t.xmp.ImageLength.value, '3');
            const decoded = await sharp(Buffer.from(result.buffer)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
            const reference = await sharp(clean).ensureAlpha().raw().toBuffer({resolveWithObject:true});
            assert.deepEqual(decoded, reference, 'metadata must not alter color or transparency');
            // The removal path passes only encoded pixels, never the source metadata.
            const stripped = tags(arrayBuffer(clean));
            assert.equal(stripped.exif, undefined);
            assert.equal(stripped.xmp, undefined);
        }
    }
});

test('all eight orientations match an independent native decoder, including AVIF mirror/rotation', async () => {
    for (const format of formats) for (let orientation = 1; orientation <= 8; orientation++) {
        const source = await fixture(format, orientation);
        const metadata = readMetadata(arrayBuffer(source), format);
        assert.equal(metadata.incomplete, false);
        const raw = await decoders[format](arrayBuffer(source));
        const oriented = orientPixels(raw, metadata);
        const nativeFixture = await sharp(Buffer.from(raw.data), {raw:{width:raw.width,height:raw.height,channels:4}}).withMetadata({orientation}).png().toBuffer();
        const reference = await sharp(nativeFixture).autoOrient().ensureAlpha().raw().toBuffer({resolveWithObject:true});
        assert.equal(oriented.width, reference.info.width, `${format} ${orientation} width`);
        assert.equal(oriented.height, reference.info.height, `${format} ${orientation} height`);
        assert.deepEqual(Buffer.from(oriented.data), reference.data, `${format} ${orientation} pixels`);
    }
});

test('metadata-free images remain clean without warnings', async () => {
    for (const format of formats) {
        const clean = await image().toFormat(format).toBuffer();
        const m = readMetadata(arrayBuffer(clean), format);
        assert.equal(m.exif, undefined);
        assert.equal(m.xmp, undefined);
        assert.equal(m.incomplete, false);
        assert.deepEqual(writeMetadata(arrayBuffer(clean), format, m, 3, 2).buffer, arrayBuffer(clean));
    }
});

test('damaged EXIF and malformed XMP warn while producing readable output', async () => {
    for (const format of formats) {
        const clean = await image().toFormat(format).toBuffer();
        const bad = {exif:new Uint8Array([73,73,42,0,255]),xmp:new TextEncoder().encode('<broken>'),orientation:1,transforms:[],incomplete:false};
        const result = writeMetadata(arrayBuffer(clean), format, bad, 3, 2);
        assert.equal(result.incomplete, true);
        assert.equal(tags(result.buffer).exif, undefined);
        assert.equal(tags(result.buffer).xmp, undefined);
        await sharp(Buffer.from(result.buffer)).raw().toBuffer();
    }
    assert.equal(readMetadata(new ArrayBuffer(5), 'avif').incomplete, true);
});

test('JPEG oversized metadata is skipped with a warning, while supported EXIF survives', async () => {
    const source = await fixture('png');
    const m = readMetadata(arrayBuffer(source), 'png');
    m.xmp = new TextEncoder().encode(`<x:xmpmeta xmlns:x="adobe:ns:meta/"><data>${'a'.repeat(70000)}</data></x:xmpmeta>`);
    const clean = await image().jpeg().toBuffer();
    const result = writeMetadata(arrayBuffer(clean), 'jpeg', m, 3, 2);
    assert.equal(result.incomplete, true);
    assert.equal(tags(result.buffer).exif.Make.description, 'Camera Test');
    assert.equal(tags(result.buffer).xmp, undefined);
});

test('compressed PNG XMP is retained, invalid PNG metadata CRC warns', async () => {
    const clean = await image().png().toBuffer();
    const source = addPngXmp(clean, xmp, true);
    const m = readMetadata(arrayBuffer(source), 'png');
    assert.equal(m.incomplete, false);
    assert.equal(new TextDecoder().decode(m.xmp), xmp);
    source[source.length - 13] ^= 1;
    const broken = readMetadata(arrayBuffer(source), 'png');
    assert.equal(broken.incomplete, true);
    assert.equal(broken.xmp, undefined);
});

test('XMP-only orientation also works with a nonstandard namespace prefix', async () => {
    const clean = await image().png().toBuffer();
    const aliased = xmp.replaceAll('tiff:', 'photo:').replaceAll('xmlns:tiff=', 'xmlns:photo=');
    const source = addPngXmp(clean, aliased);
    const m = readMetadata(arrayBuffer(source), 'png');
    assert.equal(m.orientation, 6);
    assert.equal(m.incomplete, false);
    const result = writeMetadata(arrayBuffer(clean), 'png', m, 2, 3);
    const output = readMetadata(result.buffer, 'png');
    assert.equal(output.orientation, 1);
    assert.ok(new TextDecoder().decode(output.xmp).includes('photo:ImageWidth="2"'));
});
