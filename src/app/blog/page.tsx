import type { Metadata } from "next";
import Link from "next/link";
import { getSortedPostsData } from "@/lib/blog";

export const metadata: Metadata = {
    title: "บทความและคลังความรู้เชิงเทคนิค",
    description: "รวมบทความเจาะลึกด้านความปลอดภัย WordPress, Technical SEO และการพัฒนา Full-stack สมัยใหม่ โดย Saranyuu M.",
    alternates: { canonical: "https://yuukub.github.io/blog/" },
};
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Calendar, ArrowRight, Newspaper, Clock } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default async function BlogPage() {
    const allPostsData = await getSortedPostsData();

    return (
        <div className="min-h-screen bg-background selection:bg-primary/20 relative">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            {/* Navigation */}
            <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4 pointer-events-none mb-12">
                <div className="glass rounded-full px-6 py-2 flex items-center justify-between pointer-events-auto border border-white/10 shadow-xl group/nav">
                    <Link href="/" className="font-bold text-lg tracking-tight">
                        Saranyuu<span className="text-primary">.M</span>
                    </Link>
                    <nav className="flex items-center gap-6 text-sm font-medium">
                        <Link href="/#work" className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                            Work
                        </Link>
                        <Link href="/blog" className="text-foreground transition-colors font-bold tracking-tight">
                            Blog
                        </Link>
                        <div className="flex items-center gap-3 pl-2 border-l border-border/50">
                            <ModeToggle />
                            <a href="mailto:yuukun.eutopia@gmail.com">
                                <Button size="sm" className="rounded-full px-5 hidden sm:flex">Contact</Button>
                            </a>
                        </div>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 pt-24 pb-24 max-w-5xl">
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allPostsData.map(({ slug, date, title, description, tags, readingTime, thumbnail }) => (
                        <Link key={slug} href={`/blog/${slug}`} className="group">
                            <Card className="h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20">
                                {/* Thumbnail */}
                                {thumbnail && (
                                    <div className="aspect-video w-full overflow-hidden">
                                        <img
                                            src={thumbnail}
                                            alt={title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                )}

                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                        <Calendar className="h-3 w-3" />
                                        <span>{format(new Date(date), "dd MMM yyyy", { locale: th })}</span>
                                        <span>•</span>
                                        <Clock className="h-3 w-3" />
                                        <span>{readingTime}</span>
                                    </div>
                                    <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors">
                                        {title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    {description && (
                                        <CardDescription className="line-clamp-2 mb-4">
                                            {description}
                                        </CardDescription>
                                    )}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {Array.from(new Set(tags || [])).slice(0, 2).map((tag, index) => (
                                                <Badge key={`${tag}-${index}`} variant="outline" className="text-[10px]">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                        <span className="flex items-center gap-1 text-xs font-medium text-primary whitespace-nowrap shrink-0">
                                            อ่านต่อ <ArrowRight className="h-3 w-3" />
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t py-12 bg-muted/30">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Saranyuu M. สงวนลิขสิทธิ์</p>
                    <p className="mt-2 text-xs text-muted-foreground">Member of แว่น Talk มาร์เก็ตติ้ง</p>
                </div>
            </footer>
        </div>
    );
}
