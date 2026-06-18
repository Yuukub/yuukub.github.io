import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "BackgroundRemover" });

    const keywords = t("metaKeywords").split(",").map((k) => k.trim());

    return {
        title: t("metaTitle"),
        description: t("metaDesc"),
        keywords: keywords,
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/background-remover/`,
            languages: {
                th: "https://yuukub.com/th/tools/background-remover/",
                en: "https://yuukub.com/en/tools/background-remover/",
                "x-default": "https://yuukub.com/th/tools/background-remover/",
            }
        },
        openGraph: {
            title: t("ogTitle"),
            description: t("ogDesc"),
            url: `https://yuukub.com/${locale}/tools/background-remover/`,
            siteName: "Saranyuu M.",
            type: "website",
            locale: locale === "th" ? "th_TH" : "en_US",
        },
        twitter: {
            card: "summary",
            title: t("twitterTitle"),
            description: t("twitterDesc"),
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default function BackgroundRemoverLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
