"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
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
    Minimize2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEFAULT_COMPONENTS = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <!-- สามารถเพิ่ม Tailwind CDN, Alpine.js หรือ font ได้ตรงนี้ -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: sans-serif; }
    </style>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <h1 class="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
            ✨ Hello World
        </h1>
        <p class="text-gray-600 mb-6">เริ่มแก้ไข หรือวางโค้ด HTML ของคุณในหน้าต่างซ้ายมือได้เลยครับ</p>
        <button class="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-medium py-2 px-6 rounded-lg transition-colors" onclick="alert('ปุ่มทำงานได้ด้วยนะ!')">
            ทดสอบปุ่ม
        </button>
    </div>
</body>
</html>`;

type ViewportMode = "desktop" | "tablet" | "mobile";

export function LiveWebPreviewer() {
    const [code, setCode] = useState(DEFAULT_COMPONENTS);
    const [debouncedCode, setDebouncedCode] = useState(DEFAULT_COMPONENTS);
    const [viewport, setViewport] = useState<ViewportMode>("desktop");
    const [showEditor, setShowEditor] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounce to prevent lag while typing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedCode(code);
        }, 500); // 500ms debounce
        return () => clearTimeout(handler);
    }, [code]);

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result;
            if (typeof content === "string") {
                setCode(content);
                // Reset file input so the same file can be uploaded again if needed
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;

            // Insert 4 spaces
            const newCode = code.substring(0, start) + "    " + code.substring(end);
            setCode(newCode);

            // Move cursor
            setTimeout(() => {
                target.selectionStart = target.selectionEnd = start + 4;
            }, 0);
        }
    };

    const getViewportClass = () => {
        switch (viewport) {
            case "mobile": return "w-[375px] mx-auto";
            case "tablet": return "w-[768px] mx-auto";
            case "desktop": return "w-full";
        }
    };

    return (
        <div className="min-h-screen selection:bg-fuchsia-500/20 relative flex flex-col">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="flex-1 container mx-auto px-4 pt-32 pb-12 max-w-7xl flex flex-col h-screen">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 shrink-0">
                    <div>
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
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[600px] mb-8">

                    {/* Editor Pane (Left) */}
                    {showEditor && (
                        <Card className="flex-1 flex flex-col overflow-hidden bg-zinc-950 border-zinc-800 shadow-2xl z-10 lg:max-w-[40%]">
                            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Code2 className="h-4 w-4 text-fuchsia-500" />
                                    Source Code (HTML/CSS/JS)
                                </div>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onKeyDown={handleKeyDown}
                                spellCheck={false}
                                className="flex-1 w-full p-4 bg-transparent text-zinc-300 font-mono text-[14px] leading-relaxed resize-none focus:outline-none placeholder:text-zinc-600"
                                placeholder="Paste your HTML, CSS, JS here..."
                            />
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
                                {!showEditor && (
                                    <Badge variant="outline" className="text-fuchsia-500 border-fuchsia-500/20 bg-fuchsia-500/10">Full View Mode</Badge>
                                )}
                            </div>
                        </div>

                        {/* Iframe Container */}
                        <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-950/50 overflow-auto p-4 flex items-center justify-center">
                            <div className={`transition-all duration-300 h-full bg-white rounded-md shadow-sm overflow-hidden border border-border/50 ${getViewportClass()}`}>
                                <iframe
                                    srcDoc={debouncedCode}
                                    title="preview"
                                    sandbox="allow-scripts allow-modals allow-popups allow-forms"
                                    className="w-full h-full border-0 bg-white"
                                />
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
