import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveWebPreviewer } from "./live-previewer";

export const metadata: Metadata = {
    title: "Live Web Previewer - พรีวิวโค้ด HTML/CSS/JS แบบเรียลไทม์",
    description: "เครื่องมือทดสอบและพรีวิวโค้ด HTML, CSS, และ JavaScript บนเบราว์เซอร์ พร้อมหน้าต่างแสดงผลแบบเรียลไทม์ Privacy-First ไม่มีการส่งข้อมูลไปเซิร์ฟเวอร์",
    alternates: { canonical: "https://yuukub.com/tools/web-previewer/" },
};

export default function WebPreviewerPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>}>
            <LiveWebPreviewer />
        </Suspense>
    );
}

