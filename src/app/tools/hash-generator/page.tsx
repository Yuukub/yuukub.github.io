"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Hash, CheckCircle2, ShieldAlert, ArrowLeft, Terminal } from "lucide-react";
import Link from "next/link";

// SIMPLE MD5 Implementation
function md5(string: string) {
    function k(n: number) { return Math.sin(n) * 2 ** 32 | 0; }
    let b = [0, 1, 2, 3].map(i => 0x67452301 + (i * 0xefcdab89 - 0x98badcfe) % 0x11111111);
    let s = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    let x = Array.from(unescape(encodeURIComponent(string)) + "\x80" + "\0".repeat((56 - (string.length + 1) % 64 + 64) % 64) + Array.from({ length: 8 }, (_, i) => String.fromCharCode((string.length * 8) >> (i * 8) & 255)).join(""), c => c.charCodeAt(0));
    let m = Array.from({ length: x.length / 4 }, (_, i) => x[i * 4] | x[i * 4 + 1] << 8 | x[i * 4 + 2] << 16 | x[i * 4 + 3] << 24);
    for (let j = 0; j < m.length; j += 16) {
        let [a, c, d, e] = b;
        for (let i = 0; i < 64; i++) {
            let f, g;
            if (i < 16) { f = (c & d) | (~c & e); g = i; }
            else if (i < 32) { f = (e & c) | (~e & d); g = (5 * i + 1) % 16; }
            else if (i < 48) { f = c ^ d ^ e; g = (3 * i + 5) % 16; }
            else { f = d ^ (c | ~e); g = (7 * i) % 16; }
            let t = e; e = d; d = c; c = (c + ((a + f + k(i + 1) + m[j + g]) << s[(i >> 4) * 4 + i % 4] | (a + f + k(i + 1) + m[j + g]) >>> (32 - s[(i >> 4) * 4 + i % 4]))) | 0; a = t;
        }
        b = b.map((v, i) => (v + [a, c, d, e][i]) | 0);
    }
    return b.map(v => (v >>> 0).toString(16).padStart(8, "0").split("").reverse().join("").match(/../g)!.reverse().join("")).join("");
}

export default function HashGenerator() {
    const [input, setInput] = useState("");
    const [hashes, setHashes] = useState({
        md5: "",
        sha256: ""
    });
    const [copied, setCopied] = useState<string | null>(null);

    const generateHashes = async (text: string) => {
        if (!text) {
            setHashes({ md5: "", sha256: "" });
            return;
        }

        // MD5
        const md5Hash = md5(text);

        // SHA-256 using Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

        setHashes({ md5: md5Hash, sha256: sha256Hash });
    };

    useEffect(() => {
        generateHashes(input);
    }, [input]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-3xl">
                {/* Header Section */}
                <div className="mb-10">
                    <Link href="/tools" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
                        <ArrowLeft className="h-4 w-4 mr-1" /> กลับไปที่เครื่องมือ
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <Hash className="h-6 w-6 text-violet-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Hash Generator</h1>
                    </div>
                    <p className="text-muted-foreground">
                        สร้างรหัส Hash (MD5, SHA-256) ได้รวดเร็วและปลอดภัยภายในเครื่องของคุณ
                    </p>
                </div>

                <div className="grid gap-6">
                    {/* Input Area */}
                    <Card className="border-border/50 bg-muted/20 overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Terminal className="h-4 w-4" /> Input Text
                                </label>
                                <Badge variant="secondary" className="text-[10px]">LOCAL PROCESSING</Badge>
                            </div>
                            <textarea
                                className="w-full h-32 p-4 rounded-xl bg-background border border-border/50 focus:border-violet-500/50 outline-none transition-all resize-none font-mono text-sm leading-relaxed"
                                placeholder="พิมพ์ข้อความที่ต้องการทำ Hash ที่นี่..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                        </div>
                    </Card>

                    {/* Results Area */}
                    <div className="grid gap-4">
                        {/* MD5 Section */}
                        <Card className="border-border/50 hover:border-violet-500/20 transition-all overflow-hidden group">
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-emerald-600">MD5</span>
                                        </div>
                                        <h3 className="font-bold text-sm uppercase tracking-wide">MD5 Hash</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2 text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-600 transition-all border border-border/50"
                                        onClick={() => copyToClipboard(hashes.md5, 'md5')}
                                        disabled={!hashes.md5}
                                    >
                                        {copied === 'md5' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copied === 'md5' ? 'Copied' : 'Copy'}
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="bg-muted/50 p-4 rounded-xl font-mono text-sm break-all min-h-[52px] border border-border/30 group-hover:bg-background transition-colors">
                                        {hashes.md5 || <span className="text-muted-foreground/40 italic">Result will appear here...</span>}
                                    </div>
                                </div>

                                {/* WordPress Trick - Only show if there's input */}
                                {input && (
                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                                        <ShieldAlert className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div className="text-[13px] leading-relaxed">
                                            <p className="font-bold text-emerald-700 mb-1 flex items-center gap-1">
                                                WordPress Password Reset Tool
                                            </p>
                                            <p className="text-muted-foreground">
                                                คุณสามารถนำค่า MD5 นี้ไปใส่ในช่อง <code className="bg-emerald-500/10 px-1 rounded text-emerald-700 font-mono">user_pass</code> ในฐานข้อมูล (phpMyAdmin) เพื่อรีเซ็ตรหัสผ่านได้ทันที
                                                <span className="block mt-1 opacity-80 underline decoration-dotted">WordPress (6.9+) จะทำการอัปเกรดความปลอดภัยให้เองเมื่อคุณล็อกอินครั้งหน้า</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* SHA-256 Section */}
                        <Card className="border-border/50 hover:border-violet-500/20 transition-all overflow-hidden group">
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-violet-500/10 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-violet-600">SHA</span>
                                        </div>
                                        <h3 className="font-bold text-sm uppercase tracking-wide">SHA-256 Hash</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2 text-xs font-semibold hover:bg-violet-500/10 hover:text-violet-600 transition-all border border-border/50"
                                        onClick={() => copyToClipboard(hashes.sha256, 'sha256')}
                                        disabled={!hashes.sha256}
                                    >
                                        {copied === 'sha256' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copied === 'sha256' ? 'Copied' : 'Copy'}
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="bg-muted/50 p-4 rounded-xl font-mono text-sm break-all min-h-[52px] border border-border/30 group-hover:bg-background transition-colors">
                                        {hashes.sha256 || <span className="text-muted-foreground/40 italic">Result will appear here...</span>}
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground px-1">
                                    * SHA-256 เป็นมาตรฐานความปลอดภัยขั้นสูงที่ไม่สามารถย้อนกลับได้ (One-way hash)
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
