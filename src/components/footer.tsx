import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations("Footer");
    return (
        <footer className="border-t py-12 px-4 bg-background/95 backdrop-blur-sm relative z-20">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
                <div className="flex flex-col items-center md:items-start">
                    <h4 className="font-bold text-lg mb-2 underline decoration-primary/30 underline-offset-4">Saranyuu M.</h4>
                    <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} {t('rights')}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 mt-4 text-xs font-medium">
                        <Link href="/about/" className="text-muted-foreground hover:text-primary transition-colors">{t('about')}</Link>
                        <Link href="/privacy-policy/" className="text-muted-foreground hover:text-primary transition-colors">{t('privacy')}</Link>
                        <Link href="/terms/" className="text-muted-foreground hover:text-primary transition-colors">{t('terms')}</Link>
                        <Link href="/contact/" className="text-muted-foreground hover:text-primary transition-colors">{t('contact')}</Link>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground max-w-xs md:text-right border-l-0 md:border-r border-border/50 md:pr-4 whitespace-pre-line">
                    {t('tagline')}
                </p>
            </div>
        </footer>
    );
}
