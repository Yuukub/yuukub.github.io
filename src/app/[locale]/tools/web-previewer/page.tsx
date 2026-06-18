import { Suspense } from "react";
import { LiveWebPreviewer } from "./live-previewer";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'WebPreviewer' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/web-previewer/`,
            languages: {
                th: "https://yuukub.com/th/tools/web-previewer/",
                en: "https://yuukub.com/en/tools/web-previewer/",
                "x-default": "https://yuukub.com/th/tools/web-previewer/",
            }
        },
    };
}

export default async function WebPreviewerPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("WebPreviewer");

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">{t('loading')}</div>}>
            <LiveWebPreviewer />
        </Suspense>
    );
}

