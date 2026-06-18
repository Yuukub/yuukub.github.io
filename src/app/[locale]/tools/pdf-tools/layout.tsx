import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PdfTools' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        keywords: t.raw('metaKeywords'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/pdf-tools/`,
            languages: {
                th: "https://yuukub.com/th/tools/pdf-tools/",
                en: "https://yuukub.com/en/tools/pdf-tools/",
                "x-default": "https://yuukub.com/th/tools/pdf-tools/",
            }
        },
    };
}

export default function PdfToolsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

