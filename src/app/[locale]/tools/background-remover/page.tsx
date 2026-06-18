"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import Script from "next/script";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdUnit } from "@/components/ad-unit";
import {
    ArrowLeft,
    Cloud,
    Download,
    Eraser,
    ImageIcon,
    Info,
    Loader2,
    Shield,
    Sparkles,
    Trash2,
    Upload,
    XCircle,
    Zap,
} from "lucide-react";

type Engine = "webgpu" | "canvas" | "cloudflare";
type JobStatus = "idle" | "ready" | "processing" | "done" | "error";

interface ImageInfo {
    file: File;
    name: string;
    size: number;
    width: number;
    height: number;
    previewUrl: string;
}

interface WorkerMessage {
    type: "progress" | "fallback" | "result" | "error";
    id: string;
    message?: string;
    progress?: number;
    engine?: Engine;
    pngBlob?: Blob;
    webpBlob?: Blob;
    width?: number;
    height?: number;
    pngSize?: number;
    webpSize?: number;
}

interface TurnstileRenderOptions {
    sitekey: string;
    theme: "auto";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => boolean;
}

interface TurnstileApi {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const MAX_PIXELS = 32_000_000;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_CLOUDFLARE_BG_REMOVE_API = "https://yuukub-bg-remover.sarnyou.workers.dev";
const CLOUDFLARE_BG_REMOVE_API = (
    process.env.NEXT_PUBLIC_BG_REMOVE_API || DEFAULT_CLOUDFLARE_BG_REMOVE_API
).replace(/\/$/, "");
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const FAQ_KEYS = [
    { questionKey: "faq1Q", answerKey: "faq1A" },
    { questionKey: "faq2Q", answerKey: "faq2A" },
    { questionKey: "faq3Q", answerKey: "faq3A" },
    { questionKey: "faq4Q", answerKey: "faq4A" },
    { questionKey: "faq5Q", answerKey: "faq5A" },
    { questionKey: "faq6Q", answerKey: "faq6A" },
    { questionKey: "faq7Q", answerKey: "faq7A" },
    { questionKey: "faq8Q", answerKey: "faq8A" },
] as const;

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function uid(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function isAcceptedImage(file: File): boolean {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ACCEPTED_TYPES.includes(file.type) || ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
}

function getFileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

async function readImageInfo(file: File): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(file);
    const info = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return info;
}

const translateMessage = (msg: string, t: any): string => {
    if (!msg) return "";

    // Exact matches
    if (msg === "กำลังเริ่ม WebGPU fp16 engine...") return t("workerStartingFp16");
    if (msg === "GPU ไม่รองรับ fp16 กำลังลอง WebGPU fp32...") return t("workerNoFp16TryingFp32");
    if (msg === "กำลังเริ่ม WebGPU fp32 engine...") return t("workerStartingFp32");
    if (msg === "กำลังตกแต่งขอบ mask...") return t("workerRefiningMask");
    if (msg === "กำลังวิเคราะห์สีพื้นหลังจากขอบภาพ...") return t("workerAnalyzingBgColor");
    if (msg === "กำลังลบพื้นหลังด้วย Canvas...") return t("workerRemovingCanvas");
    if (msg === "กำลังสร้าง PNG และ WebP โปร่งใส...") return t("workerGeneratingTransparent");
    if (msg === "กำลังอ่านรูปภาพ...") return t("workerReadingImage");
    if (msg === "กำลังแยกวัตถุออกจากพื้นหลัง...") return t("workerExtractingObject");
    if (msg === "เบราว์เซอร์นี้ใช้ WebGPU ไม่สำเร็จ จึงสลับเป็นโหมด Canvas สำหรับภาพโลโก้/กราฟิก") return t("workerWebgpuFailedCanvasLogo");
    if (msg === "WebGPU ประมวลผลรูปนี้ไม่สำเร็จ จึงสลับเป็นโหมด Canvas สำหรับภาพโลโก้/กราฟิก") return t("workerWebgpuFailedCanvasFallback");
    if (msg === "โมเดลพร้อมทำงาน") return t("workerModelReady");
    if (msg === "เตรียมโหลดโมเดล AI") return t("workerPreparingModel");
    if (msg === "กำลังดาวน์โหลดโมเดล AI") return t("workerDownloadingModel");
    if (msg === "กำลังเตรียมโมเดล AI") return t("workerPreparingGeneric");
    if (msg === "อัปโหลดรูปเพื่อเริ่มลบพื้นหลัง") return t("initialMessage");
    if (msg === "ลบพื้นหลังสำเร็จ พร้อมดาวน์โหลด PNG หรือ WebP") return t("successMessage");
    if (msg === "เกิดข้อผิดพลาดระหว่างลบพื้นหลัง") return t("errorProcessing");
    if (msg === "ไม่สามารถลบพื้นหลังรูปนี้ได้") return t("cannotRemove");
    if (msg === "เกิดข้อผิดพลาดใน worker") return t("workerError");
    if (msg === "พร้อมลบพื้นหลัง รูปจะถูกประมวลผลในเครื่องของคุณ") return t("readyMessage");
    if (msg === "รูปนี้ใช้ Cloudflare fallback แล้ว ดาวน์โหลดผลลัพธ์เดิมได้ หรือเปลี่ยนรูป/ล้างรูปเพื่อประมวลผลใหม่") return t("cloudflareAlreadyUsed");
    if (msg === "Cloudflare fallback ยังไม่พร้อม") return t("cloudflareNotReady");
    if (msg === "ต้องยืนยัน Turnstile ก่อนใช้ Cloudflare fallback") return t("cloudflareRequireTurnstile");
    if (msg === "กำลังส่งรูปไป Cloudflare AI fallback...") return t("cloudflareSending");
    if (msg === "Cloudflare แยกพื้นหลังสำเร็จ กำลังสร้าง WebP...") return t("cloudflareSuccessConvertingWebp");
    if (msg === "Cloudflare AI fallback ลบพื้นหลังสำเร็จ พร้อมดาวน์โหลด PNG หรือ WebP") return t("cloudflareSuccess");
    if (msg === "Cloudflare fallback ไม่สำเร็จ") return t("cloudflareFailedMessage");
    if (msg === "โหมดนี้จะอัปโหลดรูปไป Cloudflare เพื่อใช้ AI fallback") return t("cloudflareUploadNotice");
    if (msg === "Turnstile หมดอายุ กรุณายืนยันอีกครั้งก่อนใช้ Cloudflare fallback") return t("turnstileExpired");
    if (msg === "Turnstile ยืนยันไม่สำเร็จ กรุณาลองใหม่อีกครั้ง") return t("turnstileFailed");

    // Dynamic checks
    if (msg.startsWith("กำลังโหลดโมเดล AI ")) {
        const percent = msg.replace("กำลังโหลดโมเดล AI ", "");
        return t("workerModelProgressTotal", { progress: percent });
    }
    if (msg.startsWith("กำลังโหลด ") && msg.endsWith("%")) {
        const parts = msg.slice(9, -1).trim().split(" ");
        const percent = parts.pop() || "";
        const file = parts.join(" ") || "";
        return t("workerLoadingProgress", { file, progress: percent });
    }
    if (msg.startsWith("เตรียมโหลด ")) {
        const file = msg.replace("เตรียมโหลด ", "");
        return t("workerPreparingDownload", { file });
    }
    if (msg.startsWith("กำลังดาวน์โหลด ")) {
        const file = msg.replace("กำลังดาวน์โหลด ", "");
        return t("workerDownloadingProgress", { file });
    }
    if (msg.endsWith(" จึงใช้โหมด Canvas สำหรับภาพโลโก้/กราฟิกแทน")) {
        const reason = msg.replace(" จึงใช้โหมด Canvas สำหรับภาพโลโก้/กราฟิกแทน", "");
        let translatedReason = reason;
        if (reason === "เบราว์เซอร์นี้ยังไม่เปิดใช้ WebGPU") {
            translatedReason = t("reasonNoWebgpu");
        } else if (reason === "เบราว์เซอร์หา GPU adapter ไม่เจอ อาจถูกปิด hardware acceleration หรือ driver ถูก blocklist") {
            translatedReason = t("reasonNoAdapter");
        } else if (reason === "เบราว์เซอร์ขอสิทธิ์ใช้ WebGPU adapter ไม่สำเร็จ") {
            translatedReason = t("reasonPermissionFailed");
        }
        return t("workerCanvasFallbackSubstitute", { reason: translatedReason });
    }

    return msg;
};

const translateError = (errStr: string, t: any): string => {
    if (!errStr) return "";
    if (errStr.includes("รูปนี้มีความละเอียดสูงเกิน 32MP กรุณาย่อขนาดรูปก่อนใช้งาน")) return t("errorTooLarge");
    if (errStr.includes("รองรับเฉพาะ JPG, PNG และ WebP เท่านั้น")) return t("errorInvalidType");
    if (errStr.includes("ไม่สามารถอ่านรูปนี้ได้ กรุณาลองไฟล์อื่น")) return t("errorReadFailed");
    if (errStr.includes("Canvas fallback จับวัตถุไม่ได้ กรุณาใช้ภาพที่พื้นหลังต่างจากวัตถุชัดขึ้น หรือเปิด WebGPU เพื่อใช้ AI")) return t("errorCanvasFailedSubject");
    if (errStr.includes("AI จับวัตถุในภาพนี้ไม่ได้ กรุณาลองรูปที่วัตถุตัดกับพื้นหลังชัดขึ้น")) return t("errorAiFailedSubject");
    if (errStr.includes("ยังไม่ได้ฝัง Turnstile site key ในหน้าเว็บ กรุณารอ GitHub Pages deploy รอบล่าสุดก่อนใช้ Cloudflare fallback")) return t("cloudflareMissingKey");
    if (errStr.includes("กรุณายืนยันว่าเป็นผู้ใช้จริงก่อนใช้ Cloudflare AI fallback เพื่อป้องกันการใช้โควต้าจากภายนอก")) return t("cloudflareVerifyPrompt");
    if (errStr.includes("Cloudflare fallback ลบพื้นหลังไม่สำเร็จ")) return t("cloudflareFailedError");
    return errStr;
};

export default function BackgroundRemoverPage() {
    const t = useTranslations("BackgroundRemover");
    const locale = useLocale();

    const [image, setImage] = useState<ImageInfo | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [pngBlob, setPngBlob] = useState<Blob | null>(null);
    const [webpBlob, setWebpBlob] = useState<Blob | null>(null);
    const [pngSize, setPngSize] = useState<number | null>(null);
    const [webpSize, setWebpSize] = useState<number | null>(null);
    const [status, setStatus] = useState<JobStatus>("idle");
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("อัปโหลดรูปเพื่อเริ่มลบพื้นหลัง");
    const [engine, setEngine] = useState<Engine | null>(null);
    const [fallbackMessage, setFallbackMessage] = useState("");
    const [error, setError] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [turnstileReady, setTurnstileReady] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState("");
    const [turnstileMessage, setTurnstileMessage] = useState("");
    const [cloudflareResultFileKey, setCloudflareResultFileKey] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeJobRef = useRef<string | null>(null);
    const resultUrlRef = useRef<string | null>(null);
    const previewUrlRef = useRef<string | null>(null);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const turnstileWidgetRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
            if (turnstileWidgetRef.current && window.turnstile) {
                window.turnstile.remove(turnstileWidgetRef.current);
            }
            if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        };
    }, []);

    useEffect(() => {
        if (!TURNSTILE_SITE_KEY || !turnstileReady || !turnstileRef.current || !window.turnstile || turnstileWidgetRef.current) {
            return;
        }

        const widgetId = window.turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: "auto",
            callback: (token) => {
                setTurnstileToken(token);
                setTurnstileMessage("");
            },
            "expired-callback": () => {
                setTurnstileToken("");
                setTurnstileMessage("Turnstile หมดอายุ กรุณายืนยันอีกครั้งก่อนใช้ Cloudflare fallback");
            },
            "error-callback": () => {
                setTurnstileToken("");
                setTurnstileMessage("Turnstile ยืนยันไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                return true;
            },
        });

        if (widgetId) turnstileWidgetRef.current = widgetId;
    }, [turnstileReady]);

    const revokeResult = useCallback(() => {
        if (resultUrlRef.current) {
            URL.revokeObjectURL(resultUrlRef.current);
            resultUrlRef.current = null;
        }
        setResultUrl(null);
        setPngBlob(null);
        setWebpBlob(null);
        setPngSize(null);
        setWebpSize(null);
    }, []);

    const resetTurnstile = useCallback(() => {
        setTurnstileToken("");
        if (turnstileWidgetRef.current && window.turnstile) {
            window.turnstile.reset(turnstileWidgetRef.current);
        }
    }, []);

    const convertBlobToWebp = useCallback(async (blob: Blob): Promise<Blob> => {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            bitmap.close();
            throw new Error(t("errorCanvasWebp"));
        }

        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (webpBlob) => {
                    if (webpBlob) resolve(webpBlob);
                    else reject(new Error(t("errorWebpCreationFailed")));
                },
                "image/webp",
                0.92,
            );
        });
    }, [t]);

    const ensureWorker = useCallback(() => {
        if (workerRef.current) return workerRef.current;

        const worker = new Worker(
            new URL("@/workers/background-remover.worker.ts", import.meta.url),
            { type: "module" },
        );

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            const msg = event.data;
            if (msg.id !== activeJobRef.current) return;

            if (msg.type === "progress") {
                setStatus("processing");
                setProgress(msg.progress ?? 0);
                setMessage(msg.message || "กำลังประมวลผล...");
                if (msg.engine) setEngine(msg.engine);
                return;
            }

            if (msg.type === "fallback") {
                setEngine("canvas");
                setFallbackMessage(msg.message || "กำลังใช้ Canvas fallback");
                return;
            }

            if (msg.type === "result" && msg.pngBlob && msg.webpBlob) {
                revokeResult();
                const url = URL.createObjectURL(msg.pngBlob);
                resultUrlRef.current = url;
                setResultUrl(url);
                setPngBlob(msg.pngBlob);
                setWebpBlob(msg.webpBlob);
                setPngSize(msg.pngSize ?? msg.pngBlob.size);
                setWebpSize(msg.webpSize ?? msg.webpBlob.size);
                setEngine(msg.engine ?? engine);
                setProgress(100);
                setStatus("done");
                setMessage("ลบพื้นหลังสำเร็จ พร้อมดาวน์โหลด PNG หรือ WebP");
                return;
            }

            if (msg.type === "error") {
                setStatus("error");
                setError(msg.message || "เกิดข้อผิดพลาดระหว่างลบพื้นหลัง");
                setMessage("ไม่สามารถลบพื้นหลังรูปนี้ได้");
            }
        };

        worker.onerror = (err) => {
            setStatus("error");
            setError(err.message || "Worker error");
            setMessage("เกิดข้อผิดพลาดใน worker");
        };

        workerRef.current = worker;
        return worker;
    }, [engine, revokeResult]);

    const selectFile = useCallback(async (file: File) => {
        setError("");
        setFallbackMessage("");
        revokeResult();
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setImage(null);
        setProgress(0);
        setEngine(null);
        setCloudflareResultFileKey(null);
        resetTurnstile();

        if (!isAcceptedImage(file)) {
            setStatus("error");
            setError("รองรับเฉพาะ JPG, PNG และ WebP เท่านั้น");
            return;
        }

        try {
            const { width, height } = await readImageInfo(file);
            if (width * height > MAX_PIXELS) {
                setStatus("error");
                setError("รูปนี้มีความละเอียดสูงเกิน 32MP กรุณาย่อขนาดรูปก่อนใช้งาน");
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            previewUrlRef.current = previewUrl;

            setImage({
                file,
                name: file.name,
                size: file.size,
                width,
                height,
                previewUrl,
            });
            setStatus("ready");
            setProgress(0);
            setEngine(null);
            setMessage("พร้อมลบพื้นหลัง รูปจะถูกประมวลผลในเครื่องของคุณ");
        } catch {
            setStatus("error");
            setError("ไม่สามารถอ่านรูปนี้ได้ กรุณาลองไฟล์อื่น");
        }
    }, [resetTurnstile, revokeResult]);

    const clearImage = useCallback(() => {
        activeJobRef.current = null;
        if (status === "processing") {
            workerRef.current?.terminate();
            workerRef.current = null;
        }
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        revokeResult();
        setImage(null);
        setStatus("idle");
        setProgress(0);
        setEngine(null);
        setFallbackMessage("");
        setError("");
        setCloudflareResultFileKey(null);
        setMessage("อัปโหลดรูปเพื่อเริ่มลบพื้นหลัง");
        resetTurnstile();
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [resetTurnstile, revokeResult, status]);

    const runRemoval = useCallback(() => {
        if (!image || status === "processing") return;

        const id = uid();
        activeJobRef.current = id;
        setStatus("processing");
        setProgress(1);
        setError("");
        setFallbackMessage("");
        setMessage("กำลังเตรียม AI background remover...");
        revokeResult();

        const worker = ensureWorker();
        worker.postMessage({
            type: "remove",
            id,
            file: image.file,
        });
    }, [ensureWorker, image, revokeResult, status]);

    const runCloudflareRemoval = useCallback(async () => {
        if (!image || status === "processing" || !CLOUDFLARE_BG_REMOVE_API) return;

        const fileKey = getFileKey(image.file);
        if (cloudflareResultFileKey === fileKey) {
            setStatus("done");
            setEngine("cloudflare");
            setMessage("รูปนี้ใช้ Cloudflare fallback แล้ว ดาวน์โหลดผลลัพธ์เดิมได้ หรือเปลี่ยนรูป/ล้างรูปเพื่อประมวลผลใหม่");
            return;
        }

        if (!TURNSTILE_SITE_KEY) {
            setStatus("error");
            setEngine("cloudflare");
            setMessage("Cloudflare fallback ยังไม่พร้อม");
            setError("ยังไม่ได้ฝัง Turnstile site key ในหน้าเว็บ กรุณารอ GitHub Pages deploy รอบล่าสุดก่อนใช้ Cloudflare fallback");
            return;
        }

        if (!turnstileToken) {
            setStatus("error");
            setEngine("cloudflare");
            setMessage("ต้องยืนยัน Turnstile ก่อนใช้ Cloudflare fallback");
            setError("กรุณายืนยันว่าเป็นผู้ใช้จริงก่อนใช้ Cloudflare AI fallback เพื่อป้องกันการใช้โควต้าจากภายนอก");
            return;
        }

        const id = uid();
        activeJobRef.current = id;
        setStatus("processing");
        setProgress(8);
        setError("");
        setFallbackMessage("โหมดนี้จะอัปโหลดรูปไป Cloudflare เพื่อใช้ AI fallback");
        setEngine("cloudflare");
        setMessage("กำลังส่งรูปไป Cloudflare AI fallback...");
        revokeResult();

        try {
            const response = await fetch(`${CLOUDFLARE_BG_REMOVE_API}/?format=png`, {
                method: "POST",
                headers: {
                    "Content-Type": image.file.type || "application/octet-stream",
                    ...(turnstileToken ? { "CF-Turnstile-Response": turnstileToken } : {}),
                },
                body: image.file,
            });

            if (activeJobRef.current !== id) return;

            if (!response.ok) {
                let detail = "";
                try {
                    const body = await response.json();
                    detail = typeof body?.error === "string" ? body.error : "";
                } catch {
                    detail = await response.text().catch(() => "");
                }
                throw new Error(detail || `Cloudflare fallback failed (${response.status})`);
            }

            setProgress(78);
            setMessage("Cloudflare แยกพื้นหลังสำเร็จ กำลังสร้าง WebP...");
            const pngResult = await response.blob();
            const webpResult = await convertBlobToWebp(pngResult);

            if (activeJobRef.current !== id) return;

            const url = URL.createObjectURL(pngResult);
            resultUrlRef.current = url;
            setResultUrl(url);
            setPngBlob(pngResult);
            setWebpBlob(webpResult);
            setPngSize(pngResult.size);
            setWebpSize(webpResult.size);
            setEngine("cloudflare");
            setProgress(100);
            setStatus("done");
            setCloudflareResultFileKey(fileKey);
            setMessage("Cloudflare AI fallback ลบพื้นหลังสำเร็จ พร้อมดาวน์โหลด PNG หรือ WebP");
            resetTurnstile();
        } catch (err) {
            if (activeJobRef.current !== id) return;
            setStatus("error");
            setProgress(0);
            setEngine("cloudflare");
            setMessage("Cloudflare fallback ไม่สำเร็จ");
            setError(err instanceof Error ? err.message : "Cloudflare fallback ลบพื้นหลังไม่สำเร็จ");
            resetTurnstile();
        }
    }, [cloudflareResultFileKey, image, resetTurnstile, revokeResult, status, turnstileToken, convertBlobToWebp]);

    const downloadResult = useCallback((format: "png" | "webp") => {
        const blob = format === "png" ? pngBlob : webpBlob;
        if (!blob || !image) return;
        const baseName = image.name.replace(/\.[^.]+$/, "");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}-no-bg.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }, [image, pngBlob, webpBlob]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void selectFile(file);
    }, [selectFile]);

    const isBusy = status === "processing";
    const canRun = Boolean(image) && !isBusy;
    const hasCloudflareFallback = Boolean(CLOUDFLARE_BG_REMOVE_API);
    const hasTurnstile = Boolean(TURNSTILE_SITE_KEY);
    const hasCloudflareResultForCurrentImage = Boolean(
        image && cloudflareResultFileKey === getFileKey(image.file),
    );
    const canRunCloudflare = canRun && hasTurnstile && Boolean(turnstileToken) && !hasCloudflareResultForCurrentImage;
    const engineLabel = engine === "webgpu"
        ? "WebGPU"
        : engine === "canvas"
            ? t("canvasFallback")
            : engine === "cloudflare"
                ? t("cloudflareAi")
                : t("autoEngine");

    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                name: "AI Background Remover",
                url: "https://yuukub.com/tools/background-remover/",
                applicationCategory: "MultimediaApplication",
                operatingSystem: "Any",
                inLanguage: locale === "th" ? "th-TH" : "en-US",
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                },
                featureList: [
                    t("feature1"),
                    t("feature2"),
                    t("feature3"),
                    t("feature4"),
                ],
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Tools",
                        item: "https://yuukub.com/tools/",
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "Background Remover",
                        item: "https://yuukub.com/tools/background-remover/",
                    },
                ],
            },
            {
                "@type": "FAQPage",
                mainEntity: FAQ_KEYS.map((item) => ({
                    "@type": "Question",
                    name: t(item.questionKey),
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: t(item.answerKey),
                    },
                })),
            },
        ],
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            {hasTurnstile && (
                <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                    strategy="afterInteractive"
                    onLoad={() => setTurnstileReady(true)}
                />
            )}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-28 pb-20 max-w-6xl">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-foreground">
                        <Link href="/tools/">
                            <ArrowLeft className="h-4 w-4" /> {t("backToTools")}
                        </Link>
                    </Button>
                    <Badge variant="outline" className="gap-1.5 border-cyan-500/30 text-cyan-600">
                        <Sparkles className="h-3.5 w-3.5" /> {t("inBrowserAi")}
                    </Badge>
                </div>

                <section className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="w-fit gap-1.5">
                                <Eraser className="h-3.5 w-3.5" /> Background Remover
                            </Badge>
                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                                {t("headingTitle")}
                            </h1>
                            <p className="text-muted-foreground leading-relaxed">
                                {t("headingDesc")}
                            </p>
                        </div>

                        <Card
                            className={`border-2 border-dashed p-6 transition-colors cursor-pointer ${dragActive
                                ? "border-cyan-500 bg-cyan-500/5"
                                : "border-border/60 bg-card/80 hover:border-cyan-500/50"
                                }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={(event) => {
                                event.preventDefault();
                                setDragActive(false);
                            }}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                className="hidden"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void selectFile(file);
                                }}
                            />
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-cyan-500" />
                                </div>
                                <div>
                                    <p className="font-semibold">
                                        {image ? image.name : t("dragDropPrompt")}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {t("dragDropInfo")}
                                    </p>
                                </div>
                                {image && (
                                    <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                                        <Badge variant="outline">{image.width} x {image.height}px</Badge>
                                        <Badge variant="outline">{formatBytes(image.size)}</Badge>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <Button
                                className="h-11 gap-2 font-bold bg-cyan-500 hover:bg-cyan-600 text-white"
                                onClick={runRemoval}
                                disabled={!canRun}
                            >
                                {isBusy ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> {t("removingBackground")}
                                    </>
                                ) : (
                                    <>
                                        <Eraser className="h-4 w-4" /> {t("removeBackground")}
                                    </>
                                )}
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    className="h-11 gap-2"
                                    onClick={() => downloadResult("png")}
                                    disabled={!pngBlob}
                                >
                                    <Download className="h-4 w-4" /> PNG
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-11 gap-2"
                                    onClick={() => downloadResult("webp")}
                                    disabled={!webpBlob}
                                >
                                    <Download className="h-4 w-4" /> WebP
                                </Button>
                            </div>
                            {hasCloudflareFallback && (
                                <Button
                                    variant="outline"
                                    className="h-11 gap-2 sm:col-span-2 border-cyan-500/30 text-cyan-700 hover:text-cyan-800 dark:text-cyan-300"
                                    onClick={() => void runCloudflareRemoval()}
                                    disabled={!canRunCloudflare}
                                >
                                    <Cloud className="h-4 w-4" />
                                    {hasCloudflareResultForCurrentImage ? t("cfUsed") : t("cfUseFallback")}
                                </Button>
                            )}
                        </div>

                        {hasCloudflareFallback && (
                            <Card className="p-4 border-cyan-500/20 bg-cyan-500/5 space-y-2">
                                <div className="flex items-start gap-2">
                                    <Shield className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">{t("cfTurnstileTitle")}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {t("cfTurnstileDesc")}
                                        </p>
                                    </div>
                                </div>
                                {hasTurnstile ? (
                                    <div ref={turnstileRef} className="min-h-[65px]" />
                                ) : (
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                                        {t("cfWaitingDeploy")}
                                    </div>
                                )}
                                {turnstileMessage && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        {translateMessage(turnstileMessage, t)}
                                    </p>
                                )}
                            </Card>
                        )}

                        <Card className="p-4 border-border/50 bg-muted/20 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Zap className="h-4 w-4 text-cyan-500 shrink-0" />
                                    <p className="text-sm font-semibold truncate">{translateMessage(message, t)}</p>
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                    {engineLabel}
                                </Badge>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full bg-cyan-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{progress}%</span>
                                <span>
                                    {t("progressInfoWebGpu")}
                                    {hasCloudflareFallback ? t("progressInfoCf") : ""}
                                </span>
                            </div>
                            {fallbackMessage && (
                                <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <span>{translateMessage(fallbackMessage, t)}</span>
                                </div>
                            )}
                            {error && (
                                <div className="space-y-3 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex gap-2">
                                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{translateError(error, t)}</span>
                                    </div>
                                    {hasCloudflareFallback && image && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 border-red-500/20 bg-background/60"
                                            onClick={() => void runCloudflareRemoval()}
                                            disabled={isBusy || hasCloudflareResultForCurrentImage}
                                        >
                                            <Cloud className="h-3.5 w-3.5" />
                                            {hasCloudflareResultForCurrentImage ? t("cfUsed") : t("tryCfFallback")}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={clearImage}>
                                <Trash2 className="h-4 w-4" /> {t("clearImage")}
                            </Button>
                            {pngSize !== null && (
                                <Badge variant="secondary">PNG {formatBytes(pngSize)}</Badge>
                            )}
                            {webpSize !== null && (
                                <Badge variant="secondary">WebP {formatBytes(webpSize)}</Badge>
                            )}
                        </div>
                    </div>

                    <Card className="p-4 border-border/50 bg-card/80 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <PreviewPanel title="Before" imageUrl={image?.previewUrl} emptyLabel={t("originalImage")} />
                            <PreviewPanel title="After" imageUrl={resultUrl || undefined} emptyLabel={t("transparentPng")} checkerboard />
                        </div>

                        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex gap-3">
                            <Shield className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">{t("privacyTitle")}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {t("privacyDesc")}
                                </p>
                            </div>
                        </div>
                    </Card>
                </section>

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[150px] my-12 bg-card/30 backdrop-blur-sm rounded-xl py-12 border border-border/50 shadow-sm"
                />

                <section className="grid md:grid-cols-3 gap-4">
                    {[
                        { title: t("featLocalTitle"), desc: t("featLocalDesc") },
                        { title: t("featFormatTitle"), desc: t("featFormatDesc") },
                        { title: t("featFallbackTitle"), desc: t("featFallbackDesc") },
                    ].map((item) => (
                        <Card key={item.title} className="p-5 border-border/50 bg-muted/20">
                            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                                <ImageIcon className="h-5 w-5 text-cyan-500" />
                            </div>
                            <h2 className="font-bold mb-2">{item.title}</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                        </Card>
                    ))}
                </section>

                {/* ทำไมต้องลบพื้นหลังแบบ Local-first AI? */}
                <section className="mt-16 space-y-6">
                    <h2 className="text-2xl font-bold border-b border-border/10 pb-3">{t("whyLocalTitle")}</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t("whyLocal1Title")}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t("whyLocal1Desc")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t("whyLocal2Title")}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t("whyLocal2Desc")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t("whyLocal3Title")}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t("whyLocal3Desc")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t("whyLocal4Title")}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t("whyLocal4Desc")}
                            </p>
                        </div>
                    </div>
                </section>

                {/* เปรียบเทียบโหมดการทำงาน */}
                <section className="mt-16 space-y-6">
                    <h2 className="text-2xl font-bold border-b border-border/10 pb-3">{t("compareTitle")}</h2>
                    <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/50">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/50 bg-muted/40">
                                    <th className="p-4 text-sm font-semibold">{t("tableFeature")}</th>
                                    <th className="p-4 text-sm font-semibold text-cyan-500">{t("tableWebgpu")}</th>
                                    <th className="p-4 text-sm font-semibold">{t("tableCanvas")}</th>
                                    <th className="p-4 text-sm font-semibold">{t("tableCloudflare")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 text-sm">
                                <tr>
                                    <td className="p-4 font-medium">{t("tableRowUpload")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableLocalOnly")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableLocalOnly")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableCfUpload")}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-medium">{t("tableRowSuitability")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableWebgpuSuitability")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableCanvasSuitability")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableCfSuitability")}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-medium">{t("tableRowSpeed")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableWebgpuSpeed")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableCanvasSpeed")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableCfSpeed")}</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-medium">{t("tableRowRequirements")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableWebgpuReq")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableCanvasReq")}</td>
                                    <td className="p-4 text-muted-foreground">{t("tableCfReq")}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ขั้นตอนการใช้งานและวิธีลบพื้นหลังให้เนียนที่สุด */}
                <section className="mt-16 space-y-6">
                    <h2 className="text-2xl font-bold border-b border-border/10 pb-3">{t("stepsTitle")}</h2>
                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full flex items-center justify-center font-bold text-3xl text-cyan-500/10">1</div>
                            <h3 className="font-semibold text-foreground">{t("step1Title")}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t("step1Desc")}
                            </p>
                        </div>
                        <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full flex items-center justify-center font-bold text-3xl text-cyan-500/10">2</div>
                            <h3 className="font-semibold text-foreground">{t("step2Title")}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t("step2Desc")}
                            </p>
                        </div>
                        <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full flex items-center justify-center font-bold text-3xl text-cyan-500/10">3</div>
                            <h3 className="font-semibold text-foreground">{t("step3Title")}</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t("step3Desc")}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mt-16 space-y-4">
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-cyan-500" />
                        <h2 className="text-2xl font-bold">{t("faqTitle")}</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {FAQ_KEYS.map((item) => (
                            <Card key={item.questionKey} className="p-5 border-border/50 bg-card/80">
                                <h3 className="font-semibold mb-2">{t(item.questionKey)}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{t(item.answerKey)}</p>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

function PreviewPanel({
    title,
    imageUrl,
    emptyLabel,
    checkerboard = false,
}: {
    title: string;
    imageUrl?: string;
    emptyLabel: string;
    checkerboard?: boolean;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
                {checkerboard && <Badge variant="outline" className="text-[10px]">Transparent</Badge>}
            </div>
            <div
                className={`aspect-square rounded-lg border border-border/50 overflow-hidden flex items-center justify-center ${checkerboard ? "checkerboard-bg" : "bg-muted/30"}`}
            >
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={title} className="h-full w-full object-contain" />
                ) : (
                    <div className="text-center text-muted-foreground p-6">
                        <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">{emptyLabel}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
