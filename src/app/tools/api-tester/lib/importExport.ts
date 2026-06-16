import { EnvVariable } from "./variables";

export interface KeyValue {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

export type BodyMode = "none" | "json" | "raw" | "form-data" | "x-www-form-urlencoded";

export interface RequestBody {
    mode: BodyMode;
    raw?: string;
    rawLang?: "json" | "text" | "xml" | "html";
    formData?: KeyValue[];
}

export type AuthType = "none" | "bearer" | "basic" | "api-key";

export interface Auth {
    type: AuthType;
    bearerToken?: string;
    basicUser?: string;
    basicPass?: string;
    apiKeyName?: string;
    apiKeyValue?: string;
    apiKeyIn?: "header" | "query";
}

export interface ApiRequest {
    id: string;
    name: string;
    method: string;
    url: string;
    params: KeyValue[];
    headers: KeyValue[];
    body: RequestBody;
    auth: Auth;
    collectionId?: string;
    createdAt: number;
    updatedAt: number;
}

export interface Collection {
    id: string;
    name: string;
    description?: string;
    requestIds: string[];
    createdAt: number;
    updatedAt: number;
}

export interface ImportReport {
    collections: Collection[];
    requests: ApiRequest[];
    environments: { id: string; name: string; variables: EnvVariable[] }[];
    warnings: string[];
    skipped: string[];
}

const newId = () => crypto.randomUUID();

function descText(d: any): string | undefined {
    if (typeof d === "string") return d;
    if (d && typeof d === "object" && typeof d.content === "string") {
        return d.content;
    }
    return undefined;
}

function kvFromPm(kv: any): KeyValue {
    return {
        id: newId(),
        key: kv.key ?? "",
        value: kv.value ?? "",
        enabled: kv.disabled !== true,
        description: descText(kv.description),
    };
}

export function detectFormat(data: any): "postman-collection" | "postman-environment" | "native" | "unknown" {
    if (!data || typeof data !== "object") return "unknown";
    
    // Check native backup
    if (data.apiTesterBackupVersion === 1 || (data.collections && data.requests && data.environments)) {
        return "native";
    }

    // Check Postman Collection
    const info = data.info;
    if (info && Array.isArray(data.item) && (info._postman_id || (typeof info.schema === "string" && info.schema.includes("collection")))) {
        return "postman-collection";
    }

    // Check Postman Environment
    if (data._postman_variable_scope === "environment" || (typeof data.name === "string" && Array.isArray(data.values))) {
        return "postman-environment";
    }

    return "unknown";
}

export function importPostmanCollection(data: any, now: number): ImportReport {
    const report: ImportReport = { collections: [], requests: [], environments: [], warnings: [], skipped: [] };
    const info = data.info || {};
    const items = data.item || [];

    const walk = (pmItems: any[], prefix: string) => {
        for (const item of pmItems) {
            if (Array.isArray(item.item)) {
                // Folder: flatten and prefix request name
                const folderName = item.name ?? "Folder";
                walk(item.item, prefix ? `${prefix} / ${folderName}` : folderName);
                continue;
            }

            if (!item.request) {
                report.skipped.push(`Item "${item.name ?? "(unnamed)"}" has no request object`);
                continue;
            }

            const name = prefix ? `${prefix} / ${item.name ?? "Request"}` : (item.name ?? "Request");
            const pmReq = typeof item.request === "string" ? { url: item.request } : item.request;
            
            // Extract URL and parameters
            let url = "";
            let params: KeyValue[] = [];
            if (pmReq.url) {
                if (typeof pmReq.url === "string") {
                    url = pmReq.url;
                } else {
                    url = pmReq.url.raw ?? "";
                    if (Array.isArray(pmReq.url.query)) {
                        params = pmReq.url.query.map(kvFromPm);
                    }
                    if (url && params.length && url.includes("?")) {
                        url = url.split("?")[0]; // Query string is handled in params list
                    }
                }
            }

            // Extract headers
            const headers: KeyValue[] = Array.isArray(pmReq.header) ? pmReq.header.map(kvFromPm) : [];

            // Extract body
            let body: RequestBody = { mode: "none" };
            if (pmReq.body && pmReq.body.mode) {
                const mode = pmReq.body.mode;
                if (mode === "raw") {
                    const lang = pmReq.body.options?.raw?.language;
                    const rawLang = lang === "json" || lang === "xml" || lang === "html" ? lang : "text";
                    body = {
                        mode: rawLang === "json" ? "json" : "raw",
                        raw: pmReq.body.raw ?? "",
                        rawLang,
                    };
                } else if (mode === "formdata") {
                    body = {
                        mode: "form-data",
                        formData: Array.isArray(pmReq.body.formdata) ? pmReq.body.formdata.map(kvFromPm) : [],
                    };
                } else if (mode === "urlencoded") {
                    body = {
                        mode: "x-www-form-urlencoded",
                        formData: Array.isArray(pmReq.body.urlencoded) ? pmReq.body.urlencoded.map(kvFromPm) : [],
                    };
                }
            }

            // Extract Auth
            let auth: Auth = { type: "none" };
            if (pmReq.auth && pmReq.auth.type && pmReq.auth.type !== "noauth") {
                const authType = pmReq.auth.type;
                const block = pmReq.auth[authType];
                
                const getVal = (key: string): string => {
                    if (Array.isArray(block)) {
                        const param = block.find((p: any) => p.key === key);
                        return typeof param?.value === "string" ? param.value : String(param?.value ?? "");
                    }
                    if (block && typeof block === "object") {
                        const v = block[key];
                        return typeof v === "string" ? v : "";
                    }
                    return "";
                };

                if (authType === "bearer") {
                    auth = { type: "bearer", bearerToken: getVal("token") };
                } else if (authType === "basic") {
                    auth = { type: "basic", basicUser: getVal("username"), basicPass: getVal("password") };
                } else if (authType === "apikey") {
                    auth = {
                        type: "api-key",
                        apiKeyName: getVal("key"),
                        apiKeyValue: getVal("value"),
                        apiKeyIn: getVal("in") === "query" ? "query" : "header",
                    };
                } else {
                    report.warnings.push(`"${name}": Auth type "${authType}" not supported, default to None.`);
                }
            }

            const req: ApiRequest = {
                id: newId(),
                name,
                method: (pmReq.method ?? "GET").toUpperCase(),
                url,
                params,
                headers,
                body,
                auth,
                createdAt: now,
                updatedAt: now,
            };

            report.requests.push(req);
        }
    };

    walk(items, "");

    const collection: Collection = {
        id: newId(),
        name: info.name ?? "Postman Import",
        description: descText(info.description),
        requestIds: report.requests.map((r) => r.id),
        createdAt: now,
        updatedAt: now,
    };

    report.requests.forEach((r) => r.collectionId = collection.id);
    report.collections.push(collection);

    return report;
}

export function importPostmanEnvironment(data: any): ImportReport {
    const report: ImportReport = { collections: [], requests: [], environments: [], warnings: [], skipped: [] };
    const values = data.values ?? [];
    
    const variables: EnvVariable[] = values.map((v: any) => ({
        id: newId(),
        key: v.key ?? "",
        value: typeof v.value === "string" ? v.value : String(v.value ?? ""),
        enabled: v.enabled !== false,
    }));

    report.environments.push({
        id: newId(),
        name: data.name ?? "Postman Env",
        variables,
    });

    return report;
}

export function importFile(data: any, now: number): ImportReport {
    const format = detectFormat(data);
    switch (format) {
        case "postman-collection":
            return importPostmanCollection(data, now);
        case "postman-environment":
            return importPostmanEnvironment(data);
        case "native":
            return {
                collections: data.collections ?? [],
                requests: data.requests ?? [],
                environments: data.environments ?? [],
                warnings: [],
                skipped: [],
            };
        default:
            throw new Error("รูปแบบไฟล์ไม่ถูกต้อง คาดหวัง Postman Collection (v2.1) หรือ Postman Environment");
    }
}
