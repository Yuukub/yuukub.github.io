import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
  description: "ผู้เชี่ยวชาญด้านความปลอดภัยระดับ Google Certified และ Full-stack Developer ออกแบบระบบด้วยหลัก Security-by-Design เพื่อการเติบโตทางธุรกิจที่มั่นคง",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
