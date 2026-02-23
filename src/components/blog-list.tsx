"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Clock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface Post {
    slug: string;
    date: string;
    title: string;
    description?: string;
    tags?: string[];
    readingTime: string;
    thumbnail?: string;
}

interface BlogListProps {
    posts: Post[];
}

const POSTS_PER_PAGE = 6;

export function BlogList({ posts }: BlogListProps) {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);

    // Filter posts by search query (title, description, tags)
    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return posts;
        return posts.filter(
            (p) =>
                p.title.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.tags?.some((t) => t.toLowerCase().includes(q))
        );
    }, [posts, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

    const handleSearch = (value: string) => {
        setQuery(value);
        setPage(1); // Reset to page 1 on new search
    };

    return (
        <>
            {/* Search Bar */}
            <div className="relative mb-8 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="ค้นหาบทความ, แท็ก หรือคำอธิบาย..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                {query && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {filtered.length} บทความ
                    </span>
                )}
            </div>

            {/* Grid */}
            {paginated.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginated.map(({ slug, date, title, description, tags, readingTime, thumbnail }) => (
                        <Link key={slug} href={`/blog/${slug}`} className="group h-full block">
                            <Card className="h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/20">
                                {thumbnail && (
                                    <div className="aspect-video w-full overflow-hidden shrink-0">
                                        <img
                                            src={thumbnail}
                                            alt={title}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                )}
                                <CardHeader className="pb-0 shrink-0">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                        <Calendar className="h-3 w-3" />
                                        <span>{format(new Date(date), "dd MMM yyyy", { locale: th })}</span>
                                        <span>•</span>
                                        <Clock className="h-3 w-3" />
                                        <span>{readingTime}</span>
                                    </div>
                                    <CardTitle className="text-xl leading-snug group-hover:text-primary transition-colors line-clamp-3 min-h-[5.25rem]">
                                        {title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0 flex flex-col flex-grow">
                                    {description && (
                                        <CardDescription className="line-clamp-2 mb-4">
                                            {description}
                                        </CardDescription>
                                    )}
                                    <div className="mt-auto pt-4 flex items-center justify-between gap-4">
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
            ) : (
                <div className="text-center py-24 text-muted-foreground">
                    <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">ไม่พบบทความที่ตรงกับ &quot;{query}&quot;</p>
                    <p className="text-sm mt-1">ลองค้นหาด้วยคำอื่น หรือดูบทความทั้งหมด</p>
                    <Button variant="outline" className="mt-4" onClick={() => setQuery("")}>
                        ล้างการค้นหา
                    </Button>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="หน้าก่อนหน้า"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <Button
                            key={n}
                            variant={currentPage === n ? "default" : "outline"}
                            size="icon"
                            onClick={() => setPage(n)}
                            aria-label={`หน้า ${n}`}
                            className="w-9 h-9"
                        >
                            {n}
                        </Button>
                    ))}

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="หน้าถัดไป"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Post count summary */}
            <p className="text-center text-xs text-muted-foreground mt-4">
                แสดง {paginated.length} จาก {filtered.length} บทความ
                {query && ` (กรองจากทั้งหมด ${posts.length} บทความ)`}
            </p>
        </>
    );
}
