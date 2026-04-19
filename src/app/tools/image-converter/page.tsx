"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ImageIcon,
    ArrowLeft,
    Upload,
    Download,
    Loader2,
    Trash2,
    CheckCircle2,
    XCircle,
    ArrowRight,
    PackageOpen,
    FileImage,
    Shield,
    Clock,
    Info,
    Layers,
    HelpCircle,
} from "lucide-react";
import { AdUnit } from "@/components/ad-unit";
import Link from "next/link";

/* ─── SEO Data ─────────────────────────────────────────────── */

const FAQ_ITEMS = [
    {
        question: "แปลงรูปภาพด้วยเครื่องมือนี้ปลอดภัยไหม?",
        answer: "ปลอดภัย 100% เพราะไฟล์ทั้งหมดถูกประมวลผลด้วย WebAssembly ภายในเบราว์เซอร์ของคุณเท่านั้น ไม่มีการส่งไฟล์ไปยังเซิร์ฟเวอร์ใดๆ ทั้งสิ้น รูปภาพส่วนตัวหรือเอกสารลับของคุณจึงไม่มีทางรั่วไหลออกไปได้เลย",
    },
    {
        question: "รองรับไฟล์ขนาดใหญ่แค่ไหน?",
        answer: "ขึ้นอยู่กับ RAM ของอุปกรณ์คุณ โดยทั่วไปรองรับไฟล์ได้ถึงหลายสิบ MB ต่อไฟล์ และสามารถแปลงหลายไฟล์พร้อมกันในคิวเดียวได้โดยไม่จำกัดจำนวน แนะนำให้แปลงทีละ 10–20 ไฟล์เพื่อประสิทธิภาพสูงสุด",
    },
    {
        question: "ทำไม WebP ถึงดีกว่า JPEG สำหรับเว็บไซต์?",
        answer: "WebP ให้คุณภาพใกล้เคียงกันแต่ขนาดไฟล์เล็กกว่า JPEG ถึง 25–34% เฉลี่ย ทำให้เว็บโหลดเร็วขึ้น ลด Bandwidth และช่วย Core Web Vitals (LCP) ซึ่งส่งผลดีต่อ SEO โดยตรง รองรับโดยเบราว์เซอร์สมัยใหม่ทุกตัว",
    },
    {
        question: "AVIF กับ WebP ต่างกันอย่างไร?",
        answer: "AVIF เป็น format ใหม่กว่าที่บีบอัดได้ดีกว่า WebP อีก 20–50% แต่ใช้เวลาในการ encode นานกว่า เหมาะสำหรับเว็บไซต์ที่ต้องการประสิทธิภาพสูงสุด WebP ยังเป็นตัวเลือกที่ดีกว่าถ้าต้องการความเร็วในการแปลงและ browser support ที่กว้างกว่า",
    },
    {
        question: "สามารถแปลงไฟล์ format เดิมซ้ำเพื่อ compress ใหม่ได้ไหม?",
        answer: "ได้ครับ เครื่องมือนี้รองรับการแปลง PNG → PNG หรือ WebP → WebP เพื่อบีบอัดไฟล์ใหม่ด้วยค่า Quality ที่คุณตั้งเอง ซึ่งมีประโยชน์มากเมื่อต้องการลดขนาดไฟล์โดยไม่เปลี่ยน format",
    },
];

const FORMAT_COMPARISON = [
    { format: "JPEG", size: "เล็ก", transparency: "ไม่รองรับ", quality: "ดี (lossy)", support: "ทุก browser", color: "blue" },
    { format: "PNG", size: "ใหญ่", transparency: "รองรับ", quality: "สูงสุด (lossless)", support: "ทุก browser", color: "purple" },
    { format: "WebP", size: "เล็กมาก", transparency: "รองรับ", quality: "ดีมาก", support: "Modern browsers", color: "orange" },
    { format: "AVIF", size: "เล็กที่สุด", transparency: "รองรับ", quality: "ดีมาก", support: "Chrome/Firefox/Safari", color: "emerald" },
];

const USE_CASES = [
    {
        format: "WebP",
        color: "orange",
        borderColor: "border-l-orange-500",
        title: "เว็บไซต์ทั่วไป",
        desc: "เหมาะสำหรับรูปภาพบนเว็บไซต์ทุกประเภท ให้ขนาดไฟล์เล็กกว่า JPEG ถึง 30% โดยที่คุณภาพแทบไม่ต่างกัน ช่วยให้เว็บโหลดเร็วขึ้นและ SEO ดีขึ้น รองรับโดยเบราว์เซอร์สมัยใหม่ทุกตัว",
    },
    {
        format: "AVIF",
        color: "emerald",
        borderColor: "border-l-emerald-500",
        title: "เว็บประสิทธิภาพสูง",
        desc: "เหมาะสำหรับเว็บที่ต้องการ Core Web Vitals ระดับสูง เช่น e-commerce หรือ landing page ที่ทุก millisecond สำคัญ บีบอัดได้ดีที่สุดในกลุ่ม แต่ encode ช้ากว่า WebP",
    },
    {
        format: "PNG",
        color: "purple",
        borderColor: "border-l-purple-500",
        title: "งานกราฟิกและโลโก้",
        desc: "เหมาะสำหรับภาพที่ต้องการพื้นหลังโปร่งใส (transparency) เช่น โลโก้ ไอคอน และ UI elements ให้คุณภาพ lossless สูงสุด แต่ขนาดไฟล์จะใหญ่กว่า format อื่น",
    },
    {
        format: "JPEG",
        color: "blue",
        borderColor: "border-l-blue-500",
        title: "ภาพถ่ายและ CMS เก่า",
        desc: "เหมาะสำหรับภาพถ่ายที่ต้องส่งให้ระบบ CMS เก่าหรือแพลตฟอร์มที่รองรับแค่ JPG รองรับโดยทุก device และ browser ทำให้เป็นตัวเลือกที่ปลอดภัยที่สุดในด้าน compatibility",
    },
];

/* ─── Types ────────────────────────────────────────────────── */

type ImageFormat = "jpeg" | "png" | "webp" | "avif";
type FileStatus = "waiting" | "processing" | "done" | "error";

interface QueueItem {
    id: string;
    file: File;
    name: string;
    inputFormat: ImageFormat;
    originalSize: number;
    status: FileStatus;
    progress?: string;
    convertedBlob?: Blob;
    convertedSize?: number;
    previewUrl?: string; // Add preview URL
    errorMessage?: string;
}

/* ─── Helpers ──────────────────────────────────────────────── */

function detectFormat(file: File): ImageFormat | null {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const mime = file.type.toLowerCase();

    if (mime === "image/jpeg" || ext === "jpg" || ext === "jpeg") return "jpeg";
    if (mime === "image/png" || ext === "png") return "png";
    if (mime === "image/webp" || ext === "webp") return "webp";
    if (mime === "image/avif" || ext === "avif") return "avif";
    return null;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getExtension(format: ImageFormat): string {
    return format === "jpeg" ? "jpg" : format;
}

function uid(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ─── Component ────────────────────────────────────────────── */

export default function ImageConverterPage() {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [outputFormat, setOutputFormat] = useState<ImageFormat>("webp");
    const [quality, setQuality] = useState(75);
    const [effort, setEffort] = useState(4);
    const [isConverting, setIsConverting] = useState(false);
    const [convertedCount, setConvertedCount] = useState(0);
    const [dragActive, setDragActive] = useState(false);

    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize worker
    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    /* ── File handling ─────────────────────────────────────── */

    const addFiles = useCallback((files: FileList | File[]) => {
        const items: QueueItem[] = [];
        for (const file of Array.from(files)) {
            const format = detectFormat(file);
            if (!format) continue;
            items.push({
                id: uid(),
                file,
                name: file.name,
                inputFormat: format,
                originalSize: file.size,
                status: "waiting",
                previewUrl: URL.createObjectURL(file), // Create preview URL
            });
        }
        setQueue((prev) => [...prev, ...items]);
    }, []);

    const removeItem = (id: string) => {
        setQueue((prev) => {
            const item = prev.find(i => i.id === id);
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
            return prev.filter((i) => i.id !== id);
        });
    };

    const clearAll = () => {
        queue.forEach(item => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        setQueue([]);
        setConvertedCount(0);
    };

    /* ── Drag & Drop ───────────────────────────────────────── */

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (e.dataTransfer.files?.length) {
                addFiles(e.dataTransfer.files);
            }
        },
        [addFiles]
    );

    /* ── Conversion ────────────────────────────────────────── */

    const convertAll = async () => {
        if (queue.length === 0) return;
        setIsConverting(true);
        setConvertedCount(0);

        // Reset statuses
        setQueue((prev) =>
            prev.map((item) => ({
                ...item,
                status: "waiting" as FileStatus,
                convertedBlob: undefined,
                convertedSize: undefined,
                errorMessage: undefined,
                progress: undefined,
            }))
        );

        // Create a fresh worker for each batch with module type support
        const worker = new Worker(
            new URL("@/workers/image.worker.ts", import.meta.url),
            { type: "module" }
        );
        workerRef.current = worker;

        let completed = 0;

        // Process files sequentially via the worker
        for (const item of queue) {
            // Set processing
            setQueue((prev) =>
                prev.map((q) =>
                    q.id === item.id
                        ? { ...q, status: "processing" as FileStatus, progress: "เตรียมพร้อม..." }
                        : q
                )
            );

            // Read file as ArrayBuffer
            const buffer = await item.file.arrayBuffer();

            // Send to worker and wait for result
            await new Promise<void>((resolve) => {
                worker.onmessage = (e: MessageEvent) => {
                    const msg = e.data;

                    if (msg.id !== item.id) return;

                    if (msg.type === "progress") {
                        setQueue((prev) =>
                            prev.map((q) =>
                                q.id === item.id
                                    ? { ...q, progress: msg.message }
                                    : q
                            )
                        );
                    } else if (msg.type === "result") {
                        setQueue((prev) =>
                            prev.map((q) =>
                                q.id === item.id
                                    ? {
                                        ...q,
                                        status: "done" as FileStatus,
                                        convertedBlob: msg.blob,
                                        convertedSize: msg.newSize,
                                    }
                                    : q
                            )
                        );
                        completed++;
                        setConvertedCount(completed);
                        resolve();
                    } else if (msg.type === "error") {
                        setQueue((prev) =>
                            prev.map((q) =>
                                q.id === item.id
                                    ? {
                                        ...q,
                                        status: "error" as FileStatus,
                                        errorMessage: msg.message,
                                    }
                                    : q
                            )
                        );
                        completed++;
                        setConvertedCount(completed);
                        resolve();
                    }
                };

                worker.onerror = (err) => {
                    console.error("Worker error:", err);
                    setQueue((prev) =>
                        prev.map((q) =>
                            q.id === item.id
                                ? {
                                    ...q,
                                    status: "error" as FileStatus,
                                    errorMessage: "Worker error: " + (err.message || "เกิดข้อผิดพลาดในการโหลดโมดูล"),
                                }
                                : q
                        )
                    );
                    completed++;
                    setConvertedCount(completed);
                    resolve();
                };

                worker.postMessage({
                    type: "encode",
                    id: item.id,
                    imageBuffer: buffer,
                    inputFormat: item.inputFormat,
                    outputFormat,
                    quality,
                    effort,
                });
            });
        }

        setIsConverting(false);
    };

    /* ── Download helpers ──────────────────────────────────── */

    const downloadSingle = (item: QueueItem) => {
        if (!item.convertedBlob) return;
        const baseName = item.name.replace(/\.[^.]+$/, "");
        const ext = getExtension(outputFormat);
        const url = URL.createObjectURL(item.convertedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadAll = async () => {
        const doneItems = queue.filter(
            (item) => item.status === "done" && item.convertedBlob
        );
        if (doneItems.length === 0) return;

        if (doneItems.length === 1) {
            downloadSingle(doneItems[0]);
            return;
        }

        // Dynamic import fflate for ZIP
        const { zipSync, strToU8 } = await import("fflate");

        const files: Record<string, Uint8Array> = {};
        for (const item of doneItems) {
            const baseName = item.name.replace(/\.[^.]+$/, "");
            const ext = getExtension(outputFormat);
            const arrayBuffer = await item.convertedBlob!.arrayBuffer();
            files[`${baseName}.${ext}`] = new Uint8Array(arrayBuffer);
        }

        const zipped = zipSync(files);
        const blob = new Blob([zipped as any], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Current time in HH.mm format
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const timeStr = `${hours}.${minutes}`;

        a.download = `converted-images-${timeStr}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── Derived state ─────────────────────────────────────── */

    const doneCount = queue.filter((q) => q.status === "done").length;
    const hasResults = doneCount > 0;
    const allDone = !isConverting && queue.length > 0 && convertedCount === queue.length;
    const formatOptions: { value: ImageFormat; label: string }[] = [
        { value: "webp", label: "WebP" },
        { value: "avif", label: "AVIF" },
        { value: "png", label: "PNG" },
        { value: "jpeg", label: "JPG" },
    ];

    /* ── Render ─────────────────────────────────────────────── */

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer,
            },
        })),
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-3xl">
                {/* Header */}
                <div className="mb-10">
                    <Link
                        href="/tools"
                        className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" /> กลับไปที่เครื่องมือ
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-orange-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Image Converter
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        แปลงรูป JPG, PNG, WebP, AVIF ไปมาได้อย่างอิสระ
                        รองรับหลายไฟล์ ประมวลผลในเครื่องคุณ 100%
                    </p>
                </div>

                <div className="grid gap-6">
                    {/* Drop Zone */}
                    <Card
                        className={`border-2 border-dashed transition-all duration-300 overflow-hidden cursor-pointer ${dragActive
                            ? "border-orange-500 bg-orange-500/5 scale-[1.01]"
                            : "border-border/50 bg-muted/20 hover:border-orange-500/30"
                            }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-4">
                            <div
                                className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all ${dragActive
                                    ? "bg-orange-500/20 scale-110"
                                    : "bg-orange-500/10"
                                    }`}
                            >
                                <Upload
                                    className={`h-8 w-8 transition-colors ${dragActive
                                        ? "text-orange-500"
                                        : "text-orange-500/70"
                                        }`}
                                />
                            </div>
                            <div>
                                <p className="font-semibold text-lg">
                                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    รองรับ JPG, PNG, WebP, AVIF •
                                    เลือกได้หลายไฟล์พร้อมกัน
                                </p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.length) {
                                    addFiles(e.target.files);
                                    e.target.value = "";
                                }
                            }}
                        />
                    </Card>

                    {/* Settings */}
                    {queue.length > 0 && (
                        <Card className="p-6 border-border/50 bg-card animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                ตั้งค่าการแปลง (Settings)
                            </h3>
                            <div className="space-y-6">
                                {/* Output Format */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Output Format</label>
                                        <Badge variant="outline" className="text-muted-foreground border-border/50 text-[10px] py-0 h-5">
                                            Standard Speed
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {formatOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() =>
                                                    setOutputFormat(opt.value)
                                                }
                                                disabled={isConverting}
                                                className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition-all ${outputFormat === opt.value
                                                    ? "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400 shadow-sm"
                                                    : "border-border/50 text-muted-foreground hover:border-orange-500/20 hover:bg-muted/50"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Quality Slider */}
                                {(outputFormat === "webp" ||
                                    outputFormat === "avif" ||
                                    outputFormat === "jpeg") && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium">
                                                    คุณภาพ (Quality):{" "}
                                                    <span className="text-orange-500 font-bold text-lg ml-1">
                                                        {quality}
                                                    </span>
                                                </label>
                                                <span className="text-xs text-muted-foreground">
                                                    0 = เล็กที่สุด • 100 =
                                                    คุณภาพสูงสุด
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={quality}
                                                disabled={isConverting}
                                                onChange={(e) =>
                                                    setQuality(
                                                        parseInt(e.target.value)
                                                    )
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-orange-500"
                                            />
                                        </div>
                                    )}

                                {/* Effort Slider */}
                                {(outputFormat === "avif" ||
                                    outputFormat === "webp") && (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium">
                                                    Effort:{" "}
                                                    <span className="text-orange-500 font-bold text-lg ml-1">
                                                        {effort}
                                                    </span>
                                                </label>
                                                <span className="text-xs text-muted-foreground font-medium">
                                                    1 = เร็วที่สุด • 9 = ขนาดเล็กที่สุด
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="9"
                                                value={effort}
                                                disabled={isConverting}
                                                onChange={(e) =>
                                                    setEffort(
                                                        parseInt(e.target.value)
                                                    )
                                                }
                                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-orange-500"
                                            />
                                        </div>
                                    )}
                            </div>
                        </Card>
                    )}

                    {/* File Queue */}
                    {queue.length > 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <FileImage className="h-4 w-4" />
                                    รายการไฟล์ ({queue.length})
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAll}
                                    disabled={isConverting}
                                    className="text-xs text-muted-foreground hover:text-red-500"
                                >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    ล้างทั้งหมด
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {queue.map((item) => (
                                    <Card
                                        key={item.id}
                                        className={`p-4 border-border/50 transition-all ${item.status === "done"
                                            ? "bg-emerald-500/[0.03] border-emerald-500/20"
                                            : item.status === "error"
                                                ? "bg-red-500/[0.03] border-red-500/20"
                                                : item.status === "processing"
                                                    ? "bg-orange-500/[0.03] border-orange-500/20"
                                                    : "bg-card"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Status Icon */}
                                            <div className="shrink-0">
                                                {item.status === "waiting" && (
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                {item.status ===
                                                    "processing" && (
                                                        <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                                                    )}
                                                {item.status === "done" && (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                )}
                                                {item.status === "error" && (
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                )}
                                            </div>

                                            {/* Thumbnail Preview */}
                                            <div className="shrink-0 h-10 w-10 rounded overflow-hidden bg-muted border border-border/50">
                                                {item.previewUrl ? (
                                                    <img
                                                        src={item.previewUrl}
                                                        alt="preview"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        <FileImage className="h-4 w-4 text-muted-foreground/30" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* File info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {item.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatBytes(
                                                            item.originalSize
                                                        )}
                                                    </span>
                                                    {item.status ===
                                                        "processing" &&
                                                        item.progress && (
                                                            <span className="text-xs text-orange-500 font-medium">
                                                                •{" "}
                                                                {item.progress}
                                                            </span>
                                                        )}
                                                    {item.status === "done" &&
                                                        item.convertedSize !=
                                                        null && (
                                                            <>
                                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                    {formatBytes(
                                                                        item.convertedSize
                                                                    )}
                                                                </span>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={`text-[9px] px-1.5 py-0 font-bold ${item.convertedSize <
                                                                        item.originalSize
                                                                        ? "bg-emerald-500/10 text-emerald-600"
                                                                        : "bg-orange-500/10 text-orange-600"
                                                                        }`}
                                                                >
                                                                    {item.convertedSize <
                                                                        item.originalSize
                                                                        ? `-${Math.round(
                                                                            (1 -
                                                                                item.convertedSize /
                                                                                item.originalSize) *
                                                                            100
                                                                        )}%`
                                                                        : `+${Math.round(
                                                                            (item.convertedSize /
                                                                                item.originalSize -
                                                                                1) *
                                                                            100
                                                                        )}%`}
                                                                </Badge>
                                                            </>
                                                        )}
                                                    {item.status === "error" &&
                                                        item.errorMessage && (
                                                            <span className="text-xs text-red-500">
                                                                •{" "}
                                                                {
                                                                    item.errorMessage
                                                                }
                                                            </span>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {item.status === "done" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 gap-1.5 text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-600 transition-all border border-border/50"
                                                        onClick={() =>
                                                            downloadSingle(item)
                                                        }
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Download
                                                    </Button>
                                                )}
                                                {!isConverting && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                        onClick={() =>
                                                            removeItem(item.id)
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {queue.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in duration-300">
                            <Button
                                className="flex-1 h-12 text-base font-bold gap-2 rounded-xl shadow-md hover:shadow-lg transition-all bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={convertAll}
                                disabled={isConverting || queue.length === 0}
                            >
                                {isConverting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        กำลังแปลง {convertedCount}/{queue.length}...
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="h-5 w-5" />
                                        แปลงทั้งหมด ({queue.length} ไฟล์)
                                    </>
                                )}
                            </Button>

                            {allDone && doneCount > 1 && (
                                <Button
                                    variant="outline"
                                    className="h-12 text-base font-bold gap-2 rounded-xl border-orange-500/30 hover:bg-orange-500/5 transition-all"
                                    onClick={downloadAll}
                                >
                                    <PackageOpen className="h-5 w-5" />
                                    Download All (ZIP)
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Progress Bar */}
                    {isConverting && (
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 rounded-full"
                                    style={{
                                        width: `${queue.length > 0
                                            ? (convertedCount /
                                                queue.length) *
                                            100
                                            : 0
                                            }%`,
                                    }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                แปลงแล้ว {convertedCount} จาก {queue.length}{" "}
                                ไฟล์
                            </p>
                        </div>
                    )}

                    {/* Privacy Notice */}
                    <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex gap-3 items-center">
                        <Shield className="h-5 w-5 text-orange-500 shrink-0" />
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                            ปลอดภัย 100%: ไฟล์ทุกไฟล์ถูกประมวลผลภายในเครื่องของคุณเท่านั้นด้วย{" "}
                            <code className="bg-orange-500/10 px-1 rounded text-orange-600 dark:text-orange-400 font-mono">
                                WebAssembly
                            </code>{" "}
                            — ไม่มีการอัปโหลดไปยังเซิร์ฟเวอร์ใดๆ
                        </p>
                    </div>
                </div>

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[250px] mt-16 mb-4 bg-muted/10 rounded-xl py-12 border border-dashed border-muted"
                />

                {/* ─── SEO Content ─────────────────────────────────────── */}
                <div className="mt-4 space-y-12 border-t border-border/20 pt-12">

                    {/* Section 1: ทำไมการแปลงรูปภาพถึงสำคัญ */}
                    <section aria-labelledby="intro-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                <Info className="h-5 w-5 text-orange-500" />
                            </div>
                            <h2 id="intro-heading" className="text-xl font-bold tracking-tight">
                                ทำไมการแปลงรูปภาพถึงสำคัญ?
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                ในยุคที่ความเร็วของเว็บไซต์ส่งผลโดยตรงต่อประสบการณ์ผู้ใช้และอันดับ SEO การเลือก format รูปภาพที่เหมาะสมจึงเป็นสิ่งที่นักพัฒนาและเจ้าของเว็บไซต์ไม่ควรมองข้าม รูปภาพมักเป็นไฟล์ที่ใหญ่ที่สุดในหน้าเว็บ และการเลือก format ผิดอาจทำให้เว็บโหลดช้าลงอย่างมีนัยสำคัญ
                            </p>
                            <p>
                                Format สมัยใหม่อย่าง <strong className="text-foreground">WebP</strong> และ <strong className="text-foreground">AVIF</strong> ถูกออกแบบมาเพื่อแก้ปัญหานี้โดยตรง โดยสามารถลดขนาดไฟล์ได้ถึง 25–50% เมื่อเทียบกับ JPEG หรือ PNG แบบดั้งเดิม โดยที่คุณภาพภาพไม่ได้ลดลงอย่างเห็นได้ชัด ส่งผลให้ค่า Largest Contentful Paint (LCP) ดีขึ้น ซึ่งเป็นหนึ่งใน Core Web Vitals ที่ Google ใช้ในการจัดอันดับเว็บ
                            </p>
                            <p>
                                นอกจากนี้ บางครั้งเราก็จำเป็นต้องแปลง format เพื่อความเข้ากันได้ของระบบ เช่น CMS หรือแพลตฟอร์มบางตัวรองรับเฉพาะ JPEG หรือ PNG เท่านั้น หรือเมื่อต้องการภาพที่มีพื้นหลังโปร่งใส (transparency) ก็จำเป็นต้องใช้ PNG, WebP หรือ AVIF แทน JPEG ที่ไม่รองรับฟีเจอร์นี้
                            </p>
                        </div>
                    </section>

                    {/* Section 2: เปรียบเทียบ Format */}
                    <section aria-labelledby="compare-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Layers className="h-5 w-5 text-blue-500" />
                            </div>
                            <h2 id="compare-heading" className="text-xl font-bold tracking-tight">
                                เปรียบเทียบ: JPEG vs PNG vs WebP vs AVIF
                            </h2>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-border/50">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        {["Format", "ขนาดไฟล์", "Transparency", "คุณภาพ", "Browser Support"].map((h) => (
                                            <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {FORMAT_COMPARISON.map((row) => (
                                        <tr key={row.format} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3 font-bold">
                                                <Badge variant="outline" className="text-[11px]">{row.format}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{row.size}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-medium ${row.transparency === "รองรับ" ? "text-emerald-600" : "text-red-500"}`}>
                                                    {row.transparency}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{row.quality}</td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{row.support}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                            ตารางด้านบนช่วยให้เห็นภาพรวมของแต่ละ format ในการเลือกใช้จริง ควรพิจารณาทั้งขนาดไฟล์ ความต้องการ transparency และ browser ของกลุ่มเป้าหมายประกอบกัน โดยทั่วไป WebP เป็นตัวเลือกที่สมดุลที่สุดสำหรับเว็บไซต์ในปัจจุบัน
                        </p>
                    </section>

                    {/* Section 3: วิธีใช้งาน */}
                    <section aria-labelledby="howto-heading">
                        <h2 id="howto-heading" className="text-xl font-bold tracking-tight mb-6">
                            วิธีใช้งาน Image Converter — 3 ขั้นตอน
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    step: "1",
                                    icon: <Upload className="h-4 w-4 text-orange-500" />,
                                    title: "เลือกไฟล์",
                                    desc: "ลากไฟล์รูปภาพมาวางในกล่อง หรือคลิกเพื่อเปิด file picker เลือกได้หลายไฟล์พร้อมกัน รองรับ JPG, PNG, WebP และ AVIF",
                                },
                                {
                                    step: "2",
                                    icon: <ImageIcon className="h-4 w-4 text-orange-500" />,
                                    title: "ตั้งค่า Format",
                                    desc: "เลือก output format ที่ต้องการ ปรับค่า Quality (0–100) และ Effort เพื่อสมดุลระหว่างขนาดไฟล์กับคุณภาพภาพ",
                                },
                                {
                                    step: "3",
                                    icon: <Download className="h-4 w-4 text-orange-500" />,
                                    title: "ดาวน์โหลด",
                                    desc: "กดปุ่ม 'แปลงทั้งหมด' และดาวน์โหลดไฟล์ทีละไฟล์ หรือใช้ปุ่ม Download All เพื่อรับทุกไฟล์ในรูปแบบ ZIP ไฟล์เดียว",
                                },
                            ].map((item) => (
                                <Card key={item.step} className="p-5 border-border/50 bg-muted/20 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-7 w-7 rounded-full bg-orange-500/10 text-orange-600 text-sm font-bold flex items-center justify-center shrink-0">
                                            {item.step}
                                        </span>
                                        {item.icon}
                                        <span className="font-semibold text-sm">{item.title}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section 4: Use Cases */}
                    <section aria-labelledby="usecases-heading">
                        <h2 id="usecases-heading" className="text-xl font-bold tracking-tight mb-6">
                            เมื่อไหร่ควรใช้ Format ไหน?
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {USE_CASES.map((item) => (
                                <Card key={item.format} className={`p-5 border-l-4 ${item.borderColor} border-border/30 bg-card flex flex-col gap-3`}>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">{item.format}</Badge>
                                        <span className="text-sm font-semibold">{item.title}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section 5: FAQ */}
                    <section aria-labelledby="faq-heading">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                <HelpCircle className="h-5 w-5 text-orange-500" />
                            </div>
                            <h2 id="faq-heading" className="text-xl font-bold tracking-tight">
                                คำถามที่พบบ่อย (FAQ)
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {FAQ_ITEMS.map((item, i) => (
                                <Card key={i} className="p-5 border-border/50">
                                    <h3 className="font-semibold text-sm mb-2 flex items-start gap-2">
                                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Q</Badge>
                                        {item.question}
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed pl-7">{item.answer}</p>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section 6: Privacy Expanded */}
                    <section aria-labelledby="privacy-heading">
                        <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-orange-500 shrink-0" />
                                <h2 id="privacy-heading" className="font-bold text-sm uppercase tracking-wider">
                                    ความเป็นส่วนตัวและความปลอดภัย
                                </h2>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                เครื่องมือนี้ใช้เทคโนโลยี <strong className="text-foreground">WebAssembly (WASM)</strong> ซึ่งเป็น runtime ที่ทำงานอยู่ภายในเบราว์เซอร์ของคุณโดยตรง ไฟล์รูปภาพทุกไฟล์จะถูกโหลดเข้า RAM ของอุปกรณ์ ประมวลผล และส่งออกมาโดยไม่มีการส่งข้อมูลออกไปทางเครือข่ายเลยแม้แต่ไบต์เดียว
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                ซึ่งหมายความว่าคุณสามารถใช้งานได้อย่างมั่นใจกับรูปภาพส่วนตัว เอกสารลับ หรือทรัพย์สินทางปัญญาขององค์กร โดยไม่ต้องกังวลว่าไฟล์จะไปปรากฏบนเซิร์ฟเวอร์ที่ไหน และเนื่องจากไม่มีการเก็บ log หรือ cookie ใดๆ ทั้งสิ้น ประวัติการแปลงไฟล์จึงอยู่กับคุณเพียงผู้เดียว
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Badge variant="outline" className="text-[11px]">No Upload</Badge>
                                <Badge variant="outline" className="text-[11px]">Client-Side Only</Badge>
                                <Badge variant="outline" className="text-[11px]">WebAssembly Powered</Badge>
                                <Badge variant="outline" className="text-[11px]">No Cookies</Badge>
                            </div>
                        </div>
                    </section>

                </div>

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[250px] mt-20 bg-muted/10 rounded-xl py-20 border border-dashed border-muted"
                />
            </main >
        </div >
    );
}
