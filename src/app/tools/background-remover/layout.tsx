import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลบพื้นหลังรูปออนไลน์ฟรี - AI Background Remover แบบไม่อัปโหลดไฟล์",
    description: "ลบพื้นหลังรูปภาพ JPG, PNG และ WebP ด้วย AI ในเบราว์เซอร์ของคุณ รองรับ PNG โปร่งใสเต็มความละเอียด ใช้ WebGPU และไม่ส่งรูปไปยังเซิร์ฟเวอร์",
    keywords: ["ลบพื้นหลังรูป", "remove background online", "AI background remover", "PNG โปร่งใส", "ตัดพื้นหลัง", "ลบฉากหลัง", "WebGPU AI"],
    alternates: {
        canonical: "https://yuukub.com/tools/background-remover/",
    },
};

export default function BackgroundRemoverLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
