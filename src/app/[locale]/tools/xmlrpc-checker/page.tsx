"use client"

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, CheckCircle2, XCircle, Info, HelpCircle, AlertTriangle, Lock, Zap, BookOpen } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdUnit } from "@/components/ad-unit";
import { useTranslations } from "next-intl";

interface ScanResult {
    isEnabled: boolean;
    message: string;
    url: string;
}

export default function XmlRpcCheckerPage() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState("");
    const t = useTranslations("XmlRpcTool");

    const faqItems = [
        {
            question: t("faq1Q"),
            answer: t("faq1A"),
        },
        {
            question: t("faq2Q"),
            answer: t("faq2A"),
        },
        {
            question: t("faq3Q"),
            answer: t("faq3A"),
        },
        {
            question: t("faq4Q"),
            answer: t("faq4A"),
        },
        {
            question: t("faq5Q"),
            answer: t("faq5A"),
        },
    ];

    const attackTypes = [
        {
            icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            color: "border-l-red-500",
            bg: "bg-red-500/5",
            title: t("attack1Title"),
            desc: t("attack1Desc"),
        },
        {
            icon: <Zap className="h-5 w-5 text-orange-500" />,
            color: "border-l-orange-500",
            bg: "bg-orange-500/5",
            title: t("attack2Title"),
            desc: t("attack2Desc"),
        },
        {
            icon: <Lock className="h-5 w-5 text-purple-500" />,
            color: "border-l-purple-500",
            bg: "bg-purple-500/5",
            title: t("attack3Title"),
            desc: t("attack3Desc"),
        },
    ];

    const checkXmlRpc = async () => {
        if (!url) return;
        setLoading(true);
        setResult(null);
        setError("");

        try {
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const faqJsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqItems.map((item) => ({
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
                    <Link href="/tools/" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToTools")}
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    </div>
                    <p className="text-muted-foreground">
                        {t("desc")}
                    </p>
                </div>

                <Card className="border-border/50 bg-muted/20 mb-8">
                    <CardHeader>
                        <CardTitle>{t("cardTitle")}</CardTitle>
                        <CardDescription>{t("cardDesc")}</CardDescription>
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
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("checkBtn")}
                            </Button>
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>{t("errorTitle")}</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {result && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xl font-bold mb-4">{t("resultTitle")}</h2>

                        <Card className={`border-l-4 ${result.isEnabled ? 'border-l-red-500' : 'border-l-emerald-500'} bg-card shadow-lg`}>
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 p-2 rounded-full ${result.isEnabled ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {result.isEnabled ? <XCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">
                                                {result.isEnabled ? t("resultEnabled") : t("resultDisabled")}
                                            </h3>
                                            <Badge variant={result.isEnabled ? "destructive" : "default"} className={!result.isEnabled ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                                {result.isEnabled ? t("statusVulnerable") : t("statusSecure")}
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
                                            <ShieldCheck className="h-4 w-4 text-primary" /> {t("howToFix")}
                                        </h4>
                                        <div className="space-y-4 text-sm text-muted-foreground">
                                            <p>
                                                {t("fixDesc")}
                                            </p>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="bg-muted/50 p-4 rounded-lg">
                                                    <strong className="block text-foreground mb-2">{t("option1")}</strong>
                                                    <pre className="bg-black/50 p-3 rounded text-xs overflow-x-auto text-white">
                                                        {`<Files xmlrpc.php>
order deny,allow
deny from all
</Files>`}
                                                    </pre>
                                                </div>

                                                <div className="bg-muted/50 p-4 rounded-lg">
                                                    <strong className="block text-foreground mb-2">{t("option2")}</strong>
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
                                {t("seoTitle")}
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                            <p>
                                {t("seoDesc1")}
                            </p>
                            <p>
                                {t("seoDesc2")}
                            </p>
                            <p>
                                {t("seoDesc3")}
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
                                {t("seoAttacksTitle")}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {attackTypes.map((item) => (
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
                                {t("seoProtectTitle")}
                            </h2>
                        </div>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed mb-6">
                            <p>
                                {t("seoProtectDesc")}
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    step: "1",
                                    title: t("protect1Title"),
                                    desc: t("protect1Desc"),
                                    badge: t("protect1Badge"),
                                    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                },
                                {
                                    step: "2",
                                    title: t("protect2Title"),
                                    desc: t("protect2Desc"),
                                    badge: t("protect2Badge"),
                                    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                                },
                                {
                                    step: "3",
                                    title: t("protect3Title"),
                                    desc: t("protect3Desc"),
                                    badge: t("protect3Badge"),
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
                                {t("faqTitle")}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {faqItems.map((item, i) => (
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