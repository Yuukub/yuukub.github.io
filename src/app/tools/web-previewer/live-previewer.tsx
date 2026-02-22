"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
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
    ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export function LiveWebPreviewer() {
    const [html, setHtml] = useState(DEFAULT_HTML);
    const [css, setCss] = useState(DEFAULT_CSS);
    const [js, setJs] = useState(DEFAULT_JS);
    const [debouncedHtml, setDebouncedHtml] = useState(DEFAULT_HTML);
    const [debouncedCss, setDebouncedCss] = useState(DEFAULT_CSS);
    const [debouncedJs, setDebouncedJs] = useState(DEFAULT_JS);
    const [viewport, setViewport] = useState<ViewportMode>("desktop");
    const [showEditor, setShowEditor] = useState(true);
    const [activeTab, setActiveTab] = useState<EditorTab>("html");
    const [isHorizontal, setIsHorizontal] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounce to prevent lag while typing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedHtml(html);
            setDebouncedCss(css);
            setDebouncedJs(js);
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [html, css, js]);

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

    const getCombinedCode = () => {
        const interceptScript = `
<script>
    // Ultimate Link Neutralizer
    const neutralizeLinks = () => {
        document.querySelectorAll('a').forEach(link => {
            // Store original href just in case
            const href = link.getAttribute('href');
            if (href) link.setAttribute('data-original-href', href);
            
            // Overwrite href completely so it literally cannot navigate anywhere
            link.setAttribute('href', 'javascript:void(0);');
            
            // Kill all click events dead in their tracks
            link.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Live Previewer] Navigation prevented.');
            };
        });

        // Kill all form submissions
        document.querySelectorAll('form').forEach(form => {
            form.onsubmit = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Live Previewer] Form submission prevented.');
            };
        });
    };

    // Run aggressively on every possible lifecycle event
    neutralizeLinks();
    document.addEventListener('DOMContentLoaded', neutralizeLinks);
    window.addEventListener('load', neutralizeLinks);
    setTimeout(neutralizeLinks, 100);
    setTimeout(neutralizeLinks, 500);
    setTimeout(neutralizeLinks, 1000);

    // Watch for dynamically added elements (like React/Vue injecting links later)
    const observer = new MutationObserver(() => neutralizeLinks());
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

    // Catch-all document level click interceptor as absolute last resort
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Live Previewer] Document-level click intercepted.');
        }
    }, true); // Capture phase is crucial here
</script>
`;

        // Check if HTML already has complete structure
        if (debouncedHtml.toLowerCase().includes("</body>")) {
            let combined = debouncedHtml;

            if (debouncedCss) {
                combined = combined.replace("</head>", `\n<style>\n${debouncedCss}\n</style>\n</head>`);
            }
            if (debouncedJs) {
                combined = combined.replace("</body>", `\n<script>\n${debouncedJs}\n</script>\n</body>`);
            }
            // Always inject intercept script just before </body> to ensure it runs
            combined = combined.replace("</body>", `\n${interceptScript}\n</body>`);

            return combined;
        } else {
            // Wrap in basic structure if it's just a snippet
            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
${debouncedCss}
    </style>
</head>
<body>
${debouncedHtml}
    <script>
${debouncedJs}
    </script>
${interceptScript}
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
                    {viewport !== "desktop" && (
                        <div className="bg-white/80 backdrop-blur shadow-lg border border-border/50 rounded-full px-2 flex items-center gap-1">
                            <Button
                                variant="ghost" size="icon"
                                onClick={() => setViewport("desktop")}
                                className="h-8 w-8 rounded-full hover:bg-muted/50"
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
                    )}

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
                        sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
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

            <main className="flex-1 container mx-auto px-4 pt-32 pb-12 max-w-7xl flex flex-col">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 shrink-0">
                    <div>
                        <Link href="/tools" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-fuchsia-500 mb-6 transition-colors group">
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

                    <div className="flex items-center gap-2">
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
                    </div>
                </section>

                {/* Main Workspace Area */}
                <div className={`flex-1 flex ${isHorizontal ? 'flex-col lg:flex-row' : 'flex-col'} gap-6 min-h-[800px] mb-8`}>

                    {/* Editor Pane (Left/Top) */}
                    {showEditor && (
                        <Card className={`flex-1 flex flex-col overflow-hidden bg-[#1e1e1e] border-zinc-800 shadow-2xl z-10 min-h-[500px] lg:min-h-0 ${isHorizontal ? 'lg:max-w-[40%]' : ''}`}>
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
                                        className="h-8 md:hidden lg:flex hidden px-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                        title={isHorizontal ? "Switch to Vertical Layout" : "Switch to Horizontal Layout"}
                                    >
                                        {isHorizontal ? <Monitor className="h-4 w-4 rotate-90" /> : <Monitor className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 relative">
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
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        wordWrap: "on",
                                        formatOnPaste: true,
                                        tabSize: 4,
                                    }}
                                />
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
                                        srcDoc={getCombinedCode()}
                                        title="preview"
                                        sandbox="allow-scripts allow-modals allow-popups allow-forms allow-same-origin"
                                        className="w-full h-full border-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Bottom Ad Unit */}
                <AdUnit
                    slotId="xxxxxxxxxx" // TODO: Replace with actual slot ID
                    format="auto"
                    responsive={true}
                    className="min-h-[150px] bg-muted/10 rounded-xl flex items-center justify-center border border-dashed border-muted shrink-0"
                />
            </main>
        </div>
    );
}
