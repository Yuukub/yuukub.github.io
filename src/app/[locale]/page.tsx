import { Link } from "@/i18n/routing";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `https://yuukub.com/${locale}/`,
      languages: {
        th: "https://yuukub.com/th/",
        en: "https://yuukub.com/en/",
        "x-default": "https://yuukub.com/th/",
      },
    },
  };
}
import { AdUnit } from "@/components/ad-unit";
import {
  Rocket,
  ShieldCheck,
  Code2,
  Smartphone,
  BotMessageSquare,
  Mail,
  Github,
  Linkedin,
  Facebook,
  TrendingUp,
  Layers,
  Zap,
  Award,
  ArrowRight,
  ChartBar,
  ExternalLink,
  Cpu
} from "lucide-react";

const PROJECTS = [
  {
    key: "ads",
    tags: ["Next.js", "Prisma", "MySQL"],
    typeKey: "webapp",
    link: "https://ads-budget-tracking.vercel.app",
    icon: <ChartBar className="h-4 w-4" />,
    color: "blue",
    featured: true
  },
  {
    key: "nfc",
    tags: ["Android", "Kotlin", "NFC"],
    typeKey: "android",
    link: "https://github.com/Yuukub",
    icon: <Smartphone className="h-4 w-4" />,
    color: "emerald",
    featured: false
  },
  {
    key: "line",
    tags: ["Node.js", "LINE API", "Automation"],
    typeKey: "automation",
    link: "https://github.com/Yuukub",
    icon: <Zap className="h-4 w-4" />,
    color: "amber",
    featured: false
  }
];

const getProjectColorClass = (color: string) => {
  switch (color) {
    case "blue": return "bg-blue-500/10 text-blue-500 group-hover/row:bg-blue-500 group-hover/row:text-white";
    case "emerald": return "bg-emerald-500/10 text-emerald-500 group-hover/row:bg-emerald-500 group-hover/row:text-white";
    case "amber": return "bg-amber-500/10 text-amber-500 group-hover/row:bg-amber-500 group-hover/row:text-white";
    default: return "bg-primary/10 text-primary group-hover/row:bg-primary group-hover/row:text-white";
  }
};



export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHero = await getTranslations("Hero");
  const tAbout = await getTranslations("About");
  const tProjects = await getTranslations("Projects");
  const tHomeExtra = await getTranslations("HomeExtra");

  return (
    <div className="min-h-screen selection:bg-primary/20">

      {/* Mesh Background */}
      <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

      {/* Navigation */}
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-24 max-w-5xl">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-6 mb-32">
          <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/5 text-emerald-600 px-4 py-1 md:animate-in md:fade-in md:slide-in-from-bottom-2 md:duration-700">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {tHero('badge')}
          </Badge>

          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-8 md:animate-in md:fade-in md:slide-in-from-bottom-4 md:duration-700 md:delay-100 leading-[1.1]">
            {tHero('title1')}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-indigo-600">{tHero('title2')}</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl text-balance leading-relaxed md:animate-in md:fade-in md:slide-in-from-bottom-3 md:duration-700 md:delay-150">
            {tHero('description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 translate-y-2 md:animate-in md:fade-in md:slide-in-from-bottom-2 md:duration-700 md:delay-200">
            <Link href="/contact/">
              <Button size="lg" className="rounded-full h-12 px-8 gap-2 premium-glow animate-pulse-glow">
                {tHero('btnContact')} <Mail className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#work">
              <Button size="lg" variant="ghost" className="rounded-full h-12 px-8 gap-2">
                {tHero('btnExplore')} <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>


        {/* Bento Grid: About, Services, & Stats */}
        <section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:auto-rows-[160px]">
            {/* About Me */}
            <Card className="md:col-span-8 md:row-span-2 p-8 flex flex-col justify-between group overflow-hidden relative animate-in fade-in slide-in-from-bottom-3 duration-600 delay-100 hover-lift transform-gpu">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4">{tAbout('title')}</h3>
                <p className="text-muted-foreground leading-relaxed md:w-3/4">
                  {tAbout('description')}
                </p>
              </div>
               <div className="flex gap-4 relative z-10 mt-6">
                <a href="https://github.com/Yuukub" className="hover:text-primary transition-colors" aria-label="GitHub Profile"><Github className="h-5 w-5" /></a>
                <a href="https://www.linkedin.com/in/saranyoo-m" className="hover:text-primary transition-colors" aria-label="LinkedIn Profile"><Linkedin className="h-5 w-5" /></a>
                <a href="https://facebook.com/saranyou.meekumlang" className="hover:text-primary transition-colors" aria-label="Facebook Profile"><Facebook className="h-5 w-5" /></a>
              </div>
              {/* Abstract decorative element */}
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            </Card>

            {/* Google Certs */}
            <Card className="md:col-span-4 md:row-span-2 p-8 flex flex-col justify-center bg-primary text-primary-foreground premium-glow border-none animate-in fade-in slide-in-from-right-4 duration-600 delay-150">
              <Award className="h-10 w-10 mb-6 opacity-80" />
              <h3 className="text-xl font-bold mb-4">{tAbout('certTitle')}</h3>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span className="text-sm font-medium">Technical Support Fundamentals</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span className="text-sm font-medium">Google IT Support</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  <span className="text-sm font-medium">Google Cybersecurity</span>
                </li>
              </ul>
            </Card>

            {/* Project Hub: A Single Scalable Box for All Work */}
            <Card id="work" className="md:col-span-8 md:row-span-6 overflow-hidden border-border/40 group flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-600 delay-200 hover-lift transform-gpu">
              <div className="p-6 sm:p-8 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary shrink-0" /> {tProjects('hubTitle')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{tProjects('hubDesc')}</p>
                </div>
                <Link href="https://github.com/Yuukub" className="shrink-0">
                  <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs">
                    <span className="hidden sm:inline">{tProjects('explore')}</span> GitHub <Github className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="flex-grow overflow-auto max-h-[400px] scrollbar-hide">
                <div className="divide-y divide-border/40">
                  {PROJECTS.map((project) => (
                    <div
                      key={project.key}
                      className="group/row hover:bg-muted/30 p-6 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 relative"
                    >
                      <div className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl transition-colors shadow-sm ${getProjectColorClass(project.color || "")}`}>
                        {project.icon}
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm truncate">{tProjects(`items.${project.key}.title`)}</h4>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-tighter py-0 h-4 border-primary/30 text-primary bg-primary/5 font-semibold">
                            {tProjects(`types.${project.typeKey}`)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {tProjects(`items.${project.key}.description`)}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {project.tags.map(tag => (
                            <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center gap-2">
                        {project.link && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title={tProjects('visitSite')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {project.link?.includes("github.com") && (
                          <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title={tProjects('viewCode')}
                          >
                            <Github className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-muted/10 border-t border-border/40 text-[10px] text-center text-muted-foreground italic">
                {tHomeExtra('scrollUpdate')}
              </div>
            </Card>

            {/* Core Tech & Vibe Coding */}
            <Card className="md:col-span-4 md:row-span-3 p-8 flex flex-col animate-in fade-in slide-in-from-right-4 duration-600 delay-250 hover-lift transform-gpu">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" /> Vibe Coding & Stack
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {["WordPress", "Next.js", "React", "Prisma", "TypeScript", "Node.js", "MySQL", "Tailwind"].map((tech) => (
                  <Badge key={tech} variant="secondary" className="bg-muted px-3 py-1 text-[11px] uppercase tracking-wide border-border/50">{tech}</Badge>
                ))}
              </div>
              <div className="mt-auto pt-6 border-t border-border/50">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BotMessageSquare className="h-4 w-4 text-primary" /> AI-Native Development
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tHomeExtra('vibeCoding')}
                </p>
              </div>
            </Card>

            {/* Stats / Interest - Redesigned as Personal Insight */}
            <Link href="https://github.com/yuukub" target="_blank" rel="noopener noreferrer" className="md:col-span-4 md:row-span-1">
              <Card className="p-6 h-full flex items-center justify-between group cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors border-primary/10 animate-in fade-in slide-in-from-right-3 duration-600 delay-300 hover-lift transform-gpu">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-primary font-extrabold">Personal Pursuit</span>
                    <p className="text-sm font-medium leading-normal text-foreground/90">
                      {tHomeExtra('personalPursuit')}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform ml-4" />
              </Card>
            </Link>

            {/* Blog Call to Action */}
            <Card className="md:col-span-4 md:row-span-2 p-8 flex flex-col justify-between border-primary/20 bg-muted/30 animate-in fade-in slide-in-from-right-3 duration-600 delay-350 hover-lift transform-gpu">
              <div className="space-y-4">
                <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[10px]">{tHomeExtra('latestArticles')}</Badge>
                <h3 className="text-xl font-bold">{tHomeExtra('blogTitle')}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tHomeExtra('blogDesc')}
                </p>
              </div>
              <Link href="/blog/">
                <Button variant="link" className="p-0 text-primary gap-2 font-bold group">
                  {tHomeExtra('readArticles')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </Card>
          </div>
        </section>

        {/* AdSense Unit */}
        <AdUnit
          slotId="2863984675"
          className="mb-32 py-12"
        />

        {/* Specialized Services Index */}
        <section className="mb-32">
          <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4 px-2">
            <div>
              <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[10px] mb-3">Professional Solutions</Badge>
              <h3 className="text-3xl font-bold tracking-tight">{tHomeExtra('servicesTitle')}</h3>
              <p className="text-muted-foreground mt-2 max-w-xl">{tHomeExtra('servicesDesc')}</p>
            </div>
            <Link href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-full gap-2 group shadow-sm">
                {tHomeExtra('viewReviews')} <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Security Service */}
            <Card className="p-8 border-cyan-500/20 bg-cyan-500/[0.02] hover:bg-cyan-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-100 hover-lift transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6 text-cyan-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">WordPress Security & Recovery</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {tHomeExtra('services.security.desc')}
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-cyan-500/5 text-cyan-700 border-cyan-200/50 uppercase tracking-tighter">Malware Removal</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-cyan-500/5 text-cyan-700 border-cyan-200/50 uppercase tracking-tighter">Security Hardening</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992/it-device-repair-52044401?source=seller-center_my-service_share-link" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-cyan-500/30 text-cyan-700 hover:bg-cyan-500 hover:text-white transition-all gap-2 group/btn">
                    {tHomeExtra('services.security.btn')} <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Development Service */}
            <Card className="p-8 border-indigo-500/20 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-150 hover-lift transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="h-6 w-6 text-indigo-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Website Fixes & Customization</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {tHomeExtra('services.dev.desc')}
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-indigo-500/5 text-indigo-700 border-indigo-200/50 uppercase tracking-tighter">WordPress</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-indigo-500/5 text-indigo-700 border-indigo-200/50 uppercase tracking-tighter">Bug Fixing</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-indigo-500/5 text-indigo-700 border-indigo-200/50 uppercase tracking-tighter">Custom Web</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-indigo-500/30 text-indigo-700 hover:bg-indigo-500 hover:text-white transition-all gap-2 group/btn">
                    {tHomeExtra('services.dev.btn')} <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Automation & Strategy */}
            <Card className="p-8 border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-200 hover-lift transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Automation & AI Workflow</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {tHomeExtra('services.automation.desc')}
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/5 text-amber-700 border-amber-200/50 uppercase tracking-tighter">n8n / AI Integration</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/5 text-amber-700 border-amber-200/50 uppercase tracking-tighter">LINE Messaging API</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-amber-500/30 text-amber-700 hover:bg-amber-500 hover:text-white transition-all gap-2 group/btn">
                    {tHomeExtra('services.automation.btn')} <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* WordPress Migration */}
            <Card className="p-8 border-emerald-500/20 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-250 hover-lift transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Rocket className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">WordPress Migration</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {tHomeExtra('services.migration.desc')}
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/5 text-emerald-700 border-emerald-200/50 uppercase tracking-tighter">Fast Migration</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/5 text-emerald-700 border-emerald-200/50 uppercase tracking-tighter">Hosting Setup</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992/wordpress-52957825?source=seller-center_my-service_share-link" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all gap-2 group/btn">
                    {tHomeExtra('services.migration.btn')} <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* Yomu Player Highlight Section */}
        <section className="bg-gradient-to-r from-violet-600/10 via-primary/5 to-indigo-600/10 rounded-[2rem] p-12 md:p-20 text-center border border-indigo-500/20 overflow-hidden relative selection:bg-white selection:text-primary">
          <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <Badge variant="outline" className="rounded-full border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 font-semibold text-xs tracking-wider uppercase">
              {tHomeExtra('yomu.badge')}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-primary to-indigo-600">
              Yomu Player
            </h2>
            <h3 className="text-xl md:text-2xl font-bold text-foreground/80 tracking-wide">
              The All-in-One VN & RPG Player with Live Translation
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {tHomeExtra('yomu.desc')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" disabled className="rounded-full h-14 px-10 gap-2 font-bold bg-muted text-muted-foreground border border-border/50 cursor-not-allowed">
                Coming Soon
              </Button>
              <a href="https://github.com/Yuukub" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="rounded-full h-14 px-10 gap-2 font-bold">
                  GitHub Profile <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

    </div >
  );
}
