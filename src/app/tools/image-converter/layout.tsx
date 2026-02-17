import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Batch WebP & AVIF Converter | เครื่องมือแปลงรูปภาพความเร็วสูง",
    description: "แปลงรูปภาพเป็น WebP และ AVIF พร้อมกันหลายไฟล์ด้วยความเร็วสูง ประมวลผลในเครื่อง 100% ปลอดภัยและรักษาสภาพแวดล้อมความเป็นส่วนตัวของคุณ",
    keywords: ["WebP converter", "Convert to WebP", "AVIF to WebP", "Batch image processor", "แปลงไฟล์ WebP", "แปลงรูปภาพออนไลน์"],
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
