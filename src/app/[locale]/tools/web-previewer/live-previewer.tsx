"use client";

import { useState, useEffect, useRef, ChangeEvent, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AdUnit } from "@/components/ad-unit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Monitor,
    Smartphone,
    Tablet,
    Upload,
    Eye,
    EyeOff,
    Code2,
    Maximize2,
    Minimize2,
    ArrowLeft,
    Share2,
    Copy,
    Check,
    X,
    Loader2,
    RotateCcw,
    MousePointerClick
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { saveSnippet, loadSnippet, getClientIp } from "@/lib/supabase-snippets";

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <!-- นำเข้าฟอนต์ Google Sans -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet">
</head>
<body>
    <h1>Hello World</h1>
    <p>เริ่มเขียนโค้ดของคุณที่นี่ หรือวางโค้ดที่ต้องการทดสอบได้เลย</p>
</body>
</html>`;

const DEFAULT_CSS = `/* เขียน CSS ของคุณที่นี่ */
body {
    /* ใช้ฟอนต์ Google Sans */
    font-family: "Google Sans", sans-serif;
    font-optical-sizing: auto;
    font-style: normal;
    font-variation-settings: "GRAD" 0;
    margin: 0;
    padding: 20px;
}`;

const DEFAULT_JS = `// เขียน JavaScript ของคุณที่นี่
console.log("Preview Ready!");`;

type ViewportMode = "desktop" | "tablet" | "mobile";
type EditorTab = "html" | "css" | "js";

// --- LocalStorage Keys ---
const LS_KEY_HTML = "webpreviewer_html";
const LS_KEY_CSS = "webpreviewer_css";
const LS_KEY_JS = "webpreviewer_js";

function loadDraft(key: string, fallback: string): string {
    if (typeof window === "undefined") return fallback;
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

export function LiveWebPreviewer() {
    const [html, setHtml] = useState(() => loadDraft(LS_KEY_HTML, DEFAULT_HTML));
    const [css, setCss] = useState(() => loadDraft(LS_KEY_CSS, DEFAULT_CSS));
    const [js, setJs] = useState(() => loadDraft(LS_KEY_JS, DEFAULT_JS));
    const [debouncedHtml, setDebouncedHtml] = useState(() => loadDraft(LS_KEY_HTML, DEFAULT_HTML));
    const [debouncedCss, setDebouncedCss] = useState(() => loadDraft(LS_KEY_CSS, DEFAULT_CSS));
    const [debouncedJs, setDebouncedJs] = useState(() => loadDraft(LS_KEY_JS, DEFAULT_JS));
    const [viewport, setViewport] = useState<ViewportMode>("desktop");
    const [showEditor, setShowEditor] = useState(true);
    const [activeTab, setActiveTab] = useState<EditorTab>("html");
    const [isHorizontal, setIsHorizontal] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isInspectMode, setIsInspectMode] = useState(false);
    const [inspectedEl, setInspectedEl] = useState<{ tag: string; classes: string[]; width: number; height: number } | null>(null);
    const [cssJumpResult, setCssJumpResult] = useState<{
        className: string;
        matches: { tab: 'css' | 'html'; line: number; preview: string }[];
        notFound: boolean;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);
    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const isLoadingFromShareRef = useRef(false);

    // --- Share Feature State ---
    const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [shareUrl, setShareUrl] = useState<string>("");
    const [shareError, setShareError] = useState<string>("");
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loadedFromShare, setLoadedFromShare] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    // Debounce to prevent lag while typing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedHtml(html);
            setDebouncedCss(css);
            setDebouncedJs(js);
        }, 500);
        return () => clearTimeout(handler);
    }, [html, css, js]);

    // --- Load shared snippet from URL on mount ---
    useEffect(() => {
        const snippetId = searchParams.get("id");
        if (!snippetId) return;

        (async () => {
            const result = await loadSnippet(snippetId);
            if ("error" in result) {
                setShareError(result.error);
                setShowShareModal(true);
                return;
            }
            // Bug #2: ตั้ง flag ก่อนเซ็ต state เพื่อป้องกัน shareUrl reset
            isLoadingFromShareRef.current = true;
            setHtml(result.html_code);
            setCss(result.css_code);
            setJs(result.js_code);
            // Bug #1: เซ็ต debounced state ทันทีเพื่อป้องกัน preview flash
            setDebouncedHtml(result.html_code);
            setDebouncedCss(result.css_code);
            setDebouncedJs(result.js_code);
            setLoadedFromShare(true);
            // Bug #2: สร้าง shareUrl ทันทีเพื่อให้กด Share ซ้ำไม่ต้องสร้างใหม่
            setShareUrl(`${window.location.origin}${window.location.pathname}?id=${snippetId}`);
            // รอให้ state update เสร็จแล้วค่อยปลด flag
            setTimeout(() => { isLoadingFromShareRef.current = false; }, 100);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // รีเซ็ต shareUrl ทุกครั้งที่โค้ดเปลี่ยน เพื่อบังคับสร้าง snippet ใหม่
    // Bug #2: ข้ามการรีเซ็ตถ้ากำลังโหลดจาก share link
    useEffect(() => {
        if (isLoadingFromShareRef.current) return;
        setShareUrl("");
        setShareStatus("idle");
    }, [html, css, js]);

    // --- Handle Share Button Click ---
    const handleShare = useCallback(async () => {
        // ถ้ามี link อยู่แล้ว (code ยังไม่เปลี่ยน) ให้แสดง modal เฉยๆ ไม่สร้าง row ใหม่
        if (shareUrl) {
            setShareStatus("success");
            setShowShareModal(true);
            return;
        }

        setShareStatus("loading");
        setShareError("");
        setShowShareModal(true);

        try {
            const ip = await getClientIp();
            const result = await saveSnippet(
                { html_code: html, css_code: css, js_code: js },
                ip
            );

            if ("error" in result) {
                setShareStatus("error");
                setShareError(result.error);
                return;
            }

            const url = `${window.location.origin}${window.location.pathname}?id=${result.id}`;
            setShareUrl(url);
            setShareStatus("success");

            // อัพเดต URL โดยไม่ reload หน้า
            router.replace(`?id=${result.id}`, { scroll: false });
        } catch {
            setShareStatus("error");
            setShareError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
        }
    }, [html, css, js, router, shareUrl]);

    // --- Copy URL to Clipboard ---
    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [shareUrl]);

    const closeModal = useCallback(() => {
        setShowShareModal(false);
        // ไม่รีเซ็ต shareUrl เพื่อให้เปิด modal ซ้ำแล้วยัง copy ได้
    }, []);

    // Bug #10: ESC key สำหรับปิด fullscreen และ share modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (showShareModal) {
                    setShowShareModal(false);
                } else if (isFullscreen) {
                    setIsFullscreen(false);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showShareModal, isFullscreen]);

    // --- LocalStorage Autosave (debounce 1s) ---
    useEffect(() => {
        if (isLoadingFromShareRef.current) return;
        const handler = setTimeout(() => {
            try {
                localStorage.setItem(LS_KEY_HTML, html);
                localStorage.setItem(LS_KEY_CSS, css);
                localStorage.setItem(LS_KEY_JS, js);
            } catch { /* localStorage full or unavailable */ }
        }, 1000);
        return () => clearTimeout(handler);
    }, [html, css, js]);

    // --- Reset draft ---
    const handleReset = useCallback(() => {
        setHtml(DEFAULT_HTML);
        setCss(DEFAULT_CSS);
        setJs(DEFAULT_JS);
        setDebouncedHtml(DEFAULT_HTML);
        setDebouncedCss(DEFAULT_CSS);
        setDebouncedJs(DEFAULT_JS);
        try {
            localStorage.removeItem(LS_KEY_HTML);
            localStorage.removeItem(LS_KEY_CSS);
            localStorage.removeItem(LS_KEY_JS);
        } catch { /* */ }
    }, []);

    // --- Inspect Mode: toggle via postMessage ---
    const toggleInspect = useCallback(() => {
        const next = !isInspectMode;
        setIsInspectMode(next);
        const msg = next ? "inspect:on" : "inspect:off";
        iframeRef.current?.contentWindow?.postMessage(msg, "*");
        fullscreenIframeRef.current?.contentWindow?.postMessage(msg, "*");
    }, [isInspectMode]);

    // --- ค้นหา class ในข้อความ (raw string) คืนรายการ line + preview ---
    const searchClassInText = useCallback((
        text: string,
        className: string,
        tab: 'css' | 'html'
    ): { tab: 'css' | 'html'; line: number; preview: string }[] => {
        const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Regex: .className ตามด้วย whitespace / { / , / : / > / + / ~ / [ หรือ end of string
        const pattern = new RegExp(`\\.${escaped}(?=[\\s,{>+~:[\\]|$)])`, 'g');
        const lines = text.split('\n');
        const results: { tab: 'css' | 'html'; line: number; preview: string }[] = [];
        lines.forEach((lineContent, idx) => {
            if (pattern.test(lineContent)) {
                results.push({ tab, line: idx + 1, preview: lineContent.trim().slice(0, 60) });
            }
            pattern.lastIndex = 0; // reset regex state
        });
        return results;
    }, []);

    // --- Jump to CSS class (ใช้ Regex, collect ALL matches, แสดง picker ถ้าหลายอัน) ---
    const jumpToCss = useCallback((className: string) => {
        setShowEditor(true);
        setCssJumpResult(null); // reset

        // ค้นหาจาก raw string ทันที (แก้บัค race condition ตอนสลับแท็บ)
        const cssMatches = searchClassInText(css, className, 'css');
        const htmlMatches = searchClassInText(html, className, 'html');
        const allMatches = [...cssMatches, ...htmlMatches];

        if (allMatches.length === 0) {
            // ไม่เจอเลย → แจ้ง notFound
            setCssJumpResult({ className, matches: [], notFound: true });
        } else if (allMatches.length === 1) {
            // เจออันเดียว → กระโดดตรง
            const m = allMatches[0];
            setActiveTab(m.tab);
            setTimeout(() => {
                const ed = editorRef.current;
                if (!ed) return;
                ed.revealLineInCenter(m.line);
                ed.setSelection({ startLineNumber: m.line, startColumn: 1, endLineNumber: m.line, endColumn: (ed.getModel()?.getLineLength(m.line) ?? 0) + 1 });
                ed.focus();
            }, 100);
        } else {
            // เจอหลายอัน → เปิด picker
            setCssJumpResult({ className, matches: allMatches, notFound: false });
            // กระโดดไปอันแรกก่อน
            const first = allMatches[0];
            setActiveTab(first.tab);
            setTimeout(() => {
                const ed = editorRef.current;
                if (!ed) return;
                ed.revealLineInCenter(first.line);
                ed.setSelection({ startLineNumber: first.line, startColumn: 1, endLineNumber: first.line, endColumn: (ed.getModel()?.getLineLength(first.line) ?? 0) + 1 });
                ed.focus();
            }, 100);
        }
    }, [css, html, searchClassInText]);

    // --- กระโดดไปยัง line เฉพาะใน tab ที่ระบุ ---
    const jumpToExactLine = useCallback((tab: 'css' | 'html', line: number) => {
        setActiveTab(tab);
        setShowEditor(true);
        setTimeout(() => {
            const editor = editorRef.current;
            if (!editor) return;
            editor.revealLineInCenter(line);
            editor.setSelection({
                startLineNumber: line, startColumn: 1,
                endLineNumber: line, endColumn: editor.getModel()!.getLineLength(line) + 1
            });
            editor.focus();
        }, 150);
    }, []);

    // --- สร้าง CSS class ใหม่ต่อท้าย CSS editor ---
    const createCssClass = useCallback((className: string) => {
        const snippet = `\n.${className} {\n  \n}`;
        setCss(prev => prev + snippet);
        setActiveTab('css');
        setShowEditor(true);
        setCssJumpResult(null);
        // กระโดดไปบรรทัดสุดท้ายหลัง debounce
        setTimeout(() => {
            const editor = editorRef.current;
            if (!editor) return;
            const model = editor.getModel();
            if (!model) return;
            const lastLine = model.getLineCount();
            editor.revealLineInCenter(lastLine);
            editor.setPosition({ lineNumber: lastLine - 1, column: 3 });
            editor.focus();
        }, 600); // รอ debounce + tab switch
    }, []);



    // --- Inspect Mode: receive element info from iframe ---
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === "inspect:click") {
                const { outerHTML, classes, tag, width, height, lineNumber } = e.data;
                if (!outerHTML) return;

                // Update inspected element state (CSS Panel)
                setInspectedEl({ tag: (tag || "div").toLowerCase(), classes: classes || [], width: width || 0, height: height || 0 });

                // Jump to element in HTML tab
                setActiveTab("html");
                setShowEditor(true);
                setTimeout(() => {
                    const editor = editorRef.current;
                    if (!editor) return;
                    const model = editor.getModel();
                    if (!model) return;

                    // ✨ Strategy 1: ใช้ lineNumber ตรงๆ (แม่นยำ ~100%)
                    if (lineNumber && lineNumber > 0) {
                        editor.revealLineInCenter(lineNumber);
                        editor.setSelection({
                            startLineNumber: lineNumber,
                            startColumn: 1,
                            endLineNumber: lineNumber,
                            endColumn: model.getLineLength(lineNumber) + 1
                        });
                        editor.focus();
                        return;
                    }

                    // Strategy 2: Fallback — ค้นหา id ถ้าไม่มี lineNumber
                    const { htmlSearch } = e.data;
                    let found = false;
                    if (htmlSearch) {
                        const escaped = htmlSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const m = model.findMatches(escaped, false, false, false, null, true);
                        if (m.length > 0) {
                            editor.revealLineInCenter(m[0].range.startLineNumber);
                            editor.setSelection(m[0].range);
                            editor.focus();
                            found = true;
                        }
                    }

                    // Strategy 3: Fallback — opening tag
                    if (!found) {
                        const openTagMatch = outerHTML.match(/^<[^>]{1,200}>/);
                        if (openTagMatch) {
                            const cleaned = openTagMatch[0]
                                .replace(/\s+/g, ' ')
                                .replace(/\s*data-inspect-line="\d+"\s*/g, ' ') // ลบแอต annotation ออก
                                .trim();
                            const m = model.findMatches(cleaned, false, false, true, null, true);
                            if (m.length > 0) {
                                editor.revealLineInCenter(m[0].range.startLineNumber);
                                editor.setSelection(m[0].range);
                                editor.focus();
                            }
                        }
                    }
                }, 150);
            }
        };
        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, []);

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === "string") {
                setHtml(content);
                setActiveTab("html");
                // Reset file input so the same file can be uploaded again if needed
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };

    // --- Pre-annotate HTML with line numbers for accurate Inspect Mode ---
    const annotateHtmlWithLineNumbers = (html: string): string => {
        const lines = html.split('\n');
        const result: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const annotated = lines[i].replace(
                /<([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\s*\/?)>/g,
                (match, tagName, attrs, selfClose) => {
                    if (attrs.includes('data-inspect-line')) return match;
                    return `<${tagName}${attrs} data-inspect-line="${lineNum}"${selfClose}>`;
                }
            );
            result.push(annotated);
        }
        return result.join('\n');
    };

    const getCombinedCode = () => {
        const interceptScript = `
<script>
    // Ultimate Link Neutralizer
    const neutralizeLinks = () => {
        document.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if (href) link.setAttribute('data-original-href', href);
            link.setAttribute('href', 'javascript:void(0);');
            link.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
            };
        });
        document.querySelectorAll('form').forEach(form => {
            form.onsubmit = function(e) {
                e.preventDefault();
                e.stopPropagation();
            };
        });
    };
    neutralizeLinks();
    document.addEventListener('DOMContentLoaded', neutralizeLinks);
    window.addEventListener('load', neutralizeLinks);
    setTimeout(neutralizeLinks, 100);
    setTimeout(neutralizeLinks, 500);
    const observer = new MutationObserver(() => neutralizeLinks());
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link) { e.preventDefault(); e.stopPropagation(); }
    }, true);
</script>
`;

        // --- Inspect Mode Script ---
        const inspectScript = `
<script>
(function() {
    let inspectActive = false;
    let overlay = null;
    let tooltip = null;
    let lastTarget = null;

    function createOverlay() {
        overlay = document.createElement('div');
        overlay.id = '__inspect_overlay';
        overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);z-index:99999;transition:all 0.08s ease;display:none;border-radius:3px;box-shadow:0 0 0 1px rgba(59,130,246,0.2);';
        document.body.appendChild(overlay);

        tooltip = document.createElement('div');
        tooltip.id = '__inspect_tooltip';
        tooltip.style.cssText = 'position:fixed;background:#0f172a;color:#e2e8f0;font-size:11px;font-family:ui-monospace,monospace;padding:6px 10px;border-radius:6px;z-index:100000;pointer-events:none;display:none;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,0.4);max-width:340px;line-height:1.6;border:1px solid rgba(255,255,255,0.08);';
        document.body.appendChild(tooltip);
    }

    function getClasses(el) {
        if (!el.className || typeof el.className !== 'string') return [];
        return el.className.trim().split(/\\s+/).filter(Boolean);
    }

    function updateTooltip(el, rect) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? ('#' + el.id) : '';
        const classes = getClasses(el);
        const dims = Math.round(rect.width) + ' x ' + Math.round(rect.height) + 'px';

        let html = '<span style="color:#7dd3fc;font-weight:bold;">&lt;' + tag + '&gt;</span>';
        if (id) html += ' <span style="color:#fbbf24;">' + id + '</span>';
        html += '  <span style="color:#94a3b8;">' + dims + '</span>';
        if (classes.length > 0) {
            html += '<br>';
            classes.slice(0, 8).forEach(function(c) {
                html += '<span style="display:inline-block;background:rgba(99,102,241,0.25);color:#a5b4fc;border-radius:3px;padding:0 5px;margin:1px 2px;border:1px solid rgba(99,102,241,0.3);">.' + c + '</span>';
            });
            if (classes.length > 8) html += '<span style="color:#64748b;"> +' + (classes.length - 8) + '</span>';
        }
        tooltip.innerHTML = html;

        // Position
        tooltip.style.left = Math.max(0, rect.left) + 'px';
        const topAbove = rect.top - tooltip.offsetHeight - 6;
        tooltip.style.top = (topAbove >= 0 ? topAbove : rect.bottom + 6) + 'px';
    }

    function onMouseMove(e) {
        if (!inspectActive) return;
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el.id === '__inspect_overlay' || el.id === '__inspect_tooltip') return;
        lastTarget = el;
        const rect = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        tooltip.style.display = 'block';
        updateTooltip(el, rect);
    }

    function onMouseClick(e) {
        if (!inspectActive || !lastTarget) return;
        e.preventDefault();
        e.stopPropagation();
        const el = lastTarget;
        const rect = el.getBoundingClientRect();
        const classes = getClasses(el);
        let snippet = el.outerHTML;
        if (snippet.length > 500) snippet = snippet.slice(0, 500);

        // ✨ อ่าน data-inspect-line จาก element หรือ ancestor ที่ใกล้ที่สุด (แม่นยำ~100%)
        let lineNumber = null;
        let current = el;
        while (current && current !== document.body) {
            const line = current.getAttribute('data-inspect-line');
            if (line) { lineNumber = parseInt(line, 10); break; }
            current = current.parentElement;
        }

        // Fallback: htmlSearch (id หรือ class string)
        let htmlSearch = null;
        if (el.id) {
            htmlSearch = 'id="' + el.id + '"';
        } else if (classes.length > 0) {
            htmlSearch = 'class="' + classes.join(' ') + '"';
        }

        window.parent.postMessage({
            type: 'inspect:click',
            outerHTML: snippet,
            tag: el.tagName,
            classes: classes,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            lineNumber: lineNumber,
            htmlSearch: htmlSearch
        }, '*');
    }

    function activate() {
        inspectActive = true;
        document.body.style.cursor = 'crosshair';
        if (!overlay) createOverlay();
        overlay.style.display = 'none';
    }

    function deactivate() {
        inspectActive = false;
        document.body.style.cursor = '';
        if (overlay) overlay.style.display = 'none';
        if (tooltip) tooltip.style.display = 'none';
        lastTarget = null;
    }

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onMouseClick, true);

    window.addEventListener('message', function(e) {
        if (e.data === 'inspect:on') activate();
        if (e.data === 'inspect:off') deactivate();
    });
})();
</script>
`;

        // Bug #3: ใช้ regex case-insensitive สำหรับ matching HTML tags
        // ✨ Annotate HTML with line numbers ก่อน inject เข้า iframe
        const annotatedHtml = annotateHtmlWithLineNumbers(debouncedHtml);

        if (/<\/body>/i.test(debouncedHtml)) {
            let combined = annotatedHtml;

            if (debouncedCss) {
                combined = combined.replace(/<\/head>/i, `\n<style>\n${debouncedCss}\n</style>\n</head>`);
            }
            if (debouncedJs) {
                combined = combined.replace(/<\/body>/i, `\n<script>\n${debouncedJs}\n</script>\n</body>`);
            }
            // Always inject intercept + inspect scripts just before </body>
            combined = combined.replace(/<\/body>/i, `\n${interceptScript}\n${inspectScript}\n</body>`);

            return combined;
        } else {
            // Bug #9: ลบ Tailwind CDN — ป้องกันรบกวน CSS ที่ผู้ใช้เขียนเอง
            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
${debouncedCss}
    </style>
</head>
<body>
${annotatedHtml}
    <script>
${debouncedJs}
    </script>
${interceptScript}
${inspectScript}
</body>
</html>`;
        }
    };

    const getViewportClass = () => {
        if (isFullscreen) return "w-full h-full"; // Fullscreen takes all space
        switch (viewport) {
            case "mobile": return "w-[375px] mx-auto";
            case "tablet": return "w-[768px] mx-auto";
            case "desktop": return "w-full";
        }
    };

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
                <div className="absolute top-4 right-4 z-[60] flex gap-2">
                    {/* Bug #6: แสดง viewport picker เสมอในโหมด fullscreen + highlight ปุ่ม active */}
                    <div className="bg-white/80 backdrop-blur shadow-lg border border-border/50 rounded-full px-2 flex items-center gap-1">
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setViewport("desktop")}
                            className={`h-8 w-8 rounded-full ${viewport === "desktop" ? "bg-muted shadow-sm" : "hover:bg-muted/50"}`}
                        >
                            <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setViewport("tablet")}
                            className={`h-8 w-8 rounded-full ${viewport === "tablet" ? "bg-muted shadow-sm" : "hover:bg-muted/50"}`}
                        >
                            <Tablet className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            onClick={() => setViewport("mobile")}
                            className={`h-8 w-8 rounded-full ${viewport === "mobile" ? "bg-muted shadow-sm" : "hover:bg-muted/50"}`}
                        >
                            <Smartphone className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        variant="default"
                        size="sm"
                        className="shadow-xl rounded-full px-4 gap-2 bg-zinc-900 hover:bg-zinc-800 text-white"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <Minimize2 className="h-4 w-4" />
                        Exit Full Screen
                    </Button>
                </div>

                <div className={`transition-all duration-300 h-full w-full max-h-screen bg-white shadow-2xl overflow-hidden flex flex-col ${viewport !== 'desktop' as ViewportMode ? 'rounded-2xl border border-zinc-200 ring-4 ring-black/5' : ''} ${getViewportClass()}`}>
                    <iframe
                        srcDoc={getCombinedCode()}
                        title="preview-fullscreen"
                        sandbox="allow-scripts allow-modals"
                        className="w-full flex-1 border-0 bg-white"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen selection:bg-fuchsia-500/20 relative flex flex-col">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="flex-1 container mx-auto px-4 pt-32 pb-12 max-w-[1600px] flex flex-col">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 shrink-0">
                    <div>
                        <Link href="/tools/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-fuchsia-500 mb-6 transition-colors group">
                            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                            กลับไปหน้ารวมเครื่องมือ
                        </Link>
                        <div className="flex items-center gap-3 mb-4">
                            <Badge variant="outline" className="rounded-full border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-500 px-4 py-1">
                                Developer Tools
                            </Badge>
                            <Badge variant="secondary" className="rounded-full">Client-Side Only</Badge>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
                            Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-pink-600">Web Previewer</span>
                        </h1>
                        <p className="text-muted-foreground text-balance">
                            เขียนและทดสอบโครงสร้าง HTML, CSS, JavaScript แบบเรียลไทม์
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            type="file"
                            accept=".html,.txt"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            อัปโหลด .html
                        </Button>
                        <Button
                            variant={showEditor ? "default" : "secondary"}
                            onClick={() => setShowEditor(!showEditor)}
                            className="gap-2"
                        >
                            {showEditor ? <EyeOff className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
                            {showEditor ? "ซ่อนกล่องข้อความโค้ด" : "แสดงกล่องข้อความโค้ด"}
                        </Button>
                        {/* Share Button */}
                        <Button
                            variant="outline"
                            onClick={handleShare}
                            disabled={shareStatus === "loading"}
                            className="gap-2 border-fuchsia-500/30 text-fuchsia-600 hover:bg-fuchsia-500/10 hover:text-fuchsia-600"
                        >
                            {shareStatus === "loading"
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Share2 className="h-4 w-4" />}
                            แชร์โค้ด
                        </Button>
                        {loadedFromShare && (
                            <Badge variant="outline" className="text-fuchsia-500 border-fuchsia-500/20 bg-fuchsia-500/10">
                                โหลดจากลิงก์แชร์
                            </Badge>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="gap-2 text-muted-foreground hover:text-red-500 hover:border-red-500/30"
                            title="รีเซ็ตโค้ดกลับเป็นค่าเริ่มต้น"
                        >
                            <RotateCcw className="h-4 w-4" />
                            รีเซ็ตโค้ด
                        </Button>
                    </div>
                </section>

                {/* Main Workspace Area */}
                {/* Bug #4: ลด min-h บนมือถือเพื่อไม่ต้องเลื่อนมากเกินไป */}
                <div className={`flex-1 flex ${isHorizontal ? 'flex-col lg:flex-row' : 'flex-col'} gap-6 min-h-0 lg:min-h-[800px] mb-8`}>

                    {/* Editor Pane (Left/Top) */}
                    {/* Bug #4: จำกัดความสูง Editor บนมือถือ */}
                    {showEditor && (
                        <Card className={`flex flex-col overflow-hidden bg-[#1e1e1e] border-zinc-800 shadow-2xl z-10 ${isHorizontal ? 'flex-1 min-h-[350px] max-h-[50vh] lg:max-h-none lg:min-h-0 lg:max-w-[40%]' : 'min-h-[400px] h-[400px]'}`}>
                            <div className="flex items-center justify-between px-2 py-2 bg-[#252526] border-b border-zinc-800">
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setActiveTab("html")}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors border-t-2 ${activeTab === 'html' ? 'bg-[#1e1e1e] text-[#e34c26] border-t-[#e34c26]' : 'border-t-transparent text-zinc-400 hover:bg-[#2d2d2d]'}`}
                                    >
                                        index.html
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("css")}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors border-t-2 ${activeTab === 'css' ? 'bg-[#1e1e1e] text-[#264de4] border-t-[#264de4]' : 'border-t-transparent text-zinc-400 hover:bg-[#2d2d2d]'}`}
                                    >
                                        style.css
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("js")}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-t-md transition-colors border-t-2 ${activeTab === 'js' ? 'bg-[#1e1e1e] text-[#f7df1e] border-t-[#f7df1e]' : 'border-t-transparent text-zinc-400 hover:bg-[#2d2d2d]'}`}
                                    >
                                        script.js
                                    </button>
                                </div>
                                <div className="pr-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsHorizontal(!isHorizontal)}
                                        className="h-8 hidden lg:flex px-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                        title={isHorizontal ? "Switch to Vertical Layout" : "Switch to Horizontal Layout"}
                                    >
                                        {isHorizontal ? <Monitor className="h-4 w-4 rotate-90" /> : <Monitor className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 relative min-h-[350px] lg:min-h-0 w-full overflow-hidden">
                                <div className="absolute inset-0">
                                    <Editor
                                        height="100%"
                                        language={activeTab === 'js' ? 'javascript' : activeTab}
                                        theme="vs-dark"
                                        value={activeTab === 'html' ? html : activeTab === 'css' ? css : js}
                                        onChange={(value) => {
                                            if (value !== undefined) {
                                                if (activeTab === 'html') setHtml(value);
                                                else if (activeTab === 'css') setCss(value);
                                                else setJs(value);
                                            }
                                        }}
                                        onMount={(editor) => { editorRef.current = editor; }}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            wordWrap: "on",
                                            formatOnPaste: true,
                                            tabSize: 4,
                                            automaticLayout: true,
                                        }}
                                    />
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Preview Pane (Right) */}
                    <Card className="flex-[2] flex flex-col overflow-hidden bg-card border-border/50 shadow-xl transition-all duration-500 relative">
                        {/* Toolbar for Preview */}
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-sm font-medium bg-background border rounded-md p-1 shadow-sm">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewport("desktop")}
                                    className={`h-8 px-2 rounded ${viewport === "desktop" ? "bg-muted shadow-sm" : "hover:bg-muted/50"}`}
                                >
                                    <Monitor className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Desktop</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewport("tablet")}
                                    className={`h-8 px-2 rounded ${viewport === "tablet" ? "bg-muted shadow-sm" : "hover:bg-muted/50"}`}
                                >
                                    <Tablet className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Tablet</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewport("mobile")}
                                    className={`h-8 px-2 rounded ${viewport === "mobile" ? "bg-muted shadow-sm" : "hover:bg-muted/50"}`}
                                >
                                    <Smartphone className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Mobile</span>
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant={isInspectMode ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 gap-1.5 ${isInspectMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                                    onClick={toggleInspect}
                                >
                                    <MousePointerClick className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Inspect</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => setIsFullscreen(true)}
                                >
                                    <Maximize2 className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Full Screen</span>
                                </Button>
                                {!showEditor && (
                                    <Badge variant="outline" className="text-fuchsia-500 border-fuchsia-500/20 bg-fuchsia-500/10 hidden lg:inline-flex">Full View Mode</Badge>
                                )}
                            </div>
                        </div>

                        {/* Iframe Container */}
                        <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-950/50 p-2 md:p-4 flex justify-center overflow-hidden">
                            <div className={`transition-all duration-300 h-full bg-white rounded-md shadow-lg border border-border/50 flex flex-col ${getViewportClass()}`}>
                                <div className="flex-1 w-full bg-white rounded-b-md overflow-hidden min-h-[400px] md:min-h-[500px] lg:min-h-[700px]">
                                    <iframe
                                        ref={iframeRef}
                                        srcDoc={getCombinedCode()}
                                        title="preview"
                                        sandbox="allow-scripts allow-modals"
                                        className="w-full h-full border-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CSS Inspect Panel — shown when inspect:click received */}
                        {isInspectMode && inspectedEl && (
                            <div className="mx-2 md:mx-4 mb-2 rounded-xl border border-blue-500/30 bg-blue-950/20 dark:bg-blue-950/40 px-4 py-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-blue-400 text-xs bg-blue-500/10 px-2 py-0.5 rounded">
                                            &lt;{inspectedEl.tag}&gt;
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {inspectedEl.width} × {inspectedEl.height}px
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">คลิก class → กระโดดไปยัง CSS</span>
                                        <button
                                            onClick={() => setInspectedEl(null)}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                {inspectedEl.classes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {inspectedEl.classes.map((cls) => (
                                            <button
                                                key={cls}
                                                onClick={() => jumpToCss(cls)}
                                                title={`ค้นหา .${cls} ใน CSS Editor`}
                                                className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 hover:text-indigo-100 transition-all cursor-pointer"
                                            >
                                                .{cls}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">ไม่มี CSS class บน element นี้</p>
                                )}

                                {/* cssJumpResult sub-panel: picker (หลาย match) หรือ create (ไม่เจอ) */}
                                {cssJumpResult && (
                                    <div className="mt-2.5 pt-2.5 border-t border-blue-500/20">
                                        {cssJumpResult.notFound ? (
                                            /* ไม่พบ class ใน CSS เลย */
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-amber-400/80">
                                                    ไม่พบ <span className="font-mono">.{cssJumpResult.className}</span> ใน CSS
                                                </span>
                                                <button
                                                    onClick={() => createCssClass(cssJumpResult.className)}
                                                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all font-mono"
                                                >
                                                    <span className="text-sm font-bold">+</span> สร้าง .{cssJumpResult.className} {"{ }"}
                                                </button>
                                                <button onClick={() => setCssJumpResult(null)} className="text-muted-foreground hover:text-foreground ml-auto">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            /* พบหลาย match → แสดง picker */
                                            <div className="bg-black/20 dark:bg-black/40 rounded-lg p-2.5 border border-white/5">
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <span className="text-[11px] font-medium text-blue-300/90 uppercase tracking-widest pl-1">
                                                        พบ {cssJumpResult.matches.length} ตำแหน่ง <span className="text-white/40 mx-1">•</span> เลือกบรรทัดที่ต้องการกระโดดไป
                                                    </span>
                                                    <button onClick={() => setCssJumpResult(null)} className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded-md transition-all">
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    {cssJumpResult.matches.map((m, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => jumpToExactLine(m.tab, m.line)}
                                                            className="flex items-center gap-3 text-left px-3 py-2 rounded-md bg-blue-950/40 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-400/50 transition-all group shadow-sm"
                                                        >
                                                            <div className="shrink-0 flex items-center justify-center min-w-[55px] text-[10px] font-bold tracking-wider font-mono bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 group-hover:text-blue-300 px-2 py-1 rounded border border-blue-500/20 group-hover:border-blue-400/30 transition-colors">
                                                                {m.tab.toUpperCase()}:{m.line}
                                                            </div>
                                                            <span className="font-mono text-[12px] text-zinc-300 group-hover:text-white truncate transition-colors">
                                                                {m.preview}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Bottom Ad Unit */}
                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[150px] bg-muted/10 rounded-xl py-8 border border-dashed border-muted shrink-0"
                />

                {/* ===== Share Modal ===== */}
                {
                    showShareModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                        >
                            <div className="bg-background border border-border/80 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                                <button
                                    onClick={closeModal}
                                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                {/* Loading State */}
                                {shareStatus === "loading" && (
                                    <div className="flex flex-col items-center gap-3 py-4">
                                        <Loader2 className="h-10 w-10 text-fuchsia-500 animate-spin" />
                                        <p className="text-muted-foreground text-sm">กำลังบันทึกโค้ดของคุณ...</p>
                                    </div>
                                )}

                                {/* Success State */}
                                {shareStatus === "success" && (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <Check className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">แชร์โค้ดสำเร็จ!</h3>
                                                <p className="text-xs text-muted-foreground">ลิงก์นี้จะหมดอายุภายใน 7 วัน</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 bg-muted/50 rounded-lg p-1 border border-border/50">
                                            <input
                                                readOnly
                                                value={shareUrl}
                                                className="flex-1 bg-transparent text-sm px-2 py-1 outline-none text-foreground min-w-0 truncate"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleCopy}
                                                className="shrink-0 gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                                            >
                                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                {copied ? "คัดลอกแล้ว!" : "คัดลอก"}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">
                                            ⚠️ โค้ดที่แชร์เป็นสาธารณะ ห้ามใส่ข้อมูลส่วนตัวหรือรหัสผ่าน
                                        </p>
                                    </div>
                                )}

                                {/* Error State */}
                                {shareStatus === "error" && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                                                <X className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">ไม่สามารถแชร์โค้ดได้</h3>
                                                <p className="text-xs text-red-500">{shareError}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={closeModal}>ปิด</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}
