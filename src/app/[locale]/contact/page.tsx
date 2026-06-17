import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageSquare, Globe, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
    title: "Contact Us - ติดต่อเรา",
    description: "ช่องทางการติดต่อ yuukub.com สำหรับสอบถามข้อมูล แจ้งปัญหาการใช้งาน หรือข้อเสนอแนะต่างๆ",
    alternates: { canonical: "https://yuukub.com/contact/" },
};

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const contactEmail = "yuukun.eutopia@gmail.com";

    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <MessageSquare className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Contact Us</h1>
                        <p className="text-muted-foreground">ช่องทางการติดต่อและสอบถามข้อมูล</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="p-8 rounded-2xl border border-border bg-card/30 flex flex-col items-center text-center group hover:border-primary/50 transition-colors">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Mail className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Email Contact</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                สำหรับการสอบถามข้อมูลทั่วไป แจ้งปัญหาเทคนิค หรือติดต่องานที่ปรึกษา
                            </p>
                            <a href={`mailto:${contactEmail}`} className="w-full">
                                <Button className="w-full rounded-xl gap-2">
                                    <Send className="h-4 w-4" /> ส่งอีเมลหาเรา
                                </Button>
                            </a>
                            <p className="mt-4 text-xs font-medium text-primary">{contactEmail}</p>
                        </div>

                        <div className="p-8 rounded-2xl border border-border bg-card/30 flex flex-col items-center text-center group hover:border-primary/50 transition-colors">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Globe className="h-7 w-7 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Social Hub</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                ติดตามอัปเดตและผลงานล่าสุดผ่านช่องทางโซเชียลมีเดียของเรา
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center">
                                <a href="https://github.com/Yuukub" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="rounded-full">GitHub</Button>
                                </a>
                                <a href="https://linkedin.com/in/saranyoo-m" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="rounded-full">LinkedIn</Button>
                                </a>
                                <a href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="rounded-full bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors text-primary font-bold">Fastwork</Button>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                        <h2 className="text-2xl font-bold mb-4">เวลาทำการ</h2>
                        <p className="text-muted-foreground">
                            คุณสามารถติดต่อเราได้ตลอด 24 ชั่วโมงผ่านทางอีเมล โดยปกติเราจะพยายามตอบกลับภายใน 1-2 วันทำการ
                        </p>
                        
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 mt-8">
                            <h3 className="text-lg font-bold text-primary mb-2 italic">Note:</h3>
                            <p className="text-sm text-muted-foreground m-0">
                                เว็บไซต์ yuukub.com ให้ความสำคัญกับการประมวลผลข้อมูลแบบ Client-side เพื่อความเป็นส่วนตัวสูงสุด 
                                หากพบปัญหาการใช้งานเครื่องมือ (Tools) กรุณาระบุรายละเอียดเบราว์เซอร์และอุปกรณ์ที่ใช้งานเพื่อให้เราตรวจสอบได้แม่นยำขึ้น
                            </p>
                        </div>
                    </div>
                </article>
            </main>
        </div>
    );
}
