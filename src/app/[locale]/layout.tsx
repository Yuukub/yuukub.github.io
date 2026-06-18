import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://yuukub.com";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('title'),
      template: "%s | Saranyuu M.",
    },
    description: t('description'),
    keywords: ["Systems Architect", "Cybersecurity Consultant", "WordPress Security", "Technical SEO", "Full-stack Developer", "AI Automation"],
    alternates: {
      canonical: `${SITE_URL}/${locale}/`,
      languages: {
        th: `${SITE_URL}/th/`,
        en: `${SITE_URL}/en/`,
        "x-default": `${SITE_URL}/th/`,
      },
    },
    openGraph: {
      title: t('title'),
      description: "Engineering Security that Drives Business Growth",
      url: SITE_URL,
      siteName: "Saranyuu M.",
      type: "website",
      locale: locale === "th" ? "th_TH" : "en_US",
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
      title: t('title'),
      description: "Engineering Security that Drives Business Growth",
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

import { ThemeProvider } from "@/components/theme-provider";
import { ParticlesBackground } from "@/components/particles-background";
import { Footer } from "@/components/footer";
import Script from "next/script";

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
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
        <NextIntlClientProvider messages={messages}>
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
        </NextIntlClientProvider>
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
