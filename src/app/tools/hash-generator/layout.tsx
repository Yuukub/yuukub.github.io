import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "WP Hash Generator (MD5/SHA-256) | รีเซ็ตรหัสผ่าน WordPress",
    description: "สร้างรหัส Hash สำหรับรหัสผ่าน WordPress เพื่อนำไปใช้ใน phpMyAdmin รองรับทั้ง MD5 และ SHA-256 ใช้งานง่ายและปลอดภัย",
    keywords: ["WP password reset phpMyAdmin", "WordPress hash generator", "MD5 generator", "SHA-256 generator", "วิธีรีเซ็ตรหัสผ่าน WordPress"],
    alternates: {
        canonical: "https://yuukub.com/tools/hash-generator/",
    },
};

export default function HashGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
