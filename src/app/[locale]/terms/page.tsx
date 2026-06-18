import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { FileText, Scale, ShieldAlert, CheckCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'TermsPage' });

    return {
        title: t('title'),
        description: t('section1Desc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/terms/`,
            languages: {
                th: "https://yuukub.com/th/terms/",
                en: "https://yuukub.com/en/terms/",
                "x-default": "https://yuukub.com/th/terms/",
            }
        },
    };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations("TermsPage");

    const formattedDate = new Date('2026-06-18').toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <Scale className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{t('title')}</h1>
                        <p className="text-muted-foreground">{t('tagline')}</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <FileText className="h-6 w-6 text-primary" />
                                {t('section1Title')}
                            </h2>
                            <p>
                                {t('section1Desc')}
                            </p>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <ShieldAlert className="h-6 w-6 text-primary" />
                                {t('section2Title')}
                            </h2>
                            <p>
                                {t('section2Desc')}
                            </p>
                            <ul>
                                <li>{t('section2Item1')}</li>
                                <li>{t('section2Item2')}</li>
                                <li>{t('section2Item3')}</li>
                            </ul>
                        </section>

                        <section className="bg-primary/5 rounded-2xl p-8 border border-primary/10">
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <CheckCircle className="h-6 w-6 text-primary" />
                                {t('section3Title')}
                            </h2>
                            <p>
                                {t('section3Desc')}
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>{t('section3Item1')}</li>
                                <li>{t('section3Item2')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-foreground mb-6">{t('section4Title')}</h2>
                            <p>
                                {t('section4Desc')}
                            </p>
                        </section>
                    </div>

                    <Separator className="my-12 opacity-50" />

                    <footer className="text-center text-sm text-muted-foreground">
                        <p>{t('lastUpdated', { date: formattedDate })}</p>
                    </footer>
                </article>
            </main>
        </div>
    );
}
