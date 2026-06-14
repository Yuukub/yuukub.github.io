import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { User, Terminal, ShieldCheck, Heart } from "lucide-react";

export const metadata: Metadata = {
    title: "About Us - เกี่ยวกับเรา",
    description: "เรียนรู้เพิ่มเติมเกี่ยวกับเป้าหมายและพันธกิจของ yuukub.com คลังความรู้และเครื่องมือสำหรับนักพัฒนา",
};

export default function AboutPage() {
    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <Heart className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">About Us</h1>
                        <p className="text-muted-foreground">จุดเริ่มต้นและความตั้งใจของ yuukub.com</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
                        <section className="text-center md:text-left">
                            <h2 className="text-3xl font-bold text-foreground mb-6">ภารกิจของเรา</h2>
                            <p className="text-lg leading-relaxed text-muted-foreground">
                                <strong>yuukub.com</strong> ถูกสร้างขึ้นเพื่อเป็นศูนย์รวมของความรู้และเครื่องมือทางเทคนิคที่ใช้งานได้จริง
                                เราเชื่อในพลังของการแบ่งปันข้อมูลที่ &quot;เจาะลึก&quot; และเครื่องมือที่ &quot;ปลอดภัย&quot;
                            </p>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="p-6 rounded-2xl border border-border bg-card/30">
                                <Terminal className="h-10 w-10 text-primary mb-4" />
                                <h3 className="text-xl font-bold mb-2">Developer Tools</h3>
                                <p className="text-muted-foreground text-sm">
                                    เราพัฒนาเครื่องมือที่ช่วยลดขั้นตอนการทำงานที่ซับซ้อน เช่น การแปลงไฟล์ภาพระดับโปร
                                    หรือการสแกนความปลอดภัย โดยเน้นความเร็วและ Privacy-First เป็นอันดับหนึ่ง
                                </p>
                            </div>
                            <div className="p-6 rounded-2xl border border-border bg-card/30">
                                <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                                <h3 className="text-xl font-bold mb-2">Security Insights</h3>
                                <p className="text-muted-foreground text-sm">
                                    ถอดบทเรียนจากประสบการณ์จริงในสายงานด้าน Cybersecurity เพื่อให้ผู้อ่านเท่าทันภัยคุกคามในโลกดิจิทัล
                                    ตั้งแต่การดูแล WordPress ไปจนถึงการเขียนโค้ดที่ปลอดภัย (Secure Coding)
                                </p>
                            </div>
                        </div>

                        <section className="flex flex-col md:flex-row items-center gap-10 py-8">
                            <div className="shrink-0">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center p-1">
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                                        <User className="w-16 h-16 text-primary" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Developer Behind the Site</h2>
                                <p className="text-muted-foreground">
                                    ผมเป็นนักพัฒนาที่หลงใหลในเรื่อง Security และ Performance Optimization
                                    เว็บนี้เป็นพื้นที่ที่ผมใช้จัดเก็บและเผยแพร่ผลงานที่ผมคิดว่าจะมีประโยชน์ต่อสังคม Developer ชาวไทย
                                </p>
                            </div>
                        </section>
                    </div>

                    <footer className="text-center font-bold text-primary italic">
                        &quot;Empowering Developers with Secure and Efficient Tools&quot;
                    </footer>
                </article>
            </main>
        </div>
    );
}
