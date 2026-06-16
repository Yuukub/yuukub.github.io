"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    Trash2, ChevronDown, ChevronUp, AlertCircle, Code2, RotateCcw, History,
    Info, HelpCircle, Layers, Shield, Globe, Plus, Folder, Save, Upload, X, Sliders, ExternalLink
} from "lucide-react";
import { resolveVariables, findUnresolvedVariables, type EnvVariable, type Environment } from "./lib/variables";
import { importFile, type ApiRequest, type Collection, type KeyValue } from "./lib/importExport";

// ─────────────────────────────────────────────────────────
// SEO Data
// ─────────────────────────────────────────────────────────
const FAQ_ITEMS = [
    {
        question: "API Tester นี้แตกต่างจาก Postman อย่างไร?",
        answer: "API Tester นี้ทำงานได้ทันทีจากเบราว์เซอร์โดยไม่ต้องติดตั้งโปรแกรมใดๆ เหมาะสำหรับการทดสอบแบบด่วนหรือเมื่ออยู่บนเครื่องที่ไม่สามารถติดตั้งซอฟต์แวร์ได้ ส่วน Postman มีฟีเจอร์ครบกว่าสำหรับงาน enterprise เช่น collection, environment variables และ automated testing",
    },
    {
        question: "ทำไมถึงต้องใช้ Proxy ในการส่ง request?",
        answer: "เบราว์เซอร์มีนโยบาย CORS (Cross-Origin Resource Sharing) ที่ป้องกันการเรียก API จาก domain อื่นโดยตรง Proxy ของเราทำหน้าที่เป็นตัวกลางส่ง request แทนเบราว์เซอร์เพื่อแก้ปัญหานี้ โดยไม่มีการเก็บ log หรือข้อมูลใดๆ ของคุณเลย",
    },
    {
        question: "รองรับการ Import โค้ดจากภาษาอะไรบ้าง?",
        answer: "รองรับ 7 รูปแบบ ได้แก่ Bash cURL, PHP cURL, JavaScript fetch, Axios, Python requests, HTTPie และ Go net/http เพียงวางโค้ดลงในช่อง Import แล้วกด Extract ระบบจะดึง URL, method, headers และ body มาใส่ฟอร์มให้อัตโนมัติ",
    },
    {
        question: "ประวัติการยิง API ถูกเก็บไว้ที่ไหน?",
        answer: "ประวัติทั้งหมดถูกเก็บไว้ใน localStorage ของเบราว์เซอร์คุณเท่านั้น ไม่มีการส่งข้อมูลไปยังเซิร์ฟเวอร์ใดๆ ซึ่งหมายความว่าถ้าเปลี่ยนเบราว์เซอร์หรือล้าง browser data ประวัติจะหายไปด้วย",
    },
    {
        question: "ใช้ทดสอบ API ที่ต้องการ Authentication ได้ไหม?",
        answer: "ได้ครับ ใส่ header ในช่อง Headers (JSON format) เช่น {\"Authorization\": \"Bearer your-token\"} หรือ {\"X-API-Key\": \"your-key\"} ระบบจะส่ง header เหล่านั้นไปพร้อมกับ request ทุกครั้ง",
    },
];

const HTTP_METHODS = [
    { method: "GET", color: "text-emerald-600", bg: "bg-emerald-500/10", desc: "ดึงข้อมูลจาก server ไม่แก้ไขข้อมูลใดๆ เหมาะสำหรับการโหลดรายการหรือรายละเอียดทรัพยากร" },
    { method: "POST", color: "text-blue-600", bg: "bg-blue-500/10", desc: "สร้างข้อมูลใหม่บน server ส่ง body พร้อมกับ request ใช้สำหรับ login, สร้าง record ใหม่" },
    { method: "PUT", color: "text-amber-600", bg: "bg-amber-500/10", desc: "แทนที่ข้อมูลทั้งหมดของทรัพยากรที่ระบุ ต้องส่งข้อมูลครบทุก field" },
    { method: "PATCH", color: "text-purple-600", bg: "bg-purple-500/10", desc: "อัปเดตข้อมูลบางส่วนของทรัพยากร ส่งเฉพาะ field ที่ต้องการแก้ไข" },
    { method: "DELETE", color: "text-red-600", bg: "bg-red-500/10", desc: "ลบทรัพยากรที่ระบุออกจาก server ระวัง: การกระทำนี้มักไม่สามารถย้อนกลับได้" },
];

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
            const raw = bodyMatch[1].trim();
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
            const raw = bodyMatch[1].replace(/'/g, '"').replace(/True/g, "true").replace(/False/g, "false").replace(/None/g, "null");
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

    // ─── Postgirl Additions ───────────────────────────────
    const [directMode, setDirectMode] = useState<boolean>(false);
    const [isCorsError, setIsCorsError] = useState<boolean>(false);

    // Environments state
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [activeEnvironmentId, setActiveEnvironmentId] = useState<string>("");
    
    // UI variables edit state
    const [tempVars, setTempVars] = useState<string>("");
    const [envName, setEnvName] = useState<string>("");
    const [isManagingEnvs, setIsManagingEnvs] = useState<boolean>(false);

    // Collections state
    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionsRequests, setCollectionsRequests] = useState<ApiRequest[]>([]);
    const [saveRequestName, setSaveRequestName] = useState<string>("");
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    
    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load states from localStorage
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem(HISTORY_KEY);
            if (savedHistory) setHistory(JSON.parse(savedHistory));

            const savedMode = localStorage.getItem("api-tester-direct-mode");
            if (savedMode) setDirectMode(JSON.parse(savedMode));

            const savedEnvs = localStorage.getItem("api-tester-environments");
            if (savedEnvs) {
                const parsed = JSON.parse(savedEnvs);
                setEnvironments(parsed);
                const savedActiveId = localStorage.getItem("api-tester-active-env-id");
                if (savedActiveId) {
                    setActiveEnvironmentId(savedActiveId);
                } else if (parsed.length > 0) {
                    setActiveEnvironmentId(parsed[0].id);
                }
            }

            const savedCols = localStorage.getItem("api-tester-collections");
            const savedReqs = localStorage.getItem("api-tester-collections-requests");
            if (savedCols) setCollections(JSON.parse(savedCols));
            if (savedReqs) setCollectionsRequests(JSON.parse(savedReqs));
        } catch { /* ignore */ }
    }, []);

    const saveEnvironments = (updated: Environment[]) => {
        setEnvironments(updated);
        try { localStorage.setItem("api-tester-environments", JSON.stringify(updated)); } catch { /* ignore */ }
    };

    const saveActiveEnvId = (id: string) => {
        setActiveEnvironmentId(id);
        try { localStorage.setItem("api-tester-active-env-id", id); } catch { /* ignore */ }
    };

    const saveCollectionsAndRequests = (updatedCols: Collection[], updatedReqs: ApiRequest[]) => {
        setCollections(updatedCols);
        setCollectionsRequests(updatedReqs);
        try {
            localStorage.setItem("api-tester-collections", JSON.stringify(updatedCols));
            localStorage.setItem("api-tester-collections-requests", JSON.stringify(updatedReqs));
        } catch { /* ignore */ }
    };

    const saveDirectMode = (val: boolean) => {
        setDirectMode(val);
        setIsCorsError(false);
        try { localStorage.setItem("api-tester-direct-mode", JSON.stringify(val)); } catch { /* ignore */ }
    };

    // Get active environment variables
    const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
    const activeVariables = activeEnv ? activeEnv.variables : [];

    // Live URL preview
    const resolvedUrl = resolveVariables(url, activeVariables);

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
        setIsCorsError(false);

        // Resolve variables
        const resolvedUrlStr = resolveVariables(url.trim(), activeVariables);
        const resolvedHeadersStr = resolveVariables(headersText, activeVariables);
        const resolvedBodyStr = resolveVariables(bodyText, activeVariables);

        // Parse headers from text
        let parsedHeaders: Record<string, string> = {};
        if (resolvedHeadersStr.trim()) {
            try {
                parsedHeaders = JSON.parse(resolvedHeadersStr);
            } catch {
                setError("Headers ไม่ใช่ JSON ที่ถูกต้อง กรุณาตรวจสอบ format");
                setLoading(false);
                return;
            }
        }

        try {
            let data: ApiResponse;

            if (directMode) {
                const startTime = performance.now();
                const res = await fetch(resolvedUrlStr, {
                    method,
                    headers: parsedHeaders,
                    body: method !== "GET" && method !== "HEAD" ? resolvedBodyStr : undefined,
                });
                const endTime = performance.now();
                const responseBody = await res.text();
                const headersObj: Record<string, string> = {};
                res.headers.forEach((v, k) => {
                    headersObj[k] = v;
                });
                
                data = {
                    status_code: res.status,
                    status_text: res.statusText,
                    headers: headersObj,
                    body: responseBody,
                    elapsed_ms: Math.round(endTime - startTime),
                };
            } else {
                const res = await fetch(PROXY_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: resolvedUrlStr,
                        method,
                        headers: parsedHeaders,
                        body: method !== "GET" && method !== "HEAD" ? resolvedBodyStr : undefined,
                    }),
                });

                data = await res.json();

                if (!res.ok) {
                    throw new Error((data as unknown as { error: string }).error || `Proxy error: ${res.status}`);
                }
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
            if (directMode && err instanceof TypeError) {
                setIsCorsError(true);
                setError("CORS Blocked หรือ Network Error: การเรียกใช้ API ข้ามโดเมนล้มเหลวเนื่องจากความปลอดภัยของเบราว์เซอร์");
            } else {
                const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    }, [url, method, headersText, bodyText, directMode, activeVariables]);

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

    // ─── Postgirl Environment & Collection Helpers ────────
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const report = importFile(json, Date.now());

                if (report.environments.length > 0) {
                    const mergedEnvs = [...environments];
                    report.environments.forEach((newEnv) => {
                        const idx = mergedEnvs.findIndex((x) => x.name === newEnv.name);
                        if (idx >= 0) {
                            mergedEnvs[idx] = { ...newEnv, name: `${newEnv.name} (Imported)` };
                        } else {
                            mergedEnvs.push(newEnv);
                        }
                    });
                    saveEnvironments(mergedEnvs);
                    if (mergedEnvs.length > 0 && !activeEnvironmentId) {
                        saveActiveEnvId(mergedEnvs[mergedEnvs.length - 1].id);
                    }
                    setImportSuccess(`✅ นำเข้า Environment (${report.environments.map(e => e.name).join(", ")}) สำเร็จ!`);
                }

                if (report.collections.length > 0) {
                    const mergedCols = [...collections];
                    const mergedReqs = [...collectionsRequests];
                    
                    report.collections.forEach((newCol) => {
                        const idx = mergedCols.findIndex((x) => x.name === newCol.name);
                        if (idx >= 0) {
                            newCol.name = `${newCol.name} (Imported)`;
                        }
                        mergedCols.push(newCol);
                    });

                    report.requests.forEach((newReq) => {
                        mergedReqs.push(newReq);
                    });

                    saveCollectionsAndRequests(mergedCols, mergedReqs);
                    setImportSuccess(`✅ นำเข้า Collection (${report.collections.map(c => c.name).join(", ")}) สำเร็จ!`);
                }

                if (report.warnings.length > 0) {
                    setError(`คำเตือน: ${report.warnings.join(", ")}`);
                } else {
                    setError("");
                }

                setTimeout(() => setImportSuccess(""), 4000);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดไฟล์ JSON");
            }
        };
        reader.readAsText(file);
        // Reset file input value
        if (e.target) e.target.value = "";
    };

    const handleCreateEnv = () => {
        if (!envName.trim()) return;
        const newEnv: Environment = {
            id: crypto.randomUUID(),
            name: envName.trim(),
            variables: [],
        };
        const updated = [...environments, newEnv];
        saveEnvironments(updated);
        saveActiveEnvId(newEnv.id);
        setEnvName("");
    };

    const handleDeleteEnv = (id: string) => {
        const updated = environments.filter((e) => e.id !== id);
        saveEnvironments(updated);
        if (activeEnvironmentId === id) {
            saveActiveEnvId(updated.length > 0 ? updated[0].id : "");
        }
    };

    const handleSaveVariables = () => {
        if (!activeEnvironmentId) return;
        try {
            const parsed = JSON.parse(tempVars);
            if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                throw new Error("ต้องเป็น JSON Object เท่านั้น เช่น { \"key\": \"value\" }");
            }
            const updatedVars: EnvVariable[] = Object.entries(parsed).map(([key, val]) => ({
                id: crypto.randomUUID(),
                key: key.trim(),
                value: String(val),
                enabled: true,
            }));

            const updatedEnvs = environments.map((env) => {
                if (env.id === activeEnvironmentId) {
                    return { ...env, variables: updatedVars };
                }
                return env;
            });
            saveEnvironments(updatedEnvs);
            setImportSuccess("✅ บันทึกตัวแปรสภาพแวดล้อมสำเร็จ!");
            setTimeout(() => setImportSuccess(""), 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "รูปแบบ JSON ไม่ถูกต้อง ตัวอย่าง: { \"domain\": \"api.com\" }");
        }
    };

    // Load variables into editor when active environment changes
    useEffect(() => {
        if (activeEnvironmentId && activeEnv) {
            const varObj: Record<string, string> = {};
            activeEnv.variables.forEach((v) => {
                varObj[v.key] = v.value;
            });
            setTempVars(JSON.stringify(varObj, null, 2));
        } else {
            setTempVars("{}");
        }
    }, [activeEnvironmentId, environments]);

    const handleSaveRequestToCollection = () => {
        if (!saveRequestName.trim()) return;
        
        let targetColId = selectedCollectionId;
        const updatedCols = [...collections];
        const updatedReqs = [...collectionsRequests];

        // Create new collection if needed
        if (selectedCollectionId === "new") {
            const newCol: Collection = {
                id: crypto.randomUUID(),
                name: "Collection ใหม่",
                requestIds: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            updatedCols.push(newCol);
            targetColId = newCol.id;
        }

        if (!targetColId && updatedCols.length > 0) {
            targetColId = updatedCols[0].id;
        } else if (!targetColId) {
            // If no collections exist, create one
            const defaultCol: Collection = {
                id: crypto.randomUUID(),
                name: "My Collection",
                requestIds: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            updatedCols.push(defaultCol);
            targetColId = defaultCol.id;
        }

        const newReq: ApiRequest = {
            id: crypto.randomUUID(),
            name: saveRequestName.trim(),
            method,
            url,
            params: [],
            headers: [],
            body: {
                mode: method !== "GET" && method !== "HEAD" ? "json" : "none",
                raw: bodyText,
            },
            auth: { type: "none" },
            collectionId: targetColId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // If headers isn't JSON list, map correctly
        try {
            if (headersText.trim()) {
                const parsed = JSON.parse(headersText);
                newReq.headers = Object.entries(parsed).map(([k, v]) => ({
                    id: crypto.randomUUID(),
                    key: k,
                    value: String(v),
                    enabled: true,
                }));
            }
        } catch { /* ignore and use empty list */ }

        updatedReqs.push(newReq);
        
        // Add request to collection
        const colIdx = updatedCols.findIndex((c) => c.id === targetColId);
        if (colIdx >= 0) {
            updatedCols[colIdx].requestIds.push(newReq.id);
            updatedCols[colIdx].updatedAt = Date.now();
        }

        saveCollectionsAndRequests(updatedCols, updatedReqs);
        setSaveRequestName("");
        setShowSaveModal(false);
        setImportSuccess("✅ บันทึกเข้า Collection สำเร็จ!");
        setTimeout(() => setImportSuccess(""), 3000);
    };

    const loadCollectionRequest = (req: ApiRequest) => {
        setUrl(req.url);
        setMethod(req.method);
        
        // Format headers back to JSON string
        const headerObj: Record<string, string> = {};
        req.headers.forEach((h) => {
            if (h.enabled) headerObj[h.key] = h.value;
        });
        setHeadersText(Object.keys(headerObj).length > 0 ? JSON.stringify(headerObj, null, 2) : "");

        setBodyText(req.body.raw ?? "");
        setResponse(null);
        setError("");
    };

    const handleDeleteCollection = (colId: string) => {
        const updatedCols = collections.filter((c) => c.id !== colId);
        const updatedReqs = collectionsRequests.filter((r) => r.collectionId !== colId);
        saveCollectionsAndRequests(updatedCols, updatedReqs);
    };

    const handleDeleteRequest = (reqId: string, colId: string) => {
        const updatedReqs = collectionsRequests.filter((r) => r.id !== reqId);
        const updatedCols = collections.map((c) => {
            if (c.id === colId) {
                return { ...c, requestIds: c.requestIds.filter((id) => id !== reqId) };
            }
            return c;
        });
        saveCollectionsAndRequests(updatedCols, updatedReqs);
    };

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

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": { "@type": "Answer", "text": item.answer },
        })),
    };

    // ─── JSX ────────────────────────────────────────────
    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-6xl">
                {/* ─── Header ────────────────────────────── */}
                <div className="mb-8">
                    <Link href="/tools/" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4 w-fit">
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

                {/* ─── Grid: Sidebar + Main Area ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-start animate-in fade-in duration-300">
                    
                    {/* ─── Left Sidebar: Collections & Environments ─── */}
                    <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
                        
                        {/* 1. Environments Panel */}
                        <Card className="border-border/50 bg-card">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                    <Sliders className="h-4 w-4 text-cyan-500" /> สภาพแวดล้อม (Env)
                                </CardTitle>
                                {activeEnvironmentId && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/5 px-1.5"
                                        onClick={() => handleDeleteEnv(activeEnvironmentId)}
                                    >
                                        ลบ Env นี้
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Env Selector */}
                                <div className="space-y-1">
                                    <select
                                        value={activeEnvironmentId}
                                        onChange={(e) => saveActiveEnvId(e.target.value)}
                                        className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-xs focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">-- เลือกสภาพแวดล้อม (No Env) --</option>
                                        {environments.map((env) => (
                                            <option key={env.id} value={env.id}>{env.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Active Env variables JSON Editor */}
                                {activeEnvironmentId ? (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">ตัวแปร (JSON Object)</span>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-6 text-[10.5px] font-bold text-cyan-600 hover:text-cyan-700 hover:bg-cyan-500/5 px-2"
                                                onClick={handleSaveVariables}
                                            >
                                                บันทึกตัวแปร
                                            </Button>
                                        </div>
                                        <textarea
                                            value={tempVars}
                                            onChange={(e) => setTempVars(e.target.value)}
                                            rows={5}
                                            className="w-full rounded-lg border border-border/50 bg-background p-2.5 font-mono text-[11px] resize-y focus:border-cyan-500/50 outline-none transition-all"
                                            placeholder='{ "baseUrl": "https://api.com" }'
                                        />
                                        <p className="text-[10px] text-muted-foreground/85 leading-relaxed">
                                            เรียกใช้ด้วย <code className="bg-cyan-500/10 px-1 rounded text-cyan-600 font-mono">{"{{key}}"}</code> ใน URL, Headers หรือ Body
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-muted/20 border border-border/30 rounded-lg text-center">
                                        <p className="text-[11px] text-muted-foreground">ไม่มีสภาพแวดล้อมที่เลือกอยู่</p>
                                    </div>
                                )}

                                {/* Create Env Form */}
                                <div className="border-t border-border/30 pt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">สร้าง Env ใหม่</span>
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={envName}
                                            onChange={(e) => setEnvName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleCreateEnv()}
                                            placeholder="ชื่อสภาพแวดล้อม..."
                                            className="h-8 text-xs focus:border-cyan-500/50"
                                        />
                                        <Button
                                            onClick={handleCreateEnv}
                                            disabled={!envName.trim()}
                                            size="sm"
                                            className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Collections Panel */}
                        <Card className="border-border/50 bg-card">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                    <Folder className="h-4 w-4 text-cyan-500" /> คอลเลกชัน (Collections)
                                </CardTitle>
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".json"
                                        className="hidden"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-7 text-[10px] text-cyan-600 hover:text-cyan-700 hover:bg-cyan-500/5 gap-1 font-bold"
                                    >
                                        <Upload className="h-3 w-3" /> นำเข้า
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {collections.length === 0 ? (
                                    <div className="p-4 bg-muted/20 border border-dashed border-border/50 rounded-xl text-center">
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            ยังไม่มี Collection<br />
                                            บันทึก Request หรือนำเข้าไฟล์ Postman เพื่อเริ่มต้น
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                                        {collections.map((col) => {
                                            const colReqs = collectionsRequests.filter(r => r.collectionId === col.id);
                                            return (
                                                <div key={col.id} className="border border-border/50 rounded-lg overflow-hidden bg-muted/10">
                                                    <div className="bg-muted/30 px-3 py-2 flex items-center justify-between border-b border-border/30">
                                                        <span className="text-xs font-semibold truncate flex items-center gap-1.5" title={col.name}>
                                                            <Folder className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                                                            {col.name}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteCollection(col.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="p-1.5 space-y-1">
                                                        {colReqs.length === 0 ? (
                                                            <p className="text-[10px] text-muted-foreground italic px-2 py-1">ไม่มีข้อมูล</p>
                                                        ) : (
                                                            colReqs.map((req) => (
                                                                <div 
                                                                    key={req.id} 
                                                                    className="group flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                                                                >
                                                                    <div 
                                                                        className="flex items-center gap-2 flex-1 min-w-0"
                                                                        onClick={() => loadCollectionRequest(req)}
                                                                    >
                                                                        <span className={`text-[8px] font-bold px-1 rounded font-mono shrink-0 w-8 text-center py-0.5 border ${
                                                                            req.method === "GET" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                                            req.method === "POST" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                                            "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                                        }`}>
                                                                            {req.method}
                                                                        </span>
                                                                        <span className="text-[11px] font-medium truncate text-muted-foreground hover:text-foreground">
                                                                            {req.name}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                                                        onClick={() => handleDeleteRequest(req.id, col.id)}
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ─── Right Area: Request Form & Response Panel ─── */}
                    <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
                        
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* ── Request Form ─────────────────────── */}
                            <Card className="border-border/50 bg-card flex flex-col h-full">
                                <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <Send className="h-4 w-4 text-cyan-500" /> Request
                                    </CardTitle>
                                    
                                    {/* Direct Mode Toggle */}
                                    <div className="flex items-center gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border/30">
                                        <button
                                            onClick={() => saveDirectMode(true)}
                                            title="ยิงตรงจาก Browser ของคุณ (ใช้กับ localhost ได้ดี)"
                                            className={`px-2 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${
                                                directMode
                                                    ? "bg-cyan-500/15 text-cyan-500 shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <Globe className="h-3 w-3" /> Direct
                                        </button>
                                        <button
                                            onClick={() => saveDirectMode(false)}
                                            title="ยิงผ่าน Cloudflare Worker Proxy (ช่วยแก้ปัญหา CORS)"
                                            className={`px-2 py-1 text-[10px] font-bold rounded transition-all flex items-center gap-1 ${
                                                !directMode
                                                    ? "bg-blue-500/15 text-blue-500 shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            <Shield className="h-3 w-3" /> Proxy
                                        </button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        {/* Method + URL */}
                                        <div className="space-y-1">
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
                                                    placeholder="https://api.example.com/endpoint หรือ {{url}}/endpoint"
                                                    className="flex-1 font-mono text-sm focus:border-cyan-500/50"
                                                />
                                            </div>

                                            {/* Live Resolved URL Preview */}
                                            {url.includes("{{") && (
                                                <div className="text-[10px] font-mono text-muted-foreground truncate bg-muted/40 px-2.5 py-1.5 rounded border border-border/30 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                                                    <Globe className="h-3 w-3 shrink-0 text-cyan-500" />
                                                    <span className="shrink-0 text-cyan-600 font-semibold">Preview URL:</span>
                                                    <span className="truncate text-foreground/80">{resolvedUrl}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Headers */}
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                                                Headers (JSON)
                                            </label>
                                            <textarea
                                                value={headersText}
                                                onChange={(e) => setHeadersText(e.target.value)}
                                                rows={3}
                                                className="w-full rounded-lg border border-border/50 bg-background p-3 font-mono text-xs resize-y focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-muted-foreground/40"
                                                placeholder='{ "Authorization": "Bearer {{token}}" }'
                                            />
                                        </div>

                                        {/* Body */}
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                                                Body {method === "GET" || method === "HEAD" ? <span className="text-muted-foreground/50 normal-case font-normal">(ไม่ใช้กับ {method})</span> : ""}
                                            </label>
                                            <textarea
                                                value={bodyText}
                                                onChange={(e) => setBodyText(e.target.value)}
                                                rows={4}
                                                disabled={method === "GET" || method === "HEAD"}
                                                className="w-full rounded-lg border border-border/50 bg-background p-3 font-mono text-xs resize-y focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-muted-foreground/40"
                                                placeholder='{ "username": "{{user}}" }'
                                            />
                                        </div>

                                        {/* Error Alert */}
                                        {error && (
                                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>ข้อผิดพลาด</AlertTitle>
                                                <AlertDescription className="text-xs">{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        {/* CORS Explainer Card */}
                                        {isCorsError && (
                                            <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-500 animate-in fade-in slide-in-from-top-2">
                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                <AlertTitle className="font-bold text-xs">CORS Blocked (เบราว์เซอร์บล็อกการเรียกใช้)</AlertTitle>
                                                <AlertDescription className="text-[11px] space-y-2 mt-1">
                                                    <p>
                                                        เบราว์เซอร์ของคุณสกัดกั้นการเชื่อมต่อไปยังโฮสต์ปลายทาง เนื่องจากไม่ผ่านนโยบายความปลอดภัย CORS ปัญหานี้สามารถหลีกเลี่ยงได้ง่ายๆ ด้วยการยิงผ่าน Worker Proxy
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 bg-transparent h-7 text-[10px]"
                                                        onClick={() => saveDirectMode(false)}
                                                    >
                                                        สลับเป็น Proxy Mode ทันที
                                                    </Button>
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-4 border-t border-border/20 mt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSaveRequestName(url ? url.split("/").pop() || "Request ใหม่" : "Request ใหม่");
                                                setShowSaveModal(true);
                                            }}
                                            disabled={!url.trim()}
                                            className="h-11 px-4 text-sm font-semibold gap-2 border-border/50 hover:bg-muted/50"
                                        >
                                            <Save className="h-4 w-4 text-muted-foreground" />
                                            <span className="hidden sm:inline">Save</span>
                                        </Button>
                                        <Button
                                            onClick={sendRequest}
                                            disabled={loading || !url.trim()}
                                            className="flex-1 h-11 text-sm font-bold gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                                        >
                                            {loading ? (
                                                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                            ) : (
                                                <><Send className="h-4 w-4" /> Send Request</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ── Response Panel ─────────────────────── */}
                            <Card className="border-border/50 bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col h-full min-h-[450px]">
                                <CardHeader className="pb-3 shrink-0">
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
                                <CardContent className="flex-1 pt-0 overflow-y-auto">
                                    {loading && (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-zinc-500">
                                            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                                            <span className="text-sm">กำลังส่ง request...</span>
                                        </div>
                                    )}
                                    {!loading && !response && !error && (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-zinc-600">
                                            <Zap className="h-10 w-10 opacity-20" />
                                            <span className="text-sm">กรอกข้อมูลแล้วกด Send Request</span>
                                        </div>
                                    )}
                                    {response && responseTab === "body" && (
                                        <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-all text-emerald-400/90 overflow-auto max-h-[500px] animate-in fade-in py-2">
                                            {formattedBody || <span className="text-zinc-600 italic">Empty response body</span>}
                                        </pre>
                                    )}
                                    {response && responseTab === "headers" && (
                                        <div className="space-y-1 animate-in fade-in py-2">
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

                    </div>
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

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="mt-6 min-h-[150px] bg-muted/10 rounded-xl py-8 border border-dashed border-muted shrink-0"
                />

                {/* ─── SEO Content ─────────────────────────────────── */}
                <div className="mt-4 space-y-12 border-t border-border/20 pt-12 max-w-3xl mx-auto">

                    {/* Section 1: API Tester คืออะไร */}
                    <section aria-labelledby="intro-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                                <Info className="h-5 w-5 text-cyan-500" />
                            </div>
                            <h2 id="intro-heading" className="text-xl font-bold tracking-tight">
                                API Tester ออนไลน์คืออะไร?
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                <strong className="text-foreground">API Tester</strong> คือเครื่องมือสำหรับทดสอบการเชื่อมต่อและตรวจสอบการทำงานของ <strong className="text-foreground">REST API</strong> โดยไม่ต้องเขียนโค้ดหรือติดตั้งโปรแกรมเพิ่มเติม นักพัฒนาใช้เครื่องมือประเภทนี้เพื่อส่ง HTTP request ไปยัง endpoint ต่างๆ และตรวจสอบ response ที่ได้รับ ไม่ว่าจะเป็น status code, headers หรือ body
                            </p>
                            <p>
                                เครื่องมือนี้รองรับการ <strong className="text-foreground">Import โค้ดอัตโนมัติ</strong> จาก 7 รูปแบบ ได้แก่ Bash cURL, PHP cURL, JavaScript fetch, Axios, Python requests, HTTPie และ Go net/http ทำให้คุณสามารถนำโค้ดที่ได้จาก AI หรือ API documentation มาวางแล้วทดสอบได้ทันที โดยไม่ต้องแปลงด้วยมือ
                            </p>
                            <p>
                                ทุก request ถูกส่งผ่าน <strong className="text-foreground">Cloudflare Worker Proxy</strong> เพื่อแก้ปัญหา CORS ที่เบราว์เซอร์บล็อกการเรียก API ข้าม domain โดยตรง และประวัติการยิงทั้งหมดถูกบันทึกไว้ใน <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">localStorage</code> ของเครื่องคุณเท่านั้น ไม่มีการเก็บ log บน server ใดๆ
                            </p>
                        </div>
                    </section>

                    {/* Section 2: HTTP Methods */}
                    <section aria-labelledby="methods-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                                <Layers className="h-5 w-5 text-cyan-500" />
                            </div>
                            <h2 id="methods-heading" className="text-xl font-bold tracking-tight">
                                HTTP Methods ที่รองรับ
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {HTTP_METHODS.map((item) => (
                                <div key={item.method} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-muted/20">
                                    <span className={`font-mono font-bold text-sm px-2.5 py-1 rounded-lg ${item.bg} ${item.color} shrink-0 min-w-[72px] text-center`}>
                                        {item.method}
                                    </span>
                                    <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Section 3: วิธีใช้งาน */}
                    <section aria-labelledby="howto-heading">
                        <h2 id="howto-heading" className="text-xl font-bold tracking-tight mb-6">
                            วิธีใช้งาน — 3 ขั้นตอน
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    step: "1",
                                    title: "Import หรือกรอก URL",
                                    desc: "วางโค้ด cURL/fetch/Axios ในช่อง Import แล้วกด Extract หรือกรอก URL และเลือก HTTP method โดยตรง ใส่ Headers และ Body ตามต้องการ",
                                },
                                {
                                    step: "2",
                                    title: "กด Send Request",
                                    desc: "กดปุ่ม Send Request เพื่อยิง API ระบบจะส่งผ่าน Proxy อัตโนมัติเพื่อแก้ปัญหา CORS และแสดงผลลัพธ์แบบ real-time",
                                },
                                {
                                    step: "3",
                                    title: "ตรวจสอบ Response",
                                    desc: "ดู status code, response time, body (JSON formatted) และ headers แยก tab ประวัติการยิงถูกบันทึกอัตโนมัติเพื่อใช้ซ้ำได้",
                                },
                            ].map((item) => (
                                <Card key={item.step} className="p-5 border-border/50 bg-muted/20 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="h-7 w-7 rounded-full bg-cyan-500/10 text-cyan-600 text-sm font-bold flex items-center justify-center shrink-0">
                                            {item.step}
                                        </span>
                                        <span className="font-semibold text-sm">{item.title}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section 4: FAQ */}
                    <section aria-labelledby="faq-heading">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                                <HelpCircle className="h-5 w-5 text-cyan-500" />
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

                    {/* Section 5: Privacy */}
                    <section aria-labelledby="privacy-heading">
                        <div className="p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-cyan-500 shrink-0" />
                                <h2 id="privacy-heading" className="font-bold text-sm uppercase tracking-wider">
                                    ความเป็นส่วนตัวและความปลอดภัย
                                </h2>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Proxy ที่ใช้ในการส่ง request ทำงานบน <strong className="text-foreground">Cloudflare Workers</strong> ซึ่งเป็น edge runtime ที่ไม่เก็บ log การเชื่อมต่อหรือ payload ใดๆ ทำหน้าที่แค่ส่งต่อ request และรับ response กลับมาให้เท่านั้น ส่วนประวัติการยิงทั้งหมดถูกบันทึกเฉพาะใน localStorage ของเบราว์เซอร์คุณ และสามารถลบได้ตลอดเวลาผ่านปุ่ม &quot;ล้างทั้งหมด&quot;
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Badge variant="outline" className="text-[11px]">No Log</Badge>
                                <Badge variant="outline" className="text-[11px]">Cloudflare Workers</Badge>
                                <Badge variant="outline" className="text-[11px]">localStorage Only</Badge>
                                <Badge variant="outline" className="text-[11px]">No Server Storage</Badge>
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

                {/* ─── Save Request Modal ────────────────── */}
                {showSaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-md border-border/50 bg-card/95 shadow-2xl">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Folder className="h-4 w-4 text-cyan-500" /> บันทึก Request ลง Collection
                                </CardTitle>
                                <button 
                                    onClick={() => setShowSaveModal(false)}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">ชื่อ Request</label>
                                    <Input
                                        value={saveRequestName}
                                        onChange={(e) => setSaveRequestName(e.target.value)}
                                        placeholder="เช่น ดึงข้อมูลผู้ใช้"
                                    />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">เลือก Collection</label>
                                    <select
                                        value={selectedCollectionId}
                                        onChange={(e) => setSelectedCollectionId(e.target.value)}
                                        className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">-- เลือก Collection หรือสร้างใหม่ --</option>
                                        {collections.map((col) => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                        <option value="new">+ สร้าง Collection ใหม่</option>
                                    </select>
                                </div>

                                <div className="flex gap-2 justify-end pt-2">
                                    <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
                                        ยกเลิก
                                    </Button>
                                    <Button 
                                        onClick={handleSaveRequestToCollection}
                                        disabled={!saveRequestName.trim()}
                                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                                    >
                                        บันทึก
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
