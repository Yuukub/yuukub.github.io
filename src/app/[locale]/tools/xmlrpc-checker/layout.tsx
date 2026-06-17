import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "WordPress XML-RPC Checker - ตรวจช่องโหว่ xmlrpc",
    description: "ตรวจสอบว่าเว็บ WordPress ของคุณเปิด xmlrpc.php อยู่ไหม พร้อมวิธีปิดและป้องกันการโจมตี Brute Force, DDoS และ Pingback Amplification แบบ step-by-step",
    keywords: ["XML-RPC checker", "WordPress security", "ปิด xmlrpc.php", "ตรวจสอบช่องโหว่ WordPress", "Brute Force WordPress", "WordPress hardening", "xmlrpc vulnerability"],
    alternates: {
        canonical: "https://yuukub.com/tools/xmlrpc-checker/",
    },
};

export default function XmlRpcCheckerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
