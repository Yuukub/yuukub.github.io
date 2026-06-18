import { Link } from "@/i18n/routing";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, Hash, Lock, ImageIcon, MonitorPlay, Zap, FileText, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdUnit } from "@/components/ad-unit";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'ToolsHub' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/`,
            languages: {
                th: "https://yuukub.com/th/tools/",
                en: "https://yuukub.com/en/tools/",
                "x-default": "https://yuukub.com/th/tools/",
            }
        },
    };
}

export default async function ToolsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations("ToolsHub");

    const tools = [
        {
            key: "xmlrpc",
            title: "WordPress XML-RPC Checker",
            icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
            href: "/tools/xmlrpc-checker/",
            tags: ["Security", "WordPress"],
            colorClass: "bg-emerald-500/10 text-emerald-500",
        },
        {
            key: "hash",
            title: "Hash Generator",
            icon: <Hash className="h-6 w-6 text-blue-500" />,
            href: "/tools/hash-generator/",
            tags: ["Security", "DevOps"],
            colorClass: "bg-blue-500/10 text-blue-500",
        },
        {
            key: "password",
            title: "Password Generator",
            icon: <Lock className="h-6 w-6 text-purple-500" />,
            href: "/tools/password-generator/",
            tags: ["Productivity", "Security"],
            colorClass: "bg-purple-500/10 text-purple-500",
        },
        {
            key: "image",
            title: "Image Converter",
            icon: <ImageIcon className="h-6 w-6 text-orange-500" />,
            href: "/tools/image-converter/",
            tags: ["Media", "Productivity"],
            colorClass: "bg-orange-500/10 text-orange-500",
        },
        {
            key: "background",
            title: "Background Remover",
            icon: <Eraser className="h-6 w-6 text-cyan-500" />,
            href: "/tools/background-remover/",
            tags: ["AI", "Media"],
            colorClass: "bg-cyan-500/10 text-cyan-500",
        },
        {
            key: "previewer",
            title: "Live Web Previewer",
            icon: <MonitorPlay className="h-6 w-6 text-fuchsia-500" />,
            href: "/tools/web-previewer/",
            tags: ["Developer", "Live Preview"],
            colorClass: "bg-fuchsia-500/10 text-fuchsia-500",
        },
        {
            key: "api",
            title: "API Tester",
            icon: <Zap className="h-6 w-6 text-cyan-500" />,
            href: "/tools/api-tester/",
            tags: ["Developer", "API"],
            colorClass: "bg-cyan-500/10 text-cyan-500",
        },
        {
            key: "pdf",
            title: "PDF Tools",
            icon: <FileText className="h-6 w-6 text-red-500" />,
            href: "/tools/pdf-tools/",
            tags: ["PDF", "Productivity"],
            colorClass: "bg-red-500/10 text-red-500",
        },
    ];

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-5xl">
                <section className="flex flex-col items-center text-center gap-6 mb-12 border-b border-border/10 pb-12">
                    <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary px-4 py-1">
                        {t('badge')}
                    </Badge>

                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        {t('title')}<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-indigo-600">
                            {t('titleGradient')}
                        </span>
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-2xl text-balance leading-relaxed">
                        {t('desc')}
                    </p>
                </section>

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[150px] mb-12 bg-card/30 backdrop-blur-sm rounded-xl py-12 border border-border/50 shadow-sm"
                />

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map((tool) => (
                        <Link key={tool.title} href={tool.href} className="group">
                            <Card className="h-full p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card border-border/50 backdrop-blur-sm">
                                <div>
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm ${tool.colorClass}`}>
                                        {tool.icon}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{tool.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                        {t(`items.${tool.key}.desc`)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex gap-2">
                                        {tool.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0.5 pointer-events-none opacity-80 font-semibold tracking-wide uppercase">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </section>
            </main>
        </div>
    );
}
