"use client"

import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export function Navbar() {
    return (
        <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4 pointer-events-none">
            <div className="glass rounded-full px-6 py-2 flex items-center justify-between pointer-events-auto border border-white/10 shadow-xl group/nav">
                <Link href="/" className="font-bold text-lg tracking-tight">
                    Saranyuu<span className="text-primary">.M</span>
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/#work" className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                        Work
                    </Link>
                    <Link href="/tools/" className="text-muted-foreground hover:text-foreground transition-colors">
                        Tools
                    </Link>
                    <Link href="/blog/" className="text-muted-foreground hover:text-foreground transition-colors">
                        Blog
                    </Link>
                    <div className="flex items-center gap-3 pl-2 border-l border-border/50">
                        <ModeToggle />
                        <Link href="/contact/">
                            <Button size="sm" className="rounded-full px-5 hidden sm:flex">Contact</Button>
                        </Link>
                    </div>
                </nav>
            </div>
        </header>
    );
}
