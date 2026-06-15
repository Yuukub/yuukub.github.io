import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Separator } from "@/components/ui/separator";
import { FileText, Scale, ShieldAlert, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
    title: "Terms & Conditions - ข้อกำหนดและเงื่อนไข",
    description: "ข้อกำหนดและเงื่อนไขการใช้งานเว็บไซต์ yuukub.com ข้อมูลเกี่ยวกับการใช้งานเครื่องมือและลิขสิทธิ์เนื้อหา",
    alternates: { canonical: "https://yuukub.com/terms/" },
};

export default function TermsPage() {
    return (
        <div className="min-h-screen selection:bg-primary/20 relative">
            <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />
            <Navbar />

            <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl">
                <article className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-12 shadow-sm">
                    <header className="mb-12 text-center">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6">
                            <Scale className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Terms & Conditions</h1>
                        <p className="text-muted-foreground">ข้อกำหนดและเงื่อนไขการใช้งานเว็บไซต์</p>
                    </header>

                    <Separator className="mb-12 opacity-50" />

                    <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <FileText className="h-6 w-6 text-primary" />
                                1. การตอบรับข้อกำหนด
                            </h2>
                            <p>
                                การเข้าถึงและการใช้งานเว็บไซต์ <strong>yuukub.com</strong> (&quot;เรา&quot;, &quot;เว็บไซต์&quot;) หมายถึงคุณยอมรับที่จะผูกพันตามข้อกำหนดและเงื่อนไขเหล่านี้ 
                                หากคุณไม่เห็นด้วยกับข้อกำหนดใดๆ โปรดระงับการใช้งานเว็บไซต์นี้ทันที
                            </p>
                        </section>

                        <section>
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <ShieldAlert className="h-6 w-6 text-primary" />
                                2. การใช้งานเครื่องมือ (Tools)
                            </h2>
                            <p>
                                เครื่องมือทั้งหมดบนเว็บไซต์นี้ได้รับการออกแบบมาเพื่ออำนวยความสะดวกในการทำงานทางเทคนิค โดยเน้นการประมวลผลแบบ Client-side:
                            </p>
                            <ul>
                                <li>เราไม่รับประกันความถูกต้อง 100% หรือความเสถียรของเครื่องมือในทุกสภาพแวดล้อม</li>
                                <li>ผู้ใช้ควรทำการสำรองข้อมูลก่อนเริ่มใช้งานเครื่องมือที่เกี่ยวข้องกับการแก้ไขไฟล์</li>
                                <li>เราไม่รับผิดชอบต่อความเสียหายใดๆ ที่อาจเกิดขึ้นจากการใช้เครื่องมือบนเว็บไซต์นี้</li>
                            </ul>
                        </section>

                        <section className="bg-primary/5 rounded-2xl p-8 border border-primary/10">
                            <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground mb-6">
                                <CheckCircle className="h-6 w-6 text-primary" />
                                3. ลิขสิทธิ์และทรัพย์สินทางปัญญา
                            </h2>
                            <p>
                                เนื้อหา บทความ และโค้ดตัวอย่างที่เผยแพร่บนเว็บไซต์นี้เป็นทรัพย์สินทางปัญญาของ yuukub.com ยกเว้นระบุไว้เป็นอย่างอื่น:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>อนุญาต:</strong> ให้แชร์ลิงก์หรืออ้างอิงเนื้อหาโดยระบุแหล่งที่มา (Backlink) อย่างชัดเจน</li>
                                <li><strong>ไม่อนุญาต:</strong> ให้คัดลอกเนื้อหาทั้งหมดหรือส่วนใหญ่ไปเผยแพร่ใหม่เพื่อแสวงหาผลประโยชน์ทางการค้าโดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-foreground mb-6">4. การแก้ไขเปลี่ยนแปลง</h2>
                            <p>
                                เราขอสงวนสิทธิ์ในการแก้ไขหรือเปลี่ยนข้อกำหนดเหล่านี้ได้ทุกเมื่อ การเปลี่ยนแปลงจะมีผลทันทีที่โพสต์ลงบนหน้าเว็บนี้ 
                                โปรดตรวจสอบหน้านี้เป็นระยะเพื่อติดตามการเปลี่ยนแปลง
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
