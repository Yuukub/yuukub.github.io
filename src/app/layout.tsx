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
        <link
          rel="preload"
          href="/fonts/google-sans-flex.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/google-sans.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
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
          id="adsense-lazy"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var adsLoaded = false;
                function loadAds() {
                  if (adsLoaded) return;
                  adsLoaded = true;
                  window.removeEventListener('scroll', loadAds);
                  window.removeEventListener('mousemove', loadAds);
                  window.removeEventListener('touchstart', loadAds);
                  
                  var script = document.createElement('script');
                  script.type = 'text/javascript';
                  script.async = true;
                  script.crossOrigin = 'anonymous';
                  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1635737019041674';
                  document.head.appendChild(script);
                }
                window.addEventListener('scroll', loadAds, { passive: true });
                window.addEventListener('mousemove', loadAds, { passive: true });
                window.addEventListener('touchstart', loadAds, { passive: true });
                setTimeout(loadAds, 6000); // fallback after 6 seconds
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
