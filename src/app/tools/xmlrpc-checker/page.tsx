"use client"

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function XmlRpcCheckerPage() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    const checkXmlRpc = async () => {
        if (!url) return;
        setLoading(true);
        setResult(null);
        setError("");

        try {
            // Use environment variable for API URL (Cloudflare Worker) or default to local API
            const apiUrl = process.env.NEXT_PUBLIC_XMLRPC_API_URL || "https://xmlrpc-checker.sarnyou.workers.dev";

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to scan");
            }

            setResult(data);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 bg-background">
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-3xl">
                <div className="mb-8">
                    <Link href="/tools" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4 mr-1" /> กลับไปที่เครื่องมือ
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">WordPress XML-RPC Checker</h1>
                    </div>
                    <p className="text-muted-foreground">
                        ตรวจสอบเว็บไซต์ WordPress ของคุณว่าเปิดใช้งาน `xmlrpc.php` หรือไม่ ไฟล์นี้มักตกเป็นเป้าหมายของการโจมตีแบบ Brute-force และบอท DDoS
                    </p>
                </div>

                <Card className="border-border/50 bg-muted/20 mb-8">
                    <CardHeader>
                        <CardTitle>Enter Website URL</CardTitle>
                        <CardDescription>กรอก URL ของเว็บไซต์ WordPress ที่คุณต้องการตรวจสอบ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && checkXmlRpc()}
                            />
                            <Button onClick={checkXmlRpc} disabled={loading || !url}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check Now"}
                            </Button>
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>ข้อผิดพลาด</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xl font-bold mb-4">ผลการตรวจสอบ</h2>

                        <Card className={`border-l-4 ${result.isEnabled ? 'border-l-red-500' : 'border-l-emerald-500'} bg-card shadow-lg`}>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 p-2 rounded-full ${result.isEnabled ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {result.isEnabled ? <XCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">
                                                {result.isEnabled ? "เปิดใช้งาน XML-RPC" : "ปิดใช้งานหรือได้รับการป้องกัน"}
                                            </h3>
                                            <Badge variant={result.isEnabled ? "destructive" : "default"} className={!result.isEnabled ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                                {result.isEnabled ? "ไม่ปลอดภัย (Vulnerable)" : "ปลอดภัย (Secure)"}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground">{result.message}</p>
                                        <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted px-2 py-1 rounded inline-block">
                                            Target: {result.url}
                                        </p>
                                    </div>
                                </div>

                                {result.isEnabled && (
                                    <div className="mt-6 pt-6 border-t border-border/50">
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-primary" /> วิธีแก้ไข
                                        </h4>
                                        <div className="space-y-4 text-sm text-muted-foreground">
                                            <p>
                                                It is highly recommended to disable `xmlrpc.php` if you are not using it (e.g., for the Jetpack plugin or mobile app).
                                            </p>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="bg-muted/50 p-4 rounded-lg">
                                                    <strong className="block text-foreground mb-2">Option 1: .htaccess (Apache)</strong>
                                                    <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto text-white">
                                                        {`<Files xmlrpc.php>
order deny,allow
deny from all
</Files>`}
                                                    </pre>
                                                </div>

                                                <div className="bg-muted/50 p-4 rounded-lg">
                                                    <strong className="block text-foreground mb-2">Option 2: Functions.php</strong>
                                                    <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto text-white">
                                                        {`add_filter('xmlrpc_enabled', '__return_false');`}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
