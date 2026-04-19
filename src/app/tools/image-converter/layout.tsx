import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Image Converter ออนไลน์ฟรี — แปลง JPG PNG WebP AVIF ในเครื่อง 100%",
    description: "แปลงรูปภาพออนไลน์ฟรี รองรับ JPG, PNG, WebP, AVIF ไม่ต้องติดตั้งโปรแกรม ประมวลผลด้วย WebAssembly ในเครื่องของคุณ ข้อมูลไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ใดๆ",
    keywords: ["Image Converter", "แปลงรูป", "JPG to PNG", "WebP converter", "AVIF converter", "แปลงรูปฟรี", "image converter ออนไลน์"],
    alternates: {
        canonical: "https://yuukub.com/tools/image-converter/",
    },
};

export default function ImageConverterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
