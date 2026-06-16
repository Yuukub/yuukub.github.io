import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



const SITE_URL = "https://yuukub.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
    template: "%s | Saranyuu M.",
  },
  description: "ผู้เชี่ยวชาญด้านความปลอดภัย Google Certified และ Full-stack Developer ที่ออกแบบระบบด้วยหลักความเป็นส่วนตัวและความปลอดภัย (Security-by-Design)",
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
import { ParticlesBackground } from "@/components/particles-background";
import { Footer } from "@/components/footer";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  name: "Saranyuu M.",
                  url: "https://yuukub.com/",
                },
                {
                  "@type": "Person",
                  name: "Saranyuu Meekumlang",
                  url: "https://yuukub.com/",
                  jobTitle: "Systems Architect & Cybersecurity Consultant",
                  sameAs: [
                    "https://github.com/Yuukub",
                    "https://www.linkedin.com/in/saranyoo-m",
                    "https://facebook.com/saranyou.meekumlang",
                  ],
                },
              ],
            }),
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ParticlesBackground />
          <div className="relative z-10 min-h-screen flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            <Footer />
          </div>
        </ThemeProvider>
        <Script
          id="adsbygoogle-init"
          strategy="lazyOnload"
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1635737019041674`}
        />
      </body>
    </html>
  );
}
