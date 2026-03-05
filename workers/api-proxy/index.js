/**
 * Cloudflare Worker: API Proxy
 * ทำหน้าที่เป็น proxy สำหรับ API Tester tool บน yuukub.com
 * แก้ปัญหา CORS โดย forward request ไปยัง target API
 */

const ALLOWED_ORIGINS = [
    'https://yuukub.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

const CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
};

const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit

export default {
    async fetch(request) {
        const origin = request.headers.get('Origin') || '';
        const isAllowed = ALLOWED_ORIGINS.includes(origin);
        const corsOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

        // CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    ...CORS_HEADERS,
                    'Access-Control-Allow-Origin': corsOrigin,
                },
            });
        }

        // Only allow POST
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405, corsOrigin);
        }

        // Check origin
        if (!isAllowed) {
            return jsonResponse({ error: 'Forbidden: origin not allowed.' }, 403, corsOrigin);
        }

        try {
            // Parse incoming request
            const contentLength = request.headers.get('Content-Length');
            if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
                return jsonResponse({ error: 'Request body too large (max 1MB).' }, 413, corsOrigin);
            }

            const payload = await request.json();
            const { url, method = 'GET', headers = {}, body } = payload;

            if (!url) {
                return jsonResponse({ error: 'Missing required field: url' }, 400, corsOrigin);
            }

            // Validate URL
            try {
                new URL(url);
            } catch {
                return jsonResponse({ error: 'Invalid URL provided.' }, 400, corsOrigin);
            }

            // Build fetch options
            const fetchOptions = {
                method: method.toUpperCase(),
                headers: headers,
                redirect: 'follow',
            };

            // Attach body for non-GET/HEAD methods
            if (!['GET', 'HEAD'].includes(fetchOptions.method) && body) {
                fetchOptions.body = body;
            }

            // Forward request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
            fetchOptions.signal = controller.signal;

            const startTime = Date.now();
            const response = await fetch(url, fetchOptions);
            const elapsed = Date.now() - startTime;
            clearTimeout(timeoutId);

            // Read response
            const responseBody = await response.text();
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            return jsonResponse({
                status_code: response.status,
                status_text: response.statusText,
                headers: responseHeaders,
                body: responseBody,
                elapsed_ms: elapsed,
            }, 200, corsOrigin);

        } catch (err) {
            const message = err.name === 'AbortError'
                ? 'Request timed out (30s limit).'
                : err.message || 'Unknown proxy error.';

            return jsonResponse({ error: message }, 502, corsOrigin);
        }
    }
};

function jsonResponse(data, status, origin) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            ...CORS_HEADERS,
        },
    });
}
