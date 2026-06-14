/**
 * Image Converter Web Worker
 * Handles decoding and encoding images using @jsquash WASM libraries.
 * Runs off the main thread to keep the UI responsive.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// We'll dynamically import the @jsquash modules and manually init their WASM
// using fetch() from the public/wasm/ folder.

const WASM_BASE = '/wasm';

// Cache for initialized modules
let avifDecModule: any = null;
let avifEncModule: any = null;
let jpegDecModule: any = null;
let jpegEncModule: any = null;
let pngDecModule: any = null;
let pngEncModule: any = null;
let webpDecModule: any = null;
let webpEncModule: any = null;

async function fetchWasm(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch WASM: ${url} (${response.status})`);
    return await response.arrayBuffer();
}

async function initDecoder(format: string): Promise<any> {
    switch (format) {
        case 'jpeg': {
            if (jpegDecModule) return jpegDecModule;
            const wasmModule = await import('@jsquash/jpeg/decode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/mozjpeg_dec.wasm`);
            await wasmModule.init({ wasmBinary });
            jpegDecModule = (wasmModule as any).decode || (wasmModule as any).default;
            return jpegDecModule;
        }
        case 'png': {
            if (pngDecModule) return pngDecModule;
            const wasmModule = await import('@jsquash/png/decode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/squoosh_png_bg.wasm`);
            await (wasmModule as any).init(wasmBinary);
            pngDecModule = (wasmModule as any).decode || (wasmModule as any).default;
            return pngDecModule;
        }
        case 'webp': {
            if (webpDecModule) return webpDecModule;
            const wasmModule = await import('@jsquash/webp/decode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/webp_dec.wasm`);
            await wasmModule.init({ wasmBinary });
            webpDecModule = (wasmModule as any).decode || (wasmModule as any).default;
            return webpDecModule;
        }
        case 'avif': {
            if (avifDecModule) return avifDecModule;
            const wasmModule = await import('@jsquash/avif/decode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/avif_dec.wasm`);
            await wasmModule.init({ wasmBinary });
            avifDecModule = (wasmModule as any).decode || (wasmModule as any).default;
            return avifDecModule;
        }
        default:
            throw new Error(`Unsupported input format: ${format}`);
    }
}

async function initEncoder(format: string): Promise<any> {
    switch (format) {
        case 'jpeg': {
            if (jpegEncModule) return jpegEncModule;
            const wasmModule = await import('@jsquash/jpeg/encode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/mozjpeg_enc.wasm`);
            await wasmModule.init({ wasmBinary });
            jpegEncModule = (wasmModule as any).encode || (wasmModule as any).default;
            return jpegEncModule;
        }
        case 'png': {
            if (pngEncModule) return pngEncModule;
            const wasmModule = await import('@jsquash/png/encode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/squoosh_png_bg.wasm`);
            await (wasmModule as any).init(wasmBinary);
            pngEncModule = (wasmModule as any).encode || (wasmModule as any).default;
            return pngEncModule;
        }
        case 'webp': {
            if (webpEncModule) return webpEncModule;
            const wasmModule = await import('@jsquash/webp/encode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/webp_enc.wasm`);
            await wasmModule.init({ wasmBinary });
            webpEncModule = (wasmModule as any).encode || (wasmModule as any).default;
            return webpEncModule;
        }
        case 'avif': {
            if (avifEncModule) return avifEncModule;
            const wasmModule = await import('@jsquash/avif/encode');
            const wasmBinary = await fetchWasm(`${WASM_BASE}/avif_enc.wasm`);
            await wasmModule.init({ wasmBinary });
            avifEncModule = (wasmModule as any).encode || (wasmModule as any).default;
            return avifEncModule;
        }
        default:
            throw new Error(`Unsupported output format: ${format}`);
    }
}

function getMimeType(format: string): string {
    switch (format) {
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'webp': return 'image/webp';
        case 'avif': return 'image/avif';
        default: return 'application/octet-stream';
    }
}

self.onmessage = async (e: MessageEvent) => {
    const { type, id, imageBuffer, inputFormat, outputFormat, quality, effort } = e.data;

    if (type !== 'encode') return;

    try {
        // Step 1: Decode
        self.postMessage({ type: 'progress', id, message: `กำลังถอดรหัส ${inputFormat.toUpperCase()}...` });
        const decode = await initDecoder(inputFormat);
        const imageData: ImageData = await decode(imageBuffer);

        // Step 2: Encode
        self.postMessage({ type: 'progress', id, message: `กำลังเข้ารหัส ${outputFormat.toUpperCase()}...` });
        const encode = await initEncoder(outputFormat);

        let encodeOptions: any = {};
        if (outputFormat === 'webp') {
            encodeOptions = { quality: quality ?? 75 };
        } else if (outputFormat === 'avif') {
            encodeOptions = {
                quality: quality ?? 75,
                speed: effort != null ? (10 - effort) : 6, // jsquash avif uses speed (0=slowest, 10=fastest)
            };
        } else if (outputFormat === 'jpeg') {
            encodeOptions = { quality: quality ?? 75 };
        }
        // PNG doesn't typically have quality options

        const encodedData: ArrayBuffer = await encode(imageData, encodeOptions);

        // Step 3: Create Blob and send back
        const blob = new Blob([encodedData], { type: getMimeType(outputFormat) });

        self.postMessage({
            type: 'result',
            id,
            blob,
            originalSize: imageBuffer.byteLength,
            newSize: encodedData.byteLength,
        });
    } catch (err: any) {
        self.postMessage({
            type: 'error',
            id,
            message: err?.message || 'เกิดข้อผิดพลาดระหว่างการแปลงไฟล์',
        });
    }
};

export { };
