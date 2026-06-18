import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Eye, ExternalLink, Mail } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PrivacyPolicyPage' });

    return {
        title: t('title'),
        description: t('section1Desc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/privacy-policy/`,
            languages: {
                th: "https://yuukub.com/th/privacy-policy/",
                en: "https://yuukub.com/en/privacy-policy/",
                "x-default": "https://yuukub.com/th/privacy-policy/",
            }
        },
    };
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations("PrivacyPolicyPage");

    const formattedDate = new Date('2026-06-18').toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{t('title')}</h1>
                        <p className="text-muted-foreground">{t('tagline')}</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <Eye className="h-6 w-6 text-primary" />
                                {t('section1Title')}
                            </h2>
                            <p>
                                {t('section1Desc')}
                            </p>
                            <ul>
                                <li>{t('section1Item1')}</li>
                                <li>{t('section1Item2')}</li>
                                <li>{t('section1Item3')}</li>
                                <li>{t('section1Item4')}</li>
                            </ul>
                        </section>

                        <section className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <Lock className="h-6 w-6 text-primary" />
                                {t('section2Title')}
                            </h2>
                            <p className="text-lg font-medium text-foreground mb-4">
                                {t('section2Tagline')}
                            </p>
                            <p>
                                {t('section2Desc')}
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li className="text-primary font-bold">{t('section2Item1')}</li>
                                <li>{t('section2Item2')}</li>
                                <li>{t('section2Item3')}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <ExternalLink className="h-6 w-6 text-primary" />
                                {t('section3Title')}
                            </h2>
                            <p>
                                {t('section3Desc')}
                            </p>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <Mail className="h-6 w-6 text-primary" />
                                {t('section4Title')}
                            </h2>
                            <p>
                                {t('section4Desc')}
                            </p>
                            <ul className="list-none pl-0">
                                <li><strong>Email:</strong> <a href="mailto:yuukun.eutopia@gmail.com" className="text-primary hover:underline">yuukun.eutopia@gmail.com</a></li>
                                <li><strong>Website:</strong> <Link href="/contact/" className="text-primary hover:underline">{locale === 'th' ? 'หน้าติดต่อเรา' : 'Contact Page'}</Link></li>
                            </ul>
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
