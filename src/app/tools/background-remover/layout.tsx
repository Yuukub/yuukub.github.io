import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลบพื้นหลังรูปออนไลน์ฟรี - AI Background Remover PNG/WebP",
    description: "ลบพื้นหลังรูป JPG, PNG และ WebP เป็น PNG หรือ WebP โปร่งใสเต็มความละเอียด ใช้ WebGPU ในเครื่องเป็นหลัก พร้อม Cloudflare fallback ที่ยืนยันด้วย Turnstile เมื่อจำเป็น",
    keywords: [
        "ลบพื้นหลังรูป",
        "ลบพื้นหลังออนไลน์",
        "remove background online",
        "AI background remover",
        "background remover free",
        "PNG โปร่งใส",
        "WebP โปร่งใส",
        "ตัดพื้นหลัง",
        "ลบฉากหลัง",
        "ลบพื้นหลังสินค้า",
        "WebGPU AI",
        "Cloudflare Turnstile",
    ],
    alternates: {
        canonical: "https://yuukub.com/tools/background-remover/",
    },
    openGraph: {
        title: "ลบพื้นหลังรูปออนไลน์ฟรี - AI Background Remover PNG/WebP",
        description: "แยกวัตถุออกจากพื้นหลังด้วย AI แบบ local-first ส่งออก PNG/WebP โปร่งใส และมี Cloudflare fallback พร้อม Turnstile เมื่อ WebGPU ใช้ไม่ได้",
        url: "https://yuukub.com/tools/background-remover/",
        siteName: "Saranyuu M.",
        type: "website",
        locale: "th_TH",
    },
    twitter: {
        card: "summary",
        title: "ลบพื้นหลังรูปออนไลน์ฟรี - AI Background Remover PNG/WebP",
        description: "ลบพื้นหลัง JPG, PNG, WebP เป็นไฟล์โปร่งใสเต็มความละเอียด ใช้ WebGPU ในเครื่องเป็นหลัก พร้อม Cloudflare fallback เมื่อจำเป็น",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function BackgroundRemoverLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
