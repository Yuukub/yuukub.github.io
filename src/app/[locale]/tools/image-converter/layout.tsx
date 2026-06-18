import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'ImageConverter' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        keywords: t('metaKeywords')?.split(',').map((k: string) => k.trim()) || [],
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/image-converter/`,
            languages: {
                th: "https://yuukub.com/th/tools/image-converter/",
                en: "https://yuukub.com/en/tools/image-converter/",
                "x-default": "https://yuukub.com/th/tools/image-converter/",
            }
        },
    };
}

export default function ImageConverterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
