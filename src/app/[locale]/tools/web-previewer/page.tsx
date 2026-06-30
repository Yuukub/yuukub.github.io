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

    const softwareAppJsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Live Web Previewer",
        "operatingSystem": "All",
        "applicationCategory": "DeveloperApplication",
        "browserRequirements": "Requires HTML5, Web Browser",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        }
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `https://yuukub.com/${locale}/` },
            { "@type": "ListItem", "position": 2, "name": "Tools", "item": `https://yuukub.com/${locale}/tools/` },
            { "@type": "ListItem", "position": 3, "name": "Live Web Previewer", "item": `https://yuukub.com/${locale}/tools/web-previewer/` }
        ]
    };

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">{t('loading')}</div>}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([softwareAppJsonLd, breadcrumbJsonLd]) }}
            />
            <LiveWebPreviewer />
        </Suspense>
    );
}

