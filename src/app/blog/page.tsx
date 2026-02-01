import Link from "next/link";
import { getSortedPostsData } from "@/lib/blog";
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
                                <Button size="sm" className="rounded-full px-5 hidden xs:flex">Contact</Button>
                            </a>
                        </div>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-5xl">
                <header className="max-w-4xl mb-16">
                    <Badge variant="secondary" className="gap-2 mb-4">
                        <Newspaper className="h-3 w-3" />
                        การแบ่งปันความรู้เชิงเทคนิค
                    </Badge>
                    <h1 className="text-4xl font-bold tracking-tight mb-4 leading-[1.3]">คลังความรู้และการถอดบทเรียน</h1>
                    <p className="text-lg text-muted-foreground">
                        เจาะลึกกลั่นกรองประสบการณ์ด้านความปลอดภัย, Technical SEO และโซลูชันการพัฒนาเว็บสมัยใหม่
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allPostsData.map(({ slug, date, title, description, tags, readingTime, thumbnail }) => (
                        <Link key={slug} href={`/blog/${slug}`}>
                            <Card className="h-full flex flex-col group hover:shadow-2xl transition-all duration-300 border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden rounded-2xl group cursor-pointer hover:-translate-y-2">
                                {/* Thumbnail Container */}
                                <div className="aspect-[3/4] w-full overflow-hidden bg-muted relative">
                                    {thumbnail ? (
                                        <img
                                            src={thumbnail}
                                            alt={title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                                            <Newspaper className="h-16 w-16" />
                                        </div>
                                    )}

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-80" />

                                    {/* Content Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-2">
                                        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground/80">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(date), "dd MMM yyyy", { locale: th })}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" />
                                                {readingTime}
                                            </div>
                                        </div>
                                        <CardTitle className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                            {title}
                                        </CardTitle>
                                    </div>
                                </div>

                                <CardContent className="flex-grow flex flex-col p-6 pt-4">
                                    {description && (
                                        <CardDescription className="line-clamp-2 mb-6 text-sm leading-relaxed text-muted-foreground/70">
                                            {description}
                                        </CardDescription>
                                    )}
                                    <div className="mt-auto flex items-center justify-between">
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(new Set(tags || [])).slice(0, 2).map((tag, index) => (
                                                <Badge key={`${tag}-${index}`} variant="secondary" className="text-[9px] uppercase tracking-widest bg-primary/5 text-primary/80 border-none px-2">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex items-center text-xs font-semibold text-primary/80 gap-1.5 group-hover:gap-2 transition-all">
                                            Read <ArrowRight className="h-3.5 w-3.5" />
                                        </div>
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
