"use client"

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, CheckCircle2, XCircle, Info, HelpCircle, AlertTriangle, Lock, Zap, BookOpen } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdUnit } from "@/components/ad-unit";

const FAQ_ITEMS = [
    {
        question: "XML-RPC คืออะไร และทำงานอย่างไรบน WordPress?",
        answer: "XML-RPC เป็น protocol สำหรับให้แอปพลิเคชันภายนอกสื่อสารกับ WordPress ผ่านไฟล์ xmlrpc.php เช่น การโพสต์บทความจากแอปมือถือหรือการเชื่อมต่อ Jetpack ในอดีตมันมีประโยชน์มาก แต่ปัจจุบัน WordPress REST API เข้ามาแทนที่แล้ว ทำให้ XML-RPC กลายเป็นช่องโหว่ที่ไม่จำเป็น",
    },
    {
        question: "ทำไม XML-RPC ถึงอันตราย?",
        answer: "XML-RPC มีฟีเจอร์ multicall ที่ช่วยให้ส่งคำสั่งหลายพันคำสั่งในคำขอเดียวได้ แฮกเกอร์ใช้จุดนี้โจมตีแบบ Brute Force ได้อย่างรวดเร็วโดยไม่ถูก rate limit และยังสามารถใช้ xmlrpc.php เพื่อทำ DDoS Amplification ผ่าน Pingback ซึ่งทำให้เว็บไซต์ WordPress กลายเป็นเครื่องมือโจมตีเว็บอื่นได้โดยที่เจ้าของไม่รู้ตัว",
    },
    {
        question: "ถ้าปิด XML-RPC แล้วจะกระทบการทำงานไหม?",
        answer: "ขึ้นอยู่กับว่าคุณใช้ปลั๊กอินอะไรอยู่ หากใช้ Jetpack, WooCommerce mobile app หรือแอปโพสต์ WordPress บนมือถือ จะกระทบการทำงาน แต่ถ้าไม่ได้ใช้สิ่งเหล่านี้ การปิด XML-RPC จะไม่มีผลต่อการทำงานของเว็บไซต์เลย และช่วยลดความเสี่ยงได้อย่างมีนัยสำคัญ",
    },
    {
        question: "วิธีไหนปิด XML-RPC ได้ปลอดภัยที่สุด?",
        answer: "วิธีที่แนะนำคือการปิดผ่าน .htaccess (Apache) หรือ Nginx config เพราะบล็อกที่ระดับ server ก่อนที่ WordPress จะโหลด ทำให้ประหยัด resource มากกว่าการปิดผ่าน functions.php ที่ WordPress ยังต้องโหลดขึ้นมาก่อน อีกตัวเลือกที่ดีคือใช้ปลั๊กอิน Wordfence หรือ Disable XML-RPC",
    },
    {
        question: "ปลั๊กอิน Security ช่วยป้องกัน XML-RPC ได้ไหม?",
        answer: "ได้ครับ ปลั๊กอินอย่าง Wordfence, iThemes Security หรือ All-In-One WP Security มี option ปิด XML-RPC ในตัว และยังช่วย block IP ที่พยายามโจมตีซ้ำๆ ได้ด้วย แต่การปิดที่ระดับ server ผ่าน .htaccess ยังคงเป็นวิธีที่มีประสิทธิภาพสูงสุด",
    },
];

const ATTACK_TYPES = [
    {
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        color: "border-l-red-500",
        bg: "bg-red-500/5",
        title: "Brute Force Attack",
        desc: "ใช้ฟีเจอร์ multicall ของ XML-RPC ส่งคำขอล็อกอินหลายพันครั้งในคำขอ HTTP เดียว ทำให้ข้าม rate limit ทั่วไปได้ง่าย และเดารหัสผ่านได้เร็วกว่าการโจมตี login page ปกติถึง 100 เท่า",
    },
    {
        icon: <Zap className="h-5 w-5 text-orange-500" />,
        color: "border-l-orange-500",
        bg: "bg-orange-500/5",
        title: "DDoS Pingback Amplification",
        desc: "แฮกเกอร์ส่ง pingback request ให้เว็บ WordPress ของคุณไปโจมตีเว็บเป้าหมาย ทำให้เว็บคุณกลายเป็น \"ทหารรับจ้าง\" ในการโจมตี DDoS โดยที่คุณไม่รู้ตัว และอาจทำให้ IP ของคุณโดนแบนได้",
    },
    {
        icon: <Lock className="h-5 w-5 text-purple-500" />,
        color: "border-l-purple-500",
        bg: "bg-purple-500/5",
        title: "Credential Harvesting",
        desc: "แม้แต่การโจมตีที่ล้มเหลวก็สร้างภาระ server load สูงมาก เพราะ WordPress ต้องประมวลผลทุก request เปรียบเหมือนมีคนมาเขย่าประตูบ้านซ้ำๆ ตลอด 24 ชั่วโมง ทำให้เว็บช้าลงหรือล่มได้",
    },
];

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

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": { "@type": "Answer", "text": item.answer },
        })),
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

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

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="mt-12 min-h-[150px] bg-muted/10 rounded-xl py-8 border border-dashed border-muted shrink-0"
                />

                {/* ─── SEO Content ─────────────────────────────────── */}
                <div className="mt-4 space-y-12 border-t border-border/20 pt-12">

                    {/* Section 1: XML-RPC คืออะไร */}
                    <section aria-labelledby="intro-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <Info className="h-5 w-5 text-emerald-500" />
                            </div>
                            <h2 id="intro-heading" className="text-xl font-bold tracking-tight">
                                XML-RPC บน WordPress คืออะไร?
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                <strong className="text-foreground">XML-RPC</strong> (XML Remote Procedure Call) คือ protocol ที่ WordPress ใช้เพื่อให้แอปพลิเคชันภายนอกสามารถสื่อสารและควบคุมเว็บไซต์ได้จากระยะไกลผ่านไฟล์ <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">xmlrpc.php</code> ในอดีตมันถูกใช้โดยแอปมือถือ WordPress และบริการอย่าง Jetpack เพื่อโพสต์บทความและจัดการเนื้อหาโดยไม่ต้องเข้า admin panel
                            </p>
                            <p>
                                อย่างไรก็ตาม ตั้งแต่ WordPress 4.7 เป็นต้นมา <strong className="text-foreground">REST API</strong> ได้เข้ามาทำหน้าที่แทน XML-RPC ได้อย่างสมบูรณ์แบบและปลอดภัยกว่ามาก ส่งผลให้ xmlrpc.php กลายเป็น "ประตูหลัง" ที่เปิดทิ้งไว้โดยไม่จำเป็น และตกเป็นเป้าหมายหลักของแฮกเกอร์ที่สแกนหาเว็บ WordPress ที่ยังเปิดไฟล์นี้อยู่
                            </p>
                            <p>
                                จากรายงานของ Wordfence พบว่าการโจมตีผ่าน XML-RPC คิดเป็นสัดส่วนสูงในการโจมตี WordPress ทั้งหมด เนื่องจากแฮกเกอร์ใช้ <strong className="text-foreground">ฟีเจอร์ multicall</strong> ที่ช่วยให้ส่งคำสั่งหลายพันคำสั่งในคำขอ HTTP เพียงครั้งเดียว ทำให้การโจมตีมีประสิทธิภาพสูงกว่าการโจมตีหน้า login ปกติมาก
                            </p>
                        </div>
                    </section>

                    {/* Section 2: ประเภทการโจมตี */}
                    <section aria-labelledby="attacks-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                            <h2 id="attacks-heading" className="text-xl font-bold tracking-tight">
                                3 รูปแบบการโจมตีที่พบบ่อยผ่าน XML-RPC
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {ATTACK_TYPES.map((item) => (
                                <Card key={item.title} className={`p-5 border-l-4 ${item.color} border-border/30 ${item.bg}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 mt-0.5">{item.icon}</div>
                                        <div>
                                            <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section 3: วิธีป้องกัน */}
                    <section aria-labelledby="protect-heading">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <BookOpen className="h-5 w-5 text-emerald-500" />
                            </div>
                            <h2 id="protect-heading" className="text-xl font-bold tracking-tight">
                                วิธีปิด XML-RPC อย่างถูกต้อง
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed mb-6">
                            <p>
                                มีหลายวิธีในการปิดหรือจำกัดการเข้าถึง xmlrpc.php แต่ละวิธีมีข้อดีข้อเสียต่างกัน ควรเลือกตามสภาพแวดล้อมของ server และความต้องการของเว็บไซต์คุณ
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    step: "1",
                                    title: ".htaccess (Apache)",
                                    desc: "บล็อกที่ระดับ server ก่อน WordPress โหลด ประหยัด resource สูงสุด เหมาะกับ shared hosting ทั่วไป",
                                    badge: "แนะนำ",
                                    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                },
                                {
                                    step: "2",
                                    title: "Functions.php / Plugin",
                                    desc: "ปิดผ่าน WordPress filter ง่ายและปลอดภัย แต่ WordPress ยังโหลดขึ้นมาก่อน เหมาะถ้าไม่มีสิทธิ์แก้ server config",
                                    badge: "ทางเลือก",
                                    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                                },
                                {
                                    step: "3",
                                    title: "Nginx Config",
                                    desc: "เพิ่ม location block ใน nginx.conf เพื่อ return 403 บล็อกที่ระดับ server เช่นเดียวกับ .htaccess เหมาะกับ VPS/cloud",
                                    badge: "VPS/Cloud",
                                    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
                                },
                            ].map((item) => (
                                <Card key={item.step} className="p-5 border-border/50 bg-muted/20 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-bold flex items-center justify-center shrink-0">
                                            {item.step}
                                        </span>
                                        <Badge variant="outline" className={`text-[10px] ${item.badgeColor}`}>{item.badge}</Badge>
                                    </div>
                                    <p className="font-semibold text-sm">{item.title}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </section>

                    {/* Section 4: FAQ */}
                    <section aria-labelledby="faq-heading">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <HelpCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                            <h2 id="faq-heading" className="text-xl font-bold tracking-tight">
                                คำถามที่พบบ่อย (FAQ)
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {FAQ_ITEMS.map((item, i) => (
                                <Card key={i} className="p-5 border-border/50">
                                    <h3 className="font-semibold text-sm mb-2 flex items-start gap-2">
                                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Q</Badge>
                                        {item.question}
                                    </h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed pl-7">{item.answer}</p>
                                </Card>
                            ))}
                        </div>
                    </section>

                </div>

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[250px] mt-20 bg-muted/10 rounded-xl py-20 border border-dashed border-muted"
                />
            </main>
        </div>
    );
}
