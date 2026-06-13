"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdUnit } from "@/components/ad-unit";
import {
    ArrowLeft,
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

type Engine = "webgpu" | "wasm";
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

const MAX_PIXELS = 32_000_000;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FAQ_ITEMS = [
    {
        question: "ลบพื้นหลังรูปด้วยเครื่องมือนี้ปลอดภัยไหม?",
        answer: "ปลอดภัย เพราะรูปภาพถูกประมวลผลในเบราว์เซอร์ของคุณทั้งหมด ไม่มีการอัปโหลดไฟล์ไปยังเซิร์ฟเวอร์หรือ API ภายนอก",
    },
    {
        question: "ทำไมครั้งแรกใช้เวลานาน?",
        answer: "ครั้งแรกเบราว์เซอร์ต้องดาวน์โหลดโมเดล AI ประมาณ 114MB สำหรับ WebGPU fp16, ประมาณ 224MB หากต้อง fallback เป็น WebGPU fp32 หรือประมาณ 6.6MB เมื่อ fallback เป็น WASM หลังจากนั้น Transformers.js จะ cache ไว้ใน browser cache",
    },
    {
        question: "ถ้าเครื่องไม่รองรับ WebGPU ยังใช้ได้ไหม?",
        answer: "ใช้ได้ ระบบจะสลับไปใช้ WASM บน CPU อัตโนมัติ แต่การประมวลผลอาจใช้เวลานานกว่า WebGPU โดยเฉพาะรูปความละเอียดสูง",
    },
    {
        question: "ไฟล์ผลลัพธ์เป็นแบบไหน?",
        answer: "ผลลัพธ์เป็น PNG โปร่งใสเต็มความละเอียดเดิมของรูป เหมาะสำหรับทำรูปสินค้า โปรไฟล์ โพสต์โซเชียล และงานออกแบบ",
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

async function readImageInfo(file: File): Promise<{ width: number; height: number }> {
    const bitmap = await createImageBitmap(file);
    const info = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return info;
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

    const workerRef = useRef<Worker | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeJobRef = useRef<string | null>(null);
    const resultUrlRef = useRef<string | null>(null);
    const previewUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            workerRef.current?.terminate();
            if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        };
    }, []);

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
                setEngine("wasm");
                setFallbackMessage(msg.message || "กำลังใช้ WASM fallback");
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
    }, [revokeResult]);

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
        setMessage("อัปโหลดรูปเพื่อเริ่มลบพื้นหลัง");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [revokeResult, status]);

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
    const engineLabel = engine === "webgpu" ? "WebGPU" : engine === "wasm" ? "WASM fallback" : "Auto engine";

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        })),
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-28 pb-20 max-w-6xl">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-foreground">
                        <Link href="/tools">
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
                                ใช้ AI แยกวัตถุออกจากพื้นหลังบนเครื่องของคุณโดยตรง รองรับ WebGPU เพื่อความเร็วสูง และ fallback เป็น WASM อัตโนมัติเมื่อเครื่องไม่รองรับ
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
                        </div>

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
                                <span>WebGPU fp16 ~114MB / fp32 ~224MB • WASM ~6.6MB</span>
                            </div>
                            {fallbackMessage && (
                                <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    <span>{fallbackMessage}</span>
                                </div>
                            )}
                            {error && (
                                <div className="flex gap-2 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
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
                                    รูปของคุณอยู่ในเบราว์เซอร์เท่านั้น โมเดล AI รันบนอุปกรณ์ของคุณผ่าน Transformers.js, WebGPU หรือ WASM โดยไม่มีการอัปโหลดภาพไปที่เซิร์ฟเวอร์
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
                        { title: "AI Matting", desc: "ใช้ BiRefNet lite เพื่อสร้าง alpha mask สำหรับแยกวัตถุออกจากพื้นหลัง" },
                        { title: "Full Resolution", desc: "คืนค่า PNG โปร่งใสขนาดเท่าต้นฉบับ ไม่บีบอัดความละเอียดลงตอน export" },
                        { title: "Soft Edge", desc: "คำนวณ feather ตามขนาดภาพเพื่อให้ขอบวัตถุนุ่มขึ้นทั้งภาพเล็กและภาพ 4K" },
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

                <section className="mt-12 space-y-4">
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
