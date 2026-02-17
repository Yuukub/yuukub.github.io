// sw-coi.js - Service Worker for Cross-Origin Isolation (Scoped)
// This script intercepts requests and adds the necessary headers to enable SharedArrayBuffer.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
    // Only intercept GET requests to avoid issues with POST/PUT etc.
    if (event.request.method !== "GET") {
        return;
    }

    // Skip certain resources that don't need these headers or cause issues (like Cloudflare RUM)
    if (event.request.url.includes("cdn-cgi/rum")) {
        return;
    }

    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If response is opaque or error-like (status 0), return as-is
                if (response.status === 0) {
                    return response;
                }

                // Create new headers from the existing ones
                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                // Return a new response with the modified headers
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            })
            .catch((err) => {
                // Log and propagate error without trying to re-fetch the used request
                console.error("COI SW Fetch Error:", err);
                throw err;
            })
    );
});
