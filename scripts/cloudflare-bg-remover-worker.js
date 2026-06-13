const allowedOrigins = new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    "https://yuukub.com",
    "https://www.yuukub.com",
    "https://yuukub.github.io",
]);

function corsHeaders(request) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = allowedOrigins.has(origin) ? origin : "https://yuukub.com";

    return {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, CF-Turnstile-Response",
        "Vary": "Origin",
    };
}

function isAllowedBrowserRequest(request) {
    const origin = request.headers.get("Origin") || "";
    const referer = request.headers.get("Referer") || "";

    if (!allowedOrigins.has(origin)) return false;
    if (!referer) return true;

    for (const allowedOrigin of allowedOrigins) {
        if (referer === allowedOrigin || referer.startsWith(`${allowedOrigin}/`)) {
            return true;
        }
    }

    return false;
}

async function verifyTurnstile(request, env) {
    if (!env.TURNSTILE_SECRET_KEY) return { ok: true };

    const token = request.headers.get("CF-Turnstile-Response");
    if (!token) {
        return {
            ok: false,
            message: "ต้องยืนยัน Turnstile ก่อนใช้ Cloudflare fallback",
        };
    }

    const formData = new FormData();
    formData.append("secret", env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);

    const remoteIp = request.headers.get("CF-Connecting-IP");
    if (remoteIp) formData.append("remoteip", remoteIp);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData,
    });
    const result = await response.json();

    if (result.success) return { ok: true };

    return {
        ok: false,
        message: "Turnstile token ไม่ถูกต้องหรือหมดอายุ กรุณายืนยันใหม่อีกครั้ง",
        codes: result["error-codes"] || [],
    };
}

const worker = {
    async fetch(request, env) {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders(request) });
        }

        if (request.method !== "POST") {
            return Response.json(
                { error: "Method not allowed" },
                { status: 405, headers: corsHeaders(request) },
            );
        }

        if (!isAllowedBrowserRequest(request)) {
            return Response.json(
                { error: "This endpoint is only available from yuukub.com" },
                { status: 403, headers: corsHeaders(request) },
            );
        }

        const turnstile = await verifyTurnstile(request, env);
        if (!turnstile.ok) {
            return Response.json(
                { error: turnstile.message, codes: turnstile.codes || [] },
                { status: 403, headers: corsHeaders(request) },
            );
        }

        if (!env.IMAGES) {
            return Response.json(
                { error: "Cloudflare Images binding IMAGES is not configured" },
                { status: 500, headers: corsHeaders(request) },
            );
        }

        const contentType = request.headers.get("Content-Type") || "";
        const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!acceptedTypes.some((type) => contentType.includes(type))) {
            return Response.json(
                { error: "รองรับ JPG, PNG และ WebP เท่านั้น" },
                { status: 400, headers: corsHeaders(request) },
            );
        }

        if (!request.body) {
            return Response.json(
                { error: "ไม่พบไฟล์รูปภาพ" },
                { status: 400, headers: corsHeaders(request) },
            );
        }

        const url = new URL(request.url);
        const format = url.searchParams.get("format") === "webp" ? "image/webp" : "image/png";

        try {
            const result = await env.IMAGES
                .input(request.body)
                .transform({ segment: "foreground" })
                .output({ format });

            const response = result.response();
            const headers = new Headers(response.headers);
            headers.set("Content-Type", format);
            headers.set("Cache-Control", "no-store");
            for (const [key, value] of Object.entries(corsHeaders(request))) {
                headers.set(key, value);
            }

            return new Response(response.body, {
                status: response.status,
                headers,
            });
        } catch (error) {
            return Response.json(
                {
                    error: "Cloudflare fallback ลบพื้นหลังไม่สำเร็จ",
                    detail: error instanceof Error ? error.message : String(error),
                },
                { status: 500, headers: corsHeaders(request) },
            );
        }
    },
};

export default worker;
