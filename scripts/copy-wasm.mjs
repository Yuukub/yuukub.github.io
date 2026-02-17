/**
 * Copy @jsquash WASM files to public/wasm/ for client-side loading.
 * Run via: node scripts/copy-wasm.mjs
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dest = resolve(root, 'public', 'wasm');

// Ensure destination exists
mkdirSync(dest, { recursive: true });

const wasmFiles = [
    // AVIF
    { src: 'node_modules/@jsquash/avif/codec/dec/avif_dec.wasm', name: 'avif_dec.wasm' },
    { src: 'node_modules/@jsquash/avif/codec/enc/avif_enc.wasm', name: 'avif_enc.wasm' },
    // JPEG (MozJPEG)
    { src: 'node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm', name: 'mozjpeg_dec.wasm' },
    { src: 'node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm', name: 'mozjpeg_enc.wasm' },
    // PNG
    { src: 'node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm', name: 'squoosh_png_bg.wasm' },
    // Resize
    { src: 'node_modules/@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm', name: 'squoosh_resize_bg.wasm' },
    // WebP
    { src: 'node_modules/@jsquash/webp/codec/dec/webp_dec.wasm', name: 'webp_dec.wasm' },
    { src: 'node_modules/@jsquash/webp/codec/enc/webp_enc.wasm', name: 'webp_enc.wasm' },
];

let copied = 0;
for (const { src, name } of wasmFiles) {
    const srcPath = resolve(root, src);
    const destPath = resolve(dest, name);
    if (existsSync(srcPath)) {
        cpSync(srcPath, destPath);
        copied++;
        console.log(`  ✓ ${name}`);
    } else {
        console.warn(`  ✗ Missing: ${src}`);
    }
}

console.log(`\n✅ Copied ${copied}/${wasmFiles.length} WASM files to public/wasm/`);
