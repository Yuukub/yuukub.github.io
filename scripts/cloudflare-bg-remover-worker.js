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
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
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
