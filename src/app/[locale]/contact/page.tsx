import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageSquare, Globe, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'ContactPage' });

    return {
        title: t('title'),
        description: t('emailDesc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/contact/`,
            languages: {
                th: "https://yuukub.com/th/contact/",
                en: "https://yuukub.com/en/contact/",
                "x-default": "https://yuukub.com/th/contact/",
            }
        },
    };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const contactEmail = "yuukun.eutopia@gmail.com";

    const t = await getTranslations("ContactPage");

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <MessageSquare className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{t('title')}</h1>
                        <p className="text-muted-foreground">{t('tagline')}</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="p-8 rounded-2xl border border-border bg-card/30 flex flex-col items-center text-center group hover:border-primary/50 transition-colors">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Mail className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('emailTitle')}</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                {t('emailDesc')}
                            </p>
                            <a href={`mailto:${contactEmail}`} className="w-full">
                                <Button className="w-full rounded-xl gap-2">
                                    <Send className="h-4 w-4" /> {t('emailBtn')}
                                </Button>
                            </a>
                            <p className="mt-4 text-xs font-medium text-primary">{contactEmail}</p>
                        </div>

                        <div className="p-8 rounded-2xl border border-border bg-card/30 flex flex-col items-center text-center group hover:border-primary/50 transition-colors">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Globe className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('socialTitle')}</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                {t('socialDesc')}
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center">
                                <a href="https://github.com/Yuukub" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="rounded-full">GitHub</Button>
                                </a>
                                <a href="https://linkedin.com/in/saranyoo-m" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="rounded-full">LinkedIn</Button>
                                </a>
                                <a href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="rounded-full bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors text-primary font-bold">Fastwork</Button>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                        <h2 className="text-2xl font-bold mb-4">{t('hoursTitle')}</h2>
                        <p className="text-muted-foreground">
                            {t('hoursDesc')}
                        </p>

                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 mt-8">
                            <h3 className="text-lg font-bold text-primary mb-2 italic">{t('noteTitle')}</h3>
                            <p className="text-sm text-muted-foreground m-0">
                                {t('noteDesc')}
                            </p>
                        </div>
                    </div>
                </article>
            </main>
        </div>
    );
}
