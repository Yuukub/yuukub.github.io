"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Hash, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";

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
        <div className="min-h-screen selection:bg-primary/20 bg-background">
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <div className="mb-12">
                    <Badge variant="outline" className="mb-4">Security Utility</Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-4">Hash Generator</h1>
                    <p className="text-lg text-muted-foreground">
                        Generate cryptographic hashes locally in your browser. No data is sent to the server.
                    </p>
                </div>

                <div className="grid gap-8">
                    <Card className="p-6 border-primary/20 bg-muted/20">
                        <label className="block text-sm font-medium mb-2">Input Text</label>
                        <textarea
                            className="w-full h-32 p-4 rounded-xl bg-background border focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                            placeholder="Enter text to hash..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    </Card>

                    <div className="grid gap-4">
                        {/* MD5 SECTION */}
                        <Card className="p-6 border-border/50 hover:border-primary/30 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                                        <Hash className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">MD5</h3>
                                        <p className="text-xs text-muted-foreground">Common for legacy checksums & WordPress</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => copyToClipboard(hashes.md5, 'md5')}
                                    disabled={!hashes.md5}
                                >
                                    {copied === 'md5' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    {copied === 'md5' ? 'Copied' : 'Copy'}
                                </Button>
                            </div>
                            <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all min-h-[44px]">
                                {hashes.md5 || <span className="text-muted-foreground/50">Result will appear here...</span>}
                            </div>

                            {input && (
                                <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl flex gap-3 items-start">
                                    <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-primary mb-1">WordPress Fallback Trick</p>
                                        <p className="text-muted-foreground leading-relaxed">
                                            You can use this MD5 hash in the <code className="bg-primary/10 px-1 rounded text-primary">user_pass</code> field in phpMyAdmin to reset a WordPress password.
                                            WordPress 6.9+ will automatically re-hash it to a stronger format upon your next login.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* SHA-256 SECTION */}
                        <Card className="p-6 border-border/50 hover:border-blue-500/30 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Hash className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">SHA-256</h3>
                                        <p className="text-xs text-muted-foreground">Standard secure cryptographic hash</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => copyToClipboard(hashes.sha256, 'sha256')}
                                    disabled={!hashes.sha256}
                                >
                                    {copied === 'sha256' ? <CheckCircle2 className="h-4 w-4 text-blue-500" /> : <Copy className="h-4 w-4" />}
                                    {copied === 'sha256' ? 'Copied' : 'Copy'}
                                </Button>
                            </div>
                            <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all min-h-[44px]">
                                {hashes.sha256 || <span className="text-muted-foreground/50">Result will appear here...</span>}
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
