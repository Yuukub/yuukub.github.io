import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "PDF Tools ออนไลน์ฟรี — รวม แยก จัดระเบียบ และแปลง PDF เป็น JPG",
    description: "รวม PDF หลายไฟล์, แยกหน้า PDF, จัดระเบียบหน้า PDF ด้วยการลากวาง และแปลง PDF เป็นรูปภาพ JPG ฟรี ประมวลผลในเครื่อง 100% ไม่อัปโหลดไปที่ใด",
    keywords: ["PDF merger", "PDF splitter", "PDF to JPG", "PDF organizer", "รวม PDF", "แยก PDF", "จัดระเบียบ PDF", "จัดเรียงหน้า PDF", "แปลง PDF เป็นรูป", "PDF tools ออนไลน์"],
    alternates: {
        canonical: "https://yuukub.com/tools/pdf-tools/",
    },
};

export default function PdfToolsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
