import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "API Tester | ทดสอบยิง REST API ได้ทันทีจากเบราว์เซอร์",
    description: "เครื่องมือทดสอบ REST API แบบ GET/POST/PUT/DELETE/PATCH พร้อมระบบ Import โค้ด cURL, fetch, Axios, Python requests อัตโนมัติ ใช้งานฟรี",
    keywords: ["API Tester", "REST API", "cURL import", "API debugging tool", "ทดสอบ API ออนไลน์"],
    alternates: {
        canonical: "https://yuukub.com/tools/api-tester/",
    },
};

export default function ApiTesterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
