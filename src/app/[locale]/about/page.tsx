import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { User, Terminal, ShieldCheck, Heart } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'AboutPage' });

    return {
        title: t('title'),
        description: t('missionDesc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/about/`,
            languages: {
                th: "https://yuukub.com/th/about/",
                en: "https://yuukub.com/en/about/",
                "x-default": "https://yuukub.com/th/about/",
            }
        },
    };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations("AboutPage");

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <Heart className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{t('title')}</h1>
                        <p className="text-muted-foreground">{t('tagline')}</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
                        <section className="text-center md:text-left">
                            <h2 className="text-3xl font-bold text-foreground mb-6">{t('missionTitle')}</h2>
                            <p className="text-lg leading-relaxed text-muted-foreground">
                                {t('missionDesc')}
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-6 rounded-2xl border border-border bg-card/30">
                                <Terminal className="h-10 w-10 text-primary mb-4" />
                                <h3 className="text-xl font-bold mb-2">{t('toolsTitle')}</h3>
                                <p className="text-muted-foreground text-sm">
                                    {t('toolsDesc')}
                                </p>
                            </div>
                            <div className="p-6 rounded-2xl border border-border bg-card/30">
                                <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                                <h3 className="text-xl font-bold mb-2">{t('securityTitle')}</h3>
                                <p className="text-muted-foreground text-sm">
                                    {t('securityDesc')}
                                </p>
                            </div>
                        </div>

                        <section className="flex flex-col md:flex-row items-center gap-10 py-8">
                            <div className="shrink-0">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center p-1">
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                                        <User className="w-16 h-16 text-primary" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4">{t('developerTitle')}</h2>
                                <p className="text-muted-foreground">
                                    {t('developerDesc')}
                                </p>
                            </div>
                        </section>
                    </div>

                    <footer className="text-center font-bold text-primary italic">
                        {t('footerQuote')}
                    </footer>
                </article>
            </main>
        </div>
    );
}
