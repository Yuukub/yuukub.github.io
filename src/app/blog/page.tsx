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
                            <Card className="h-full flex flex-col group hover:shadow-lg transition-all border-muted overflow-hidden">
                                {/* Thumbnail Container */}
                                <div className="aspect-[16/9] w-full overflow-hidden bg-muted relative">
                                    {thumbnail ? (
                                        <img
                                            src={thumbnail}
                                            alt={title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                            <Newspaper className="h-12 w-12" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
                                </div>

                                <CardHeader className="flex-none pb-4 pt-6">
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(date), "dd MMMM yyyy", { locale: th })}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {readingTime}
                                        </div>
                                    </div>
                                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                        {title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col">
                                    {description && (
                                        <CardDescription className="line-clamp-3 mb-4 text-sm leading-relaxed">
                                            {description}
                                        </CardDescription>
                                    )}
                                    <div className="mt-auto flex flex-col gap-4">
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(new Set(tags || [])).slice(0, 3).map((tag, index) => (
                                                <Badge key={`${tag}-${index}`} variant="outline" className="text-[10px] uppercase tracking-wider">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex items-center text-sm font-medium text-primary gap-1 pt-2">
                                            อ่านต่อ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
