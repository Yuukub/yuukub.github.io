import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Secure Password Generator | เครื่องมือสร้างรหัสผ่านที่ปลอดภัย",
    description: "สร้างรหัสผ่านที่แข็งแรงและคาดเดายากภายในเครื่องของคุณเอง ไม่มีการส่งข้อมูลผ่านอินเทอร์เน็ต มั่นใจในความปลอดภัยระดับสูงสุด",
    keywords: ["Secure Password Generator", "เครื่องมือสร้างรหัสผ่าน", "Random password maker", "ความปลอดภัยของรหัสผ่าน"],
    alternates: {
        canonical: "https://yuukub.com/tools/password-generator/",
    },
};

export default function PasswordGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
