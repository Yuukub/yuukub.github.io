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

const SITE_URL = "https://yuukub.github.io";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
    template: "%s | Saranyuu M.",
  },
  description: "ผู้เชี่ยวชาญด้านความปลอดภัยระดับ Google Certified และ Full-stack Developer ที่ออกแบบระบบด้วยหลักความเป็นส่วนตัวและความมั่นคงปลอดภัย (Security-by-Design)",
  keywords: ["Systems Architect", "Cybersecurity Consultant", "WordPress Security", "Technical SEO", "Full-stack Developer", "AI Automation"],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
    description: "Engineering Security that Drives Business Growth",
    url: SITE_URL,
    siteName: "Saranyuu M.",
    type: "website",
    locale: "th_TH",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Saranyuu M. - Systems Architect & Cybersecurity Consultant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
    description: "Engineering Security that Drives Business Growth",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
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
