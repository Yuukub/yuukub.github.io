import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "WordPress XML-RPC Vulnerability Checker | ตรวจสอบช่องโหว่เว็บไซต์",
    description: "เครื่องมือตรวจสอบช่องโหว่ XML-RPC บน WordPress ของคุณ พร้อมคำแนะนำในการป้องกันการโจมตีแบบ Brute Force และ Pingback amplification",
    keywords: ["WordPress security check", "Fix XML-RPC vulnerability", "XML-RPC checker", "ตรวจสอบความปลอดภัย WordPress", "ช่องโหว่ XML-RPC"],
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
