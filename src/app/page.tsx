import type { Metadata } from "next";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Saranyuu M. | Systems Architect & Cybersecurity Consultant",
  description: "ผู้เชี่ยวชาญด้านความปลอดภัยระดับ Google Certified และ Full-stack Developer ออกแบบระบบด้วยหลัก Security-by-Design เพื่อการเติบโตทางธุรกิจที่มั่นคง",
  alternates: { canonical: "https://yuukub.github.io/" },
};
import {
  Rocket,
  Globe,
  ShieldCheck,
  Code2,
  Smartphone,
  BotMessageSquare,
  Mail,
  Github,
  Linkedin,
  Facebook,
  TrendingUp,
  Layout,
  Layers,
  Zap,
  Award,
  ArrowRight,
  ChartBar,
  Database,
  Lock,
  ExternalLink,
  Cpu
} from "lucide-react";

const PROJECTS = [
  {
    title: "Ads Budget Tracking",
    description: "ระบบบริหารจัดการงบประมาณค่าโฆษณา สำหรับเอเจนซี่และทีมมาร์เก็ตติ้ง แสดงผลแบบ Real-time พร้อมการจัดเก็บข้อมูลที่ปลอดภัย",
    tags: ["Next.js", "Prisma", "MySQL"],
    type: "เว็บแอปพลิเคชัน",
    link: "https://github.com/Yuukub/Ads-budget-tracking",
    icon: <ChartBar className="h-4 w-4" />,
    color: "blue",
    featured: true
  },
  {
    title: "NFC Door Access",
    description: "แอปพลิเคชัน Android สำหรับควบคุมการเข้า-ออกประตูด้วยเทคโนโลยี NFC พร้อมระบบอ่านบัตรที่มีการเข้ารหัส",
    tags: ["Android", "Kotlin", "NFC"],
    type: "แอปแอนดรอยด์",
    link: "https://github.com/Yuukub",
    icon: <Smartphone className="h-4 w-4" />,
    color: "emerald",
    featured: false
  },
  {
    title: "LINE Automation",
    description: "ระบบจัดการการแจ้งเตือนอัตโนมัติและ CRM ผ่าน LINE Messaging API เชื่อมต่อกับระบบจัดการข้อมูลภายนอก",
    tags: ["Node.js", "LINE API", "Automation"],
    type: "ระบบอัตโนมัติ",
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



export default function Home() {
  return (
    <div className="min-h-screen bg-background/80 selection:bg-primary/20">

      {/* Mesh Background */}
      <div className="fixed inset-0 -z-10 mesh-gradient opacity-40 dark:opacity-20 pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-4 z-50 w-full max-w-4xl mx-auto px-4 pointer-events-none">
        <div className="glass rounded-full px-6 py-2 flex items-center justify-between pointer-events-auto border border-white/10 shadow-xl group/nav">
          <Link href="/" className="font-bold text-lg tracking-tight">
            Saranyuu<span className="text-primary">.M</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/#work" className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Work
            </Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <div className="flex items-center gap-3 pl-2 border-l border-border/50">
              <ModeToggle />
              <a href="mailto:yuukun.eutopia@gmail.com">
                <Button size="sm" className="rounded-full px-5 hidden sm:flex">Contact</Button>
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-32 pb-24 max-w-5xl">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-6 mb-32">
          <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/5 text-emerald-600 px-4 py-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            พร้อมสำหรับโปรเจกต์ใหม่และงานที่ปรึกษาทางเทคนิค
          </Badge>

          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 leading-[1.1]">
            ระบบที่ดีเริ่มต้นที่<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-indigo-600">ความปลอดภัย</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl text-balance leading-relaxed animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            เมื่อรากฐานมั่นคง ธุรกิจจึงเติบโตได้อย่างไร้ขีดจำกัด — ผมออกแบบระบบด้วยหลัก <span className="text-foreground font-medium">Security-driven Growth</span> ผ่านวิศวกรรมที่แม่นยำและเทคโนโลยีสมัยใหม่ เพราะความปลอดภัยคือหัวใจของทุกระบบ
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 translate-y-2 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
            <a href="mailto:yuukun.eutopia@gmail.com">
              <Button size="lg" className="rounded-full h-12 px-8 gap-2 premium-glow">
                ติดต่อร่วมงาน <Mail className="h-4 w-4" />
              </Button>
            </a>
            <a href="#work">
              <Button size="lg" variant="ghost" className="rounded-full h-12 px-8 gap-2">
                สำรวจโปรเจกต์ <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>


        {/* Bento Grid: About, Services, & Stats */}
        <section className="mb-32">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:auto-rows-[160px]">
            {/* About Me */}
            <Card className="md:col-span-8 md:row-span-2 p-8 flex flex-col justify-between group overflow-hidden relative animate-in fade-in slide-in-from-bottom-3 duration-600 delay-100 premium-card-hover transform-gpu">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4">Engineering Security for the Future</h3>
                <p className="text-muted-foreground leading-relaxed md:w-3/4">
                  ผมออกแบบโซลูชันที่ผสานความปลอดภัย (Cybersecurity) เข้ากับประสิทธิภาพทางธุรกิจ
                  เพื่อสร้างรากฐานที่แข็งแกร่งและปกป้องทุกโอกาสในการเติบโตขององค์กร
                </p>
              </div>
              <div className="flex gap-4 relative z-10 mt-6">
                <a href="https://github.com/Yuukub" className="hover:text-primary transition-colors"><Github className="h-5 w-5" /></a>
                <a href="https://www.linkedin.com/in/saranyoo-m" className="hover:text-primary transition-colors"><Linkedin className="h-5 w-5" /></a>
                <a href="https://facebook.com/saranyou.meekumlang" className="hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
              </div>
              {/* Abstract decorative element */}
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            </Card>

            {/* Google Certs */}
            <Card className="md:col-span-4 md:row-span-2 p-8 flex flex-col justify-center bg-primary text-primary-foreground premium-glow border-none animate-in fade-in slide-in-from-right-4 duration-600 delay-150">
              <Award className="h-10 w-10 mb-6 opacity-80" />
              <h3 className="text-xl font-bold mb-4">ใบอนุญาตและรางวัล</h3>
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
            <Card id="work" className="md:col-span-8 md:row-span-6 overflow-hidden border-border/40 group flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-600 delay-200 premium-card-hover transform-gpu">
              <div className="p-6 sm:p-8 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary shrink-0" /> คลังผลงาน
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">รวบรวมงานออกแบบและพัฒนาที่มุ่งเน้นความแม่นยำและประสิทธิภาพเชิงเทคนิค</p>
                </div>
                <Link href="https://github.com/Yuukub" className="shrink-0">
                  <Button variant="outline" size="sm" className="rounded-full gap-2 text-xs">
                    <span className="hidden sm:inline">สำรวจ</span> GitHub <Github className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="flex-grow overflow-auto max-h-[400px] scrollbar-hide">
                <div className="divide-y divide-border/40">
                  {PROJECTS.map((project) => (
                    <div
                      key={project.title}
                      className="group/row hover:bg-muted/30 p-6 transition-colors flex flex-col sm:flex-row sm:items-center gap-4 relative"
                    >
                      <div className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl transition-colors shadow-sm ${getProjectColorClass(project.color || "")}`}>
                        {project.icon}
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm truncate">{project.title}</h4>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-tighter py-0 h-4 border-primary/20 text-primary/70">
                            {project.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {project.description}
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
                            title="เยี่ยมชมเว็บไซต์"
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
                            title="ดูโค้ดบน GitHub"
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
                เลื่อนเพื่อดูเพิ่มเติม • อัปเดตล่าสุด 2026
              </div>
            </Card>

            {/* Core Tech & Vibe Coding */}
            <Card className="md:col-span-4 md:row-span-3 p-8 flex flex-col animate-in fade-in slide-in-from-right-4 duration-600 delay-250 premium-card-hover transform-gpu">
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
                  ขับเคลื่อนด้วยแนวคิด **Vibe Coding** ที่ใช้ขุมพลังของ AI ในการยกระดับมาตรฐานโค้ดและการเพิ่มประสิทธิภาพที่ก้าวกระโดด
                </p>
              </div>
            </Card>



            {/* Stats / Interest - Redesigned as Personal Insight */}
            <Link href="https://github.com/yuukub" target="_blank" rel="noopener noreferrer" className="md:col-span-4 md:row-span-1">
              <Card className="p-6 h-full flex items-center justify-between group cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors border-primary/10 animate-in fade-in slide-in-from-right-3 duration-600 delay-300 premium-card-hover transform-gpu">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-widest text-primary/70 font-bold">Personal Pursuit</span>
                    <p className="text-sm font-medium leading-normal text-foreground/90">
                      สำรวจกลไกตลาดหุ้นปันผล US และการผสาน AI สู่ระบบนิเวศแห่งอนาคต
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform ml-4" />
              </Card>
            </Link>

            {/* Blog Call to Action */}
            <Card className="md:col-span-4 md:row-span-2 p-8 flex flex-col justify-between border-primary/20 bg-muted/30 animate-in fade-in slide-in-from-right-3 duration-600 delay-350 premium-card-hover transform-gpu">
              <div className="space-y-4">
                <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[10px]">บทความล่าสุด</Badge>
                <h3 className="text-xl font-bold">แบ่งปันความรู้ด้านเทคนิค</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  เจาะลึกเรื่องความปลอดภัย WordPress, Technical SEO และการพัฒนา Full-stack สมัยใหม่
                </p>
              </div>
              <Link href="/blog">
                <Button variant="link" className="p-0 text-primary gap-2 font-bold group">
                  อ่านบทความ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </Card>
          </div>
        </section>



        {/* Specialized Services Index */}
        <section className="mb-32">
          <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-4 px-2">
            <div>
              <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[10px] mb-3">Professional Solutions</Badge>
              <h3 className="text-3xl font-bold tracking-tight">บริการและความเชี่ยวชาญเฉพาะทาง</h3>
              <p className="text-muted-foreground mt-2 max-w-xl">ส่งมอบโซลูชันเชิงเทคนิคระดับสูงที่เน้นความปลอดภัย ความเสถียร และการเติบโตของธุรกิจ</p>
            </div>
            <Link href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-full gap-2 group shadow-sm">
                ดูโปรไฟล์และรีวิวลูกค้า <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Security Service */}
            <Card className="p-8 border-cyan-500/20 bg-cyan-500/[0.02] hover:bg-cyan-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-100 premium-card-hover transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6 text-cyan-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">WordPress Security & Recovery</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                กู้คืนเว็บไซต์โดนแฮก, ล้างมัลแวร์เชิงลึก และวางระบบ Defensive Architecture เพื่อป้องกันการโจมตีซ้ำในระยะยาว
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-cyan-500/5 text-cyan-700 border-cyan-200/50 uppercase tracking-tighter">Malware Removal</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-cyan-500/5 text-cyan-700 border-cyan-200/50 uppercase tracking-tighter">Security Hardening</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992/it-device-repair-52044401?source=seller-center_my-service_share-link" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-cyan-500/30 text-cyan-700 hover:bg-cyan-500 hover:text-white transition-all gap-2 group/btn">
                    กู้คืนเว็บ WordPress ติดไวรัส <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Development Service */}
            <Card className="p-8 border-indigo-500/20 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-150 premium-card-hover transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="h-6 w-6 text-indigo-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Landing Page & Web Systems</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                สร้าง Landing Page ที่เน้น Conversion และระบบดูแลจัดการข้อมูลหลังบ้านที่เสถียรปลอดภัย รองรับผู้ใช้งานจำนวนมาก
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-indigo-500/5 text-indigo-700 border-indigo-200/50 uppercase tracking-tighter">WordPress</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-indigo-500/5 text-indigo-700 border-indigo-200/50 uppercase tracking-tighter">WordPress Plugin</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-indigo-500/30 text-indigo-700 hover:bg-indigo-500 hover:text-white transition-all gap-2 group/btn">
                    จ้างงานพัฒนาเว็บไซต์ <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Automation & Strategy */}
            <Card className="p-8 border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-200 premium-card-hover transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">Automation & AI Workflow</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                ออกแบบระบบจัดการข้อมูลอัตโนมัติ (n8n/AI) และระบบแจ้งเตือนผ่าน API เพื่อลดเวลาและเพิ่มประสิทธิภาพการทำงาน
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/5 text-amber-700 border-amber-200/50 uppercase tracking-tighter">n8n / AI Integration</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-amber-500/5 text-amber-700 border-amber-200/50 uppercase tracking-tighter">LINE Messaging API</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-amber-500/30 text-amber-700 hover:bg-amber-500 hover:text-white transition-all gap-2 group/btn">
                    จ้างงานระบบอัตโนมัติ/AI <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* WordPress Migration */}
            <Card className="p-8 border-emerald-500/20 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] transition-colors group flex flex-col h-full animate-in fade-in slide-in-from-bottom-3 duration-600 delay-250 premium-card-hover transform-gpu">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Rocket className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="text-xl font-bold mb-3">WordPress Migration</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                ย้ายเว็บไซต์ WordPress จาก Hosting เดิมมาที่ใหม่ พร้อมตรวจสอบความเรียบร้อยและประสิทธิภาพหลังย้าย
              </p>
              <div className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/5 text-emerald-700 border-emerald-200/50 uppercase tracking-tighter">Fast Migration</Badge>
                  <Badge variant="secondary" className="text-[10px] bg-emerald-500/5 text-emerald-700 border-emerald-200/50 uppercase tracking-tighter">Hosting Setup</Badge>
                </div>
                <Link href="https://fastwork.co/user/yuukun992/wordpress-52957825?source=seller-center_my-service_share-link" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full rounded-xl border-emerald-500/30 text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all gap-2 group/btn">
                    ย้ายโฮสติ้ง WordPress <ExternalLink className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/5 rounded-[2rem] p-12 md:p-20 text-center border overflow-hidden relative selection:bg-white selection:text-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight leading-[1.3]">ยกระดับมาตรฐานความปลอดภัยและประสิทธิภาพให้กับโปรเจกต์ของคุณ</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              ผมพร้อมแบ่งปันความเชี่ยวชาญในฐานะที่ปรึกษาและนักพัฒนาในโปรเจกต์เชิงเทคนิค มาร่วมสร้างวิสัยทัศน์ของคุณให้เป็นจริงด้วยมาตรฐานระดับสูงครับ
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="mailto:yuukun.eutopia@gmail.com">
                <Button size="lg" className="rounded-full h-14 px-10 gap-2 font-bold shadow-2xl">
                  ติดต่อร่วมงาน
                </Button>
              </a>
              <a href="https://www.linkedin.com/in/saranyoo-m">
                <Button size="lg" variant="outline" className="rounded-full h-14 px-10 gap-2 font-bold">
                  LinkedIn <Linkedin className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-muted/10">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-left">
            <h4 className="font-bold text-lg mb-2 underline decoration-primary/30 underline-offset-4">Saranyuu M.</h4>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} สงวนลิขสิทธิ์ตามกฎหมาย</p>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs md:text-right border-l md:border-l-0 md:border-r border-border/50 pl-4 md:pl-0 md:pr-4">
            ความปลอดภัย. การตลาด. การพัฒนา. <br />
            แนวทางด้านเทคนิคแบบรวมศูนย์เพื่อการเติบโตทางดิจิทัล
          </p>
        </div>
      </footer>
    </div >
  );
}
