import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'XmlRpcTool' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        keywords: [
            "XML-RPC checker",
            "WordPress security",
            locale === "th" ? "ปิด xmlrpc.php" : "disable xmlrpc.php",
            locale === "th" ? "ตรวจสอบช่องโหว่ WordPress" : "wordpress vulnerability checker",
            locale === "th" ? "Brute Force WordPress" : "WordPress brute force",
            "WordPress hardening",
            "xmlrpc vulnerability"
        ],
        alternates: {
            canonical: `https://yuukub.com/${locale}/tools/xmlrpc-checker/`,
            languages: {
                th: "https://yuukub.com/th/tools/xmlrpc-checker/",
                en: "https://yuukub.com/en/tools/xmlrpc-checker/",
                "x-default": "https://yuukub.com/th/tools/xmlrpc-checker/",
            }
        },
    };
}

export default function XmlRpcCheckerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
