import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, Hash, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
    title: "Tools | Saranyuu M.",
    description: "Collection of security and utility tools for developers and system administrators.",
};

const TOOLS = [
    {
        title: "WordPress XML-RPC Checker",
        description: "Check if your WordPress site is vulnerable to XML-RPC attacks and get advice on how to secure it.",
        icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
        href: "/tools/xmlrpc-checker",
        tags: ["Security", "WordPress"],
        colorClass: "bg-emerald-500/10 text-emerald-500",
    },
    {
        title: "Hash Generator",
        description: "Generate MD5 and SHA-256 hashes locally. Useful for WordPress password resets via phpMyAdmin.",
        icon: <Hash className="h-6 w-6 text-blue-500" />,
        href: "/tools/hash-generator",
        tags: ["Security", "DevOps"],
        colorClass: "bg-blue-500/10 text-blue-500",
    },
    {
        title: "Password Generator",
        description: "Create secure, cryptographically strong passwords with a built-in strength meter.",
        icon: <Lock className="h-6 w-6 text-purple-500" />,
        href: "/tools/password-generator",
        tags: ["Productivity", "Security"],
        colorClass: "bg-purple-500/10 text-purple-500",
    },
];

export default function ToolsPage() {
    return (
        <div className="min-h-screen selection:bg-primary/20">
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-5xl">
                <section className="flex flex-col items-center text-center gap-6 mb-20">
                    <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary px-4 py-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        Developer Tools & Utilities
                    </Badge>

                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        Premium Tools for<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-indigo-600">
                            Security & Productivity
                        </span>
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-2xl text-balance animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
                        Practical tools designed to help you verify security and optimize your workflow. Free to use, built with privacy in mind.
                    </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TOOLS.map((tool, index) => (
                        <Link key={tool.title} href={tool.href} className="group">
                            <Card className="h-full p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-muted/20 border-border/50">
                                <div>
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${tool.colorClass}`}>
                                        {tool.icon}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-bold">{tool.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {tool.description}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex gap-2">
                                        {tool.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0.5 pointer-events-none">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </section>
            </main>
        </div>
    );
}
