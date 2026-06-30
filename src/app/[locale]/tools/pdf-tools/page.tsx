"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdUnit } from "@/components/ad-unit";
import { Link } from "@/i18n/routing";
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

const COMPRESS_PRESETS: Record<CompressQuality, { dpi: number; jpegQuality: number }> = {
    low:    { dpi: 96,  jpegQuality: 0.60 },
    medium: { dpi: 144, jpegQuality: 0.75 },
    high:   { dpi: 200, jpegQuality: 0.90 },
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

/* ─── Helpers for translation ───────────────────────────── */

function translateProgress(msg: string, t: any): string {
    if (!msg) return msg;
    if (msg.includes("กำลังรวมไฟล์ PDF...")) return t("worker.mergingPdf");
    if (msg.includes("กำลังประมวลผลไฟล์")) {
        const match = msg.match(/กำลังประมวลผลไฟล์\s+(\d+\/\d+)/);
        if (match) return t("worker.processingFile", { progress: match[1] });
        return msg;
    }
    if (msg.includes("กำลังสร้างไฟล์ผลลัพธ์...")) return t("worker.generatingResult");
    if (msg.includes("กำลังโหลด PDF...")) return t("worker.loadingPdf");
    if (msg.includes("กำลังแยกหน้า")) {
        const match = msg.match(/กำลังแยกหน้า\s+(\d+\/\d+)/);
        if (match) return t("worker.splittingPage", { progress: match[1] });
        return msg;
    }
    if (msg.includes("กำลังรวมหน้า")) {
        const match = msg.match(/กำลังรวมหน้า\s+(\d+\/\d+)/);
        if (match) return t("worker.mergingPage", { progress: match[1] });
        return msg;
    }
    if (msg.includes("กำลังสร้าง PDF...")) return t("worker.generatingPdf");
    if (msg.includes("กำลังประมวลผลหน้า")) {
        const match = msg.match(/กำลังประมวลผลหน้า\s+(\d+\/\d+)/);
        if (match) return t("worker.processingPage", { progress: match[1] });
        return msg;
    }
    if (msg.includes("กำลังบันทึกไฟล์...")) return t("worker.savingFile");
    if (msg.includes("กำลังบีบอัดโครงสร้าง PDF...")) return t("worker.compressingStructure");
    if (msg.includes("กำลังบันทึก...")) return t("compressSaving");
    return msg;
}

/* ─── Component ─────────────────────────────────────────── */

export default function PdfToolsPage() {
    const t = useTranslations("PdfTools");
    const locale = useLocale();
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

            setJpgProgress(t("jpgLoadingPdf"));
            const buffer = await jpgFile.file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: buffer }).promise;
            const total = pdf.numPages;
            const results: JpgResult[] = [];

            for (let i = 1; i <= total; i++) {
                setJpgProgress(t("jpgConvertingPage", { current: i, total }));
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
            setJpgError(err instanceof Error ? err.message : t("jpgErrorConverting"));
            setJpgStatus("error");
            setJpgProgress("");
        }
    }, [jpgFile, jpgQuality, t]);

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
                setCompressProgress(t("worker.compressingStructure"));
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

            setCompressProgress(t("compressLoadingPdf"));
            const pdf = await pdfjs.getDocument({ data: srcBuffer }).promise;
            const total = pdf.numPages;
            const out = await PDFDocument.create();

            for (let i = 1; i <= total; i++) {
                setCompressProgress(t("compressProcessingPage", { current: i, total }));
                let page;
                try {
                    page = await pdf.getPage(i);
                } catch {
                    throw new Error(t("compressProcessingPageError", { pageNum: i }));
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

            setCompressProgress(t("compressSaving"));
            const bytes = await out.save({ useObjectStreams: true });
            const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
            setCompressResult(blob);
            setCompressStatus("done");
            setCompressProgress("");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t("compressErrorDefault");
            const friendly = /encrypt|password/i.test(msg)
                ? t("compressEncrypted")
                : msg;
            setCompressError(friendly);
            setCompressStatus("error");
            setCompressProgress("");
        }
    }, [compressFile, compressMode, compressQuality, t]);

    /* ── FAQ JSON-LD ──────────────────────────── */

    const faqItems = [
        {
            question: t("faqItems.0.question"),
            answer: t("faqItems.0.answer"),
        },
        {
            question: t("faqItems.1.question"),
            answer: t("faqItems.1.answer"),
        },
        {
            question: t("faqItems.2.question"),
            answer: t("faqItems.2.answer"),
        },
        {
            question: t("faqItems.3.question"),
            answer: t("faqItems.3.answer"),
        },
        {
            question: t("faqItems.4.question"),
            answer: t("faqItems.4.answer"),
        },
        {
            question: t("faqItems.5.question"),
            answer: t("faqItems.5.answer"),
        },
        {
            question: t("faqItems.6.question"),
            answer: t("faqItems.6.answer"),
        },
    ];

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems.map((item) => ({
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
        { id: "merge",    label: t("tabMerge"),        icon: <Layers      className="h-4 w-4" /> },
        { id: "split",    label: t("tabSplit"),         icon: <Scissors    className="h-4 w-4" /> },
        { id: "to-jpg",   label: t("tabToJpg"),      icon: <ImageIcon   className="h-4 w-4" /> },
        { id: "organize", label: t("tabOrganize"),  icon: <LayoutGrid  className="h-4 w-4" /> },
        { id: "compress", label: t("tabCompress"),     icon: <Minimize2   className="h-4 w-4" /> },
    ];

    const softwareAppJsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "PDF Tools",
        "operatingSystem": "All",
        "applicationCategory": "UtilityApplication",
        "browserRequirements": "Requires HTML5, Web Browser, WebAssembly",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        }
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `https://yuukub.com/${locale}/` },
            { "@type": "ListItem", "position": 2, "name": "Tools", "item": `https://yuukub.com/${locale}/tools/` },
            { "@type": "ListItem", "position": 3, "name": "PDF Tools", "item": `https://yuukub.com/${locale}/tools/pdf-tools/` }
        ]
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, softwareAppJsonLd, breadcrumbJsonLd]) }}
            />
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-3xl">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/tools/" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
                        <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToTools")}
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">PDF Tools</h1>
                    </div>
                    <p className="text-muted-foreground">
                        {t("headerDesc")}
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
                                        <p className="font-semibold">{t("mergeReadyFiles", { count: mergeFiles.length })}</p>
                                        <p className="text-sm text-muted-foreground">{t("mergeDragMore")}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">{t("mergeDragDrop")}</p>
                                        <p className="text-sm text-muted-foreground">{t("mergeSelectMultiple")}</p>
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
                                        {t("mergeOrder")}
                                        <span className="ml-2 text-red-500 normal-case font-semibold">{t("mergeCount", { count: mergeFiles.length })}</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                                            onClick={() => mergeInputRef.current?.click()}>
                                            <Upload className="h-3.5 w-3.5" /> {t("mergeAddFile")}
                                        </Button>
                                        <Button variant="ghost" size="sm"
                                            onClick={() => { setMergeFiles([]); setMergeThumbs(new Map()); setMergeResult(null); setMergeError(""); setMergeStatus("waiting"); }}
                                            className="text-xs text-muted-foreground hover:text-red-500">
                                            <Trash2 className="h-3 w-3 mr-1" /> {t("mergeClearAll")}
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
                                                title={t("mergeDelete")}
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
                                                        title={t("mergeMoveLeft")}
                                                    >
                                                        <ChevronUp className="h-3 w-3 rotate-[-90deg]" />
                                                    </button>
                                                    <button
                                                        onClick={() => moveMergeFile(i, 1)}
                                                        disabled={i === mergeFiles.length - 1}
                                                        className="flex-1 flex items-center justify-center py-0.5 rounded bg-muted hover:bg-muted/80 disabled:opacity-20 transition-colors"
                                                        title={t("mergeMoveRight")}
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
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {translateProgress(mergeProgress, t) || t("mergeProgressLoading")}</>
                                        : <><Layers className="h-4 w-4" /> {t("mergeBtn", { count: mergeFiles.length })}</>}
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
                                            <p className="text-sm font-semibold">{t("mergeSuccess")}</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(mergeResult.size)}</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                            onClick={() => triggerDownload(mergeResult!, "merged.pdf")}>
                                            <Download className="h-3.5 w-3.5" /> {t("mergeDownload")}
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
                                            {formatBytes(splitFile.size)}{splitThumbnails.length > 0 && ` • ${t("pagesCount", { count: splitThumbnails.length })}`}
                                        </p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSplitFile(null); setSplitThumbnails([]); setSplitSelectedPages(new Set()); setSplitResults([]); setSplitError(""); setSplitStatus("waiting"); }}
                                            className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            {t("splitChangeFile")}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">{t("splitDragDrop")}</p>
                                        <p className="text-sm text-muted-foreground">{t("splitSupportOne")}</p>
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
                                <Loader2 className="h-4 w-4 animate-spin" /> {t("splitLoadingThumb")}
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
                                        {t("splitModeSplit")}
                                    </button>
                                    <button
                                        onClick={() => { setSplitMode("extract"); setSplitResults([]); setSplitExtractResult(null); setSplitStatus("waiting"); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${splitMode === "extract" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        {t("splitModeExtract")}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground -mt-2 text-center">
                                    {splitMode === "split"
                                        ? t("splitDescSplit")
                                        : t("splitDescExtract")}
                                </p>

                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("splitSelectPages")}
                                        <span className="ml-2 text-red-500 normal-case font-semibold">
                                            ({splitSelectedPages.size}/{splitThumbnails.length})
                                        </span>
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSplitSelectedPages(new Set(Array.from({ length: splitThumbnails.length }, (_, i) => i + 1)))}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {t("splitSelectAll")}
                                        </button>
                                        <span className="text-muted-foreground/30">|</span>
                                        <button
                                            onClick={() => setSplitSelectedPages(new Set())}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {t("splitClearAll")}
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
                                                <img src={src} alt={t("splitPageAlt", { pageNum })} className="w-full block" />
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
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {translateProgress(splitProgress, t) || t("splitProcessing")}</>
                                        : splitMode === "split"
                                            ? <><Scissors className="h-4 w-4" /> {t("splitBtnSplit", { count: splitSelectedPages.size })}</>
                                            : <><Scissors className="h-4 w-4" /> {t("splitBtnExtract", { count: splitSelectedPages.size })}</>
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
                                            <p className="text-sm font-semibold">{t("splitSuccess")}</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(splitExtractResult.size)}</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                            onClick={() => triggerDownload(splitExtractResult!, "extracted.pdf")}>
                                            <Download className="h-3.5 w-3.5" /> {t("splitDownload")}
                                        </Button>
                                    </div>
                                )}

                                {splitStatus === "done" && splitResults.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t("splitResultsCount", { count: splitResults.length })}
                                            </p>
                                            {splitResults.length > 1 && (
                                                <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                                                    onClick={() => downloadZip(splitResults, "split-pages.zip")}>
                                                    <PackageOpen className="h-3.5 w-3.5" /> {t("splitZipAll")}
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
                                        <p className="font-semibold">{t("jpgDragDrop")}</p>
                                        <p className="text-sm text-muted-foreground">{t("jpgEachPage")}</p>
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
                                            {t("jpgQualityLabel")} <span className="text-red-500 font-bold text-lg ml-1">{jpgQuality}</span>
                                        </label>
                                        <span className="text-xs text-muted-foreground">{t("jpgQualityHint")}</span>
                                    </div>
                                    <input type="range" min="50" max="100" value={jpgQuality}
                                        onChange={(e) => setJpgQuality(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500"
                                    />
                                </Card>

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runToJpg} disabled={jpgStatus === "processing"}>
                                    {jpgStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {translateProgress(jpgProgress, t) || t("jpgProgressLoading")}</>
                                        : <><ImageIcon className="h-4 w-4" /> {t("jpgBtn")}</>}
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
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t("pagesCount", { count: jpgResults.length })}
                                            </p>
                                            {jpgResults.length > 1 && (
                                                <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                                                    onClick={() => downloadZip(jpgResults, "pdf-to-jpg.zip")}>
                                                    <PackageOpen className="h-3.5 w-3.5" /> {t("jpgZipAll")}
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {jpgResults.map((r) => (
                                                <div key={r.pageNum} className="group relative rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                                                    <img src={r.previewUrl} alt={t("jpgPageAlt", { pageNum: r.pageNum })} className="w-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                        <Button size="sm" variant="secondary"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 text-xs shadow-lg"
                                                            onClick={() => triggerDownload(r.blob, r.filename)}>
                                                            <Download className="h-3.5 w-3.5" /> {t("jpgPageText", { pageNum: r.pageNum })}
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
                                        <p className="font-semibold">{t("orgFilesCount", { files: orgFiles.length })} • {t("pagesCount", { count: orgPages.length })}</p>
                                        <p className="text-sm text-muted-foreground">{t("orgDragMore")}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">{t("orgDragDrop")}</p>
                                        <p className="text-sm text-muted-foreground">{t("orgSelectMultiple")}</p>
                                    </>
                                )}
                            </div>
                            <input ref={orgInputRef} type="file" multiple accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { addOrgFiles(e.target.files); e.target.value = ""; } }} />
                        </Card>

                        {orgThumbLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> {t("orgLoadingThumb")}
                            </div>
                        )}

                        {orgPages.length > 0 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("orgAllPages")}
                                        <span className="ml-2 text-red-500 normal-case font-semibold">{t("orgCount", { count: orgPages.length })}</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                                            onClick={() => orgInputRef.current?.click()}>
                                            <Upload className="h-3.5 w-3.5" /> {t("orgAddFile")}
                                        </Button>
                                        <Button variant="ghost" size="sm"
                                            onClick={() => { setOrgFiles([]); setOrgPages([]); setOrgResult(null); setOrgError(""); setOrgStatus("waiting"); }}
                                            className="text-xs text-muted-foreground hover:text-red-500">
                                            <Trash2 className="h-3 w-3 mr-1" /> {t("orgClearAll")}
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
                                            title={`${page.sourceName} — ${t("orgPageText", { pageNum: page.pageNum })}`}
                                        >
                                            <img src={page.thumbUrl} alt={t("orgPageAlt", { pageNum: index + 1 })} className="w-full block pointer-events-none" />
                                            <div className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-bold py-0.5 bg-black/50 text-white">
                                                {index + 1}
                                            </div>
                                            <div className="absolute top-0 left-0 right-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                                                <GripVertical className="h-3 w-3 text-white drop-shadow" />
                                            </div>
                                            <button
                                                onClick={() => setOrgPages((prev) => prev.filter((_, i) => i !== index))}
                                                className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                                                title={t("orgDeletePage")}
                                            >
                                                <XCircle className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runOrganize} disabled={orgStatus === "processing" || orgPages.length === 0}>
                                    {orgStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {translateProgress(orgProgress, t) || t("orgGenerating")}</>
                                        : <><LayoutGrid className="h-4 w-4" /> {t("orgBtn", { count: orgPages.length })}</>}
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
                                            <p className="text-sm font-semibold">{t("orgSuccess")}</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(orgResult.size)}</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                            onClick={() => triggerDownload(orgResult!, "organized.pdf")}>
                                            <Download className="h-3.5 w-3.5" /> {t("orgDownload")}
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
                                            {t("compressChangeFile")}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-semibold">{t("compressDragDrop")}</p>
                                        <p className="text-sm text-muted-foreground">{t("compressDesc")}</p>
                                    </>
                                )}
                            </div>
                            <input ref={compressInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                                onChange={(e) => { if (e.target.files?.length) { setSingleFile(e.target.files, setCompressFile); e.target.value = ""; setCompressResult(null); setCompressError(""); setCompressStatus("waiting"); } }} />
                        </Card>

                        {compressFile && (
                            <p className="text-xs text-muted-foreground text-center -mt-2">
                                {t("compressLimitHint")}
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
                                        {t("compressModeRasterize")}
                                    </button>
                                    <button
                                        onClick={() => { setCompressMode("smart"); setCompressResult(null); setCompressStatus("waiting"); }}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${compressMode === "smart" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                                    >
                                        {t("compressModeSmart")}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground -mt-2 text-center">
                                    {compressMode === "rasterize"
                                        ? t("compressRasterizeDesc")
                                        : t("compressSmartDesc")}
                                </p>

                                {compressMode === "rasterize" && (
                                    <Card className="p-5 border-border/50 space-y-3">
                                        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("compressQualityLabel")}</p>
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
                                                        {t(`presets.${q}.label`)}
                                                        <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                                                            {preset.dpi} DPI
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {t(`presets.${compressQuality}.hint`)}
                                        </p>
                                    </Card>
                                )}

                                {compressMode === "smart" && (
                                    <p className="text-xs text-muted-foreground text-center px-2">
                                        {t("compressSmartNoSettings")}
                                    </p>
                                )}

                                <Button className="w-full h-11 font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={runCompress} disabled={compressStatus === "processing"}>
                                    {compressStatus === "processing"
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> {translateProgress(compressProgress, t) || t("compressProgress")}</>
                                        : <><Minimize2 className="h-4 w-4" /> {t("compressBtn")}</>}
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
                                                    {t("compressSuccess")}
                                                    {reduced ? (
                                                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">
                                                            {t("compressReduced", { pct })}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                            {t("compressNoChange")}
                                                        </Badge>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {formatBytes(compressOriginalSize)} → {formatBytes(newSize)}
                                                </p>
                                            </div>
                                            <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                                                onClick={() => triggerDownload(compressResult!, "compressed.pdf")}>
                                                <Download className="h-3.5 w-3.5" /> {t("compressDownload")}
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
                        {t("privacyNote")}
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
                                {t("seoIntroTitle")}
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                {t.rich("seoIntroDesc1", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                            </p>
                            <p>
                                {t.rich("seoIntroDesc2", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                            </p>
                            <p>
                                {t.rich("seoIntroDesc3", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                            </p>
                            <p>
                                {t.rich("seoIntroDesc4", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                            </p>
                            <p>
                                {t.rich("seoIntroDesc5", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                            </p>
                            <p>
                                {t.rich("seoIntroDesc6", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
                            </p>
                        </div>
                    </section>

                    {/* Section 2: วิธีใช้งาน */}
                    <section aria-labelledby="howto-heading">
                        <h2 id="howto-heading" className="text-xl font-bold tracking-tight mb-6">
                            {t("seoHowtoTitle")}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {([
                                { key: "merge", icon: <Layers className="h-4 w-4 text-red-500" /> },
                                { key: "split", icon: <Scissors className="h-4 w-4 text-red-500" /> },
                                { key: "toJpg", icon: <ImageIcon className="h-4 w-4 text-red-500" /> },
                                { key: "organize", icon: <LayoutGrid className="h-4 w-4 text-red-500" /> },
                                { key: "compress", icon: <Minimize2 className="h-4 w-4 text-red-500" /> },
                            ] as const).map((item) => (
                                <Card key={item.key} className="p-5 border-border/50 bg-muted/20 flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        {item.icon}
                                        <span className="font-semibold text-sm">{t(`seoHowtoItems.${item.key}.title`)}</span>
                                    </div>
                                    <ol className="space-y-1.5">
                                        {[0, 1, 2].map((i) => (
                                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                                <span className="h-4 w-4 rounded-full bg-red-500/10 text-red-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                                    {i + 1}
                                                </span>
                                                {t(`seoHowtoItems.${item.key}.steps.${i}`)}
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
                                {t("seoFaqTitle")}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {faqItems.map((item, i) => (
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
                                    {t("seoPrivacyTitle")}
                                </h2>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t.rich("seoPrivacyDesc", { strong: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
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
