import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowRight, Hash, Lock, ImageIcon, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdUnit } from "@/components/ad-unit";

export const metadata: Metadata = {
    title: "Premium Tools for Security & Productivity รวมเครื่องมือและยูทิลิตี้",
    description: "รวมหลากหลายเครื่องมือด้านความปลอดภัยและยูทิลิตี้สำหรับนักพัฒนาและผู้ดูแลระบบ ใช้งานฟรีและปลอดภัย",
    alternates: { canonical: "https://yuukub.com/tools/" },
};

const TOOLS = [
    {
        title: "WordPress XML-RPC Checker",
        description: "ตรวจสอบช่องโหว่ XML-RPC บน WordPress ของคุณ พร้อมแนะนำวิธีป้องกันและเพิ่มความปลอดภัย",
        icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
        href: "/tools/xmlrpc-checker",
        tags: ["Security", "WordPress"],
        colorClass: "bg-emerald-500/10 text-emerald-500",
    },
    {
        title: "Hash Generator",
        description: "สร้างรหัส MD5 และ SHA-256 ภายในเครื่องของคุณ ใช้สำหรับรีเซ็ตรหัสผ่าน WordPress ผ่าน phpMyAdmin",
        icon: <Hash className="h-6 w-6 text-blue-500" />,
        href: "/tools/hash-generator",
        tags: ["Security", "DevOps"],
        colorClass: "bg-blue-500/10 text-blue-500",
    },
    {
        title: "Password Generator",
        description: "สร้างรหัสผ่านที่ปลอดภัยและคาดเดายาก (Secure Password) พร้อมระบบวัดความแข็งแรงในตัว",
        icon: <Lock className="h-6 w-6 text-purple-500" />,
        href: "/tools/password-generator",
        tags: ["Productivity", "Security"],
        colorClass: "bg-purple-500/10 text-purple-500",
    },
    {
        title: "Image Converter",
        description: "แปลงรูป JPG, PNG, WebP, AVIF ไปมาได้อย่างอิสระ รองรับหลายไฟล์ ประมวลผลในเครื่อง 100%",
        icon: <ImageIcon className="h-6 w-6 text-orange-500" />,
        href: "/tools/image-converter",
        tags: ["Media", "Productivity"],
        colorClass: "bg-orange-500/10 text-orange-500",
    },
    {
        title: "Live Web Previewer",
        description: "เขียนและทดสอบโค้ด HTML/CSS/JS หรือวางโค้ดจาก AI เพื่อดูตัวอย่างหน้าเว็บได้แบบเรียลไทม์ พร้อมโหมดเต็มจอ",
        icon: <MonitorPlay className="h-6 w-6 text-fuchsia-500" />,
        href: "/tools/web-previewer",
        tags: ["Developer", "Live Preview"],
        colorClass: "bg-fuchsia-500/10 text-fuchsia-500",
    },
];

export default function ToolsPage() {
    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-5xl">
                <section className="flex flex-col items-center text-center gap-6 mb-12 border-b border-border/10 pb-12">
                    <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary px-4 py-1">
                        Developer Tools & Utilities
                    </Badge>

                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
                        Premium Tools for<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-indigo-600">
                            Security & Productivity
                        </span>
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-2xl text-balance leading-relaxed">
                        รวมเครื่องมือสารพัดประโยชน์ที่ช่วยคุณตรวจสอบความปลอดภัยและเพิ่มประสิทธิภาพการทำงาน ใช้งานฟรี และให้ความสำคัญกับความเป็นส่วนตัวของคุณเป็นอันดับแรก (Privacy-First)
                    </p>
                </section>

                <AdUnit
                    slotId="2863984675"
                    format="auto"
                    responsive={true}
                    className="min-h-[150px] mb-12 bg-card/30 backdrop-blur-sm rounded-xl py-12 border border-border/50 shadow-sm"
                />

                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TOOLS.map((tool, index) => (
                        <Link key={tool.title} href={tool.href} className="group">
                            <Card className="h-full p-6 flex flex-col justify-between hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card border-border/50 backdrop-blur-sm">
                                <div>
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm ${tool.colorClass}`}>
                                        {tool.icon}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{tool.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                        {tool.description}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex gap-2">
                                        {tool.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0.5 pointer-events-none opacity-80 font-semibold tracking-wide uppercase">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors border border-transparent group-hover:border-primary/20">
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
