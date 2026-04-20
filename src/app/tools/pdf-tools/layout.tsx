import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "PDF Tools ออนไลน์ฟรี — รวม แยก และแปลง PDF เป็น JPG",
    description: "รวม PDF หลายไฟล์ตามลำดับ, แยกหน้า PDF เป็นไฟล์ย่อย, แปลง PDF เป็นรูปภาพ JPG ฟรี ประมวลผลในเครื่อง 100% ไม่อัปโหลดไปที่ใด",
    keywords: ["PDF merger", "PDF splitter", "PDF to JPG", "รวม PDF", "แยก PDF", "แปลง PDF เป็นรูป", "PDF tools ออนไลน์"],
    alternates: {
        canonical: "https://yuukub.com/tools/pdf-tools/",
    },
};

export default function PdfToolsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
