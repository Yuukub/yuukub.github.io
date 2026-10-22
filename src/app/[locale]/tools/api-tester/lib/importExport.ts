import type { EnvVariable, Environment } from "./variables";

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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function text(value: unknown, fallback = ""): string {
    return value == null ? fallback : String(value);
}

function descText(d: unknown): string | undefined {
    if (typeof d === "string") return d;
    if (isRecord(d) && typeof d.content === "string") {
        return d.content;
    }
    return undefined;
}

function kvFromPm(value: unknown): KeyValue {
    const kv = record(value);
    return {
        id: newId(),
        key: text(kv.key),
        value: text(kv.value),
        enabled: kv.disabled !== true,
        description: descText(kv.description),
    };
}

export function detectFormat(data: unknown): "postman-collection" | "postman-environment" | "native" | "unknown" {
    if (!isRecord(data)) return "unknown";
    
    // Check native backup
    if (data.apiTesterBackupVersion === 1 || (data.collections && data.requests && data.environments)) {
        return "native";
    }

    // Check Postman Collection
    const info = record(data.info);
    if (info && Array.isArray(data.item) && (info._postman_id || (typeof info.schema === "string" && info.schema.includes("collection")))) {
        return "postman-collection";
    }

    // Check Postman Environment
    if (data._postman_variable_scope === "environment" || (typeof data.name === "string" && Array.isArray(data.values))) {
        return "postman-environment";
    }

    return "unknown";
}

export function importPostmanCollection(input: unknown, now: number): ImportReport {
    const data = record(input);
    const report: ImportReport = { collections: [], requests: [], environments: [], warnings: [], skipped: [] };
    const info = record(data.info);
    const items = Array.isArray(data.item) ? data.item : [];

    const walk = (pmItems: unknown[], prefix: string) => {
        for (const rawItem of pmItems) {
            const item = record(rawItem);
            if (Array.isArray(item.item)) {
                // Folder: flatten and prefix request name
                const folderName = text(item.name, "Folder");
                walk(item.item, prefix ? `${prefix} / ${folderName}` : folderName);
                continue;
            }

            if (!item.request) {
                report.skipped.push(`Item "${item.name ?? "(unnamed)"}" has no request object`);
                continue;
            }

            const name = prefix ? `${prefix} / ${text(item.name, "Request")}` : text(item.name, "Request");
            const pmReq = typeof item.request === "string" ? { url: item.request } : record(item.request);
            
            // Extract URL and parameters
            let url = "";
            let params: KeyValue[] = [];
            if (pmReq.url) {
                if (typeof pmReq.url === "string") {
                    url = pmReq.url;
                } else {
                    const pmUrl = record(pmReq.url);
                    url = text(pmUrl.raw);
                    if (Array.isArray(pmUrl.query)) {
                        params = pmUrl.query.map(kvFromPm);
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
            const pmBody = record(pmReq.body);
            if (pmBody.mode) {
                const mode = pmBody.mode;
                if (mode === "raw") {
                    const lang = record(record(pmBody.options).raw).language;
                    const rawLang = lang === "json" || lang === "xml" || lang === "html" ? lang : "text";
                    body = {
                        mode: rawLang === "json" ? "json" : "raw",
                        raw: text(pmBody.raw),
                        rawLang,
                    };
                } else if (mode === "formdata") {
                    body = {
                        mode: "form-data",
                        formData: Array.isArray(pmBody.formdata) ? pmBody.formdata.map(kvFromPm) : [],
                    };
                } else if (mode === "urlencoded") {
                    body = {
                        mode: "x-www-form-urlencoded",
                        formData: Array.isArray(pmBody.urlencoded) ? pmBody.urlencoded.map(kvFromPm) : [],
                    };
                }
            }

            // Extract Auth
            let auth: Auth = { type: "none" };
            const pmAuth = record(pmReq.auth);
            if (typeof pmAuth.type === "string" && pmAuth.type !== "noauth") {
                const authType = pmAuth.type;
                const block = pmAuth[authType];
                
                const getVal = (key: string): string => {
                    if (Array.isArray(block)) {
                        const param = block.map(record).find((p) => p.key === key);
                        return typeof param?.value === "string" ? param.value : String(param?.value ?? "");
                    }
                    if (isRecord(block)) {
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
                method: text(pmReq.method, "GET").toUpperCase(),
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
        name: text(info.name, "Postman Import"),
        description: descText(info.description),
        requestIds: report.requests.map((r) => r.id),
        createdAt: now,
        updatedAt: now,
    };

    report.requests.forEach((r) => r.collectionId = collection.id);
    report.collections.push(collection);

    return report;
}

export function importPostmanEnvironment(input: unknown): ImportReport {
    const data = record(input);
    const report: ImportReport = { collections: [], requests: [], environments: [], warnings: [], skipped: [] };
    const values = Array.isArray(data.values) ? data.values : [];
    
    const variables: EnvVariable[] = values.map(record).map((v) => ({
        id: newId(),
        key: text(v.key),
        value: typeof v.value === "string" ? v.value : String(v.value ?? ""),
        enabled: v.enabled !== false,
    }));

    report.environments.push({
        id: newId(),
        name: text(data.name, "Postman Env"),
        variables,
    });

    return report;
}

function isKeyValue(value: unknown): value is KeyValue {
    return isRecord(value) && [value.id, value.key, value.value].every(v => typeof v === "string")
        && typeof value.enabled === "boolean"
        && (value.description === undefined || typeof value.description === "string");
}

function isKeyValueArray(value: unknown): value is KeyValue[] {
    return Array.isArray(value) && value.every(isKeyValue);
}

function isRequest(value: unknown): value is ApiRequest {
    if (!isRecord(value) || !isRecord(value.body) || !isRecord(value.auth)) return false;
    const auth = value.auth;
    return [value.id, value.name, value.method, value.url].every(v => typeof v === "string")
        && isKeyValueArray(value.params) && isKeyValueArray(value.headers)
        && typeof value.createdAt === "number" && typeof value.updatedAt === "number"
        && (value.collectionId === undefined || typeof value.collectionId === "string")
        && ["none", "json", "raw", "form-data", "x-www-form-urlencoded"].includes(text(value.body.mode))
        && (value.body.raw === undefined || typeof value.body.raw === "string")
        && (value.body.rawLang === undefined || ["json", "text", "xml", "html"].includes(text(value.body.rawLang)))
        && (value.body.formData === undefined || isKeyValueArray(value.body.formData))
        && ["none", "bearer", "basic", "api-key"].includes(text(value.auth.type))
        && ["bearerToken", "basicUser", "basicPass", "apiKeyName", "apiKeyValue"].every(
            key => auth[key] === undefined || typeof auth[key] === "string"
        )
        && (value.auth.apiKeyIn === undefined || ["header", "query"].includes(text(value.auth.apiKeyIn)));
}

function isCollection(value: unknown): value is Collection {
    return isRecord(value) && typeof value.id === "string" && typeof value.name === "string"
        && (value.description === undefined || typeof value.description === "string")
        && Array.isArray(value.requestIds) && value.requestIds.every(id => typeof id === "string")
        && typeof value.createdAt === "number" && typeof value.updatedAt === "number";
}

function isEnvironment(value: unknown): value is Environment {
    return isRecord(value) && typeof value.id === "string" && typeof value.name === "string"
        && Array.isArray(value.variables) && value.variables.every(v => isRecord(v)
            && [v.id, v.key, v.value].every(field => typeof field === "string")
            && typeof v.enabled === "boolean");
}

function isNativeBackup(value: unknown): value is {
    collections: Collection[]; requests: ApiRequest[]; environments: Environment[];
} {
    return isRecord(value)
        && Array.isArray(value.collections) && value.collections.every(isCollection)
        && Array.isArray(value.requests) && value.requests.every(isRequest)
        && Array.isArray(value.environments) && value.environments.every(isEnvironment);
}

export function importFile(data: unknown, now: number): ImportReport {
    const format = detectFormat(data);
    switch (format) {
        case "postman-collection":
            return importPostmanCollection(data, now);
        case "postman-environment":
            return importPostmanEnvironment(data);
        case "native":
            if (!isNativeBackup(data)) throw new Error("INVALID_FORMAT");
            return {
                collections: data.collections ?? [],
                requests: data.requests ?? [],
                environments: data.environments ?? [],
                warnings: [],
                skipped: [],
            };
        default:
            throw new Error("INVALID_FORMAT");
    }
}
