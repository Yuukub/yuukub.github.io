// sw-coi.js - Service Worker for Cross-Origin Isolation (Scoped)
// This script intercepts requests and adds the necessary headers to enable SharedArrayBuffer.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
    // Only intercept requests for resources within our scope or sub-resources
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
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
            .catch((e) => {
                // In case of error, just return the original fetch attempt or let it fail
                return fetch(event.request);
            })
    );
});
