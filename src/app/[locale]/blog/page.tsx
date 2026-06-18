import { getSortedPostsData } from "@/lib/blog";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Newspaper } from "lucide-react";
import { BlogList } from "@/components/blog-list";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'BlogPage' });

    return {
        title: t('metaTitle'),
        description: t('metaDesc'),
        alternates: {
            canonical: `https://yuukub.com/${locale}/blog/`,
            languages: {
                th: "https://yuukub.com/th/blog/",
                en: "https://yuukub.com/en/blog/",
                "x-default": "https://yuukub.com/th/blog/",
            }
        },
    };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("BlogPage");
    const allPostsData = await getSortedPostsData(locale);

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://yuukub.com/" },
                            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://yuukub.com/blog/" }
                        ]
                    })
                }}
            />
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            {/* Navigation */}
            <Navbar />

            <main className="container mx-auto px-4 pt-10 md:pt-24 pb-24 max-w-5xl">
                <header className="max-w-4xl mb-12">
                    <Badge variant="secondary" className="gap-2 mb-4">
                        <Newspaper className="h-3 w-3" />
                        {t('badge')}
                    </Badge>
                    <h1 className="text-4xl font-bold tracking-tight mb-4 leading-[1.3]">{t('title')}</h1>
                    <p className="text-lg text-muted-foreground">
                        {t('desc')}
                    </p>
                </header>

                {/* Client component handles search + pagination */}
                <BlogList posts={allPostsData} />
            </main>
        </div>
    );
}
