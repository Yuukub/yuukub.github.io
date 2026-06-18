import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'HashTool' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/hash-generator/`,
            languages: {
                th: "https://yuukub.com/th/tools/hash-generator/",
                en: "https://yuukub.com/en/tools/hash-generator/",
                "x-default": "https://yuukub.com/th/tools/hash-generator/",
            }
        },
    };
}

export default function HashGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
