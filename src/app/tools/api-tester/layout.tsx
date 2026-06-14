import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "API Tester ออนไลน์ - ทดสอบ REST API GET/POST",
    description: "ทดสอบยิง REST API ได้ทันทีโดยไม่ต้องติดตั้ง Postman รองรับ Import cURL, fetch, Axios, Python requests, Go net/http พร้อม response viewer และประวัติการยิง",
    keywords: ["API Tester", "REST API tester", "ทดสอบ API ออนไลน์", "cURL import", "Postman alternative", "API debugging", "HTTP client online", "ทดสอบ REST API"],
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
