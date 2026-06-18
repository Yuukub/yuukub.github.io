import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PasswordTool' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/password-generator/`,
            languages: {
                th: "https://yuukub.com/th/tools/password-generator/",
                en: "https://yuukub.com/en/tools/password-generator/",
                "x-default": "https://yuukub.com/th/tools/password-generator/",
            }
        },
    };
}

export default function PasswordGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
