"use client";

import { useState, useCallback, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdUnit } from "@/components/ad-unit";
import Link from "next/link";
import {
    ArrowLeft, FileText, Upload, Download, Loader2, Trash2,
    CheckCircle2, XCircle, Clock, PackageOpen, ChevronUp, ChevronDown,
    Layers, Scissors, ImageIcon, Info, HelpCircle, Shield,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────── */

type PdfTool = "merge" | "split" | "to-jpg";
type FileStatus = "waiting" | "processing" | "done" | "error";

interface PdfFile {
    id: string;
    file: File;
    name: string;
    size: number;
    status: FileStatus;
    progress?: string;
    errorMessage?: string;
}

interface SplitResult {
    blob: Blob;
    filename: string;
}

interface JpgResult {
    blob: Blob;
    filename: string;
    previewUrl: string;
    pageNum: number;
}

/* ─── SEO Data ──────────────────────────────────────────── */

const FAQ_ITEMS = [
    {
        question: "ไฟล์ PDF ที่อัปโหลดปลอดภัยไหม?",
        answer: "ปลอดภัย 100% เพราะไฟล์ทั้งหมดถูกประมวลผลภายในเบราว์เซอร์ของคุณเท่านั้น ไม่มีการส่งไฟล์ไปยังเซิร์ฟเวอร์ใดๆ ทั้งสิ้น เหมาะสำหรับเอกสารที่เป็นความลับหรือข้อมูลส่วนตัว",
    },
    {
        question: "รองรับ PDF ขนาดใหญ่แค่ไหน?",
        answer: "ขึ้นอยู่กับ RAM ของอุปกรณ์คุณ โดยทั่วไปรองรับได้ถึงหลายสิบ MB สำหรับ Merge และ Split สำหรับ PDF→JPG ถ้า PDF มีหลายสิบหน้าอาจใช้เวลานานขึ้น แนะนำให้ทำทีละไม่เกิน 50 หน้าเพื่อประสิทธิภาพสูงสุด",
    },
    {
        question: "PDF→JPG ได้ความละเอียดเท่าไหร่?",
        answer: "ระบบ render ที่ scale 2x (192 DPI) เพื่อให้ได้ภาพที่คมชัด เหมาะสำหรับการนำไปใช้งานบนเว็บหรือ presentation คุณยังสามารถปรับ Quality ของ JPG ได้ตั้งแต่ 50–100 เพื่อสมดุลระหว่างขนาดไฟล์และคุณภาพ",
    },
    {
        question: "รองรับ PDF ที่มีรหัสผ่านไหม?",
        answer: "ไม่รองรับครับ PDF ที่ถูก encrypt หรือมีรหัสผ่านปกป้องไว้จะไม่สามารถประมวลผลได้ กรุณาถอดรหัสผ่านออกก่อนนำมาใช้งาน",
    },
    {
        question: "สามารถเรียงลำดับหน้าก่อน Merge ได้ไหม?",
        answer: "ได้ครับ ในโหมด Merge คุณสามารถใช้ปุ่ม ▲▼ เพื่อเลื่อนลำดับไฟล์ PDF ได้ตามต้องการ ระบบจะรวมไฟล์ตามลำดับที่แสดงในรายการ",
    },
];

/* ─── Helpers ───────────────────────────────────────────── */

function uid(): string {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function parsePageRange(input: string, total: number): number[] {
    const pages = new Set<number>();
    const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
        if (part.includes("-")) {
            const [a, b] = part.split("-").map(Number);
            if (!isNaN(a) && !isNaN(b)) {
                for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
                    if (i >= 1 && i <= total) pages.add(i);
                }
            }
        } else {
            const n = Number(part);
            if (!isNaN(n) && n >= 1 && n <= total) pages.add(n);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

async function downloadZip(items: { blob: Blob; filename: string }[], zipName: string) {
    const { zipSync } = await import("fflate");
    const files: Record<string, Uint8Array> = {};
    for (const item of items) {
        const buf = await item.blob.arrayBuffer();
        files[item.filename] = new Uint8Array(buf);
    }
    const zipped = zipSync(files);
    const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
    triggerDownload(blob, zipName);
}

function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* ─── Component ─────────────────────────────────────────── */

export default function PdfToolsPage() {
    const [activeTool, setActiveTool] = useState<PdfTool>("merge");

    /* ── Merge state ──────────────────────────── */
    const [mergeFiles, setMergeFiles] = useState<PdfFile[]>([]);
    const [mergeStatus, setMergeStatus] = useState<FileStatus>("waiting");
    const [mergeProgress, setMergeProgress] = useState("");
    const [mergeResult, setMergeResult] = useState<Blob | null>(null);
    const [mergeError, setMergeError] = useState("");

    /* ── Split state ──────────────────────────── */
    const [splitFile, setSplitFile] = useState<PdfFile | null>(null);
    const [splitPageInput, setSplitPageInput] = useState("");
    const [splitAllPages, setSplitAllPages] = useState(true);
    const [splitStatus, setSplitStatus] = useState<FileStatus>("waiting");
    const [splitProgress, setSplitProgress] = useState("");
    const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
    const [splitError, setSplitError] = useState("");
    const [splitPageCount, setSplitPageCount] = useState(0);

    /* ── PDF→JPG state ────────────────────────── */
    const [jpgFile, setJpgFile] = useState<PdfFile | null>(null);
    const [jpgQuality, setJpgQuality] = useState(85);
    const [jpgStatus, setJpgStatus] = useState<FileStatus>("waiting");
    const [jpgProgress, setJpgProgress] = useState("");
    const [jpgResults, setJpgResults] = useState<JpgResult[]>([]);
    const [jpgError, setJpgError] = useState("");

    const workerRef = useRef<Worker | null>(null);
    const mergeInputRef = useRef<HTMLInputElement>(null);
    const splitInputRef = useRef<HTMLInputElement>(null);
    const jpgInputRef = useRef<HTMLInputElement>(null);

    /* ── File Handlers ────────────────────────── */

    const addMergeFiles = useCallback((files: FileList | File[]) => {
        const items: PdfFile[] = Array.from(files)
            .filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"))
            .map((f) => ({ id: uid(), file: f, name: f.name, size: f.size, status: "waiting" }));
        setMergeFiles((prev) => [...prev, ...items]);
    }, []);

    const setSingleFile = useCallback((
        files: FileList | File[],
        setter: (f: PdfFile | null) => void,
        onPageCount?: (n: number) => void
    ) => {
        const f = Array.from(files).find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
        if (!f) return;
        setter({ id: uid(), file: f, name: f.name, size: f.size, status: "waiting" });
        if (onPageCount) {
            f.arrayBuffer().then(async (buf) => {
                try {
                    const { PDFDocument } = await import("pdf-lib");
                    const doc = await PDFDocument.load(buf);
                    onPageCount(doc.getPageCount());
                } catch { /* ignore */ }
            });
        }
    }, []);

    /* ── Merge ────────────────────────────────── */

    const moveMergeFile = (index: number, dir: -1 | 1) => {
        setMergeFiles((prev) => {
            const arr = [...prev];
            const target = index + dir;
            if (target < 0 || target >= arr.length) return prev;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr;
        });
    };

    const runMerge = useCallback(async () => {
        if (mergeFiles.length < 1) return;
        setMergeStatus("processing");
        setMergeError("");
        setMergeResult(null);

        const worker = new Worker(
            new URL("@/workers/pdf.worker.ts", import.meta.url),
            { type: "module" }
        );
        workerRef.current = worker;
        const id = uid();

        const buffers = await Promise.all(mergeFiles.map((f) => f.file.arrayBuffer()));

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.id !== id) return;
            if (msg.type === "progress") setMergeProgress(msg.message);
            else if (msg.type === "result") {
                setMergeResult(msg.blob);
                setMergeStatus("done");
                setMergeProgress("");
                worker.terminate();
            } else if (msg.type === "error") {
                setMergeError(msg.message);
                setMergeStatus("error");
                setMergeProgress("");
                worker.terminate();
            }
        };
        worker.onerror = (err) => {
            setMergeError(err.message || "Worker error");
            setMergeStatus("error");
            worker.terminate();
        };

        worker.postMessage({ type: "merge", id, buffers });
    }, [mergeFiles]);

    /* ── Split ────────────────────────────────── */

    const runSplit = useCallback(async () => {
        if (!splitFile) return;
        setSplitStatus("processing");
        setSplitError("");
        setSplitResults([]);

        const worker = new Worker(
            new URL("@/workers/pdf.worker.ts", import.meta.url),
            { type: "module" }
        );
        workerRef.current = worker;
        const id = uid();

        const buffer = await splitFile.file.arrayBuffer();
        const pages: number[] | "all" = splitAllPages
            ? "all"
            : parsePageRange(splitPageInput, splitPageCount);

        if (!splitAllPages && (pages as number[]).length === 0) {
            setSplitError("ไม่พบหน้าที่ระบุ กรุณาตรวจสอบ format เช่น 1,3,5-8");
            setSplitStatus("error");
            return;
        }

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.id !== id) return;
            if (msg.type === "progress") setSplitProgress(msg.message);
            else if (msg.type === "result-split") {
                setSplitResults(msg.blobs);
                setSplitStatus("done");
                setSplitProgress("");
                worker.terminate();
            } else if (msg.type === "error") {
                setSplitError(msg.message);
                setSplitStatus("error");
                setSplitProgress("");
                worker.terminate();
            }
        };
        worker.onerror = (err) => {
            setSplitError(err.message || "Worker error");
            setSplitStatus("error");
            worker.terminate();
        };

        worker.postMessage({ type: "split", id, buffer, pages });
    }, [splitFile, splitAllPages, splitPageInput, splitPageCount]);

    /* ── PDF→JPG ──────────────────────────────── */

    const runToJpg = useCallback(async () => {
        if (!jpgFile) return;
        setJpgStatus("processing");
        setJpgError("");
        setJpgResults([]);

        try {
            const pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = "";

            setJpgProgress("กำลังโหลด PDF...");
            const buffer = await jpgFile.file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: buffer }).promise;
            const total = pdf.numPages;
            const results: JpgResult[] = [];

            for (let i = 1; i <= total; i++) {
                setJpgProgress(`กำลังแปลงหน้า ${i}/${total}...`);
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, canvas, viewport }).promise;

                const blob = await new Promise<Blob>((resolve) =>
                    canvas.toBlob((b) => resolve(b!), "image/jpeg", jpgQuality / 100)
                );
                const previewUrl = URL.createObjectURL(blob);
                results.push({ blob, previewUrl, filename: `page-${i}.jpg`, pageNum: i });
            }

            setJpgResults(results);
            setJpgStatus("done");
            setJpgProgress("");
        } catch (err: unknown) {
            setJpgError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างแปลง PDF");
            setJpgStatus("error");
            setJpgProgress("");
        }
    }, [jpgFile, jpgQuality]);

    /* ── FAQ JSON-LD ──────────────────────────── */

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": { "@type": "Answer", "text": item.answer },
        })),
    };

    /* ── Drag & Drop helpers ──────────────────── */

    const makeDragProps = (onFiles: (files: FileList) => void) => ({
        onDragOver: (e: React.DragEvent) => { e.preventDefault(); },
        onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
        },
    });

    /* ── Render ───────────────────────────────── */

    const TABS: { id: PdfTool; label: string; icon: React.ReactNode }[] = [
        { id: "merge", label: "รวม PDF", icon: <Layers className="h-4 w-4" /> },
        { id: "split", label: "แยกหน้า", icon: <Scissors className="h-4 w-4" /> },
        { id: "to-jpg", label: "PDF → JPG", icon: <ImageIcon className="h-4 w-4" /> },
    ];

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-3xl">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/tools" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
                        <ArrowLeft className="h-4 w-4 mr-1" /> กลับไปที่เครื่องมือ
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">PDF Tools</h1>
                    </div>
                    <p className="text-muted-foreground">
                        รวม PDF, แยกหน้า และแปลง PDF เป็นรูปภาพ JPG ประมวลผลในเครื่อง 100% ไม่อัปโหลดไปที่ใด
                    </p>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-6">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTool(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${activeTool === tab.id
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Tab: Merge ─────────────────────────────── */}
                {activeTool === "merge" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <Card
                            className="border-2 border-dashed border-border/50 bg-muted/20 hover:border-red-500/30 transition-colors cursor-pointer"
                            onClick={() => mergeInputRef.current?.click()}
                            {...makeDragProps(addMergeFiles)}
                        >
                            <div className="p-8 flex flex-col items-center gap-3 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <Upload className="h-7 w-7 text-red-500/70" />
                                </div>
                                <p className="font-semibold">ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก</p>
                                <p className="text-sm text-muted-foreground">เลือกได้หลายไฟล์ • ลำดับสามารถปรับได้</p>
                            </div>
                            <input ref={mergeInputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { addMergeFiles(e.target.files); e.target.value = ""; } }} />
                        </Card>

                        {mergeFiles.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        ลำดับไฟล์ ({mergeFiles.length})
                                    </p>
                                    <Button variant="ghost" size="sm" onClick={() => { setMergeFiles([]); setMergeResult(null); setMergeError(""); }}
                                        className="text-xs text-muted-foreground hover:text-red-500">
                                        <Trash2 className="h-3 w-3 mr-1" /> ล้างทั้งหมด
                                    </Button>
                                </div>
                                {mergeFiles.map((f, i) => (
                                    <Card key={f.id} className="p-3 flex items-center gap-3 border-border/50">
                                        <FileText className="h-4 w-4 text-red-500 shrink-0" />
                                        <span className="flex-1 text-sm truncate">{f.name}</span>
                                        <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
                                        <div className="flex flex-col gap-0.5">
                                            <button onClick={() => moveMergeFile(i, -1)} disabled={i === 0}
                                                className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => moveMergeFile(i, 1)} disabled={i === mergeFiles.length - 1}
                                                className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <button onClick={() => setMergeFiles((p) => p.filter((x) => x.id !== f.id))}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-500">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </Card>
                                ))}

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runMerge} disabled={mergeStatus === "processing" || mergeFiles.length < 1}>
                                    {mergeStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {mergeProgress || "กำลังรวม..."}</>
                                        : <><Layers className="h-4 w-4" /> รวม PDF ({mergeFiles.length} ไฟล์)</>}
                                </Button>

                                {mergeError && (
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-2 items-start">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600">{mergeError}</p>
                                    </div>
                                )}

                                {mergeStatus === "done" && mergeResult && (
                                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">รวม PDF สำเร็จ</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(mergeResult.size)}</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                            onClick={() => triggerDownload(mergeResult!, "merged.pdf")}>
                                            <Download className="h-3.5 w-3.5" /> ดาวน์โหลด
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Split ─────────────────────────────── */}
                {activeTool === "split" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <Card
                            className="border-2 border-dashed border-border/50 bg-muted/20 hover:border-red-500/30 transition-colors cursor-pointer"
                            onClick={() => splitInputRef.current?.click()}
                            {...makeDragProps((files) => setSingleFile(files, setSplitFile, setSplitPageCount))}
                        >
                            <div className="p-8 flex flex-col items-center gap-3 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <Scissors className="h-7 w-7 text-red-500/70" />
                                </div>
                                {splitFile ? (
                                    <>
                                        <p className="font-semibold">{splitFile.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatBytes(splitFile.size)}{splitPageCount > 0 && ` • ${splitPageCount} หน้า`}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก</p>
                                        <p className="text-sm text-muted-foreground">รองรับ 1 ไฟล์</p>
                                    </>
                                )}
                            </div>
                            <input ref={splitInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { setSingleFile(e.target.files, setSplitFile, setSplitPageCount); e.target.value = ""; setSplitResults([]); setSplitError(""); setSplitStatus("waiting"); } }} />
                        </Card>

                        {splitFile && (
                            <>
                                <Card className="p-5 border-border/50 space-y-4">
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">ตั้งค่าการแยก</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setSplitAllPages(true)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${splitAllPages ? "bg-red-500/10 border-red-500/40 text-red-600" : "border-border/50 text-muted-foreground hover:border-red-500/20"}`}>
                                            ทุกหน้า
                                        </button>
                                        <button onClick={() => setSplitAllPages(false)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${!splitAllPages ? "bg-red-500/10 border-red-500/40 text-red-600" : "border-border/50 text-muted-foreground hover:border-red-500/20"}`}>
                                            ระบุหน้า
                                        </button>
                                    </div>
                                    {!splitAllPages && (
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block">
                                                เลขหน้า เช่น <code className="bg-muted px-1 rounded">1,3,5-8</code>
                                                {splitPageCount > 0 && <span> (ทั้งหมด {splitPageCount} หน้า)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={splitPageInput}
                                                onChange={(e) => setSplitPageInput(e.target.value)}
                                                placeholder="เช่น 1,3,5-8"
                                                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 outline-none"
                                            />
                                        </div>
                                    )}
                                </Card>

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runSplit} disabled={splitStatus === "processing"}>
                                    {splitStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {splitProgress || "กำลังแยก..."}</>
                                        : <><Scissors className="h-4 w-4" /> แยกหน้า</>}
                                </Button>

                                {splitError && (
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-2 items-start">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600">{splitError}</p>
                                    </div>
                                )}

                                {splitStatus === "done" && splitResults.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> ผลลัพธ์ ({splitResults.length} ไฟล์)
                                            </p>
                                            {splitResults.length > 1 && (
                                                <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                                                    onClick={() => downloadZip(splitResults, "split-pages.zip")}>
                                                    <PackageOpen className="h-3.5 w-3.5" /> ZIP ทั้งหมด
                                                </Button>
                                            )}
                                        </div>
                                        {splitResults.map((r, i) => (
                                            <Card key={i} className="p-3 flex items-center gap-3 border-emerald-500/20 bg-emerald-500/[0.03]">
                                                <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                                                <span className="flex-1 text-sm">{r.filename}</span>
                                                <span className="text-xs text-muted-foreground">{formatBytes(r.blob.size)}</span>
                                                <Button size="sm" variant="ghost" className="gap-1 text-xs hover:text-emerald-600"
                                                    onClick={() => triggerDownload(r.blob, r.filename)}>
                                                    <Download className="h-3.5 w-3.5" />
                                                </Button>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── Tab: PDF→JPG ───────────────────────────── */}
                {activeTool === "to-jpg" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <Card
                            className="border-2 border-dashed border-border/50 bg-muted/20 hover:border-red-500/30 transition-colors cursor-pointer"
                            onClick={() => jpgInputRef.current?.click()}
                            {...makeDragProps((files) => setSingleFile(files, setJpgFile))}
                        >
                            <div className="p-8 flex flex-col items-center gap-3 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <ImageIcon className="h-7 w-7 text-red-500/70" />
                                </div>
                                {jpgFile ? (
                                    <>
                                        <p className="font-semibold">{jpgFile.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatBytes(jpgFile.size)}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก</p>
                                        <p className="text-sm text-muted-foreground">แต่ละหน้าจะถูกแปลงเป็น JPG</p>
                                    </>
                                )}
                            </div>
                            <input ref={jpgInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { setSingleFile(e.target.files, setJpgFile); e.target.value = ""; setJpgResults([]); setJpgError(""); setJpgStatus("waiting"); } }} />
                        </Card>

                        {jpgFile && (
                            <>
                                <Card className="p-5 border-border/50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium">
                                            คุณภาพ (Quality): <span className="text-red-500 font-bold text-lg ml-1">{jpgQuality}</span>
                                        </label>
                                        <span className="text-xs text-muted-foreground">50 = เล็กสุด • 100 = คุณภาพสูงสุด</span>
                                    </div>
                                    <input type="range" min="50" max="100" value={jpgQuality}
                                        onChange={(e) => setJpgQuality(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                </Card>

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runToJpg} disabled={jpgStatus === "processing"}>
                                    {jpgStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {jpgProgress || "กำลังแปลง..."}</>
                                        : <><ImageIcon className="h-4 w-4" /> แปลงเป็น JPG</>}
                                </Button>

                                {jpgError && (
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-2 items-start">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600">{jpgError}</p>
                                    </div>
                                )}

                                {jpgStatus === "done" && jpgResults.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {jpgResults.length} หน้า
                                            </p>
                                            {jpgResults.length > 1 && (
                                                <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                                                    onClick={() => downloadZip(jpgResults, "pdf-to-jpg.zip")}>
                                                    <PackageOpen className="h-3.5 w-3.5" /> ZIP ทั้งหมด
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {jpgResults.map((r) => (
                                                <div key={r.pageNum} className="group relative rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                                                    <img src={r.previewUrl} alt={`หน้า ${r.pageNum}`} className="w-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                        <Button size="sm" variant="secondary"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 text-xs shadow-lg"
                                                            onClick={() => triggerDownload(r.blob, r.filename)}>
                                                            <Download className="h-3.5 w-3.5" /> หน้า {r.pageNum}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Privacy Note */}
                <div className="mt-6 p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex gap-3 items-center">
                    <Shield className="h-5 w-5 text-red-500 shrink-0" />
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                        ปลอดภัย 100%: ไฟล์ทุกไฟล์ถูกประมวลผลในเครื่องคุณเท่านั้น —
                        ไม่มีการอัปโหลดไปยังเซิร์ฟเวอร์ใดๆ
                    </p>
                </div>

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[250px] mt-16 mb-4 bg-muted/10 rounded-xl py-12 border border-dashed border-muted"
                />

                {/* ─── SEO Content ───────────────────────────── */}
                <div className="mt-4 space-y-12 border-t border-border/20 pt-12">

                    {/* Section 1: PDF Tools คืออะไร */}
                    <section aria-labelledby="intro-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                <Info className="h-5 w-5 text-red-500" />
                            </div>
                            <h2 id="intro-heading" className="text-xl font-bold tracking-tight">
                                PDF Tools ออนไลน์ฟรี ทำอะไรได้บ้าง?
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                เครื่องมือนี้รวม 3 ฟีเจอร์หลักสำหรับจัดการ PDF ไว้ในที่เดียว โดยทำงานทั้งหมดภายในเบราว์เซอร์ของคุณผ่าน <strong className="text-foreground">pdf-lib</strong> และ <strong className="text-foreground">pdfjs-dist</strong> ซึ่งเป็น library ระดับโปรที่ไม่ต้องการ server เลย ไฟล์ PDF ของคุณจะไม่ถูกส่งออกไปที่ใดทั้งสิ้น
                            </p>
                            <p>
                                <strong className="text-foreground">รวม PDF (Merge)</strong> ช่วยให้นำ PDF หลายไฟล์มาเชื่อมต่อกันเป็นไฟล์เดียว พร้อมปรับลำดับได้ตามต้องการ เหมาะสำหรับการรวมรายงาน สัญญา หรือเอกสารหลายชุดเข้าด้วยกัน
                            </p>
                            <p>
                                <strong className="text-foreground">แยกหน้า (Split)</strong> ช่วยตัดบางหน้าออกจาก PDF เป็นไฟล์ PDF ย่อยแยกกัน สามารถระบุหน้าเฉพาะเจาะจงเช่น <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">1,3,5-8</code> หรือแยกทุกหน้าออกมาทีเดียว
                            </p>
                            <p>
                                <strong className="text-foreground">PDF → JPG</strong> แปลงแต่ละหน้าของ PDF ให้เป็นรูปภาพ JPG ความละเอียดสูง (192 DPI) เหมาะสำหรับการนำหน้า PDF ไปใช้ใน presentation, โซเชียลมีเดีย หรือแนบในอีเมล
                            </p>
                        </div>
                    </section>

                    {/* Section 2: วิธีใช้งาน */}
                    <section aria-labelledby="howto-heading">
                        <h2 id="howto-heading" className="text-xl font-bold tracking-tight mb-6">
                            วิธีใช้งานแต่ละฟีเจอร์
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    icon: <Layers className="h-4 w-4 text-red-500" />,
                                    title: "รวม PDF",
                                    steps: ["ลากไฟล์ PDF หลายไฟล์ลงในกล่อง", "ปรับลำดับด้วยปุ่ม ▲▼", "กดรวม PDF แล้วดาวน์โหลด"],
                                },
                                {
                                    icon: <Scissors className="h-4 w-4 text-red-500" />,
                                    title: "แยกหน้า",
                                    steps: ["ลาก PDF ไฟล์เดียวลงในกล่อง", "เลือก 'ทุกหน้า' หรือระบุเลขหน้า", "กดแยกหน้า → ดาวน์โหลดแยกหรือ ZIP"],
                                },
                                {
                                    icon: <ImageIcon className="h-4 w-4 text-red-500" />,
                                    title: "PDF → JPG",
                                    steps: ["ลาก PDF ไฟล์เดียวลงในกล่อง", "ปรับ Quality ตามต้องการ (50–100)", "กดแปลง → preview และดาวน์โหลด"],
                                },
                            ].map((item) => (
                                <Card key={item.title} className="p-5 border-border/50 bg-muted/20 flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        {item.icon}
                                        <span className="font-semibold text-sm">{item.title}</span>
                                    </div>
                                    <ol className="space-y-1.5">
                                        {item.steps.map((step, i) => (
                                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                                <span className="h-4 w-4 rounded-full bg-red-500/10 text-red-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                    {i + 1}
                                                </span>
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section 3: FAQ */}
                    <section aria-labelledby="faq-heading">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                <HelpCircle className="h-5 w-5 text-red-500" />
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

                    {/* Section 4: Privacy */}
                    <section aria-labelledby="privacy-heading">
                        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-red-500 shrink-0" />
                                <h2 id="privacy-heading" className="font-bold text-sm uppercase tracking-wider">
                                    ความเป็นส่วนตัวและความปลอดภัย
                                </h2>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                ทั้ง <strong className="text-foreground">pdf-lib</strong> (สำหรับ Merge/Split) และ <strong className="text-foreground">pdfjs-dist</strong> (สำหรับ PDF→JPG) รันทั้งหมดภายใน browser sandbox ของคุณ ไฟล์ PDF ถูกโหลดเข้า RAM ประมวลผล และส่งออกมาโดยไม่มีการส่ง network request ใดๆ ออกไป ไม่มีการเก็บ log ไม่มี cookie และไม่มีการติดตามเนื้อหาในไฟล์ของคุณ
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Badge variant="outline" className="text-[11px]">No Upload</Badge>
                                <Badge variant="outline" className="text-[11px]">Client-Side Only</Badge>
                                <Badge variant="outline" className="text-[11px]">pdf-lib Powered</Badge>
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
            </main>
        </div>
    );
}
