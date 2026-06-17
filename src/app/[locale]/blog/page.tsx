import type { Metadata } from "next";
import { getSortedPostsData } from "@/lib/blog";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Newspaper } from "lucide-react";
import { BlogList } from "@/components/blog-list";

export const metadata: Metadata = {
    title: "บทความและคลังความรู้เชิงเทคนิค",
    description: "รวมบทความเจาะลึกด้านความปลอดภัย WordPress, Technical SEO และการพัฒนา Full-stack สมัยใหม่ โดย Saranyuu M.",
    alternates: { canonical: "https://yuukub.com/blog/" },
};

import { setRequestLocale } from "next-intl/server";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const allPostsData = await getSortedPostsData();

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
                        การแบ่งปันความรู้เชิงเทคนิค
                    </Badge>
                    <h1 className="text-4xl font-bold tracking-tight mb-4 leading-[1.3]">คลังความรู้และการถอดบทเรียน</h1>
                    <p className="text-lg text-muted-foreground">
                        เจาะลึกกลั่นกรองประสบการณ์ด้านความปลอดภัย, Technical SEO และโซลูชันการพัฒนาเว็บสมัยใหม่
                    </p>
                </header>

                {/* Client component handles search + pagination */}
                <BlogList posts={allPostsData} />
            </main>
        </div>
    );
}
