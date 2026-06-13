import { env, pipeline, RawImage } from "@huggingface/transformers";
import type { ImageSegmentationPipeline } from "@huggingface/transformers";

const WEBGPU_MODEL_ID = "onnx-community/BiRefNet_lite-ONNX";
const WASM_MODEL_ID = WEBGPU_MODEL_ID;
const MAX_PIXELS = 32_000_000;
const MIN_MASK_COVERAGE = 0.002;

type Engine = "webgpu" | "wasm";
type DType = "fp16" | "fp32" | "q8";

interface RemoveBackgroundMessage {
    type: "remove";
    id: string;
    file: File;
}

interface ProgressInfo {
    status?: string;
    progress?: number;
    file?: string;
    name?: string;
    loaded?: number;
    total?: number;
}

interface PipelineState {
    engine: Engine;
    dtype: DType;
    modelId: string;
    pipe: ImageSegmentationPipeline;
}

env.allowLocalModels = false;
env.useBrowserCache = true;
env.useWasmCache = true;

let pipelineState: Promise<PipelineState> | null = null;

type GpuStatus =
    | { available: true; supportsFp16: boolean }
    | { available: false; reason: string };

interface NavigatorWithGpu extends Navigator {
    gpu?: {
        requestAdapter: () => Promise<{
            features: {
                has: (feature: string) => boolean;
            };
        } | null>;
    };
}

function postProgress(id: string, message: string, progress: number, engine?: Engine) {
    self.postMessage({
        type: "progress",
        id,
        message,
        progress: Math.max(0, Math.min(100, Math.round(progress))),
        engine,
    });
}

function describeModelProgress(info: ProgressInfo): string {
    const file = info.file || info.name || "";
    const shortFile = file.split("/").pop();

    if (info.status === "progress_total" && typeof info.progress === "number") {
        return `กำลังโหลดโมเดล AI ${info.progress.toFixed(0)}%`;
    }

    if (info.status === "progress" && typeof info.progress === "number") {
        return shortFile
            ? `กำลังโหลด ${shortFile} ${info.progress.toFixed(0)}%`
            : `กำลังโหลดโมเดล AI ${info.progress.toFixed(0)}%`;
    }

    if (info.status === "ready") return "โมเดลพร้อมทำงาน";
    if (info.status === "initiate") return shortFile ? `เตรียมโหลด ${shortFile}` : "เตรียมโหลดโมเดล AI";
    if (info.status === "download") return shortFile ? `กำลังดาวน์โหลด ${shortFile}` : "กำลังดาวน์โหลดโมเดล AI";

    return "กำลังเตรียมโมเดล AI";
}

function progressFromInfo(info: ProgressInfo): number {
    if (typeof info.progress === "number") return info.progress;
    if (typeof info.loaded === "number" && typeof info.total === "number" && info.total > 0) {
        return (info.loaded / info.total) * 100;
    }
    if (info.status === "ready") return 100;
    return 5;
}

async function getGpuStatus(): Promise<GpuStatus> {
    const nav = navigator as NavigatorWithGpu;
    if (!nav.gpu) {
        return {
            available: false,
            reason: "เบราว์เซอร์นี้ยังไม่เปิดใช้ WebGPU",
        };
    }

    try {
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) {
            return {
                available: false,
                reason: "เบราว์เซอร์หา GPU adapter ไม่เจอ อาจถูกปิด hardware acceleration หรือ driver ถูก blocklist",
            };
        }

        return {
            available: true,
            supportsFp16: adapter.features.has("shader-f16"),
        };
    } catch {
        return {
            available: false,
            reason: "เบราว์เซอร์ขอสิทธิ์ใช้ WebGPU adapter ไม่สำเร็จ",
        };
    }
}

async function createPipeline(engine: Engine, dtype: DType, modelId: string, id: string): Promise<PipelineState> {
    const pipe = await pipeline("image-segmentation", modelId, {
        device: engine,
        dtype,
        progress_callback: (info: ProgressInfo) => {
            postProgress(id, describeModelProgress(info), progressFromInfo(info) * 0.6, engine);
        },
    });

    return {
        engine,
        dtype,
        modelId,
        pipe: pipe as ImageSegmentationPipeline,
    };
}

async function getPipeline(id: string): Promise<PipelineState> {
    if (pipelineState) return pipelineState;

    pipelineState = (async () => {
        const gpuStatus = await getGpuStatus();
        if (gpuStatus.available) {
            try {
                if (gpuStatus.supportsFp16) {
                    postProgress(id, "กำลังเริ่ม WebGPU fp16 engine...", 3, "webgpu");
                    return await createPipeline("webgpu", "fp16", WEBGPU_MODEL_ID, id);
                }
                postProgress(id, "GPU ไม่รองรับ fp16 กำลังลอง WebGPU fp32...", 4, "webgpu");
            } catch (err) {
                console.warn("WebGPU fp16 pipeline failed, retrying with fp32:", err);
            }

            try {
                postProgress(id, "กำลังเริ่ม WebGPU fp32 engine...", 5, "webgpu");
                return await createPipeline("webgpu", "fp32", WEBGPU_MODEL_ID, id);
            } catch (err) {
                console.warn("WebGPU fp32 pipeline failed, falling back to WASM:", err);
                self.postMessage({
                    type: "fallback",
                    id,
                    engine: "wasm",
                    message: "เบราว์เซอร์นี้ใช้ WebGPU ไม่สำเร็จ จึงสลับเป็น WASM คุณภาพสูง แต่อาจใช้ RAM และเวลามากขึ้น",
                });
            }
        } else {
            self.postMessage({
                type: "fallback",
                id,
                engine: "wasm",
                message: `${gpuStatus.reason} จึงใช้ WASM คุณภาพสูงแทน ซึ่งอาจใช้ RAM และเวลามากขึ้น`,
            });
        }

        postProgress(id, "กำลังเริ่ม WASM engine...", 3, "wasm");
        return createPipeline("wasm", "fp32", WASM_MODEL_ID, id);
    })();

    return pipelineState;
}

function getFeatherRadius(width: number, height: number): number {
    return Math.max(0.5, Math.min(1.8, Math.max(width, height) / 3000));
}

function createMaskCanvas(mask: RawImage, width: number, height: number): OffscreenCanvas {
    const source = new OffscreenCanvas(mask.width, mask.height);
    const sourceCtx = source.getContext("2d");
    if (!sourceCtx) throw new Error("เบราว์เซอร์ไม่รองรับ Canvas สำหรับประมวลผล mask");

    const maskPixels = new Uint8ClampedArray(mask.width * mask.height * 4);
    const channels = mask.channels;
    for (let i = 0, j = 0; i < mask.data.length && j < maskPixels.length; i += channels, j += 4) {
        const alpha = mask.data[i];
        maskPixels[j] = 255;
        maskPixels[j + 1] = 255;
        maskPixels[j + 2] = 255;
        maskPixels[j + 3] = alpha;
    }
    sourceCtx.putImageData(new ImageData(maskPixels, mask.width, mask.height), 0, 0);

    if (mask.width === width && mask.height === height) return source;

    const scaled = new OffscreenCanvas(width, height);
    const scaledCtx = scaled.getContext("2d");
    if (!scaledCtx) throw new Error("เบราว์เซอร์ไม่รองรับ Canvas สำหรับขยาย mask");
    scaledCtx.imageSmoothingEnabled = true;
    scaledCtx.imageSmoothingQuality = "high";
    scaledCtx.drawImage(source, 0, 0, width, height);
    return scaled;
}

function featherMask(maskCanvas: OffscreenCanvas, radius: number): OffscreenCanvas {
    const canvas = new OffscreenCanvas(maskCanvas.width, maskCanvas.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("เบราว์เซอร์ไม่รองรับ Canvas สำหรับแต่งขอบ");

    ctx.filter = `blur(${radius.toFixed(2)}px)`;
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.filter = "none";
    return canvas;
}

function getMaskCoverage(mask: RawImage): number {
    const channels = mask.channels;
    if (mask.data.length === 0 || channels <= 0) return 0;

    let visible = 0;
    const total = Math.floor(mask.data.length / channels);
    for (let i = 0; i < mask.data.length; i += channels) {
        if (mask.data[i] > 8) visible++;
    }

    return visible / total;
}

async function compositeImage(id: string, file: File, mask: RawImage): Promise<{ pngBlob: Blob; webpBlob: Blob }> {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    if (width * height > MAX_PIXELS) {
        bitmap.close();
        throw new Error("รูปนี้มีความละเอียดสูงเกิน 32MP กรุณาย่อขนาดรูปก่อนใช้งาน");
    }

    const output = new OffscreenCanvas(width, height);
    const ctx = output.getContext("2d");
    if (!ctx) {
        bitmap.close();
        throw new Error("เบราว์เซอร์ไม่รองรับ Canvas สำหรับสร้าง PNG");
    }

    postProgress(id, "กำลังตกแต่งขอบ mask...", 88);
    const maskCanvas = createMaskCanvas(mask, width, height);
    const feathered = featherMask(maskCanvas, getFeatherRadius(width, height));

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(feathered, 0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";

    const [pngBlob, webpBlob] = await Promise.all([
        output.convertToBlob({ type: "image/png" }),
        output.convertToBlob({ type: "image/webp", quality: 0.92 }),
    ]);

    return { pngBlob, webpBlob };
}

self.onmessage = async (event: MessageEvent<RemoveBackgroundMessage>) => {
    const { type, id, file } = event.data;
    if (type !== "remove") return;

    try {
        postProgress(id, "กำลังอ่านรูปภาพ...", 1);

        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        const height = bitmap.height;
        bitmap.close();

        if (width * height > MAX_PIXELS) {
            throw new Error("รูปนี้มีความละเอียดสูงเกิน 32MP กรุณาย่อขนาดรูปก่อนใช้งาน");
        }

        const rawImage = await RawImage.fromBlob(file);
        let state = await getPipeline(id);

        postProgress(id, "กำลังแยกวัตถุออกจากพื้นหลัง...", 65, state.engine);

        let segments;
        try {
            segments = await state.pipe(rawImage);
        } catch (err) {
            if (state.engine === "wasm") throw err;

            console.warn("WebGPU inference failed, retrying with WASM:", err);
            pipelineState = null;
            self.postMessage({
                type: "fallback",
                id,
                engine: "wasm",
                message: "WebGPU ประมวลผลรูปนี้ไม่สำเร็จ จึงสลับเป็น WASM คุณภาพสูงและลองใหม่",
            });
            const fallback = await createPipeline("wasm", "fp32", WASM_MODEL_ID, id);
            state = fallback;
            pipelineState = Promise.resolve(fallback);
            postProgress(id, "กำลังแยกวัตถุด้วย WASM...", 65, "wasm");
            segments = await fallback.pipe(rawImage);
        }

        const mask = Array.isArray(segments) ? segments[0]?.mask : undefined;
        if (!mask) throw new Error("ไม่พบ mask จากโมเดล AI");

        const coverage = getMaskCoverage(mask);
        if (coverage < MIN_MASK_COVERAGE) {
            throw new Error("AI จับวัตถุในภาพนี้ไม่ได้ กรุณาลองรูปที่วัตถุตัดกับพื้นหลังชัดขึ้น");
        }

        postProgress(id, "กำลังสร้าง PNG และ WebP โปร่งใส...", 84, state.engine);
        const { pngBlob, webpBlob } = await compositeImage(id, file, mask);

        self.postMessage({
            type: "result",
            id,
            pngBlob,
            webpBlob,
            engine: state.engine,
            width,
            height,
            pngSize: pngBlob.size,
            webpSize: webpBlob.size,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างลบพื้นหลัง";
        self.postMessage({ type: "error", id, message });
    }
};

export {};
