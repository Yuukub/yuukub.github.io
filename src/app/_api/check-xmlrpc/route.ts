import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        let targetUrl = url;
        if (!targetUrl.startsWith("http")) {
            targetUrl = `https://${targetUrl}`; // Default to https
        }

        // Ensure URL ends with xmlrpc.php or just append it
        if (!targetUrl.endsWith("xmlrpc.php")) {
            targetUrl = targetUrl.replace(/\/+$/, "") + "/xmlrpc.php";
        }

        console.log(`Checking XML-RPC at: ${targetUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "text/xml",
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
<methodCall>
<methodName>system.listMethods</methodName>
<params></params>
</methodCall>`,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const text = await response.text();
        const status = response.status;

        // Analyze response
        let isEnabled = false;
        let message = "";

        if (status === 200 && text.includes("methodResponse")) {
            isEnabled = true;
            message = "XML-RPC is enabled and publicly accessible.";
        } else if (status === 405 && text.includes("XML-RPC server accepts POST requests only")) {
            // Sometimes GET request returns this, but if POST returns this it's weird, 
            // but strictly speaking checking existence.
            // However, strictly "enabled" means it processes XML.
            isEnabled = true;
            message = "XML-RPC server is present.";
        } else if (status === 403 || status === 401) {
            isEnabled = false;
            message = "XML-RPC is present but access is forbidden/protected (Good).";
        } else if (status === 404) {
            isEnabled = false;
            message = "xmlrpc.php not found (Good).";
        } else {
            // Parse error or other XML-RPC error still means it's processed
            if (text.includes("faultCode") || text.includes("parse error")) {
                isEnabled = true;
                message = "XML-RPC is enabled (responded with fault).";
            } else {
                isEnabled = false;
                message = `Unexpected response status: ${status}`;
            }
        }

        return NextResponse.json({
            title: "Scan Completed",
            url: targetUrl,
            isEnabled,
            status,
            message
        });

    } catch (error: any) {
        console.error("XML-RPC Check Error:", error);
        return NextResponse.json({
            error: "Failed to check URL. The site might be down or blocking requests.",
            details: error.message
        }, { status: 500 });
    }
}
