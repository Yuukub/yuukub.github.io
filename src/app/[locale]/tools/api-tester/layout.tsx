import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'ApiTester' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        keywords: t('metaKeywords').split(',').map(k => k.trim()),
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/api-tester/`,
            languages: {
                th: "https://yuukub.com/th/tools/api-tester/",
                en: "https://yuukub.com/en/tools/api-tester/",
                "x-default": "https://yuukub.com/th/tools/api-tester/",
            }
        },
    };
}

export default function ApiTesterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
