import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { Shield, Lock, Eye, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
    title: "Privacy Policy - นโยบายความเป็นส่วนตัว",
    description: "นโยบายความเป็นส่วนตัวของ yuukub.com ข้อมูลเกี่ยวกับการทำงานของคุกกี้ AdSense และการประมวลผลข้อมูลแบบ Client-side",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            {/* Mesh Background */}
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Privacy Policy</h1>
                        <p className="text-muted-foreground">นโยบายความเป็นส่วนตัวและการจัดการข้อมูล</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <Eye className="h-6 w-6 text-primary" />
                                การเก็บและใช้ข้อมูล (Google AdSense)
                            </h2>
                            <p>
                                เว็บไซต์นี้มีการใช้งาน **Google AdSense** เพื่อแสดงโฆษณาแก่ผู้ที่เข้ามาเยี่ยมชม โดยมีข้อกำหนดที่ผู้ใช้ควรทราบดังนี้:
                            </p>
                            <ul>
                                <li>Google ในฐานะผู้ให้บริการบุคคลที่สาม มีการใช้คุกกี้ (Cookies) เพื่อแสดงโฆษณาบนหน้าเว็บไซต์นี้</li>
                                <li>Google ใช้ **DART cookie** เพื่อช่วยในการแสดงโฆษณาแก่ผู้ใช้ โดยอิงตามการเยี่ยมชมเว็บไซต์นี้และเว็บไซต์อื่นๆ บนอินเทอร์เน็ต</li>
                                <li>ผู้ใช้สามารถยกเลิกการใช้ DART cookie ได้โดยเข้าไปที่นโยบายความเป็นส่วนตัวของเครือข่ายโฆษณาและเนื้อหาของ Google</li>
                            </ul>
                        </section>

                        <section className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <Lock className="h-6 w-6 text-primary" />
                                ความเป็นส่วนตัวของข้อมูล (Client-side Processing)
                            </h2>
                            <p className="text-lg font-medium text-foreground mb-4">
                                "ความปลอดภัยของคุณคือภารกิจสูงสุดของเรา"
                            </p>
                            <p>
                                สำหรับเครื่องมือต่างๆ บนเว็บไซต์นี้ (เช่น Image Converter) เราใช้เทคโนโลยี **WebAssembly (WASM)** และ **JavaScript** ในการประมวลผลข้อมูล **บนบราวเซอร์ของผู้ใช้โดยตรง (Client-side)**:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li className="text-primary font-bold">ไม่มีการอัปโหลดรูปภาพหรือข้อมูลส่วนตัวของคุณขึ้นไปยัง Server ของเรา</li>
                                <li>การแปลงไฟล์ทั้งหมดเกิดขึ้นภายในเครื่องคอมพิวเตอร์หรืออุปกรณ์ของคุณเอง</li>
                                <li>ไม่มีการเก็บประวัติการแปลงไฟล์หรือสำเนาข้อมูลใดๆ ของผู้ใช้</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <ExternalLink className="h-6 w-6 text-primary" />
                                ลิงก์ไปยังเว็บไซต์ภายนอก (Third-party Links)
                            </h2>
                            <p>
                                เว็บไซต์ของเราอาจมีลิงก์ไปยังเว็บไซต์อื่นๆ ที่ไม่ได้ดำเนินการโดยเรา หากคุณคลิกที่ลิงก์ของบุคคลที่สาม คุณจะถูกนำไปยังเว็บไซต์ของบุคคลที่สามนั้น
                                เราขอแนะนำให้คุณตรวจสอบนโยบายความเป็นส่วนตัวของทุกเว็บไซต์ที่คุณเยี่ยมชม
                            </p>
                            <p>
                                เราไม่มีอำนาจควบคุมและไม่รับผิดชอบต่อเนื้อหา นโยบายความเป็นส่วนตัว หรือแนวทางปฏิบัติของเว็บไซต์หรือบริการของบุคคลที่สามใดๆ
                            </p>
                        </section>
                    </div>

                    <Separator className="my-12 opacity-50" />

                    <footer className="text-center text-sm text-muted-foreground">
                        <p>อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </footer>
                </article>
            </main>
        </div>
    );
}
