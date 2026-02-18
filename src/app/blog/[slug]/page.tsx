import type { Metadata } from "next";
import Link from "next/link";
import { getPostData, getAllPostSlugs } from "@/lib/blog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { Calendar, ChevronLeft, Tag as TagIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Navbar } from "@/components/navbar";

export async function generateStaticParams() {
    return await getAllPostSlugs();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostData(slug);
    return {
        title: post.title,
        description: post.description || `อ่านบทความ ${post.title} โดย Saranyuu M.`,
        alternates: { canonical: `https://yuukub.com/blog/${slug}/` },
        openGraph: {
            title: post.title,
            description: post.description || `อ่านบทความ ${post.title} โดย Saranyuu M.`,
            type: "article",
            publishedTime: post.date,
            authors: ["Saranyuu Meekumlang"],
            ...(post.thumbnail ? { images: [{ url: post.thumbnail }] } : {}),
        },
    };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const postData = await getPostData(slug);

    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: postData.title,
        datePublished: postData.date,
        author: { "@type": "Person", name: "Saranyuu Meekumlang" },
        ...(postData.description ? { description: postData.description } : {}),
        ...(postData.thumbnail ? { image: postData.thumbnail } : {}),
    };

    const breadcrumbJsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://yuukub.com/" },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://yuukub.com/blog/" },
            { "@type": "ListItem", "position": 3, "name": postData.title, "item": `https://yuukub.com/blog/${slug}/` }
        ]
    };

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd]) }}
            />
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            {/* Navigation */}
            <Navbar />

            <main className="container mx-auto px-4 pt-10 md:pt-24 pb-24 max-w-5xl">
                <Link href="/blog">
                    <Button variant="ghost" size="sm" className="gap-1 mb-8 text-muted-foreground hover:text-primary">
                        <ChevronLeft className="h-4 w-4" />
                        กลับไปที่คลังความรู้
                    </Button>
                </Link>

                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-10 shadow-sm">
                    <header className="mb-10">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(postData.date), "dd MMMM yyyy", { locale: th })}
                            </div>
                            <Separator orientation="vertical" className="h-4 hidden sm:block" />
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {postData.readingTime}
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.2]">
                            {postData.title}
                        </h1>

                        <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(postData.tags || [])).map((tag, index) => (
                                <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1 px-3 py-1">
                                    <TagIcon className="h-3 w-3" />
                                    {tag}
                                </Badge>
                            ))}
                        </div>

                        {/* Cover Image */}
                        {postData.thumbnail && (
                            <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl border border-border/50 shadow-md">
                                <img
                                    src={postData.thumbnail}
                                    alt={postData.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </header>

                    <Separator className="mb-10 opacity-50" />

                    {/* Post Content */}
                    <div
                        className="prose prose-zinc dark:prose-invert max-w-none
            prose-headings:scroll-mt-20 prose-headings:font-bold
            prose-p:leading-relaxed prose-p:text-muted-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-lg
            prose-code:before:content-none prose-code:after:content-none"
                        dangerouslySetInnerHTML={{ __html: postData.contentHtml }}
                    />
                </article>
            </main>

            {/* Footer */}
            <footer className="border-t py-12 mt-16 bg-background/95 backdrop-blur-sm relative z-20">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Saranyuu M. สงวนลิขสิทธิ์</p>
                    <p className="mt-2 text-xs text-muted-foreground">Member of แว่น Talk มาร์เก็ตติ้ง</p>
                </div>
            </footer>
        </div>
    );
}
