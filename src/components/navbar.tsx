"use client"

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";

export function Navbar() {
    const t = useTranslations("Nav");
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();

    const toggleLanguage = () => {
        const nextLocale = locale === 'th' ? 'en' : 'th';
        router.replace(pathname, { locale: nextLocale });
    };

    return (
        <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4 pointer-events-none">
            <div className="glass rounded-full px-6 py-2 flex items-center justify-between pointer-events-auto border border-white/10 shadow-xl group/nav">
                <Link href="/" className="font-bold text-lg tracking-tight">
                    Saranyuu<span className="text-primary">.M</span>
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/#work" className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                        {t('work')}
                    </Link>
                    <Link href="/tools/" className="text-muted-foreground hover:text-foreground transition-colors">
                        {t('tools')}
                    </Link>
                    <Link href="/blog/" className="text-muted-foreground hover:text-foreground transition-colors">
                        {t('blog')}
                    </Link>
                    <div className="flex items-center gap-3 pl-2 border-l border-border/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleLanguage}
                            className="h-9 w-9 rounded-full text-xs font-bold hover:bg-muted pointer-events-auto cursor-pointer"
                            aria-label={locale === 'th' ? 'Switch to English' : 'สลับเป็นภาษาไทย'}
                        >
                            {locale === 'th' ? 'EN' : 'TH'}
                        </Button>
                        <ModeToggle />
                        <Link href="/contact/" aria-label="Contact">
                            <Button size="sm" className="rounded-full px-5 hidden sm:flex">{t('contact')}</Button>
                        </Link>
                    </div>
                </nav>
            </div>
        </header>
    );
}
