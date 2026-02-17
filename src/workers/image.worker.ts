/**
 * Image Converter Web Worker
 * Handles decoding and encoding images using @jsquash WASM libraries.
 * Runs off the main thread to keep the UI responsive.
 */

// We'll dynamically import the @jsquash modules and manually init their WASM
// using fetch() from the public/wasm/ folder.

const WASM_BASE = '/wasm';

// Cache for initialized modules
let avifDecModule: any = null;
let avifEncModule: any = null;
let jpegDecModule: any = null;
let jpegEncModule: any = null;
let pngModule: any = null;
let webpDecModule: any = null;
let webpEncModule: any = null;

async function initDecoder(format: string) {
    switch (format) {
        case 'jpeg': {
            if (!jpegDecModule) {
                const module = await import('@jsquash/jpeg/decode');
                await module.init({ locateFile: () => `${WASM_BASE}/mozjpeg_dec.wasm` });
                jpegDecModule = module;
            }
            return jpegDecModule;
        }
        case 'png': {
            const module = await import('@jsquash/png/decode');
            await module.init(`${WASM_BASE}/squoosh_png_bg.wasm`);
            return { decode: module.default };
        }
        case 'webp': {
            if (!webpDecModule) {
                const module = await import('@jsquash/webp/decode');
                await module.init({ locateFile: () => `${WASM_BASE}/webp_dec.wasm` });
                webpDecModule = module;
            }
            return webpDecModule;
        }
        case 'avif': {
            if (!avifDecModule) {
                const module = await import('@jsquash/avif/decode');
                await module.init({ locateFile: () => `${WASM_BASE}/avif_dec.wasm` });
                avifDecModule = module;
            }
            return avifDecModule;
        }
        default:
            throw new Error(`Unsupported input format: ${format}`);
    }
}

async function initEncoder(format: string) {
    switch (format) {
        case 'jpeg': {
            if (!jpegEncModule) {
                const module = await import('@jsquash/jpeg/encode');
                await module.init({ locateFile: () => `${WASM_BASE}/mozjpeg_enc.wasm` });
                jpegEncModule = module;
            }
            return jpegEncModule;
        }
        case 'png': {
            const module = await import('@jsquash/png/encode');
            await module.init(`${WASM_BASE}/squoosh_png_bg.wasm`);
            return { encode: module.default };
        }
        case 'webp': {
            if (!webpEncModule) {
                const module = await import('@jsquash/webp/encode');
                await module.init({ locateFile: () => `${WASM_BASE}/webp_enc.wasm` });
                webpEncModule = module;
            }
            return webpEncModule;
        }
        case 'avif': {
            if (!avifEncModule) {
                const module = await import('@jsquash/avif/encode');
                await module.init({ locateFile: () => `${WASM_BASE}/avif_enc.wasm` });
                avifEncModule = module;
            }
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
        const decoder = await initDecoder(inputFormat);
        const imageData: ImageData = await decoder.decode(imageBuffer);

        // Step 2: Encode
        self.postMessage({ type: 'progress', id, message: `กำลังเข้ารหัส ${outputFormat.toUpperCase()}...` });
        const encoder = await initEncoder(outputFormat);

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

        const encodedData: ArrayBuffer = await encoder.encode(imageData, encodeOptions);

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
