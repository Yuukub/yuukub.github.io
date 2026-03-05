"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdUnit } from "@/components/ad-unit";
import Link from "next/link";
import {
    ArrowLeft, Zap, Send, Loader2, Clock, Copy, CheckCircle2,
    Trash2, ChevronDown, ChevronUp, AlertCircle, Code2, RotateCcw, History
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface ParsedRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
    language: string;
}

interface ApiResponse {
    status_code: number;
    status_text: string;
    headers: Record<string, string>;
    body: string;
    elapsed_ms: number;
}

interface HistoryItem {
    id: string;
    url: string;
    method: string;
    statusCode: number;
    elapsedMs: number;
    timestamp: number;
    headers: string;
    body: string;
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────
const PROXY_URL = process.env.NEXT_PUBLIC_API_PROXY_URL || "https://api-proxy.sarnyou.workers.dev";
const HISTORY_KEY = "api-tester-history";
const MAX_HISTORY = 10;

const METHOD_COLORS: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    POST: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    PUT: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    PATCH: "bg-purple-500/15 text-purple-500 border-purple-500/30",
    DELETE: "bg-red-500/15 text-red-500 border-red-500/30",
    HEAD: "bg-gray-500/15 text-gray-500 border-gray-500/30",
};

// ─────────────────────────────────────────────────────────
// Import Code Parser — รองรับ 6 ภาษา
// ─────────────────────────────────────────────────────────
function parseImportCode(code: string): ParsedRequest {
    const result: ParsedRequest = { url: "", method: "GET", headers: {}, body: "", language: "" };
    const trimmed = code.trim();
    if (!trimmed) return result;

    // 1. PHP cURL
    if (trimmed.includes("CURLOPT_") || trimmed.includes("curl_init")) {
        result.language = "PHP cURL";

        const urlMatch = trimmed.match(/CURLOPT_URL\s*(?:=>|,)\s*["']([^"']+)["']/);
        if (urlMatch) result.url = urlMatch[1];

        const methodMatch = trimmed.match(/CURLOPT_CUSTOMREQUEST\s*(?:=>|,)\s*["']([^"']+)["']/);
        if (methodMatch) result.method = methodMatch[1].toUpperCase();
        else if (/CURLOPT_POST\s*(?:=>|,)\s*(?:true|1)/i.test(trimmed)) result.method = "POST";

        const headerMatch = trimmed.match(/CURLOPT_HTTPHEADER\s*(?:=>|,)\s*(?:array\s*\(|\[)([\s\S]*?)(?:\]|\))/);
        if (headerMatch) {
            const pairs = headerMatch[1].match(/["']([^"']+)["']/g);
            if (pairs) {
                pairs.forEach((h) => {
                    const clean = h.replace(/["']/g, "");
                    const idx = clean.indexOf(":");
                    if (idx > 0) result.headers[clean.slice(0, idx).trim()] = clean.slice(idx + 1).trim();
                });
            }
        }

        const bodyMatch = trimmed.match(/CURLOPT_POSTFIELDS\s*(?:=>|,)\s*([\s\S]*?)(?:,\s*\n|\n|\]|\))/);
        if (bodyMatch) {
            let raw = bodyMatch[1].trim();
            if (raw.includes("json_encode")) {
                const arrMatch = raw.match(/json_encode\s*\(\s*[\[{]([\s\S]*?)[\]}]\s*\)/);
                if (arrMatch) {
                    let jsonStr = "{" + arrMatch[1].replace(/=>/g, ":").replace(/'/g, '"') + "}";
                    jsonStr = jsonStr.replace(/,\s*}/g, "}");
                    try { result.body = JSON.stringify(JSON.parse(jsonStr), null, 2); } catch { result.body = jsonStr; }
                }
            } else {
                result.body = raw.replace(/^['"]|['"]$/g, "");
            }
        }
        return result;
    }

    // 2. Bash cURL
    if (/^\s*curl\s/im.test(trimmed)) {
        result.language = "Bash cURL";
        // Join continuation lines
        const joined = trimmed.replace(/\\\s*\n/g, " ");

        const urlMatch = joined.match(/(?:curl\s+(?:.*?\s+)?)((?:https?|ftp):\/\/[^\s'"]+)|(?:curl\s+(?:.*?\s+)?)['"]((https?|ftp):\/\/[^'"]+)['"]/);
        if (urlMatch) result.url = urlMatch[1] || urlMatch[2];

        // Try --location URL pattern too
        if (!result.url) {
            const locMatch = joined.match(/--location\s+['"]?([^\s'"]+)['"]?/);
            if (locMatch) result.url = locMatch[1];
        }

        const methodMatch = joined.match(/(?:-X|--request)\s+['"]?([A-Z]+)['"]?/i);
        if (methodMatch) result.method = methodMatch[1].toUpperCase();

        const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = headerRegex.exec(joined)) !== null) {
            const idx = match[1].indexOf(":");
            if (idx > 0) result.headers[match[1].slice(0, idx).trim()] = match[1].slice(idx + 1).trim();
        }

        const dataMatch = joined.match(/(?:-d|--data|--data-raw|--data-binary)\s+['"]([\s\S]*?)['"]/);
        if (dataMatch) {
            result.body = dataMatch[1];
            if (!methodMatch) result.method = "POST"; // cURL defaults to POST when -d is used
        }
        return result;
    }

    // 3. Python requests
    if (/requests\.(get|post|put|delete|patch|head|options)\s*\(/i.test(trimmed) || (trimmed.includes("import requests") && trimmed.includes("requests."))) {
        result.language = "Python requests";

        const methodMatch = trimmed.match(/requests\.(get|post|put|delete|patch|head|options)\s*\(/i);
        if (methodMatch) result.method = methodMatch[1].toUpperCase();

        const urlMatch = trimmed.match(/requests\.\w+\s*\(\s*(?:url\s*=\s*)?[f]?["']([^"']+)["']/);
        if (urlMatch) result.url = urlMatch[1];

        const headerMatch = trimmed.match(/headers\s*=\s*\{([\s\S]*?)\}/);
        if (headerMatch) {
            const pairs = headerMatch[1].match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g);
            if (pairs) {
                pairs.forEach((p) => {
                    const m = p.match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/);
                    if (m) result.headers[m[1]] = m[2];
                });
            }
        }

        const bodyMatch = trimmed.match(/(?:json|data)\s*=\s*(\{[\s\S]*?\})/);
        if (bodyMatch) {
            let raw = bodyMatch[1].replace(/'/g, '"').replace(/True/g, "true").replace(/False/g, "false").replace(/None/g, "null");
            try { result.body = JSON.stringify(JSON.parse(raw), null, 2); } catch { result.body = raw; }
        }
        return result;
    }

    // 4. JavaScript fetch
    if (trimmed.includes("fetch(") || trimmed.includes("fetch (")) {
        result.language = "JavaScript fetch";

        const urlMatch = trimmed.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/);
        if (urlMatch) result.url = urlMatch[1];

        const methodMatch = trimmed.match(/method\s*:\s*["']([^"']+)["']/i);
        if (methodMatch) result.method = methodMatch[1].toUpperCase();

        const headerMatch = trimmed.match(/headers\s*:\s*(?:new\s+Headers\s*\(\s*)?\{([\s\S]*?)\}/);
        if (headerMatch) {
            const pairs = headerMatch[1].match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g);
            if (pairs) {
                pairs.forEach((p) => {
                    const m = p.match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/);
                    if (m) result.headers[m[1]] = m[2];
                });
            }
        }

        const bodyMatch = trimmed.match(/body\s*:\s*JSON\.stringify\s*\(\s*(\{[\s\S]*?\})\s*\)/);
        if (bodyMatch) {
            try { result.body = JSON.stringify(JSON.parse(bodyMatch[1]), null, 2); } catch { result.body = bodyMatch[1]; }
        } else {
            const rawBody = trimmed.match(/body\s*:\s*["'`]([\s\S]*?)["'`]/);
            if (rawBody) result.body = rawBody[1];
        }
        return result;
    }

    // 5. Axios
    if (trimmed.includes("axios.") || trimmed.includes("axios(")) {
        result.language = "Axios";

        // axios.get/post/put/delete(url, ...)
        const shorthand = trimmed.match(/axios\.(get|post|put|delete|patch|head|options)\s*\(\s*["'`]([^"'`]+)["'`]/i);
        if (shorthand) {
            result.method = shorthand[1].toUpperCase();
            result.url = shorthand[2];
        } else {
            // axios({ url, method, ... })
            const urlMatch = trimmed.match(/url\s*:\s*["'`]([^"'`]+)["'`]/);
            if (urlMatch) result.url = urlMatch[1];
            const methodMatch = trimmed.match(/method\s*:\s*["']([^"']+)["']/i);
            if (methodMatch) result.method = methodMatch[1].toUpperCase();
        }

        const headerMatch = trimmed.match(/headers\s*:\s*\{([\s\S]*?)\}/);
        if (headerMatch) {
            const pairs = headerMatch[1].match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g);
            if (pairs) {
                pairs.forEach((p) => {
                    const m = p.match(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/);
                    if (m) result.headers[m[1]] = m[2];
                });
            }
        }

        const dataMatch = trimmed.match(/data\s*:\s*(\{[\s\S]*?\})/);
        if (dataMatch) {
            try { result.body = JSON.stringify(JSON.parse(dataMatch[1]), null, 2); } catch { result.body = dataMatch[1]; }
        }
        // For shorthand post/put/patch: the second argument is data
        if (!result.body && shorthand && ["POST", "PUT", "PATCH"].includes(result.method)) {
            const secondArg = trimmed.match(/axios\.\w+\s*\(\s*["'`][^"'`]+["'`]\s*,\s*(\{[\s\S]*?\})/);
            if (secondArg) {
                try { result.body = JSON.stringify(JSON.parse(secondArg[1]), null, 2); } catch { result.body = secondArg[1]; }
            }
        }
        return result;
    }

    // 6. HTTPie
    if (/^\s*https?\s/im.test(trimmed)) {
        result.language = "HTTPie";
        const parts = trimmed.split(/\s+/);
        let idx = 1; // skip 'http' or 'https'

        // Check if second token is a method
        if (parts[idx] && /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/i.test(parts[idx])) {
            result.method = parts[idx].toUpperCase();
            idx++;
        }

        if (parts[idx]) result.url = parts[idx];
        idx++;

        // Remaining tokens: Header:Value or key=value or key:=value
        const bodyObj: Record<string, unknown> = {};
        let hasBody = false;
        for (let i = idx; i < parts.length; i++) {
            const token = parts[i];
            if (token.includes(":=")) {
                const [k, v] = token.split(":=", 2);
                try { bodyObj[k] = JSON.parse(v); } catch { bodyObj[k] = v; }
                hasBody = true;
            } else if (token.includes("==")) {
                // Query parameter — append to URL
                const [k, v] = token.split("==", 2);
                const sep = result.url.includes("?") ? "&" : "?";
                result.url += `${sep}${k}=${v}`;
            } else if (/^[\w-]+:/.test(token) && !token.startsWith("http")) {
                const colonIdx = token.indexOf(":");
                result.headers[token.slice(0, colonIdx)] = token.slice(colonIdx + 1);
            } else if (token.includes("=")) {
                const [k, v] = token.split("=", 2);
                bodyObj[k] = v;
                hasBody = true;
            }
        }
        if (hasBody) {
            result.body = JSON.stringify(bodyObj, null, 2);
            if (result.method === "GET") result.method = "POST";
        }
        return result;
    }

    // 7. Go net/http
    if (trimmed.includes("http.NewRequest") || trimmed.includes("http.Get") || trimmed.includes("http.Post")) {
        result.language = "Go net/http";

        const newReqMatch = trimmed.match(/http\.NewRequest\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/);
        if (newReqMatch) {
            result.method = newReqMatch[1].toUpperCase();
            result.url = newReqMatch[2];
        }

        const getMatch = trimmed.match(/http\.Get\s*\(\s*["']([^"']+)["']/);
        if (getMatch) { result.method = "GET"; result.url = getMatch[1]; }

        const postMatch = trimmed.match(/http\.Post\s*\(\s*["']([^"']+)["']/);
        if (postMatch) { result.method = "POST"; result.url = postMatch[1]; }

        // Headers: req.Header.Set("key", "value") or req.Header.Add(...)
        const headerRegex = /\.Header\.(?:Set|Add)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g;
        let hMatch;
        while ((hMatch = headerRegex.exec(trimmed)) !== null) {
            result.headers[hMatch[1]] = hMatch[2];
        }

        // Body: strings.NewReader("...") or bytes.NewBuffer(...)
        const bodyMatch = trimmed.match(/strings\.NewReader\s*\(\s*["'`]([\s\S]*?)["'`]\s*\)/);
        if (bodyMatch) result.body = bodyMatch[1];

        return result;
    }

    result.language = "Unknown";
    return result;
}

// ─────────────────────────────────────────────────────────
// Auto-detect language (lightweight — for badge)
// ─────────────────────────────────────────────────────────
function detectLanguage(code: string): string {
    const c = code.trim();
    if (!c) return "";
    if (c.includes("CURLOPT_") || c.includes("curl_init")) return "PHP cURL";
    if (/^\s*curl\s/im.test(c)) return "Bash cURL";
    if (/requests\.(get|post|put|delete|patch)/i.test(c)) return "Python requests";
    if (c.includes("fetch(")) return "JavaScript fetch";
    if (c.includes("axios.") || c.includes("axios(")) return "Axios";
    if (/^\s*https?\s/im.test(c)) return "HTTPie";
    if (c.includes("http.NewRequest") || c.includes("http.Get")) return "Go net/http";
    return "";
}

// ─────────────────────────────────────────────────────────
// Status code color helper
// ─────────────────────────────────────────────────────────
function statusColor(code: number): string {
    if (code >= 200 && code < 300) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (code >= 300 && code < 400) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    if (code >= 400 && code < 500) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    if (code >= 500) return "bg-red-500/15 text-red-400 border-red-500/30";
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export default function ApiTesterPage() {
    // Form state
    const [url, setUrl] = useState("");
    const [method, setMethod] = useState("GET");
    const [headersText, setHeadersText] = useState("");
    const [bodyText, setBodyText] = useState("");

    // Import state
    const [importCode, setImportCode] = useState("");
    const [importExpanded, setImportExpanded] = useState(false);
    const [importSuccess, setImportSuccess] = useState("");
    const [detectedLang, setDetectedLang] = useState("");

    // Response state
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [error, setError] = useState("");
    const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
    const [copied, setCopied] = useState(false);

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Load history from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(HISTORY_KEY);
            if (saved) setHistory(JSON.parse(saved));
        } catch { /* ignore */ }
    }, []);

    // Auto-detect language while typing import code
    useEffect(() => {
        setDetectedLang(detectLanguage(importCode));
    }, [importCode]);

    // ─── Import Handler ─────────────────────────────────
    const handleImport = useCallback(() => {
        if (!importCode.trim()) return;
        const parsed = parseImportCode(importCode);

        if (parsed.url) setUrl(parsed.url);
        if (parsed.method) setMethod(parsed.method);
        if (Object.keys(parsed.headers).length > 0) {
            setHeadersText(JSON.stringify(parsed.headers, null, 2));
        }
        if (parsed.body) setBodyText(parsed.body);

        setImportSuccess(`✅ สำเร็จ! แยกข้อมูลจาก ${parsed.language} เรียบร้อย`);
        setImportCode("");
        setTimeout(() => setImportSuccess(""), 3000);
    }, [importCode]);

    // ─── Send Request Handler ───────────────────────────
    const sendRequest = useCallback(async () => {
        if (!url.trim()) return;
        setLoading(true);
        setResponse(null);
        setError("");

        // Parse headers from text
        let parsedHeaders: Record<string, string> = {};
        if (headersText.trim()) {
            try {
                parsedHeaders = JSON.parse(headersText);
            } catch {
                setError("Headers ไม่ใช่ JSON ที่ถูกต้อง กรุณาตรวจสอบ format");
                setLoading(false);
                return;
            }
        }

        try {
            const res = await fetch(PROXY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: url.trim(),
                    method,
                    headers: parsedHeaders,
                    body: method !== "GET" && method !== "HEAD" ? bodyText : undefined,
                }),
            });

            const data: ApiResponse = await res.json();

            if (!res.ok) {
                throw new Error((data as unknown as { error: string }).error || `Proxy error: ${res.status}`);
            }

            setResponse(data);

            // Save to history
            const newItem: HistoryItem = {
                id: Date.now().toString(),
                url: url.trim(),
                method,
                statusCode: data.status_code,
                elapsedMs: data.elapsed_ms,
                timestamp: Date.now(),
                headers: headersText,
                body: bodyText,
            };
            setHistory((prev) => {
                const updated = [newItem, ...prev].slice(0, MAX_HISTORY);
                try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
                return updated;
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [url, method, headersText, bodyText]);

    // ─── History Helpers ────────────────────────────────
    const loadFromHistory = useCallback((item: HistoryItem) => {
        setUrl(item.url);
        setMethod(item.method);
        setHeadersText(item.headers);
        setBodyText(item.body);
        setResponse(null);
        setError("");
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    }, []);

    const copyResponse = useCallback(() => {
        if (!response) return;
        navigator.clipboard.writeText(response.body);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [response]);

    // ─── Format response body ───────────────────────────
    const formattedBody = (() => {
        if (!response?.body) return "";
        try {
            return JSON.stringify(JSON.parse(response.body), null, 2);
        } catch {
            return response.body;
        }
    })();

    // ─── JSX ────────────────────────────────────────────
    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-6xl">
                {/* ─── Header ────────────────────────────── */}
                <div className="mb-8">
                    <Link href="/tools" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
                        <ArrowLeft className="h-4 w-4 mr-1" /> กลับไปที่เครื่องมือ
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Zap className="h-6 w-6 text-cyan-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">API Tester</h1>
                    </div>
                    <p className="text-muted-foreground">
                        ทดสอบยิง REST API ได้ทันทีจากเบราว์เซอร์ พร้อมระบบ Import โค้ดอัตโนมัติจากหลากหลายภาษา
                    </p>
                </div>

                {/* ─── Import from Code ──────────────────── */}
                <Card className="border-border/50 bg-muted/20 mb-6 overflow-hidden">
                    <button
                        onClick={() => setImportExpanded(!importExpanded)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Code2 className="h-5 w-5 text-cyan-500" />
                            <span className="font-semibold">Import from Code</span>
                            {detectedLang && importExpanded && (
                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold animate-in fade-in">
                                    {detectedLang}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground hidden sm:inline">PHP cURL · Bash · fetch · Axios · Python · HTTPie · Go</span>
                            {importExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </button>

                    {importExpanded && (
                        <CardContent className="pt-0 pb-5 px-6 animate-in slide-in-from-top-2 duration-200">
                            <textarea
                                value={importCode}
                                onChange={(e) => setImportCode(e.target.value)}
                                rows={6}
                                className="w-full rounded-lg border border-border/50 bg-background p-4 font-mono text-sm resize-y focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-muted-foreground/50"
                                placeholder={"วางโค้ดที่นี่... เช่น:\n\ncurl -X GET 'https://api.example.com/data' \\\n  -H 'Authorization: Bearer token123'"}
                            />
                            <div className="flex items-center justify-between mt-3 gap-3">
                                <div className="flex-1">
                                    {importSuccess && (
                                        <span className="text-sm text-emerald-500 font-medium animate-in fade-in">{importSuccess}</span>
                                    )}
                                </div>
                                <Button
                                    onClick={handleImport}
                                    disabled={!importCode.trim()}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
                                    size="sm"
                                >
                                    <Zap className="h-3.5 w-3.5" /> Extract & Fill Form
                                </Button>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* ─── Main Grid: Request + Response ─────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* ── Request Form ─────────────────────── */}
                    <Card className="border-border/50 bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Send className="h-4 w-4 text-cyan-500" /> Request
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Method + URL */}
                            <div className="flex gap-2">
                                <select
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm font-bold focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all cursor-pointer min-w-[100px]"
                                >
                                    {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <Input
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                                    placeholder="https://api.example.com/endpoint"
                                    className="flex-1 font-mono text-sm focus:border-cyan-500/50"
                                />
                            </div>

                            {/* Headers */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                                    Headers (JSON)
                                </label>
                                <textarea
                                    value={headersText}
                                    onChange={(e) => setHeadersText(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-border/50 bg-background p-3 font-mono text-sm resize-y focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-muted-foreground/40"
                                    placeholder='{ "Authorization": "Bearer token..." }'
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                                    Body {method === "GET" || method === "HEAD" ? <span className="text-muted-foreground/50 normal-case font-normal">(ไม่ใช้กับ {method})</span> : ""}
                                </label>
                                <textarea
                                    value={bodyText}
                                    onChange={(e) => setBodyText(e.target.value)}
                                    rows={4}
                                    disabled={method === "GET" || method === "HEAD"}
                                    className="w-full rounded-lg border border-border/50 bg-background p-3 font-mono text-sm resize-y focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-muted-foreground/40"
                                    placeholder='{ "key": "value" }'
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>ข้อผิดพลาด</AlertTitle>
                                    <AlertDescription className="text-sm">{error}</AlertDescription>
                                </Alert>
                            )}

                            {/* Send Button */}
                            <Button
                                onClick={sendRequest}
                                disabled={loading || !url.trim()}
                                className="w-full h-11 text-sm font-bold gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                            >
                                {loading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                ) : (
                                    <><Send className="h-4 w-4" /> Send Request</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ── Response Panel ─────────────────────── */}
                    <Card className="border-border/50 bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                    Response
                                </CardTitle>
                                {response && (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={`${statusColor(response.status_code)} border text-xs font-bold`}>
                                            {response.status_code} {response.status_text}
                                        </Badge>
                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {response.elapsed_ms}ms
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            {response && (
                                <div className="flex gap-1 mt-3 border-b border-zinc-800 pb-0">
                                    <button
                                        onClick={() => setResponseTab("body")}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${responseTab === "body" ? "bg-zinc-800 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                        Body
                                    </button>
                                    <button
                                        onClick={() => setResponseTab("headers")}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${responseTab === "headers" ? "bg-zinc-800 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
                                    >
                                        Headers ({response.headers ? Object.keys(response.headers).length : 0})
                                    </button>
                                    <div className="flex-1" />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 gap-1"
                                        onClick={copyResponse}
                                    >
                                        {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                        {copied ? "Copied!" : "Copy"}
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px] pt-0">
                            {loading && (
                                <div className="flex items-center justify-center h-full gap-3 text-zinc-500">
                                    <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                                    <span className="text-sm">กำลังส่ง request...</span>
                                </div>
                            )}
                            {!loading && !response && !error && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
                                    <Zap className="h-10 w-10 opacity-20" />
                                    <span className="text-sm">กรอกข้อมูลแล้วกด Send Request</span>
                                </div>
                            )}
                            {response && responseTab === "body" && (
                                <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-all text-emerald-400/90 overflow-auto max-h-[500px] animate-in fade-in">
                                    {formattedBody || <span className="text-zinc-600 italic">Empty response body</span>}
                                </pre>
                            )}
                            {response && responseTab === "headers" && (
                                <div className="space-y-1 animate-in fade-in">
                                    {response.headers && Object.entries(response.headers).map(([key, value]) => (
                                        <div key={key} className="flex gap-2 text-xs sm:text-sm font-mono py-1 border-b border-zinc-800/50 last:border-0">
                                            <span className="text-cyan-400 font-semibold whitespace-nowrap">{key}:</span>
                                            <span className="text-zinc-400 break-all">{value}</span>
                                        </div>
                                    ))}
                                    {(!response.headers || Object.keys(response.headers).length === 0) && (
                                        <span className="text-zinc-600 text-sm italic">No headers returned</span>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ─── History ────────────────────────────── */}
                {history.length > 0 && (
                    <Card className="border-border/50 bg-card mb-6 animate-in fade-in">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                    <History className="h-4 w-4" /> ประวัติล่าสุด
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive gap-1" onClick={clearHistory}>
                                    <Trash2 className="h-3 w-3" /> ล้างทั้งหมด
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-1.5">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => loadFromHistory(item)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                                    >
                                        <Badge variant="outline" className={`${METHOD_COLORS[item.method] || ""} border text-[10px] font-bold min-w-[52px] justify-center`}>
                                            {item.method}
                                        </Badge>
                                        <span className="flex-1 text-sm font-mono truncate text-muted-foreground group-hover:text-foreground transition-colors">
                                            {item.url}
                                        </span>
                                        <Badge variant="outline" className={`${statusColor(item.statusCode)} border text-[10px] font-bold`}>
                                            {item.statusCode}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5" /> {item.elapsedMs}ms
                                        </span>
                                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-primary transition-all" />
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ─── Privacy Note ───────────────────────── */}
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex gap-3 items-center mb-6">
                    <Zap className="h-5 w-5 text-cyan-500 shrink-0" />
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                        Request ถูกส่งผ่าน Proxy เพื่อแก้ปัญหา CORS เท่านั้น — ไม่มีการเก็บหรือ log ข้อมูลใดๆ ประวัติการยิงถูกเก็บไว้ใน <code className="bg-cyan-500/10 px-1 rounded text-cyan-600 font-mono">localStorage</code> ของเครื่องคุณเท่านั้น
                    </p>
                </div>

                {/* Bottom Ad Unit */}
                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="mt-6 min-h-[150px] bg-muted/10 rounded-xl py-8 border border-dashed border-muted shrink-0"
                />
            </main>
        </div>
    );
}
