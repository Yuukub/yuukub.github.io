import type { Metadata } from "next";
import { Geist, Geist_Mono, Google_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const googleSans = Google_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-google-sans",
});

export const metadata: Metadata = {
  title: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
  description: "ผู้เชี่ยวชาญด้านความปลอดภัยระดับ Google Certified และ Full-stack Developer ที่ออกแบบระบบด้วยหลักความเป็นส่วนตัวและความมั่นคงปลอดภัย (Security-by-Design)",
  keywords: ["Systems Architect", "Cybersecurity Consultant", "WordPress Security", "Technical SEO", "Full-stack Developer", "AI Automation"],
  openGraph: {
    title: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
    description: "Engineering Security that Drives Business Growth",
    type: "website",
    locale: "th_TH",
  },
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" />
      </head>
      <body
        className={`${googleSans.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
