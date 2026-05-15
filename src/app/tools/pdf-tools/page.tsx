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
    GripVertical, LayoutGrid, Minimize2,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────── */

type PdfTool = "merge" | "split" | "to-jpg" | "organize" | "compress";
type FileStatus = "waiting" | "processing" | "done" | "error";
type CompressMode = "rasterize" | "smart";
type CompressQuality = "low" | "medium" | "high";

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

interface OrganizerPage {
    id: string;
    fileIndex: number;
    pageNum: number;
    thumbUrl: string;
    sourceName: string;
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
        question: "สามารถเรียงลำดับไฟล์ก่อน Merge ได้ไหม?",
        answer: "ได้ครับ ในโหมด Merge แต่ละไฟล์จะแสดง thumbnail หน้าแรกพร้อมปุ่มลูกศร ◀▶ เพื่อเลื่อนลำดับ และถ้าต้องการจัดเรียงระดับหน้าแบบละเอียด ให้ใช้ tab 'จัดระเบียบ PDF' ที่รองรับการลากวาง thumbnail ทุกหน้าได้เลย",
    },
    {
        question: "ความแตกต่างระหว่าง 'รวม PDF' กับ 'จัดระเบียบ PDF' คืออะไร?",
        answer: "รวม PDF (Merge) ใช้เมื่อต้องการต่อ PDF หลายไฟล์เข้าด้วยกันตามลำดับไฟล์ ส่วน จัดระเบียบ PDF (Organizer) ให้อิสระมากกว่า — สามารถลากวาง thumbnail แต่ละหน้า ลบหน้าที่ไม่ต้องการ และผสมหน้าจากหลาย PDF ในลำดับที่กำหนดเองได้อย่างอิสระ",
    },
    {
        question: "ลดขนาด PDF ได้กี่ % และผลลัพธ์เป็นอย่างไร?",
        answer: "ขึ้นอยู่กับเนื้อหาและโหมดที่เลือก — โหมด Rasterize (เปลี่ยนหน้าเป็นภาพ JPEG) ลดได้ 50–90% เหมาะกับเอกสารสแกนหรือมีรูปภาพเยอะ แต่ข้อความจะคัดลอกไม่ได้ ส่วนโหมด Smart (object stream compression) คงข้อความคัดลอกได้แต่ลดได้น้อยประมาณ 1–10% ถ้าต้องการลดขนาดเยอะให้ใช้โหมด Rasterize",
    },
];

const COMPRESS_PRESETS: Record<CompressQuality, { dpi: number; jpegQuality: number; label: string; hint: string }> = {
    low:    { dpi: 96,  jpegQuality: 0.60, label: "ต่ำ",      hint: "เล็กที่สุด • เหมาะกับเอกสารดูบนจอ" },
    medium: { dpi: 144, jpegQuality: 0.75, label: "ปานกลาง", hint: "สมดุล • แนะนำ" },
    high:   { dpi: 200, jpegQuality: 0.90, label: "สูง",      hint: "ใหญ่ขึ้น • คุณภาพใกล้ต้นฉบับ" },
};

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
    const [mergeThumbs, setMergeThumbs] = useState<Map<string, string>>(new Map());
    const [mergeStatus, setMergeStatus] = useState<FileStatus>("waiting");
    const [mergeProgress, setMergeProgress] = useState("");
    const [mergeResult, setMergeResult] = useState<Blob | null>(null);
    const [mergeError, setMergeError] = useState("");

    /* ── Split state ──────────────────────────── */
    const [splitFile, setSplitFile] = useState<PdfFile | null>(null);
    const [splitThumbnails, setSplitThumbnails] = useState<string[]>([]);
    const [splitSelectedPages, setSplitSelectedPages] = useState<Set<number>>(new Set());
    const [splitThumbLoading, setSplitThumbLoading] = useState(false);
    const [splitMode, setSplitMode] = useState<"split" | "extract">("split");
    const [splitStatus, setSplitStatus] = useState<FileStatus>("waiting");
    const [splitProgress, setSplitProgress] = useState("");
    const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
    const [splitExtractResult, setSplitExtractResult] = useState<Blob | null>(null);
    const [splitError, setSplitError] = useState("");

    /* ── PDF→JPG state ────────────────────────── */
    const [jpgFile, setJpgFile] = useState<PdfFile | null>(null);
    const [jpgQuality, setJpgQuality] = useState(85);
    const [jpgStatus, setJpgStatus] = useState<FileStatus>("waiting");
    const [jpgProgress, setJpgProgress] = useState("");
    const [jpgResults, setJpgResults] = useState<JpgResult[]>([]);
    const [jpgError, setJpgError] = useState("");

    /* ── Organizer state ─────────────────────────── */
    const [orgFiles, setOrgFiles]               = useState<File[]>([]);
    const [orgPages, setOrgPages]               = useState<OrganizerPage[]>([]);
    const [orgThumbLoading, setOrgThumbLoading] = useState(false);
    const [orgStatus, setOrgStatus]             = useState<FileStatus>("waiting");
    const [orgProgress, setOrgProgress]         = useState("");
    const [orgResult, setOrgResult]             = useState<Blob | null>(null);
    const [orgError, setOrgError]               = useState("");

    /* ── Compress state ─────────────────────────── */
    const [compressFile, setCompressFile]               = useState<PdfFile | null>(null);
    const [compressMode, setCompressMode]               = useState<CompressMode>("rasterize");
    const [compressQuality, setCompressQuality]         = useState<CompressQuality>("medium");
    const [compressStatus, setCompressStatus]           = useState<FileStatus>("waiting");
    const [compressProgress, setCompressProgress]       = useState("");
    const [compressResult, setCompressResult]           = useState<Blob | null>(null);
    const [compressOriginalSize, setCompressOriginalSize] = useState<number>(0);
    const [compressError, setCompressError]             = useState("");

    const workerRef    = useRef<Worker | null>(null);
    const mergeInputRef = useRef<HTMLInputElement>(null);
    const splitInputRef = useRef<HTMLInputElement>(null);
    const jpgInputRef   = useRef<HTMLInputElement>(null);
    const orgInputRef   = useRef<HTMLInputElement>(null);
    const compressInputRef = useRef<HTMLInputElement>(null);
    const dragIndexRef  = useRef<number | null>(null);

    /* ── File Handlers ────────────────────────── */

    const renderMergeThumb = useCallback(async (id: string, file: File) => {
        try {
            const pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: buffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, canvas, viewport }).promise;
            const thumb = canvas.toDataURL("image/jpeg", 0.7);
            setMergeThumbs((prev) => new Map(prev).set(id, thumb));
        } catch { /* ignore */ }
    }, []);

    const addMergeFiles = useCallback((files: FileList | File[]) => {
        const items: PdfFile[] = Array.from(files)
            .filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"))
            .map((f) => ({ id: uid(), file: f, name: f.name, size: f.size, status: "waiting" }));
        setMergeFiles((prev) => [...prev, ...items]);
        items.forEach((item) => renderMergeThumb(item.id, item.file));
    }, [renderMergeThumb]);

    const setSingleFile = useCallback((
        files: FileList | File[],
        setter: (f: PdfFile | null) => void,
    ) => {
        const f = Array.from(files).find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
        if (!f) return;
        setter({ id: uid(), file: f, name: f.name, size: f.size, status: "waiting" });
    }, []);

    const renderSplitThumbnails = useCallback(async (file: File) => {
        setSplitThumbLoading(true);
        setSplitThumbnails([]);
        setSplitSelectedPages(new Set());
        setSplitExtractResult(null);
        setSplitResults([]);
        setSplitStatus("waiting");
        try {
            const pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: buffer }).promise;
            const thumbs: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.4 });
                const canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, canvas, viewport }).promise;
                thumbs.push(canvas.toDataURL("image/jpeg", 0.7));
            }
            setSplitThumbnails(thumbs);
            setSplitSelectedPages(new Set(Array.from({ length: thumbs.length }, (_, i) => i + 1)));
        } catch { /* ignore */ }
        setSplitThumbLoading(false);
    }, []);

    /* ── Organizer ───────────────────────────── */

    const renderOrgThumbnails = useCallback(async (newFiles: File[], existingFileCount: number) => {
        setOrgThumbLoading(true);
        try {
            const pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
            const newPages: OrganizerPage[] = [];
            for (let fi = 0; fi < newFiles.length; fi++) {
                const file = newFiles[fi];
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument({ data: buffer }).promise;
                for (let pi = 1; pi <= pdf.numPages; pi++) {
                    const page = await pdf.getPage(pi);
                    const viewport = page.getViewport({ scale: 0.4 });
                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext("2d")!;
                    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
                    newPages.push({
                        id: uid(),
                        fileIndex: existingFileCount + fi,
                        pageNum: pi,
                        thumbUrl: canvas.toDataURL("image/jpeg", 0.7),
                        sourceName: file.name,
                    });
                }
            }
            setOrgPages((prev) => [...prev, ...newPages]);
        } catch { /* ignore */ }
        setOrgThumbLoading(false);
    }, []);

    const addOrgFiles = useCallback((files: FileList | File[]) => {
        const pdfs = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
        if (!pdfs.length) return;
        setOrgFiles((prev) => {
            renderOrgThumbnails(pdfs, prev.length);
            return [...prev, ...pdfs];
        });
        setOrgStatus("waiting");
        setOrgResult(null);
        setOrgError("");
    }, [renderOrgThumbnails]);

    const runOrganize = useCallback(async () => {
        if (orgPages.length === 0) return;
        setOrgStatus("processing");
        setOrgError("");
        setOrgResult(null);

        const worker = new Worker(new URL("@/workers/pdf.worker.ts", import.meta.url), { type: "module" });
        workerRef.current = worker;
        const id = uid();

        const bufferMap = new Map<number, ArrayBuffer>();
        for (const page of orgPages) {
            if (!bufferMap.has(page.fileIndex)) {
                bufferMap.set(page.fileIndex, await orgFiles[page.fileIndex].arrayBuffer());
            }
        }
        const pageRequests = orgPages.map((page) => ({
            buffer: bufferMap.get(page.fileIndex)!,
            pageIndex: page.pageNum - 1,
        }));

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.id !== id) return;
            if (msg.type === "progress") setOrgProgress(msg.message);
            else if (msg.type === "result") {
                setOrgResult(msg.blob);
                setOrgStatus("done");
                setOrgProgress("");
                worker.terminate();
            } else if (msg.type === "error") {
                setOrgError(msg.message);
                setOrgStatus("error");
                setOrgProgress("");
                worker.terminate();
            }
        };
        worker.onerror = (err) => {
            setOrgError(err.message || "Worker error");
            setOrgStatus("error");
            worker.terminate();
        };
        worker.postMessage({ type: "organize", id, pageRequests });
    }, [orgPages, orgFiles]);

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
        if (!splitFile || splitSelectedPages.size === 0) return;
        setSplitStatus("processing");
        setSplitError("");
        setSplitResults([]);
        setSplitExtractResult(null);

        const worker = new Worker(
            new URL("@/workers/pdf.worker.ts", import.meta.url),
            { type: "module" }
        );
        workerRef.current = worker;
        const id = uid();

        const buffer = await splitFile.file.arrayBuffer();
        const pages = Array.from(splitSelectedPages).sort((a, b) => a - b);

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.id !== id) return;
            if (msg.type === "progress") setSplitProgress(msg.message);
            else if (msg.type === "result-split") {
                setSplitResults(msg.blobs);
                setSplitStatus("done");
                setSplitProgress("");
                worker.terminate();
            } else if (msg.type === "result") {
                setSplitExtractResult(msg.blob);
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

        if (splitMode === "extract") {
            worker.postMessage({ type: "extract", id, buffer, pages });
        } else {
            const sendPages: number[] | "all" = pages.length === splitThumbnails.length ? "all" : pages;
            worker.postMessage({ type: "split", id, buffer, pages: sendPages });
        }
    }, [splitFile, splitSelectedPages, splitThumbnails.length, splitMode]);

    /* ── PDF→JPG ──────────────────────────────── */

    const runToJpg = useCallback(async () => {
        if (!jpgFile) return;
        setJpgStatus("processing");
        setJpgError("");
        setJpgResults([]);

        try {
            const pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

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

    /* ── Compress ─────────────────────────────── */

    const runCompress = useCallback(async () => {
        if (!compressFile) return;
        setCompressStatus("processing");
        setCompressError("");
        setCompressResult(null);
        setCompressOriginalSize(compressFile.size);

        try {
            const { PDFDocument } = await import("pdf-lib");
            const srcBuffer = await compressFile.file.arrayBuffer();

            if (compressMode === "smart") {
                setCompressProgress("กำลังบีบอัดโครงสร้าง PDF...");
                const doc = await PDFDocument.load(srcBuffer);
                const bytes = await doc.save({ useObjectStreams: true });
                const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
                setCompressResult(blob);
                setCompressStatus("done");
                setCompressProgress("");
                return;
            }

            // rasterize mode
            const preset = COMPRESS_PRESETS[compressQuality];
            const scale = preset.dpi / 72;
            const pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.mjs", import.meta.url,
            ).toString();

            setCompressProgress("กำลังโหลด PDF...");
            const pdf = await pdfjs.getDocument({ data: srcBuffer }).promise;
            const total = pdf.numPages;
            const out = await PDFDocument.create();

            for (let i = 1; i <= total; i++) {
                setCompressProgress(`กำลังประมวลผลหน้า ${i}/${total}...`);
                let page;
                try {
                    page = await pdf.getPage(i);
                } catch {
                    throw new Error(`ไม่สามารถประมวลผลหน้า ${i}`);
                }
                const vp1 = page.getViewport({ scale: 1 });
                const widthPt = vp1.width;
                const heightPt = vp1.height;
                const vp = page.getViewport({ scale });
                const canvas = document.createElement("canvas");
                canvas.width = vp.width;
                canvas.height = vp.height;
                const ctx = canvas.getContext("2d")!;
                await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;

                const jpgBlob: Blob = await new Promise((resolve) =>
                    canvas.toBlob((b) => resolve(b!), "image/jpeg", preset.jpegQuality),
                );
                const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
                const embedded = await out.embedJpg(jpgBytes);
                const newPage = out.addPage([widthPt, heightPt]);
                newPage.drawImage(embedded, { x: 0, y: 0, width: widthPt, height: heightPt });

                canvas.width = 0;
                canvas.height = 0;
            }

            setCompressProgress("กำลังบันทึก...");
            const bytes = await out.save({ useObjectStreams: true });
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
            setCompressResult(blob);
            setCompressStatus("done");
            setCompressProgress("");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            const friendly = /encrypt|password/i.test(msg)
                ? "PDF นี้ถูกเข้ารหัส กรุณาปลดล็อกก่อนใช้งาน"
                : msg;
            setCompressError(friendly);
            setCompressStatus("error");
            setCompressProgress("");
        }
    }, [compressFile, compressMode, compressQuality]);

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
        { id: "merge",    label: "รวม PDF",        icon: <Layers      className="h-4 w-4" /> },
        { id: "split",    label: "แยกหน้า",         icon: <Scissors    className="h-4 w-4" /> },
        { id: "to-jpg",   label: "PDF → JPG",      icon: <ImageIcon   className="h-4 w-4" /> },
        { id: "organize", label: "จัดระเบียบ PDF",  icon: <LayoutGrid  className="h-4 w-4" /> },
        { id: "compress", label: "ลดขนาด PDF",     icon: <Minimize2   className="h-4 w-4" /> },
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
                        รวม PDF, แยกหน้า, จัดระเบียบ, ลดขนาด และแปลง PDF เป็นรูปภาพ JPG ประมวลผลในเครื่อง 100% ไม่อัปโหลดไปที่ใด
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
                                {mergeFiles.length > 0 ? (
                                    <>
                                        <p className="font-semibold">{mergeFiles.length} ไฟล์พร้อมรวม</p>
                                        <p className="text-sm text-muted-foreground">ลากไฟล์เพิ่ม หรือกด "เพิ่มไฟล์"</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก</p>
                                        <p className="text-sm text-muted-foreground">เลือกได้หลายไฟล์ • ปรับลำดับได้</p>
                                    </>
                                )}
                            </div>
                            <input ref={mergeInputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { addMergeFiles(e.target.files); e.target.value = ""; } }} />
                        </Card>

                        {mergeFiles.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        ลำดับไฟล์
                                        <span className="ml-2 text-red-500 normal-case font-semibold">({mergeFiles.length} ไฟล์)</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                                            onClick={() => mergeInputRef.current?.click()}>
                                            <Upload className="h-3.5 w-3.5" /> เพิ่มไฟล์
                                        </Button>
                                        <Button variant="ghost" size="sm"
                                            onClick={() => { setMergeFiles([]); setMergeThumbs(new Map()); setMergeResult(null); setMergeError(""); setMergeStatus("waiting"); }}
                                            className="text-xs text-muted-foreground hover:text-red-500">
                                            <Trash2 className="h-3 w-3 mr-1" /> ล้างทั้งหมด
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {mergeFiles.map((f, i) => (
                                        <div key={f.id} className="relative group flex flex-col rounded-xl border-2 border-border/40 overflow-hidden bg-muted/10 hover:border-red-500/40 transition-all">
                                            {/* Thumbnail */}
                                            <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center overflow-hidden">
                                                {mergeThumbs.get(f.id) ? (
                                                    <img src={mergeThumbs.get(f.id)} alt={f.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                                                )}
                                            </div>
                                            {/* Order badge */}
                                            <div className="absolute top-1.5 left-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                                                {i + 1}
                                            </div>
                                            {/* Delete button */}
                                            <button
                                                onClick={() => setMergeFiles((p) => p.filter((x) => x.id !== f.id))}
                                                className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
                                                title="ลบ"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                            </button>
                                            {/* Filename + move arrows */}
                                            <div className="p-2 flex flex-col gap-1">
                                                <p className="text-[10px] text-foreground font-medium truncate leading-tight" title={f.name}>{f.name}</p>
                                                <p className="text-[9px] text-muted-foreground">{formatBytes(f.size)}</p>
                                                <div className="flex gap-1 mt-0.5">
                                                    <button
                                                        onClick={() => moveMergeFile(i, -1)}
                                                        disabled={i === 0}
                                                        className="flex-1 flex items-center justify-center py-0.5 rounded bg-muted hover:bg-muted/80 disabled:opacity-20 transition-colors"
                                                        title="เลื่อนซ้าย"
                                                    >
                                                        <ChevronUp className="h-3 w-3 rotate-[-90deg]" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveMergeFile(i, 1)}
                                                        disabled={i === mergeFiles.length - 1}
                                                        className="flex-1 flex items-center justify-center py-0.5 rounded bg-muted hover:bg-muted/80 disabled:opacity-20 transition-colors"
                                                        title="เลื่อนขวา"
                                                    >
                                                        <ChevronDown className="h-3 w-3 rotate-[-90deg]" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runMerge} disabled={mergeStatus === "processing" || mergeFiles.length < 2}>
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
                            onClick={() => !splitFile && splitInputRef.current?.click()}
                            {...makeDragProps((files) => {
                                setSingleFile(files, setSplitFile);
                                setSplitResults([]); setSplitError(""); setSplitStatus("waiting");
                                const f = Array.from(files).find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
                                if (f) renderSplitThumbnails(f);
                            })}
                        >
                            <div className="p-8 flex flex-col items-center gap-3 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <Scissors className="h-7 w-7 text-red-500/70" />
                                </div>
                                {splitFile ? (
                                    <>
                                        <p className="font-semibold">{splitFile.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatBytes(splitFile.size)}{splitThumbnails.length > 0 && ` • ${splitThumbnails.length} หน้า`}
                                        </p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSplitFile(null); setSplitThumbnails([]); setSplitSelectedPages(new Set()); setSplitResults([]); setSplitError(""); setSplitStatus("waiting"); }}
                                            className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            เปลี่ยนไฟล์
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก</p>
                                        <p className="text-sm text-muted-foreground">รองรับ 1 ไฟล์</p>
                                    </>
                                )}
                            </div>
                            <input ref={splitInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => {
                                    if (e.target.files?.length) {
                                        setSingleFile(e.target.files, setSplitFile);
                                        setSplitResults([]); setSplitError(""); setSplitStatus("waiting");
                                        renderSplitThumbnails(e.target.files[0]);
                                        e.target.value = "";
                                    }
                                }} />
                        </Card>

                        {splitThumbLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด thumbnail...
                            </div>
                        )}

                        {splitThumbnails.length > 0 && (
                            <>
                                {/* Mode toggle */}
                                <div className="flex gap-2 p-1 bg-muted/40 rounded-xl">
                                    <button
                                        onClick={() => { setSplitMode("split"); setSplitResults([]); setSplitExtractResult(null); setSplitStatus("waiting"); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${splitMode === "split" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        แยกเป็นหลายไฟล์
                                    </button>
                                    <button
                                        onClick={() => { setSplitMode("extract"); setSplitResults([]); setSplitExtractResult(null); setSplitStatus("waiting"); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${splitMode === "extract" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        ตัดเป็นไฟล์เดียว
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground -mt-2 text-center">
                                    {splitMode === "split"
                                        ? "หน้าที่เลือกแต่ละหน้าจะได้เป็นไฟล์ PDF แยก"
                                        : "หน้าที่เลือกทั้งหมดจะรวมเป็น PDF ไฟล์เดียว"}
                                </p>

                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        เลือกหน้า
                                        <span className="ml-2 text-red-500 normal-case font-semibold">
                                            ({splitSelectedPages.size}/{splitThumbnails.length})
                                        </span>
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSplitSelectedPages(new Set(Array.from({ length: splitThumbnails.length }, (_, i) => i + 1)))}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            เลือกทั้งหมด
                                        </button>
                                        <span className="text-muted-foreground/30">|</span>
                                        <button
                                            onClick={() => setSplitSelectedPages(new Set())}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            ยกเลิกทั้งหมด
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {splitThumbnails.map((src, i) => {
                                        const pageNum = i + 1;
                                        const selected = splitSelectedPages.has(pageNum);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setSplitSelectedPages((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(pageNum)) next.delete(pageNum);
                                                    else next.add(pageNum);
                                                    return next;
                                                })}
                                                className={`relative rounded-lg overflow-hidden border-2 transition-all ${selected
                                                    ? "border-red-500 shadow-md shadow-red-500/20"
                                                    : "border-border/30 opacity-60 hover:opacity-90 hover:border-border"
                                                    }`}
                                            >
                                                <img src={src} alt={`หน้า ${pageNum}`} className="w-full block" />
                                                <div className={`absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold py-0.5 ${selected ? "bg-red-500 text-white" : "bg-black/40 text-white"}`}>
                                                    {pageNum}
                                                </div>
                                                {selected && (
                                                    <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                                                        <CheckCircle2 className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runSplit} disabled={splitStatus === "processing" || splitSelectedPages.size === 0}>
                                    {splitStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {splitProgress || "กำลังประมวลผล..."}</>
                                        : splitMode === "split"
                                            ? <><Scissors className="h-4 w-4" /> แยก {splitSelectedPages.size} หน้า เป็น {splitSelectedPages.size} ไฟล์</>
                                            : <><Scissors className="h-4 w-4" /> ตัด {splitSelectedPages.size} หน้า เป็น PDF เดียว</>
                                    }
                                </Button>

                                {splitError && (
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-2 items-start">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600">{splitError}</p>
                                    </div>
                                )}

                                {splitStatus === "done" && splitExtractResult && (
                                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">ตัดหน้าสำเร็จ</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(splitExtractResult.size)}</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                            onClick={() => triggerDownload(splitExtractResult!, "extracted.pdf")}>
                                            <Download className="h-3.5 w-3.5" /> ดาวน์โหลด
                                        </Button>
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

                {/* ── Tab: Organize ──────────────────────────── */}
                {activeTool === "organize" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <Card
                            className="border-2 border-dashed border-border/50 bg-muted/20 hover:border-red-500/30 transition-colors cursor-pointer"
                            onClick={() => orgInputRef.current?.click()}
                            {...makeDragProps(addOrgFiles)}
                        >
                            <div className="p-8 flex flex-col items-center gap-3 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <LayoutGrid className="h-7 w-7 text-red-500/70" />
                                </div>
                                {orgFiles.length > 0 ? (
                                    <>
                                        <p className="font-semibold">{orgFiles.length} ไฟล์ • {orgPages.length} หน้า</p>
                                        <p className="text-sm text-muted-foreground">ลากไฟล์เพิ่ม หรือใช้ปุ่มด้านล่าง</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก</p>
                                        <p className="text-sm text-muted-foreground">เลือกได้หลายไฟล์ • ลากหน้าเพื่อจัดลำดับ</p>
                                    </>
                                )}
                            </div>
                            <input ref={orgInputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { addOrgFiles(e.target.files); e.target.value = ""; } }} />
                        </Card>

                        {orgThumbLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด thumbnail...
                            </div>
                        )}

                        {orgPages.length > 0 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        หน้าทั้งหมด
                                        <span className="ml-2 text-red-500 normal-case font-semibold">({orgPages.length} หน้า)</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                                            onClick={() => orgInputRef.current?.click()}>
                                            <Upload className="h-3.5 w-3.5" /> เพิ่มไฟล์
                                        </Button>
                                        <Button variant="ghost" size="sm"
                                            onClick={() => { setOrgFiles([]); setOrgPages([]); setOrgResult(null); setOrgError(""); setOrgStatus("waiting"); }}
                                            className="text-xs text-muted-foreground hover:text-red-500">
                                            <Trash2 className="h-3 w-3 mr-1" /> ล้างทั้งหมด
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {orgPages.map((page, index) => (
                                        <div
                                            key={page.id}
                                            draggable
                                            onDragStart={() => { dragIndexRef.current = index; }}
                                            onDragOver={(e) => { e.preventDefault(); }}
                                            onDrop={() => {
                                                const from = dragIndexRef.current;
                                                if (from === null || from === index) return;
                                                setOrgPages((prev) => {
                                                    const arr = [...prev];
                                                    const [removed] = arr.splice(from, 1);
                                                    arr.splice(index, 0, removed);
                                                    return arr;
                                                });
                                                dragIndexRef.current = null;
                                            }}
                                            className="relative rounded-lg overflow-hidden border-2 border-border/30 hover:border-red-500/40 transition-all cursor-grab active:cursor-grabbing group"
                                            title={`${page.sourceName} — หน้า ${page.pageNum}`}
                                        >
                                            <img src={page.thumbUrl} alt={`หน้า ${index + 1}`} className="w-full block pointer-events-none" />
                                            <div className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold py-0.5 bg-black/50 text-white">
                                                {index + 1}
                                            </div>
                                            <div className="absolute top-0 left-0 right-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                                                <GripVertical className="h-3 w-3 text-white drop-shadow" />
                                            </div>
                                            <button
                                                onClick={() => setOrgPages((prev) => prev.filter((_, i) => i !== index))}
                                                className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                                                title="ลบหน้านี้"
                                            >
                                                <XCircle className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runOrganize} disabled={orgStatus === "processing" || orgPages.length === 0}>
                                    {orgStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {orgProgress || "กำลังสร้าง..."}</>
                                        : <><LayoutGrid className="h-4 w-4" /> สร้าง PDF ที่จัดระเบียบแล้ว ({orgPages.length} หน้า)</>}
                                </Button>

                                {orgError && (
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-2 items-start">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600">{orgError}</p>
                                    </div>
                                )}

                                {orgStatus === "done" && orgResult && (
                                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">สร้าง PDF สำเร็จ</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(orgResult.size)}</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                            onClick={() => triggerDownload(orgResult!, "organized.pdf")}>
                                            <Download className="h-3.5 w-3.5" /> ดาวน์โหลด
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── Tab: Compress ──────────────────────────── */}
                {activeTool === "compress" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <Card
                            className="border-2 border-dashed border-border/50 bg-muted/20 hover:border-red-500/30 transition-colors cursor-pointer"
                            onClick={() => compressInputRef.current?.click()}
                            {...makeDragProps((files) => {
                                setSingleFile(files, setCompressFile);
                                setCompressResult(null); setCompressError(""); setCompressStatus("waiting");
                            })}
                        >
                            <div className="p-8 flex flex-col items-center gap-3 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <Minimize2 className="h-7 w-7 text-red-500/70" />
                                </div>
                                {compressFile ? (
                                    <>
                                        <p className="font-semibold">{compressFile.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatBytes(compressFile.size)}</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCompressFile(null); setCompressResult(null); setCompressError(""); setCompressStatus("waiting"); }}
                                            className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            เปลี่ยนไฟล์
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">ลากไฟล์ PDF มาวาง หรือคลิกเพื่อเลือก</p>
                                        <p className="text-sm text-muted-foreground">ระบบจะลดขนาดไฟล์ให้เล็กลง</p>
                                    </>
                                )}
                            </div>
                            <input ref={compressInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { setSingleFile(e.target.files, setCompressFile); e.target.value = ""; setCompressResult(null); setCompressError(""); setCompressStatus("waiting"); } }} />
                        </Card>

                        {compressFile && (
                            <p className="text-xs text-muted-foreground text-center -mt-2">
                                แนะนำไม่เกิน 100 หน้าต่อครั้ง
                            </p>
                        )}

                        {compressFile && (
                            <>
                                {/* Mode toggle */}
                                <div className="flex gap-2 p-1 bg-muted/40 rounded-xl">
                                    <button
                                        onClick={() => { setCompressMode("rasterize"); setCompressResult(null); setCompressStatus("waiting"); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${compressMode === "rasterize" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        ลดขนาดสูงสุด
                                    </button>
                                    <button
                                        onClick={() => { setCompressMode("smart"); setCompressResult(null); setCompressStatus("waiting"); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${compressMode === "smart" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        รักษาข้อความ
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground -mt-2 text-center">
                                    {compressMode === "rasterize"
                                        ? "เปลี่ยนแต่ละหน้าเป็นภาพ • เหมาะกับเอกสารสแกน • ข้อความคัดลอกไม่ได้"
                                        : "คงข้อความคัดลอกได้ • ลดได้น้อย ≈ 1–10%"}
                                </p>

                                {compressMode === "rasterize" && (
                                    <Card className="p-5 border-border/50 space-y-3">
                                        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">คุณภาพ</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(["low", "medium", "high"] as CompressQuality[]).map((q) => {
                                                const preset = COMPRESS_PRESETS[q];
                                                const active = compressQuality === q;
                                                return (
                                                    <button
                                                        key={q}
                                                        onClick={() => { setCompressQuality(q); setCompressResult(null); setCompressStatus("waiting"); }}
                                                        className={`py-3 px-2 rounded-lg text-sm font-semibold transition-all border-2 ${active
                                                            ? "border-red-500 bg-red-500/10 text-foreground"
                                                            : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                                                            }`}
                                                    >
                                                        {preset.label}
                                                        <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                                                            {preset.dpi} DPI
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {COMPRESS_PRESETS[compressQuality].hint}
                                        </p>
                                    </Card>
                                )}

                                {compressMode === "smart" && (
                                    <p className="text-xs text-muted-foreground text-center px-2">
                                        โหมด Smart ลดขนาดด้วย object stream compression เท่านั้น (ประมาณ 1–10%) ไม่มีการตั้งค่าเพิ่ม
                                    </p>
                                )}

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runCompress} disabled={compressStatus === "processing"}>
                                    {compressStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {compressProgress || "กำลังลดขนาด..."}</>
                                        : <><Minimize2 className="h-4 w-4" /> ลดขนาด PDF</>}
                                </Button>

                                {compressError && (
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-2 items-start">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600">{compressError}</p>
                                    </div>
                                )}

                                {compressStatus === "done" && compressResult && (() => {
                                    const newSize = compressResult.size;
                                    const reduced = compressOriginalSize > 0 && newSize < compressOriginalSize;
                                    const pct = compressOriginalSize > 0
                                        ? ((1 - newSize / compressOriginalSize) * 100).toFixed(1)
                                        : "0";
                                    return (
                                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                                                    ลดขนาดสำเร็จ
                                                    {reduced ? (
                                                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">
                                                            ลดลง {pct}%
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            ขนาดใกล้เคียงเดิม
                                                        </Badge>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {formatBytes(compressOriginalSize)} → {formatBytes(newSize)}
                                                </p>
                                            </div>
                                            <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                                onClick={() => triggerDownload(compressResult!, "compressed.pdf")}>
                                                <Download className="h-3.5 w-3.5" /> ดาวน์โหลด
                                            </Button>
                                        </div>
                                    );
                                })()}
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
                                เครื่องมือนี้รวม <strong className="text-foreground">5 ฟีเจอร์หลัก</strong>สำหรับจัดการ PDF ไว้ในที่เดียว โดยทำงานทั้งหมดภายในเบราว์เซอร์ของคุณผ่าน <strong className="text-foreground">pdf-lib</strong> และ <strong className="text-foreground">pdfjs-dist</strong> ซึ่งเป็น library ระดับโปรที่ไม่ต้องการ server เลย ไฟล์ PDF ของคุณจะไม่ถูกส่งออกไปที่ใดทั้งสิ้น
                            </p>
                            <p>
                                <strong className="text-foreground">รวม PDF (Merge)</strong> ช่วยให้นำ PDF หลายไฟล์มาเชื่อมต่อกันเป็นไฟล์เดียว พร้อมปรับลำดับได้ตามต้องการ เหมาะสำหรับการรวมรายงาน สัญญา หรือเอกสารหลายชุดเข้าด้วยกัน
                            </p>
                            <p>
                                <strong className="text-foreground">แยกหน้า (Split)</strong> ช่วยตัดบางหน้าออกจาก PDF เป็นไฟล์ PDF ย่อยแยกกัน เลือกหน้าโดยคลิก thumbnail ได้เลย รองรับทั้งโหมดแยกเป็นหลายไฟล์และตัดรวมเป็นไฟล์เดียว
                            </p>
                            <p>
                                <strong className="text-foreground">PDF → JPG</strong> แปลงแต่ละหน้าของ PDF ให้เป็นรูปภาพ JPG ความละเอียดสูง (192 DPI) เหมาะสำหรับการนำหน้า PDF ไปใช้ใน presentation, โซเชียลมีเดีย หรือแนบในอีเมล
                            </p>
                            <p>
                                <strong className="text-foreground">จัดระเบียบ PDF (Organizer)</strong> ช่วยให้จัดเรียงหน้า PDF ใหม่ได้อย่างอิสระด้วยการลากและวาง thumbnail ของแต่ละหน้า ลบหน้าที่ไม่ต้องการ หรือนำหลาย PDF มารวมกันแล้วจัดลำดับหน้าก่อน Export เป็นไฟล์เดียว
                            </p>
                            <p>
                                <strong className="text-foreground">ลดขนาด PDF (Compress)</strong> ช่วยลดขนาดไฟล์ PDF ให้เล็กลงเพื่อแนบอีเมลหรืออัปโหลดได้ง่าย เลือกได้สองโหมด — Rasterize (ลดได้ 50–90% เปลี่ยนหน้าเป็นภาพ JPEG) สำหรับเอกสารสแกน หรือ Smart (ลดได้ 1–10% รักษาข้อความให้คัดลอกได้) สำหรับเอกสารข้อความ
                            </p>
                        </div>
                    </section>

                    {/* Section 2: วิธีใช้งาน */}
                    <section aria-labelledby="howto-heading">
                        <h2 id="howto-heading" className="text-xl font-bold tracking-tight mb-6">
                            วิธีใช้งานแต่ละฟีเจอร์
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                {
                                    icon: <Layers className="h-4 w-4 text-red-500" />,
                                    title: "รวม PDF",
                                    steps: ["ลากไฟล์ PDF หลายไฟล์ลงในกล่อง", "ดู thumbnail แล้วกดลูกศร ◀▶ ปรับลำดับ", "กดรวม PDF แล้วดาวน์โหลด"],
                                },
                                {
                                    icon: <Scissors className="h-4 w-4 text-red-500" />,
                                    title: "แยกหน้า",
                                    steps: ["ลาก PDF ไฟล์เดียวลงในกล่อง", "คลิก thumbnail เลือกหน้าที่ต้องการ", "กดแยกหน้า → ดาวน์โหลดแยกหรือ ZIP"],
                                },
                                {
                                    icon: <ImageIcon className="h-4 w-4 text-red-500" />,
                                    title: "PDF → JPG",
                                    steps: ["ลาก PDF ไฟล์เดียวลงในกล่อง", "ปรับ Quality ตามต้องการ (50–100)", "กดแปลง → preview และดาวน์โหลด"],
                                },
                                {
                                    icon: <LayoutGrid className="h-4 w-4 text-red-500" />,
                                    title: "จัดระเบียบ PDF",
                                    steps: ["ลาก PDF หนึ่งหรือหลายไฟล์ลงในกล่อง", "ลาก thumbnail เพื่อจัดเรียงหน้า หรือกด ✕ เพื่อลบ", "กดสร้าง PDF แล้วดาวน์โหลดไฟล์ที่จัดระเบียบแล้ว"],
                                },
                                {
                                    icon: <Minimize2 className="h-4 w-4 text-red-500" />,
                                    title: "ลดขนาด PDF",
                                    steps: ["ลาก PDF ไฟล์เดียวลงในกล่อง", "เลือกโหมด Rasterize/Smart และระดับคุณภาพ", "กดลดขนาด → ดูอัตราการลดและดาวน์โหลด"],
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
                                ทั้ง <strong className="text-foreground">pdf-lib</strong> (สำหรับ Merge/Split/Compress) และ <strong className="text-foreground">pdfjs-dist</strong> (สำหรับ PDF→JPG และ Compress) รันทั้งหมดภายใน browser sandbox ของคุณ ไฟล์ PDF ถูกโหลดเข้า RAM ประมวลผล และส่งออกมาโดยไม่มีการส่ง network request ใดๆ ออกไป ไม่มีการเก็บ log ไม่มี cookie และไม่มีการติดตามเนื้อหาในไฟล์ของคุณ
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
