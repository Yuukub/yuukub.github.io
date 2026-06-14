import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "PDF Tools ออนไลน์ - รวม แยก แปลงไฟล์ PDF",
    description: "รวม PDF หลายไฟล์, แยกหน้า PDF, จัดระเบียบหน้า PDF ด้วยการลากวาง, ลดขนาดไฟล์ PDF ให้เล็กลง และแปลง PDF เป็นรูปภาพ JPG ฟรี ประมวลผลในเครื่อง 100% ไม่อัปโหลดไปที่ใด",
    keywords: ["PDF merger", "PDF splitter", "PDF to JPG", "PDF organizer", "PDF compressor", "รวม PDF", "แยก PDF", "จัดระเบียบ PDF", "จัดเรียงหน้า PDF", "ลดขนาด PDF", "บีบอัด PDF", "ย่อขนาด PDF", "compress PDF online", "แปลง PDF เป็นรูป", "PDF tools ออนไลน์"],
    alternates: {
        canonical: "https://yuukub.com/tools/pdf-tools/",
    },
};

export default function PdfToolsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
