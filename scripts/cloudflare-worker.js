/**
 * Cloudflare Worker Script for WordPress XML-RPC Checker
 * 
 * Instructions:
 * 1. Go to https://workers.cloudflare.com/
 * 2. Create a specific Service (e.g., "xmlrpc-checker")
 * 3. Copypaste this code into the editor (Quick Edit)
 * 4. Save and Deploy
 * 5. Use the Worker URL in your frontend application
 */

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            const { url } = await request.json();

            if (!url) {
                return new Response(JSON.stringify({ error: "URL is required" }), {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            }

            let targetUrl = url;
            if (!targetUrl.startsWith("http")) {
                targetUrl = `https://${targetUrl}`; // Default to https
            }

            // Ensure URL ends with xmlrpc.php or just append it
            if (!targetUrl.endsWith("xmlrpc.php")) {
                targetUrl = targetUrl.replace(/\/+$/, "") + "/xmlrpc.php";
            }

            // XML-RPC Payload to check system.listMethods
            const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<methodCall>
<methodName>system.listMethods</methodName>
<params></params>
</methodCall>`;

            // Fetch with timeout logic (using AbortController if supported, or just Promise.race)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(targetUrl, {
                method: "POST",
                headers: {
                    "User-Agent": "WordPress XML-RPC Checker/1.0",
                    "Content-Type": "text/xml",
                },
                body: xmlPayload,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const text = await response.text();
            const status = response.status;

            // Analyze response
            let isEnabled = false;
            let message = "";

            // Logic:
            // 1. Status 200 + XML content -> Active
            // 2. Status 405 + Specific message -> Active (Request method correct but maybe blocked by plugin, but file exists)
            // 3. Status 403/404 -> Inactive/Protected

            if (status === 200 && text.includes("methodResponse")) {
                isEnabled = true;
                message = "XML-RPC is enabled and publicly accessible.";
            } else if (status === 405 && text.includes("XML-RPC server accepts POST requests only")) {
                isEnabled = true;
                message = "XML-RPC server is present.";
            } else if (status === 403 || status === 401) {
                isEnabled = false;
                message = "XML-RPC is present but access is forbidden/protected (Good).";
            } else if (status === 404) {
                isEnabled = false;
                message = "xmlrpc.php not found (Good).";
            } else {
                // Fallback checks
                if (text.includes("faultCode") || text.includes("parse error")) {
                    isEnabled = true;
                    message = "XML-RPC is enabled (responded with fault).";
                } else {
                    isEnabled = false;
                    message = `Unexpected response status: ${status}`;
                }
            }

            return new Response(JSON.stringify({
                title: "Scan Completed",
                url: targetUrl,
                isEnabled,
                status,
                message
            }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*", // Allow all origins for the tool
                },
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: "Failed to check URL.",
                details: error.message
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
    },
};
