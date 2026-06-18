"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdUnit } from "@/components/ad-unit";
import { Link } from "@/i18n/routing";
import {
    ArrowLeft, Zap, Send, Loader2, Clock, Copy, CheckCircle2,
    Trash2, ChevronDown, ChevronUp, AlertCircle, Code2, RotateCcw, History,
    Info, HelpCircle, Layers, Shield, Globe, Plus, Folder, Save, Upload, X, Sliders, ExternalLink
} from "lucide-react";
import { resolveVariables, findUnresolvedVariables, type EnvVariable, type Environment } from "./lib/variables";
import { importFile, type ApiRequest, type Collection, type KeyValue } from "./lib/importExport";

// ─────────────────────────────────────────────────────────
// (FAQ_ITEMS and HTTP_METHODS are now declared dynamically inside the component to support i18n)
// ─────────────────────────────────────────────────────────

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

interface Tab {
    id: string;
    name: string;
    method: string;
    url: string;
    headers: KeyValue[];
    params: KeyValue[];
    bodyMode: "none" | "json" | "raw" | "form-data" | "x-www-form-urlencoded";
    bodyRaw: string;
    bodyFormData: KeyValue[];
    bodyUrlEncoded: KeyValue[];
    authType: "none" | "bearer" | "basic" | "api-key";
    authBearerToken: string;
    authBasicUser: string;
    authBasicPass: string;
    authApiKeyName: string;
    authApiKeyValue: string;
    authApiKeyIn: "header" | "query";
    response: ApiResponse | null;
    loading: boolean;
    error: string;
    isCorsError: boolean;
    associatedRequestId?: string;
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
    const t = useTranslations("ApiTester");

    const FAQ_ITEMS = [
        {
            question: t("faq1Q"),
            answer: t("faq1A"),
        },
        {
            question: t("faq2Q"),
            answer: t("faq2A"),
        },
        {
            question: t("faq3Q"),
            answer: t("faq3A"),
        },
        {
            question: t("faq4Q"),
            answer: t("faq4A"),
        },
        {
            question: t("faq5Q"),
            answer: t("faq5A"),
        },
    ];

    const HTTP_METHODS = [
        { method: "GET", color: "text-emerald-600", bg: "bg-emerald-500/10", desc: t("methodGetDesc") },
        { method: "POST", color: "text-blue-600", bg: "bg-blue-500/10", desc: t("methodPostDesc") },
        { method: "PUT", color: "text-amber-600", bg: "bg-amber-500/10", desc: t("methodPutDesc") },
        { method: "PATCH", color: "text-purple-600", bg: "bg-purple-500/10", desc: t("methodPatchDesc") },
        { method: "DELETE", color: "text-red-600", bg: "bg-red-500/10", desc: t("methodDeleteDesc") },
    ];

    // Tabs state
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>("");
    const [reqTab, setReqTab] = useState<"params" | "auth" | "headers" | "body">("params");
    const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [renamingName, setRenamingName] = useState<string>("");
    const [copied, setCopied] = useState(false);

    // Import state
    const [importCode, setImportCode] = useState("");
    const [importExpanded, setImportExpanded] = useState(false);
    const [importSuccess, setImportSuccess] = useState("");
    const [detectedLang, setDetectedLang] = useState("");

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // ─── Postgirl Additions ───────────────────────────────
    const [directMode, setDirectMode] = useState<boolean>(false);

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

    const defaultTab = (): Tab => ({
        id: crypto.randomUUID(),
        name: "GET Request",
        method: "GET",
        url: "",
        headers: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
        params: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
        bodyMode: "none",
        bodyRaw: "",
        bodyFormData: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
        bodyUrlEncoded: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
        authType: "none",
        authBearerToken: "",
        authBasicUser: "",
        authBasicPass: "",
        authApiKeyName: "",
        authApiKeyValue: "",
        authApiKeyIn: "header",
        response: null,
        loading: false,
        error: "",
        isCorsError: false
    });

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

            // Load tabs
            const savedTabs = localStorage.getItem("api-tester-workspace-tabs");
            const savedActiveTabId = localStorage.getItem("api-tester-workspace-active-tab-id");
            if (savedTabs) {
                const parsedTabs = JSON.parse(savedTabs);
                setTabs(parsedTabs);
                if (savedActiveTabId && parsedTabs.some((t: Tab) => t.id === savedActiveTabId)) {
                    setActiveTabId(savedActiveTabId);
                } else if (parsedTabs.length > 0) {
                    setActiveTabId(parsedTabs[0].id);
                }
            } else {
                const initialTab = defaultTab();
                setTabs([initialTab]);
                setActiveTabId(initialTab.id);
            }
        } catch { 
            const initialTab = defaultTab();
            setTabs([initialTab]);
            setActiveTabId(initialTab.id);
        }
    }, []);

    // Save tabs to localStorage
    useEffect(() => {
        if (tabs.length > 0) {
            try {
                localStorage.setItem("api-tester-workspace-tabs", JSON.stringify(tabs));
            } catch { /* ignore */ }
        }
    }, [tabs]);

    useEffect(() => {
        if (activeTabId) {
            try {
                localStorage.setItem("api-tester-workspace-active-tab-id", activeTabId);
            } catch { /* ignore */ }
        }
    }, [activeTabId]);

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
        setTabs(prev => prev.map(t => ({ ...t, isCorsError: false })));
        try { localStorage.setItem("api-tester-direct-mode", JSON.stringify(val)); } catch { /* ignore */ }
    };

    // Get active environment variables
    const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
    const activeVariables = activeEnv ? activeEnv.variables : [];

    // Active tab selector
    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || {
        id: "",
        name: "GET Request",
        method: "GET",
        url: "",
        headers: [],
        params: [],
        bodyMode: "none",
        bodyRaw: "",
        bodyFormData: [],
        bodyUrlEncoded: [],
        authType: "none",
        authBearerToken: "",
        authBasicUser: "",
        authBasicPass: "",
        authApiKeyName: "",
        authApiKeyValue: "",
        authApiKeyIn: "header",
        response: null,
        loading: false,
        error: "",
        isCorsError: false
    };

    const {
        url,
        method,
        response,
        loading,
        error,
        isCorsError
    } = activeTab;

    const setError = (msg: string) => {
        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, error: msg } : t));
    };

    // Live URL preview
    const resolvedUrl = resolveVariables(activeTab.url || "", activeVariables);

    // Auto-detect language while typing import code
    useEffect(() => {
        setDetectedLang(detectLanguage(importCode));
    }, [importCode]);

    // Parse URL query parameters helper
    const parseUrlToParams = (urlString: string): { baseUrl: string; params: KeyValue[] } => {
        try {
            const qIdx = urlString.indexOf("?");
            if (qIdx === -1) {
                return { baseUrl: urlString, params: [] };
            }
            const baseUrl = urlString.slice(0, qIdx);
            const queryStr = urlString.slice(qIdx + 1);
            if (!queryStr.trim()) {
                return { baseUrl, params: [] };
            }
            
            const params: KeyValue[] = queryStr.split("&").map((pair) => {
                const eqIdx = pair.indexOf("=");
                let key = pair;
                let value = "";
                if (eqIdx !== -1) {
                    key = pair.slice(0, eqIdx);
                    value = pair.slice(eqIdx + 1);
                }
                return {
                    id: crypto.randomUUID(),
                    key: safeDecode(key),
                    value: safeDecode(value),
                    enabled: true,
                };
            });
            
            return { baseUrl, params };
        } catch {
            return { baseUrl: urlString, params: [] };
        }
    };

    const compileUrl = (baseUrl: string, params: KeyValue[]): string => {
        const activeParams = params.filter((p) => p.enabled && p.key.trim());
        if (activeParams.length === 0) {
            return baseUrl;
        }
        const queryStr = activeParams
            .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
            .join("&");
        
        const base = baseUrl.split("?")[0];
        return `${base}?${queryStr}`;
    };

    const safeDecode = (val: string): string => {
        try {
            return decodeURIComponent(val);
        } catch {
            return val;
        }
    };

    // ─── Import Handler ─────────────────────────────────
    const handleImport = useCallback(() => {
        if (!importCode.trim()) return;
        const parsed = parseImportCode(importCode);

        const mapRows = (obj: Record<string, string>): KeyValue[] => {
            const mapped = Object.entries(obj).map(([k, v]) => ({
                id: crypto.randomUUID(),
                key: k,
                value: String(v),
                enabled: true,
            }));
            mapped.push({ id: crypto.randomUUID(), key: "", value: "", enabled: true });
            return mapped;
        };

        const parsedUrl = parseUrlToParams(parsed.url || "");

        const newT: Tab = {
            id: crypto.randomUUID(),
            name: `${parsed.method || "GET"} Request`,
            method: parsed.method || "GET",
            url: parsed.url || "",
            headers: mapRows(parsed.headers),
            params: parsedUrl.params.length > 0 ? [...parsedUrl.params, { id: crypto.randomUUID(), key: "", value: "", enabled: true }] : [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
            bodyMode: parsed.body ? "json" : "none",
            bodyRaw: parsed.body || "",
            bodyFormData: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
            bodyUrlEncoded: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
            authType: "none",
            authBearerToken: "",
            authBasicUser: "",
            authBasicPass: "",
            authApiKeyName: "",
            authApiKeyValue: "",
            authApiKeyIn: "header",
            response: null,
            loading: false,
            error: "",
            isCorsError: false
        };

        setTabs(prev => [...prev, newT]);
        setActiveTabId(newT.id);

        setImportSuccess(t("importSuccess", { language: parsed.language }));
        setImportCode("");
        setTimeout(() => setImportSuccess(""), 3000);
    }, [importCode]);

    // ─── Send Request Handler ───────────────────────────
    const sendRequest = useCallback(async () => {
        if (!activeTab || !activeTab.url.trim()) return;

        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, loading: true, response: null, error: "", isCorsError: false } : t));

        // Resolve variables on URL
        let finalUrl = resolveVariables(activeTab.url.trim(), activeVariables);

        // Build headers dictionary
        const finalHeaders: Record<string, string> = {};

        // 1. Custom headers
        activeTab.headers.forEach((h) => {
            if (h.enabled && h.key.trim()) {
                const resolvedKey = resolveVariables(h.key.trim(), activeVariables);
                const resolvedVal = resolveVariables(h.value, activeVariables);
                finalHeaders[resolvedKey] = resolvedVal;
            }
        });

        // 2. Auth credentials
        if (activeTab.authType === "bearer" && activeTab.authBearerToken) {
            const token = resolveVariables(activeTab.authBearerToken, activeVariables);
            finalHeaders["Authorization"] = `Bearer ${token}`;
        } else if (activeTab.authType === "basic") {
            const user = resolveVariables(activeTab.authBasicUser, activeVariables);
            const pass = resolveVariables(activeTab.authBasicPass, activeVariables);
            const base64 = btoa(`${user}:${pass}`);
            finalHeaders["Authorization"] = `Basic ${base64}`;
        } else if (activeTab.authType === "api-key" && activeTab.authApiKeyName && activeTab.authApiKeyValue) {
            const keyName = resolveVariables(activeTab.authApiKeyName, activeVariables);
            const keyValue = resolveVariables(activeTab.authApiKeyValue, activeVariables);
            if (activeTab.authApiKeyIn === "query") {
                const sep = finalUrl.includes("?") ? "&" : "?";
                finalUrl += `${sep}${encodeURIComponent(keyName)}=${encodeURIComponent(keyValue)}`;
            } else {
                finalHeaders[keyName] = keyValue;
            }
        }

        // 3. Request Body
        let finalBody: any = undefined;
        if (activeTab.method !== "GET" && activeTab.method !== "HEAD") {
            if (activeTab.bodyMode === "json" || activeTab.bodyMode === "raw") {
                finalBody = resolveVariables(activeTab.bodyRaw, activeVariables);
            } else if (activeTab.bodyMode === "x-www-form-urlencoded") {
                const urlParams = new URLSearchParams();
                activeTab.bodyUrlEncoded.forEach((kv) => {
                    if (kv.enabled && kv.key.trim()) {
                        urlParams.append(
                            resolveVariables(kv.key.trim(), activeVariables),
                            resolveVariables(kv.value, activeVariables)
                        );
                    }
                });
                finalBody = urlParams.toString();
                finalHeaders["Content-Type"] = "application/x-www-form-urlencoded";
            } else if (activeTab.bodyMode === "form-data") {
                if (directMode) {
                    const formData = new FormData();
                    activeTab.bodyFormData.forEach((kv) => {
                        if (kv.enabled && kv.key.trim()) {
                            formData.append(
                                resolveVariables(kv.key.trim(), activeVariables),
                                resolveVariables(kv.value, activeVariables)
                            );
                        }
                    });
                    finalBody = formData;
                } else {
                    const obj: Record<string, string> = {};
                    activeTab.bodyFormData.forEach((kv) => {
                        if (kv.enabled && kv.key.trim()) {
                            obj[kv.key.trim()] = kv.value;
                        }
                    });
                    finalBody = JSON.stringify(obj);
                    finalHeaders["Content-Type"] = "application/json";
                }
            }
        }

        try {
            let data: ApiResponse;
            const startTime = performance.now();

            if (directMode) {
                const res = await fetch(finalUrl, {
                    method: activeTab.method,
                    headers: finalHeaders,
                    body: finalBody,
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
                let proxyBody = finalBody;
                if (typeof proxyBody === "object" && !(proxyBody instanceof FormData) && proxyBody !== null) {
                    proxyBody = JSON.stringify(proxyBody);
                }

                const res = await fetch(PROXY_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: finalUrl,
                        method: activeTab.method,
                        headers: finalHeaders,
                        body: proxyBody,
                    }),
                });

                data = await res.json();

                if (!res.ok) {
                    throw new Error((data as unknown as { error: string }).error || `Proxy error: ${res.status}`);
                }
            }

            setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, loading: false, response: data } : t));

            // Save to history
            const newItem: HistoryItem = {
                id: Date.now().toString(),
                url: activeTab.url.trim(),
                method: activeTab.method,
                statusCode: data.status_code,
                elapsedMs: data.elapsed_ms,
                timestamp: Date.now(),
                headers: JSON.stringify(finalHeaders),
                body: typeof finalBody === "string" ? finalBody : "",
            };
            setHistory((prev) => {
                const updated = [newItem, ...prev].slice(0, 100);
                try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
                return updated;
            });
        } catch (err: unknown) {
            let errorMsg = t("unknownError");
            let corsErr = false;

            if (directMode && err instanceof TypeError) {
                corsErr = true;
                errorMsg = t("corsOrNetworkError");
            } else if (err instanceof Error) {
                errorMsg = err.message;
            }

            setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, loading: false, error: errorMsg, isCorsError: corsErr } : t));
        }
    }, [activeTab, activeVariables, directMode]);

    // ─── History Helpers ────────────────────────────────
    const loadFromHistory = useCallback((item: HistoryItem) => {
        const parseHeaders = (hStr: string): KeyValue[] => {
            try {
                if (!hStr.trim()) return [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }];
                const parsed = JSON.parse(hStr);
                const mapped = Object.entries(parsed).map(([k, v]) => ({
                    id: crypto.randomUUID(),
                    key: k,
                    value: String(v),
                    enabled: true,
                }));
                mapped.push({ id: crypto.randomUUID(), key: "", value: "", enabled: true });
                return mapped;
            } catch {
                return [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }];
            }
        };

        const parsedParams = parseUrlToParams(item.url);

        const newT: Tab = {
            id: crypto.randomUUID(),
            name: `${item.method} Request`,
            method: item.method,
            url: item.url,
            headers: parseHeaders(item.headers),
            params: parsedParams.params.length > 0 ? [...parsedParams.params, { id: crypto.randomUUID(), key: "", value: "", enabled: true }] : [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
            bodyMode: item.body ? "json" : "none",
            bodyRaw: item.body || "",
            bodyFormData: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
            bodyUrlEncoded: [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
            authType: "none",
            authBearerToken: "",
            authBasicUser: "",
            authBasicPass: "",
            authApiKeyName: "",
            authApiKeyValue: "",
            authApiKeyIn: "header",
            response: null,
            loading: false,
            error: "",
            isCorsError: false
        };

        setTabs(prev => [...prev, newT]);
        setActiveTabId(newT.id);
    }, []);

    const handleCloseTab = (id: string) => {
        if (tabs.length === 1) return;
        const idx = tabs.findIndex(t => t.id === id);
        const updated = tabs.filter(t => t.id !== id);
        setTabs(updated);
        
        if (activeTabId === id) {
            const nextActiveIdx = idx === 0 ? 0 : idx - 1;
            setActiveTabId(updated[nextActiveIdx].id);
        }
    };

    const handleMethodChange = (newMethod: string) => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, method: newMethod } : t));
    };

    const handleBodyModeChange = (mode: "none" | "json" | "raw" | "form-data" | "x-www-form-urlencoded") => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, bodyMode: mode } : t));
    };

    const handleBodyRawChange = (raw: string) => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, bodyRaw: raw } : t));
    };

    const handleAuthTypeChange = (type: "none" | "bearer" | "basic" | "api-key") => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, authType: type } : t));
    };

    const handleAuthFieldChange = (field: "authBearerToken" | "authBasicUser" | "authBasicPass" | "authApiKeyName" | "authApiKeyValue" | "authApiKeyIn", val: string) => {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, [field]: val } : t));
    };

    const handleTabNameChange = (tabId: string, newName: string) => {
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: newName } : t));
    };

    const handleAddTab = () => {
        const newTab = defaultTab();
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
    };

    const handleUrlChange = (newUrl: string) => {
        setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            
            const qIdx = newUrl.indexOf("?");
            if (qIdx === -1) {
                return { ...t, url: newUrl, params: t.params.filter(p => !p.enabled || p.key.trim() === "") };
            }
            
            const baseUrl = newUrl.slice(0, qIdx);
            const queryStr = newUrl.slice(qIdx + 1);
            const parsedPairs = queryStr.split("&").map(pair => {
                const eqIdx = pair.indexOf("=");
                const k = eqIdx === -1 ? pair : pair.slice(0, eqIdx);
                const v = eqIdx === -1 ? "" : pair.slice(eqIdx + 1);
                return { key: safeDecode(k), value: safeDecode(v) };
            });
            
            const updatedParams: KeyValue[] = [];
            const existingParams = [...t.params];
            
            parsedPairs.forEach((pair) => {
                const matchIndex = existingParams.findIndex(p => p.key === pair.key && p.value === pair.value);
                if (matchIndex !== -1) {
                    updatedParams.push(existingParams[matchIndex]);
                    existingParams.splice(matchIndex, 1);
                } else {
                    updatedParams.push({
                        id: crypto.randomUUID(),
                        key: pair.key,
                        value: pair.value,
                        enabled: true
                    });
                }
            });
            
            existingParams.forEach(p => {
                if (!p.enabled || !p.key.trim()) {
                    updatedParams.push(p);
                }
            });
            
            return { ...t, url: newUrl, params: updatedParams };
        }));
    };

    const handleParamChange = (index: number, field: "key" | "value" | "enabled" | "description", val: any) => {
        setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            
            const updatedParams = [...t.params];
            updatedParams[index] = {
                ...updatedParams[index],
                [field]: val
            };
            
            const lastParam = updatedParams[updatedParams.length - 1];
            if (lastParam && (lastParam.key.trim() || lastParam.value.trim()) && index === updatedParams.length - 1) {
                updatedParams.push({
                    id: crypto.randomUUID(),
                    key: "",
                    value: "",
                    enabled: true
                });
            }
            
            const newUrl = compileUrl(t.url.split("?")[0], updatedParams);
            return { ...t, params: updatedParams, url: newUrl };
        }));
    };

    const handleHeaderChange = (index: number, field: "key" | "value" | "enabled" | "description", val: any) => {
        setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            
            const updated = [...t.headers];
            updated[index] = {
                ...updated[index],
                [field]: val
            };
            
            const last = updated[updated.length - 1];
            if (last && (last.key.trim() || last.value.trim()) && index === updated.length - 1) {
                updated.push({
                    id: crypto.randomUUID(),
                    key: "",
                    value: "",
                    enabled: true
                });
            }
            
            return { ...t, headers: updated };
        }));
    };

    const handleBodyKVChange = (type: "formData" | "urlEncoded", index: number, field: "key" | "value" | "enabled" | "description", val: any) => {
        setTabs(prev => prev.map(t => {
            if (t.id !== activeTabId) return t;
            
            const updated = type === "formData" ? [...t.bodyFormData] : [...t.bodyUrlEncoded];
            updated[index] = {
                ...updated[index],
                [field]: val
            };
            
            const last = updated[updated.length - 1];
            if (last && (last.key.trim() || last.value.trim()) && index === updated.length - 1) {
                updated.push({
                    id: crypto.randomUUID(),
                    key: "",
                    value: "",
                    enabled: true
                });
            }
            
            if (type === "formData") return { ...t, bodyFormData: updated };
            return { ...t, bodyUrlEncoded: updated };
        }));
    };

    const handleDeleteRow = (tabId: string, type: "params" | "headers" | "formData" | "urlEncoded", index: number) => {
        setTabs(prev => prev.map(t => {
            if (t.id !== tabId) return t;
            
            let updated: KeyValue[];
            if (type === "params") updated = [...t.params];
            else if (type === "headers") updated = [...t.headers];
            else if (type === "formData") updated = [...t.bodyFormData];
            else updated = [...t.bodyUrlEncoded];
            
            updated.splice(index, 1);
            
            if (updated.length === 0) {
                updated.push({ id: crypto.randomUUID(), key: "", value: "", enabled: true });
            }
            
            let newUrl = t.url;
            if (type === "params") {
                newUrl = compileUrl(t.url.split("?")[0], updated);
            }
            
            if (type === "params") return { ...t, params: updated, url: newUrl };
            if (type === "headers") return { ...t, headers: updated };
            if (type === "formData") return { ...t, bodyFormData: updated };
            return { ...t, bodyUrlEncoded: updated };
        }));
    };

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
                    setImportSuccess(t("importEnvSuccess", { names: report.environments.map(e => e.name).join(", ") }));
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
                    setImportSuccess(t("importCollectionSuccess", { names: report.collections.map(c => c.name).join(", ") }));
                }

                if (report.warnings.length > 0) {
                    setError(t("warning", { warnings: report.warnings.join(", ") }));
                } else {
                    setError("");
                }

                setTimeout(() => setImportSuccess(""), 4000);
            } catch (err: unknown) {
                if (err instanceof Error && err.message === "INVALID_FORMAT") {
                    setError(t("invalidFileFormat"));
                } else {
                    setError(err instanceof Error ? err.message : t("jsonLoadError"));
                }
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
                throw new Error(t("jsonObjectOnlyError"));
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
            setImportSuccess(t("saveEnvSuccess"));
            setTimeout(() => setImportSuccess(""), 2000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("invalidJsonError"));
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
                name: t("newCollectionDefaultName"),
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
            id: activeTab.associatedRequestId || crypto.randomUUID(),
            name: saveRequestName.trim(),
            method: activeTab.method,
            url: activeTab.url,
            params: activeTab.params.filter(p => p.key.trim() || p.value.trim()),
            headers: activeTab.headers.filter(h => h.key.trim() || h.value.trim()),
            body: {
                mode: activeTab.bodyMode,
                raw: activeTab.bodyRaw,
                formData: activeTab.bodyMode === "form-data" ? activeTab.bodyFormData.filter(f => f.key.trim() || f.value.trim()) : 
                          activeTab.bodyMode === "x-www-form-urlencoded" ? activeTab.bodyUrlEncoded.filter(u => u.key.trim() || u.value.trim()) : undefined
            },
            auth: {
                type: activeTab.authType,
                bearerToken: activeTab.authBearerToken,
                basicUser: activeTab.authBasicUser,
                basicPass: activeTab.authBasicPass,
                apiKeyName: activeTab.authApiKeyName,
                apiKeyValue: activeTab.authApiKeyValue,
                apiKeyIn: activeTab.authApiKeyIn
            },
            collectionId: targetColId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const reqIdx = updatedReqs.findIndex(r => r.id === newReq.id);
        if (reqIdx >= 0) {
            updatedReqs[reqIdx] = newReq;
        } else {
            updatedReqs.push(newReq);
            const colIdx = updatedCols.findIndex((c) => c.id === targetColId);
            if (colIdx >= 0) {
                updatedCols[colIdx].requestIds.push(newReq.id);
                updatedCols[colIdx].updatedAt = Date.now();
            }
        }

        saveCollectionsAndRequests(updatedCols, updatedReqs);
        
        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, name: newReq.name, associatedRequestId: newReq.id } : t));

        setSaveRequestName("");
        setShowSaveModal(false);
        setImportSuccess(t("saveCollectionSuccess"));
        setTimeout(() => setImportSuccess(""), 3000);
    };

    const loadCollectionRequest = (req: ApiRequest) => {
        const mapRows = (rows: any[] | undefined): KeyValue[] => {
            if (!Array.isArray(rows)) return [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }];
            const mapped: KeyValue[] = rows.map(r => ({
                id: r.id || crypto.randomUUID(),
                key: r.key || "",
                value: r.value || "",
                enabled: r.disabled !== true && r.enabled !== false,
                description: r.description
            }));
            if (mapped.length === 0 || mapped[mapped.length - 1].key.trim() || mapped[mapped.length - 1].value.trim()) {
                mapped.push({ id: crypto.randomUUID(), key: "", value: "", enabled: true });
            }
            return mapped;
        };

        const parsedUrl = parseUrlToParams(req.url || "");

        const newTab: Tab = {
            id: crypto.randomUUID(),
            name: req.name || "GET Request",
            method: req.method || "GET",
            url: req.url || "",
            headers: mapRows(req.headers),
            params: parsedUrl.params.length > 0 ? [...parsedUrl.params, { id: crypto.randomUUID(), key: "", value: "", enabled: true }] : [{ id: crypto.randomUUID(), key: "", value: "", enabled: true }],
            bodyMode: req.body?.mode || "none",
            bodyRaw: req.body?.raw || "",
            bodyFormData: mapRows(req.body?.formData),
            bodyUrlEncoded: mapRows(req.body?.formData),
            authType: req.auth?.type || "none",
            authBearerToken: req.auth?.bearerToken || "",
            authBasicUser: req.auth?.basicUser || "",
            authBasicPass: req.auth?.basicPass || "",
            authApiKeyName: req.auth?.apiKeyName || "",
            authApiKeyValue: req.auth?.apiKeyValue || "",
            authApiKeyIn: req.auth?.apiKeyIn || "header",
            response: null,
            loading: false,
            error: "",
            isCorsError: false,
            associatedRequestId: req.id
        };

        const isEmpty = !activeTab.url.trim() && activeTab.response === null;
        if (isEmpty) {
            setTabs(prev => prev.map(t => t.id === activeTab.id ? newTab : t));
        } else {
            setTabs(prev => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
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
        setTabs(prev => prev.map(t => t.associatedRequestId === reqId ? { ...t, associatedRequestId: undefined } : t));
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

    const renderKeyValueEditor = (
        type: "params" | "headers" | "formData" | "urlEncoded",
        rows: KeyValue[]
    ) => {
        const onChange = (index: number, field: "key" | "value" | "enabled" | "description", val: any) => {
            if (type === "params") handleParamChange(index, field, val);
            else if (type === "headers") handleHeaderChange(index, field, val);
            else handleBodyKVChange(type === "formData" ? "formData" : "urlEncoded", index, field, val);
        };

        const onDelete = (index: number) => {
            handleDeleteRow(activeTab.id, type, index);
        };

        return (
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                <div className="grid grid-cols-[30px_1fr_1fr_30px] gap-2 items-center text-[10px] font-bold text-muted-foreground uppercase px-2">
                    <div></div>
                    <div>Key</div>
                    <div>Value</div>
                    <div></div>
                </div>
                <div className="space-y-1.5">
                    {rows.map((row, idx) => (
                        <div key={row.id} className="grid grid-cols-[30px_1fr_1fr_30px] gap-2 items-center group">
                            <div className="flex justify-center">
                                <input
                                    type="checkbox"
                                    checked={row.enabled}
                                    onChange={(e) => onChange(idx, "enabled", e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-border text-cyan-600 focus:ring-cyan-500/20"
                                />
                            </div>
                            <Input
                                value={row.key}
                                onChange={(e) => onChange(idx, "key", e.target.value)}
                                placeholder="Key"
                                className="h-8 text-xs font-mono focus:border-cyan-500/50"
                            />
                            <Input
                                value={row.value}
                                onChange={(e) => onChange(idx, "value", e.target.value)}
                                placeholder="Value"
                                className="h-8 text-xs font-mono focus:border-cyan-500/50"
                            />
                            <div className="flex justify-center">
                                {idx < rows.length - 1 ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(idx)}
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                ) : (
                                    <div className="w-7 h-7" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

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
                        <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToTools")}
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Zap className="h-6 w-6 text-cyan-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">API Tester</h1>
                    </div>
                    <p className="text-muted-foreground">
                        {t("subTitle")}
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
                                placeholder={t("importPlaceholder")}
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
                                    <Sliders className="h-4 w-4 text-cyan-500" /> {t("environmentHeader")}
                                </CardTitle>
                                {activeEnvironmentId && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/5 px-1.5"
                                        onClick={() => handleDeleteEnv(activeEnvironmentId)}
                                    >
                                        {t("deleteEnv")}
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
                                        <option value="">{t("noEnvSelect")}</option>
                                        {environments.map((env) => (
                                            <option key={env.id} value={env.id}>{env.name}</option>
                                        ))}
                                    </select>
                                </div>
 
                                {/* Active Env variables JSON Editor */}
                                {activeEnvironmentId ? (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{t("variablesLabel")}</span>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-6 text-[10.5px] font-bold text-cyan-600 hover:text-cyan-700 hover:bg-cyan-500/5 px-2"
                                                onClick={handleSaveVariables}
                                            >
                                                {t("saveVariables")}
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
                                            {t.rich("variablesHint", {
                                                code: () => <code className="bg-cyan-500/10 px-1 rounded text-cyan-600 font-mono">{"{{key}}"}</code>
                                            })}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-muted/20 border border-border/30 rounded-lg text-center">
                                        <p className="text-[11px] text-muted-foreground">{t("noEnvSelected")}</p>
                                    </div>
                                )}
 
                                {/* Create Env Form */}
                                <div className="border-t border-border/30 pt-3 space-y-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">{t("createNewEnvLabel")}</span>
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={envName}
                                            onChange={(e) => setEnvName(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleCreateEnv()}
                                            placeholder={t("envNamePlaceholder")}
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
                                    <Folder className="h-4 w-4 text-cyan-500" /> {t("collectionsHeader")}
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
                                        <Upload className="h-3 w-3" /> {t("import")}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {collections.length === 0 ? (
                                    <div className="p-4 bg-muted/20 border border-dashed border-border/50 rounded-xl text-center">
                                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                            {t("noCollections")}
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
                                                            <p className="text-[10px] text-muted-foreground italic px-2 py-1">{t("noData")}</p>
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
                            <Card className="border-border/50 bg-card flex flex-col h-full overflow-hidden">
                                {/* Tabs bar at the top of the request card */}
                                <div className="flex items-center gap-1 border-b border-border/30 bg-muted/20 px-3 py-2 overflow-x-auto no-scrollbar shrink-0">
                                    {tabs.map((tabItem) => {
                                        const isActive = tabItem.id === activeTabId;
                                        const getMethodColor = (m: string) => {
                                            switch (m) {
                                                case "GET": return "text-emerald-500";
                                                case "POST": return "text-blue-500";
                                                case "PUT": return "text-amber-500";
                                                case "PATCH": return "text-purple-500";
                                                case "DELETE": return "text-red-500";
                                                default: return "text-muted-foreground";
                                            }
                                        };
                                        return (
                                            <div
                                                key={tabItem.id}
                                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none shrink-0 ${
                                                    isActive
                                                        ? "bg-background border-border/50 shadow-sm text-foreground"
                                                        : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10"
                                                }`}
                                                onClick={() => setActiveTabId(tabItem.id)}
                                            >
                                                <span className={`text-[9px] font-extrabold font-mono tracking-tight ${getMethodColor(tabItem.method)}`}>
                                                    {tabItem.method}
                                                </span>
                                                {renamingTabId === tabItem.id ? (
                                                    <input
                                                        value={renamingName}
                                                        onChange={(e) => setRenamingName(e.target.value)}
                                                        onBlur={() => {
                                                            handleTabNameChange(tabItem.id, renamingName || tabItem.name);
                                                            setRenamingTabId(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                handleTabNameChange(tabItem.id, renamingName || tabItem.name);
                                                                setRenamingTabId(null);
                                                            }
                                                        }}
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-transparent border-b border-cyan-500 outline-none text-xs w-20 px-0.5 py-0 font-medium text-foreground"
                                                    />
                                                ) : (
                                                    <span
                                                        onDoubleClick={(e) => {
                                                            e.stopPropagation();
                                                            setRenamingTabId(tabItem.id);
                                                            setRenamingName(tabItem.name);
                                                        }}
                                                        className="truncate max-w-[100px]"
                                                        title={t("doubleClickRename")}
                                                    >
                                                        {tabItem.name}
                                                    </span>
                                                )}
                                                {tabs.length > 1 && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCloseTab(tabItem.id);
                                                        }}
                                                        className="text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 hover:bg-muted p-0.5 rounded transition-colors shrink-0"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAddTab}
                                        className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 shrink-0 ml-1"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>

                                <CardHeader className="pb-3 pt-4 flex flex-row items-center justify-between space-y-0 shrink-0">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Send className="h-4 w-4 text-cyan-500" /> Request Settings
                                    </CardTitle>
                                    
                                    {/* Direct Mode Toggle */}
                                    <div className="flex items-center gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border/30">
                                        <button
                                            onClick={() => saveDirectMode(true)}
                                            title={t("directModeTooltip")}
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
                                            title={t("proxyModeTooltip")}
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

                                <CardContent className="space-y-4 flex-1 flex flex-col justify-between overflow-y-auto">
                                    <div className="space-y-4">
                                        {/* Method + URL */}
                                        <div className="space-y-1">
                                            <div className="flex gap-2">
                                                <select
                                                    value={method}
                                                    onChange={(e) => handleMethodChange(e.target.value)}
                                                    className="h-10 rounded-lg border border-border/50 bg-background px-3 text-sm font-bold focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all cursor-pointer min-w-[100px]"
                                                >
                                                    {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((m) => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                                <Input
                                                    value={url}
                                                    onChange={(e) => handleUrlChange(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                                                    placeholder={t("urlPlaceholder")}
                                                    className="flex-1 font-mono text-sm focus:border-cyan-500/50"
                                                />
                                            </div>

                                            {/* Live Resolved URL Preview */}
                                            {url && url.includes("{{") && (
                                                <div className="text-[10px] font-mono text-muted-foreground truncate bg-muted/40 px-2.5 py-1.5 rounded border border-border/30 mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                                                    <Globe className="h-3 w-3 shrink-0 text-cyan-500" />
                                                    <span className="shrink-0 text-cyan-600 font-semibold">Preview URL:</span>
                                                    <span className="truncate text-foreground/80">{resolvedUrl}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sub-tabs Navigation */}
                                        <div className="flex gap-1 border-b border-border/30 pb-0 shrink-0">
                                            {[
                                                { id: "params", label: `Params`, count: activeTab.params ? activeTab.params.filter(p => p.key.trim() || p.value.trim()).length : 0 },
                                                { id: "auth", label: "Auth", count: activeTab.authType !== "none" ? 1 : 0 },
                                                { id: "headers", label: "Headers", count: activeTab.headers ? activeTab.headers.filter(h => h.key.trim() || h.value.trim()).length : 0 },
                                                { id: "body", label: "Body", count: activeTab.bodyMode !== "none" ? 1 : 0 }
                                            ].map((tab) => {
                                                const isActive = reqTab === tab.id;
                                                return (
                                                    <button
                                                        key={tab.id}
                                                        type="button"
                                                        onClick={() => setReqTab(tab.id as any)}
                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
                                                            isActive
                                                                ? "border-cyan-500 text-cyan-500 font-bold"
                                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                                        }`}
                                                    >
                                                        {tab.label}
                                                        {tab.count > 0 && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[9px] font-bold">
                                                                {tab.id === "auth" ? "●" : tab.count}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Sub-tabs Panes */}
                                        <div className="flex-1 min-h-[220px]">
                                            {/* Params Pane */}
                                            {reqTab === "params" && (
                                                <div className="space-y-3 animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Query Parameters</span>
                                                    </div>
                                                    {activeTab.params && renderKeyValueEditor("params", activeTab.params)}
                                                </div>
                                            )}

                                            {/* Auth Pane */}
                                            {reqTab === "auth" && (
                                                <div className="space-y-4 animate-in fade-in duration-150">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Type</label>
                                                        <select
                                                            value={activeTab.authType}
                                                            onChange={(e) => handleAuthTypeChange(e.target.value as any)}
                                                            className="w-full max-w-[200px] h-9 rounded-lg border border-border/50 bg-background px-3 text-xs focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                                                        >
                                                            <option value="none">No Auth</option>
                                                            <option value="bearer">Bearer Token</option>
                                                            <option value="basic">Basic Auth</option>
                                                            <option value="api-key">API Key</option>
                                                        </select>
                                                    </div>

                                                    {activeTab.authType === "none" && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            {t("noAuthDescription")}
                                                        </p>
                                                    )}

                                                    {activeTab.authType === "bearer" && (
                                                        <div className="space-y-2 max-w-md animate-in fade-in duration-100">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Token</label>
                                                                <Input
                                                                    value={activeTab.authBearerToken}
                                                                    onChange={(e) => handleAuthFieldChange("authBearerToken", e.target.value)}
                                                                    placeholder={t("bearerTokenPlaceholder")}
                                                                    className="h-9 text-xs font-mono focus:border-cyan-500/50"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeTab.authType === "basic" && (
                                                        <div className="grid grid-cols-2 gap-3 max-w-md animate-in fade-in duration-100">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Username</label>
                                                                <Input
                                                                    value={activeTab.authBasicUser}
                                                                    onChange={(e) => handleAuthFieldChange("authBasicUser", e.target.value)}
                                                                    placeholder="Username"
                                                                    className="h-9 text-xs focus:border-cyan-500/50"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Password</label>
                                                                <Input
                                                                    type="password"
                                                                    value={activeTab.authBasicPass}
                                                                    onChange={(e) => handleAuthFieldChange("authBasicPass", e.target.value)}
                                                                    placeholder="Password"
                                                                    className="h-9 text-xs focus:border-cyan-500/50"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {activeTab.authType === "api-key" && (
                                                        <div className="space-y-3 max-w-md animate-in fade-in duration-100">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Key</label>
                                                                    <Input
                                                                        value={activeTab.authApiKeyName}
                                                                        onChange={(e) => handleAuthFieldChange("authApiKeyName", e.target.value)}
                                                                        placeholder="e.g. X-API-Key"
                                                                        className="h-9 text-xs font-mono focus:border-cyan-500/50"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Value</label>
                                                                    <Input
                                                                        value={activeTab.authApiKeyValue}
                                                                        onChange={(e) => handleAuthFieldChange("authApiKeyValue", e.target.value)}
                                                                        placeholder="API Key Value"
                                                                        className="h-9 text-xs font-mono focus:border-cyan-500/50"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Add to</label>
                                                                <select
                                                                    value={activeTab.authApiKeyIn}
                                                                    onChange={(e) => handleAuthFieldChange("authApiKeyIn", e.target.value as any)}
                                                                    className="w-full h-9 rounded-lg border border-border/50 bg-background px-3 text-xs focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                                                                >
                                                                    <option value="header">Header</option>
                                                                    <option value="query">Query Params</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Headers Pane */}
                                            {reqTab === "headers" && (
                                                <div className="space-y-3 animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Headers</span>
                                                    </div>
                                                    {activeTab.headers && renderKeyValueEditor("headers", activeTab.headers)}
                                                </div>
                                            )}

                                            {/* Body Pane */}
                                            {reqTab === "body" && (
                                                <div className="space-y-3 animate-in fade-in duration-150 flex flex-col h-full">
                                                    <div className="flex items-center gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border/30 w-fit shrink-0">
                                                        {[
                                                            { id: "none", label: "none" },
                                                            { id: "json", label: "JSON" },
                                                            { id: "raw", label: "raw" },
                                                            { id: "form-data", label: "form-data" },
                                                            { id: "x-www-form-urlencoded", label: "x-www-form-urlencoded" }
                                                        ].map((mode) => (
                                                            <button
                                                                key={mode.id}
                                                                type="button"
                                                                onClick={() => handleBodyModeChange(mode.id as any)}
                                                                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                                                                    activeTab.bodyMode === mode.id
                                                                        ? "bg-cyan-500/15 text-cyan-500 shadow-sm"
                                                                        : "text-muted-foreground hover:text-foreground"
                                                                }`}
                                                            >
                                                                {mode.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="flex-1 mt-2 min-h-[160px]">
                                                        {activeTab.bodyMode === "none" && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {t("noBodyDescription")}
                                                            </p>
                                                        )}

                                                        {(activeTab.bodyMode === "json" || activeTab.bodyMode === "raw") && (
                                                            <textarea
                                                                value={activeTab.bodyRaw}
                                                                onChange={(e) => handleBodyRawChange(e.target.value)}
                                                                rows={6}
                                                                className="w-full h-full rounded-lg border border-border/50 bg-background p-3 font-mono text-xs resize-y focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-muted-foreground/40"
                                                                placeholder={activeTab.bodyMode === "json" ? '{\n  "key": "value"\n}' : "Text body goes here..."}
                                                            />
                                                        )}

                                                        {activeTab.bodyMode === "form-data" && (
                                                            <div className="space-y-3">
                                                                {activeTab.bodyFormData && renderKeyValueEditor("formData", activeTab.bodyFormData)}
                                                            </div>
                                                        )}

                                                        {activeTab.bodyMode === "x-www-form-urlencoded" && (
                                                            <div className="space-y-3">
                                                                {activeTab.bodyUrlEncoded && renderKeyValueEditor("urlEncoded", activeTab.bodyUrlEncoded)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Error Alert */}
                                        {error && (
                                            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 shrink-0">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>{t("errorAlertTitle")}</AlertTitle>
                                                <AlertDescription className="text-xs">{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        {/* CORS Explainer Card */}
                                        {isCorsError && (
                                            <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-500 animate-in fade-in slide-in-from-top-2 shrink-0">
                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                <AlertTitle className="font-bold text-xs">{t("corsBlockedTitle")}</AlertTitle>
                                                <AlertDescription className="text-[11px] space-y-2 mt-1">
                                                    <p>
                                                        {t("corsBlockedDesc")}
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 bg-transparent h-7 text-[10px]"
                                                        onClick={() => saveDirectMode(false)}
                                                    >
                                                        {t("switchToProxy")}
                                                    </Button>
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-4 border-t border-border/20 mt-4 shrink-0">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSaveRequestName(url ? url.split("/").pop() || t("newRequestDefaultName") : t("newRequestDefaultName"));
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
                                                {copied ? t("copied") : t("copy")}
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-1 pt-0 overflow-y-auto">
                                    {loading && (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-zinc-500">
                                            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                                            <span className="text-sm">{t("sendingRequest")}</span>
                                        </div>
                                    )}
                                    {!loading && !response && !error && (
                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 text-zinc-600">
                                            <Zap className="h-10 w-10 opacity-20" />
                                            <span className="text-sm">{t("enterInfoSendRequest")}</span>
                                        </div>
                                    )}
                                    {response && responseTab === "body" && (
                                        <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-all text-emerald-400/90 overflow-auto max-h-[500px] animate-in fade-in py-2">
                                            {formattedBody || <span className="text-zinc-600 italic">{t("emptyResponseBody")}</span>}
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
                                                <span className="text-zinc-600 text-sm italic">{t("noHeadersReturned")}</span>
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
                                    <History className="h-4 w-4" /> {t("recentHistory")}
                                </CardTitle>
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive gap-1" onClick={clearHistory}>
                                    <Trash2 className="h-3 w-3" /> {t("clearAll")}
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
                        {t.rich("privacyNotice", {
                            code: (chunks) => <code className="bg-cyan-500/10 px-1 rounded text-cyan-600 font-mono">{chunks}</code>
                        })}
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
                                {t("whatIsApiTesterHeader")}
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                {t("whatIsApiTesterDesc1")}
                            </p>
                            <p>
                                {t("whatIsApiTesterDesc2")}
                            </p>
                            <p>
                                {t.rich("whatIsApiTesterDesc3", {
                                    code: (chunks) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{chunks}</code>
                                })}
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
                                {t("supportedHttpMethodsHeader")}
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
                            {t("howToUseHeader")}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    step: "1",
                                    title: t("step1Title"),
                                    desc: t("step1Desc"),
                                },
                                {
                                    step: "2",
                                    title: t("step2Title"),
                                    desc: t("step2Desc"),
                                },
                                {
                                    step: "3",
                                    title: t("step3Title"),
                                    desc: t("step3Desc"),
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
                                {t("faqHeader")}
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
                                    {t("privacySecurityHeader")}
                                </h2>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t("privacySecurityDesc")}
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
                                    <Folder className="h-4 w-4 text-cyan-500" /> {t("saveRequestToCollectionHeader")}
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
                                    <label className="text-xs font-bold text-muted-foreground uppercase">{t("requestNameLabel")}</label>
                                    <Input
                                        value={saveRequestName}
                                        onChange={(e) => setSaveRequestName(e.target.value)}
                                        placeholder={t("requestNamePlaceholder")}
                                    />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">{t("selectCollectionLabel")}</label>
                                    <select
                                        value={selectedCollectionId}
                                        onChange={(e) => setSelectedCollectionId(e.target.value)}
                                        className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm focus:border-cyan-500/50 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">{t("selectCollectionPlaceholder")}</option>
                                        {collections.map((col) => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                        <option value="new">{t("createNewCollectionOption")}</option>
                                    </select>
                                </div>

                                <div className="flex gap-2 justify-end pt-2">
                                    <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
                                        {t("cancel")}
                                    </Button>
                                    <Button 
                                        onClick={handleSaveRequestToCollection}
                                        disabled={!saveRequestName.trim()}
                                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                                    >
                                        {t("save")}
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
