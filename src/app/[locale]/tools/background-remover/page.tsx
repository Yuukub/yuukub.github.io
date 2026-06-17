"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import Script from "next/script";
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

const FAQ_ITEMS = [
    {
        question: "ลบพื้นหลังรูปด้วยเครื่องมือนี้ปลอดภัยไหม?",
        answer: "ปลอดภัยแน่นอนครับ เพราะระบบเริ่มต้นทำงานแบบ local-first รูปภาพของคุณจะได้รับการประมวลผลภายในเบราว์เซอร์ของอุปกรณ์คุณเองโดยไม่ผ่านเซิร์ฟเวอร์ใดๆ (กรณีใช้ WebGPU AI หรือ Canvas Heuristics) ยกเว้นเมื่อคุณเลือกโหมด Cloudflare AI Fallback ระบบจะส่งรูปภาพไปประมวลผลแบบเข้ารหัสที่เซิร์ฟเวอร์ปลายทางของ Cloudflare เพื่อช่วยตัดพื้นหลัง และจะไม่มีการบันทึกภาพถ่ายนั้นลงเซิร์ฟเวอร์เป็นการถาวร",
    },
    {
        question: "ทำไมการประมวลผลครั้งแรกถึงใช้เวลานาน?",
        answer: "เมื่อเริ่มต้นใช้งานโหมด WebGPU AI เป็นครั้งแรก ระบบจำเป็นต้องดาวน์โหลดไฟล์โมเดลประมวลผลภาษาภาพ (BiRefNet-lite) จากทาง Hugging Face ขนาดประมาณ 114MB สำหรับเครื่องที่รับ float16 หรือประมาณ 224MB สำหรับ float32 ซึ่งจะดาวน์โหลดเพียงแค่ครั้งเดียวเท่านั้น หลังจากนั้น ตัวโมเดลจะถูกบันทึกเก็บไว้ในระบบเบราว์เซอร์แคชของเครื่อง ทำให้การใช้งานครั้งต่อไปรันต่อได้ทันทีโดยไม่ต้องรอโหลดซ้ำ",
    },
    {
        question: "หากอุปกรณ์หรือเว็บเบราว์เซอร์ไม่รองรับ WebGPU จะทำอย่างไร?",
        answer: "ไม่มีปัญหาครับ ระบบถูกออกแบบมาให้มีเอนจินสำรองพร้อมใช้งานทันที โดยจะตรวจจับให้อัตโนมัติและสลับไปใช้ Canvas Heuristics เพื่อลบพื้นหลังแบบสีพื้นเรียบในพริบตา หรือผู้ใช้สามารถเลือกใช้ Cloudflare AI Fallback ในการลบภาพซับซ้อน ซึ่งระบบนี้ต้องการการยืนยัน Turnstile ก่อนทำงานเพื่อป้องกันการโจมตีจากบอทภายนอก",
    },
    {
        question: "ไฟล์รูปภาพผลลัพธ์ที่ได้มีลักษณะเป็นอย่างไร?",
        answer: "รูปภาพที่ลบพื้นหลังสำเร็จสามารถเลือกดาวน์โหลดได้ทั้งแบบไฟล์ PNG ที่โปร่งใสและรักษาความละเอียดดั้งเดิมของกล้องไว้แบบ 100% เหมาะสำหรับนำไปตัดต่อต่อ หรือเลือกดาวน์โหลดไฟล์ WebP โปร่งใสที่มีการบีบอัดให้ขนาดไฟล์เล็กลงมากโดยยังคงรายละเอียดที่คมชัด เหมาะสำหรับนำไปโพสต์ขึ้นหน้าเว็บหรือโซเชียลมีเดีย",
    },
    {
        question: "โควต้าของ Cloudflare AI Fallback มีการจัดการอย่างไร?",
        answer: "เพื่อประหยัดทรัพยากรการส่งรูป ระบบจะเรียกใช้ API ของ Cloudflare เพียง 1 ครั้งต่อรูปภาพนั้นๆ เพื่อรับผลลัพธ์ PNG กลับมา จากนั้นการแปลงเป็นไฟล์ WebP จะเกิดขึ้นบนเบราว์เซอร์ของตัวเครื่องโดยตรง และปุ่มเรียกใช้ Cloudflare สำหรับรูปเดิมจะถูกปิดใช้งานทันทีหลังทำสำเร็จ เพื่อหลีกเลี่ยงการยิงคำสั่งซ้ำซ้อนโดยไม่จำเป็น",
    },
    {
        question: "ขนาดไฟล์และมิติของรูปภาพที่เหมาะสมกับการใช้งานคือเท่าไหร่?",
        answer: "หน้าเว็บของเรารองรับรูปภาพขนาดใหญ่สุดได้ถึง 32 Megapixel อย่างไรก็ตาม เพื่อประสิทธิภาพที่ดีที่สุดและป้องกันการขาดแคลนหน่วยความจำ (Out of Memory) ในเบราว์เซอร์ขณะรัน AI บนการ์ดจอ ขอแนะนำให้เลือกใช้รูปที่มีขนาดไฟล์ทั่วไปไม่เกิน 15-20MB",
    },
    {
        question: "สามารถใช้งานระบบตัดพื้นหลังตอนที่ไม่มีอินเทอร์เน็ตได้หรือไม่?",
        answer: "ได้เลยครับ! หากอุปกรณ์ของคุณเคยผ่านขั้นตอนการโหลดโมเดล AI (WebGPU) สำเร็จมาก่อนหน้านั้นแล้ว ตัวโมเดลจะถูกดึงไปเก็บใน Cache Storage ของตัวเครื่อง คุณจึงสามารถลากรูปภาพมาลบพื้นหลังแบบออฟไลน์ได้ 100% โดยไม่จำเป็นต้องเชื่อมต่อเครือข่ายอินเทอร์เน็ตใดๆ",
    },
    {
        question: "กรณีที่ต้องการลบโมเดล AI ออกจากอุปกรณ์ ต้องทำอย่างไร?",
        answer: "หากคุณกังวลเรื่องพื้นที่จัดเก็บข้อมูลในเครื่องและต้องการนำโมเดลออก สามารถทำได้ง่ายๆ โดยการล้างแคชของเบราว์เซอร์ (Clear Browser Cache) สำหรับโดเมน yuukub.com หรือเข้าไปที่หน้าต่างเครื่องมือผู้พัฒนาเว็บ (Developer Tools) ไปที่แท็บ Application -> Storage แล้วกดปุ่ม Clear site data ได้ทันที",
    },
];

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

async function convertBlobToWebp(blob: Blob): Promise<Blob> {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        bitmap.close();
        throw new Error("เบราว์เซอร์ไม่รองรับ Canvas สำหรับสร้าง WebP");
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (webpBlob) => {
                if (webpBlob) resolve(webpBlob);
                else reject(new Error("ไม่สามารถสร้างไฟล์ WebP ได้"));
            },
            "image/webp",
            0.92,
        );
    });
}

export default function BackgroundRemoverPage() {
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
    }, [cloudflareResultFileKey, image, resetTurnstile, revokeResult, status, turnstileToken]);

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
            ? "Canvas fallback"
            : engine === "cloudflare"
                ? "Cloudflare AI"
                : "Auto engine";

    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                name: "AI Background Remover",
                url: "https://yuukub.com/tools/background-remover/",
                applicationCategory: "MultimediaApplication",
                operatingSystem: "Any",
                inLanguage: "th-TH",
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                },
                featureList: [
                    "ลบพื้นหลังรูป JPG, PNG และ WebP",
                    "ส่งออก PNG และ WebP โปร่งใสเต็มความละเอียด",
                    "ประมวลผลแบบ local-first ด้วย WebGPU และ Canvas fallback",
                    "Cloudflare AI fallback พร้อม Turnstile เมื่อจำเป็น",
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
                mainEntity: FAQ_ITEMS.map((item) => ({
                    "@type": "Question",
                    name: item.question,
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: item.answer,
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
                            <ArrowLeft className="h-4 w-4" /> กลับไป Tools
                        </Link>
                    </Button>
                    <Badge variant="outline" className="gap-1.5 border-cyan-500/30 text-cyan-600">
                        <Sparkles className="h-3.5 w-3.5" /> AI ในเบราว์เซอร์
                    </Badge>
                </div>

                <section className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="w-fit gap-1.5">
                                <Eraser className="h-3.5 w-3.5" /> Background Remover
                            </Badge>
                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                                ลบพื้นหลังรูปเป็น PNG โปร่งใส
                            </h1>
                            <p className="text-muted-foreground leading-relaxed">
                                ใช้ AI แยกวัตถุออกจากพื้นหลังแบบ local-first รองรับ WebGPU เพื่อความเร็วสูง มี Canvas fallback สำหรับภาพพื้นหลังเรียบ และมี Cloudflare AI fallback พร้อม Turnstile เมื่อเครื่องไม่รองรับ
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
                                        {image ? image.name : "ลากรูปมาวาง หรือคลิกเพื่อเลือกรูป"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        JPG, PNG, WebP สูงสุด 32MP • ผลลัพธ์เป็น PNG โปร่งใส
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
                                        <Loader2 className="h-4 w-4 animate-spin" /> กำลังลบพื้นหลัง
                                    </>
                                ) : (
                                    <>
                                        <Eraser className="h-4 w-4" /> ลบพื้นหลัง
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
                                    {hasCloudflareResultForCurrentImage ? "ใช้ Cloudflare แล้ว" : "ใช้ Cloudflare AI fallback"}
                                </Button>
                            )}
                        </div>

                        {hasCloudflareFallback && (
                            <Card className="p-4 border-cyan-500/20 bg-cyan-500/5 space-y-2">
                                <div className="flex items-start gap-2">
                                    <Shield className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold">Cloudflare fallback Turnstile</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            ยืนยัน Turnstile ก่อนส่งรูปไป Cloudflare เพื่อกันการเรียก Worker จากภายนอกและช่วยประหยัดโควต้า Images
                                        </p>
                                    </div>
                                </div>
                                {hasTurnstile ? (
                                    <div ref={turnstileRef} className="min-h-[65px]" />
                                ) : (
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                                        กำลังรอ deploy ค่า Turnstile site key รอบล่าสุดก่อนเปิด Cloudflare fallback
                                    </div>
                                )}
                                {turnstileMessage && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300">{turnstileMessage}</p>
                                )}
                            </Card>
                        )}

                        <Card className="p-4 border-border/50 bg-muted/20 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Zap className="h-4 w-4 text-cyan-500 shrink-0" />
                                    <p className="text-sm font-semibold truncate">{message}</p>
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
                                    WebGPU AI ~114-224MB • Canvas fallback
                                    {hasCloudflareFallback ? " • Cloudflare optional" : ""}
                                </span>
                            </div>
                            {fallbackMessage && (
                                <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <span>{fallbackMessage}</span>
                                </div>
                            )}
                            {error && (
                                <div className="space-y-3 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex gap-2">
                                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
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
                                            {hasCloudflareResultForCurrentImage ? "ใช้ Cloudflare แล้ว" : "ลองใช้ Cloudflare AI fallback"}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={clearImage}>
                                <Trash2 className="h-4 w-4" /> ล้างรูป
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
                            <PreviewPanel title="Before" imageUrl={image?.previewUrl} emptyLabel="รูปต้นฉบับ" />
                            <PreviewPanel title="After" imageUrl={resultUrl || undefined} emptyLabel="PNG โปร่งใส" checkerboard />
                        </div>

                        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex gap-3">
                            <Shield className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">Privacy-first processing</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    ค่าเริ่มต้นรูปจะอยู่ในเบราว์เซอร์ของคุณเท่านั้นผ่าน Transformers.js/WebGPU หรือ Canvas fallback ส่วน Cloudflare AI fallback จะอัปโหลดรูปไป Cloudflare เฉพาะเมื่อคุณกดเลือกใช้งานและผ่าน Turnstile
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
                        { title: "Local-first AI", desc: "ใช้ BiRefNet lite ผ่าน Transformers.js/WebGPU เป็นหลัก และไม่อัปโหลดรูปในโหมด local" },
                        { title: "PNG และ WebP", desc: "คืนค่าไฟล์โปร่งใสเต็มความละเอียดเดิม ดาวน์โหลดได้ทั้ง PNG และ WebP โดย WebP แปลงในเบราว์เซอร์" },
                        { title: "Protected fallback", desc: "Cloudflare AI fallback ต้องผ่าน Turnstile และปิดปุ่มหลังประมวลผลสำเร็จสำหรับรูปเดิมเพื่อลดการใช้โควต้าซ้ำ" },
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
                    <h2 className="text-2xl font-bold border-b border-border/10 pb-3">ทำไมถึงควรลบพื้นหลังรูปภาพแบบ Local-first?</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">1. ปลอดภัยเรื่องข้อมูลส่วนตัว 100%</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                โดยทั่วไป เว็บไซต์ลบพื้นหลังส่วนใหญ่จะต้องอัปโหลดไฟล์รูปภาพของคุณขึ้นไปประมวลผลบนเซิร์ฟเวอร์ แต่ระบบแบบ Local-first ของเราจะประมวลผลผ่าน Transformers.js ร่วมกับ WebGPU ในเว็บเบราว์เซอร์ของตัวเครื่องโดยตรง ทำให้ไฟล์ภาพถ่ายบุคคล ภาพสินค้า หรือเอกสารสำคัญของคุณจะไม่ถูกส่งออกไปที่ใดเลย มั่นใจได้ในเรื่องความเป็นส่วนตัว
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">2. ใช้งานได้ฟรี ไม่จำกัดจำนวนรูป</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                การรัน AI บนคลาวด์มีค่าเซิร์ฟเวอร์ที่สูงมาก ทำให้บริการลบพื้นหลังมักจะจำกัดจำนวนครั้งที่ใช้ หรือลดความละเอียดภาพลงเหลือแค่ภาพขนาดเล็ก (Low-res) แต่เนื่องจากระบบนี้ใช้กำลังการประมวลผลจากชิป GPU/CPU ในเครื่องคอมพิวเตอร์หรือมือถือของคุณเอง คุณจึงสามารถลบพื้นหลังและดาวน์โหลดรูปโปร่งใสความละเอียดสูงได้แบบไม่จำกัดจำนวนครั้ง
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">3. ประหยัดปริมาณอินเทอร์เน็ต</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                สำหรับการรันผ่าน WebGPU ครั้งแรก ระบบจะดาวน์โหลดโมเดล AI ขนาดเล็ก (BiRefNet-lite) มาเก็บไว้ในเบราว์เซอร์แคชของเครื่อง หลังจากนั้นเมื่อคุณกดลบพื้นหลังในครั้งถัดไป ระบบจะดึงโมเดลมาใช้ได้ทันทีโดยไม่ต้องต่ออินเทอร์เน็ตหรืออัปโหลดรูปภาพขนาดหลายสิบเมกะไบต์ เหมาะมากสำหรับการทำงานขณะใช้อินเทอร์เน็ตมือถือ
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">4. สลับโหมดการประมวลผลได้ยืดหยุ่น</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                หากอุปกรณ์ของคุณไม่มี GPU แยก หรือใช้เบราว์เซอร์รุ่นเก่าที่ไม่รองรับ WebGPU ระบบจะสลับไปใช้ Canvas Fallback สำหรับลบพื้นหลังสีพื้นธรรมดา หรือคุณสามารถกดยืนยันผ่าน Turnstile เพื่อเลือกใช้ Cloudflare Workers AI Fallback ซึ่งช่วยให้เครื่องสเปกต่ำสามารถลบพื้นหลังภาพที่ซับซ้อนได้เช่นกัน
                            </p>
                        </div>
                    </div>
                </section>

                {/* เปรียบเทียบโหมดการทำงาน */}
                <section className="mt-16 space-y-6">
                    <h2 className="text-2xl font-bold border-b border-border/10 pb-3">เปรียบเทียบโหมดการทำงานของเครื่องมือ</h2>
                    <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/50">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/50 bg-muted/40">
                                    <th className="p-4 text-sm font-semibold">คุณสมบัติ</th>
                                    <th className="p-4 text-sm font-semibold text-cyan-500">WebGPU AI (แนะนำ)</th>
                                    <th className="p-4 text-sm font-semibold">Canvas Heuristics</th>
                                    <th className="p-4 text-sm font-semibold">Cloudflare AI Fallback</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 text-sm">
                                <tr>
                                    <td className="p-4 font-medium">การอัปโหลดรูป</td>
                                    <td className="p-4 text-muted-foreground">ทำงานในเครื่อง 100% ไม่มีการอัปโหลด</td>
                                    <td className="p-4 text-muted-foreground">ทำงานในเครื่อง 100% ไม่มีการอัปโหลด</td>
                                    <td className="p-4 text-muted-foreground">ส่งรูปไปประมวลผลในเมมโมรี่ของ Cloudflare (ไม่มีการบันทึกถาวร)</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-medium">ความเหมาะของรูป</td>
                                    <td className="p-4 text-muted-foreground">ภาพคน สัตว์ สิ่งของ ที่มีขอบหยักซับซ้อน</td>
                                    <td className="p-4 text-muted-foreground">โลโก้ ไอคอน หรือภาพที่มีสีพื้นหลังตัดกันชัดเจน</td>
                                    <td className="p-4 text-muted-foreground">ภาพทุกประเภท (เหมาะเมื่อเครื่องไม่รองรับ WebGPU)</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-medium">ความเร็วในการทำงาน</td>
                                    <td className="p-4 text-muted-foreground">เร็วมาก (ขึ้นอยู่กับความแรงของ GPU เครื่อง)</td>
                                    <td className="p-4 text-muted-foreground">รวดเร็วทันทีภายในไม่กี่มิลลิวินาที</td>
                                    <td className="p-4 text-muted-foreground">ปานกลาง (ขึ้นอยู่กับความเร็วอินเทอร์เน็ตในการส่งรูป)</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-medium">ข้อกำหนดของอุปกรณ์</td>
                                    <td className="p-4 text-muted-foreground">ต้องการการ์ดจอ และเบราว์เซอร์รองรับ WebGPU</td>
                                    <td className="p-4 text-muted-foreground">รองรับทุกอุปกรณ์และทุกเบราว์เซอร์</td>
                                    <td className="p-4 text-muted-foreground">ต้องการการเชื่อมต่ออินเทอร์เน็ตและยืนยัน Turnstile</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ขั้นตอนการใช้งานและวิธีลบพื้นหลังให้เนียนที่สุด */}
                <section className="mt-16 space-y-6">
                    <h2 className="text-2xl font-bold border-b border-border/10 pb-3">ขั้นตอนการใช้งานและเคล็ดลับเพื่อผลลัพธ์ที่ดีที่สุด</h2>
                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full flex items-center justify-center font-bold text-3xl text-cyan-500/10">1</div>
                            <h3 className="font-semibold text-foreground">เตรียมรูปภาพ</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                เลือกรูปภาพที่มีแสงสว่างเพียงพอ และจุดที่ต้องการตัดมีความต่างของสีกับพื้นหลังอย่างชัดเจน หากใช้โหมด WebGPU AI ระบบสามารถช่วยแยกเส้นผม ขนสัตว์ หรือขอบวัตถุที่มีความฟุ้งได้ค่อนข้างเป็นธรรมชาติ
                            </p>
                        </div>
                        <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full flex items-center justify-center font-bold text-3xl text-cyan-500/10">2</div>
                            <h3 className="font-semibold text-foreground">เลือกเอนจินประมวลผล</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                ระบบจะตรวจสเปกและเลือกเอนจินที่ดีที่สุดให้อัตโนมัติ หากรูปเป็นโลโก้ฉากหลังสีขาวล้วน แนะนำให้กดเลือกโหมด Canvas Heuristics เพื่อความรวดเร็ว แต่หากเป็นรูปถ่ายทั่วไป แนะนำให้ใช้ WebGPU AI หรือ Cloudflare AI
                            </p>
                        </div>
                        <div className="space-y-3 p-5 rounded-xl border border-border/50 bg-muted/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-cyan-500/5 rounded-bl-full flex items-center justify-center font-bold text-3xl text-cyan-500/10">3</div>
                            <h3 className="font-semibold text-foreground">บันทึกรูปและนำไปใช้</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                คุณสามารถกดดาวน์โหลดผลลัพธ์ได้ทั้งไฟล์ PNG ความละเอียดต้นฉบับสำหรับการทำงานกราฟิกต่อ หรือเลือกดาวน์โหลดไฟล์ WebP โปร่งใสที่ประมวลผลบีบอัดขนาดไฟล์ลงมา เพื่อช่วยให้โหลดบนเว็บไซต์ได้รวดเร็วยิ่งขึ้น
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mt-16 space-y-4">
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-cyan-500" />
                        <h2 className="text-2xl font-bold">คำถามที่พบบ่อย</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {FAQ_ITEMS.map((item) => (
                            <Card key={item.question} className="p-5 border-border/50 bg-card/80">
                                <h3 className="font-semibold mb-2">{item.question}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
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
