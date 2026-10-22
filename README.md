<div align="center">

# 🛡️ Saranyuu M. Portfolio
### Systems Architect & Cybersecurity Consultant

<p align="center">
  <a href="https://yuukub.github.io">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-yuukub.github.io-2563eb?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://fastwork.co/user/yuukun992">
    <img src="https://img.shields.io/badge/💼_Hire_Me-Fastwork-10b981?style=for-the-badge&logo=freelancer&logoColor=white" alt="Fastwork" />
  </a>
  <a href="https://www.linkedin.com/in/saranyoo-m">
    <img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
</p>

> **"Engineering Security that Drives Business Growth"**  
> ออกแบบระบบด้วยหลัก **Security-by-Design** ผสานวิศวกรรมที่แม่นยำเข้ากับเทคโนโลยี **AI-Native** เพื่อความปลอดภัยและการเติบโตที่ยั่งยืน

</div>

<br />

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **GEO First** | Optimized for **Generative Engine Optimization (GEO)** with advanced Schema.org & JSON-LD |
| ⚡ **Next-Gen Tech** | Built on **Next.js 16**, **React 19**, and **Tailwind CSS v4** |
| 🎨 **Premium UI/UX** | Modern **Glassmorphism**, Mesh Gradients, and Adaptive Dark/Light Mode |
| 📝 **MDX Blog** | Static Markdown blog system with `gray-matter` & `rehype` pipeline |
| 🔍 **Technical SEO** | 100% Score on Lighthouse, Accessibility-focused, and Auto-generated Sitemaps |

## 🛠️ Tech Stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Shadcn UI](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)

</div>

Versions checked against npm's `latest` releases on 2026-10-22. Exact installed versions are recorded in `package-lock.json`.

| Layer | Technology |
|-------|------------|
| Runtime / deployment | Node.js 26.12.1 (Current), GitHub Actions, GitHub Pages static export |
| Framework / UI | Next.js 16.4.2, React / React DOM 19.3.1 |
| Language / lint | TypeScript 6.0.3, ESLint 9.39.5 |
| Styling / components | Tailwind CSS 4.3.3, shadcn/ui source components, Radix UI, Lucide React 1.61.0 |
| Localization / themes | next-intl 4.14.9, next-themes 0.4.6 |
| CMS / content | Keystatic Core 0.6.9, Keystatic Next 5.0.5, gray-matter, unified / remark / rehype |
| Data / API | Supabase JS 2.118.0, Cloudflare Workers API proxy |
| Image / AI tools | Transformers.js 4.3.1, jSquash WASM codecs, Sharp 0.35.5 |
| PDF / editor tools | PDF.js 6.4.299, pdf-lib 1.17.1, Monaco React 4.7.0 |
| Browser tests | Playwright 1.64.1 |

TypeScript is held at **6.0.3**: the current `typescript-eslint` parser supports `>=4.8.4 <6.1.0`, so TypeScript 7.0.2 cannot yet be used with the supported lint stack. ESLint is held at **9.39.5** because the React, import, and accessibility plugins in `eslint-config-next` do not yet declare ESLint 10 support. The deprecated `remark-footnotes` plugin has been replaced by the existing `remark-gfm` footnote support.

## 🧬 Architecture & GEO Strategy

โปรเจกต์นี้ไม่ได้เป็นเพียงแค่เว็บไซต์แสดงผลงาน แต่เป็น **Proof of Concept** ในการทำ **Technical SEO** ยุคใหม่:
- **Global Entity Recognition:** ใช้ `Organization` และ `Person` Schema ในระดับ Root Layout
- **AI-Readable Structure:** ปูพรม `BreadcrumbList` เพื่อช่วยให้ AI Bot (ChatGPT/Gemini) เข้าใจลำดับชั้นของเนื้อหา
- **Performance:** ใช้ Static Export (`output: 'export'`) เพื่อความเร็วสูงสุดบน GitHub Pages

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/Yuukub/yuukub.github.io.git

# Use the project runtime (requires nvm)
nvm install
nvm use

# Install the locked dependencies
npm ci

# Run development server
npm run dev
# Open http://localhost:3000
```

## Validation after the 2026-10-22 upgrade

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run test:metadata
npm run test:api-import
# Serve the exported site in another terminal:
python3 -m http.server 3100 --bind 127.0.0.1 --directory out
IMAGE_CONVERTER_TEST_URL=http://127.0.0.1:3100 npm run test:image-converter-browser
API_TESTER_TEST_URL=http://127.0.0.1:3100 npm run test:api-tester-browser
```

Verified on Node.js 26.12.1: clean install, lint with 0 errors and 0 warnings, typecheck, static build (60 pages), all 7 metadata tests, all 6 API import tests, and browser image conversions for JPG/PNG/WebP/AVIF with metadata kept/removed. Browser smoke checks also covered Thai/English home pages and brand icons, PDF.js thumbnails, two-file PDF merge, PDF-to-JPG conversion, and password/API tool hydration.

Tailwind Typography uses a scoped `postcss-selector-parser` override to **7.1.7**. Its generated components and variants match the previous parser output. Browser comparisons of typography styles also match on desktop/mobile in light/dark themes. The PostCSS parser advisory no longer appears in `npm audit`.

API imports accept `unknown` JSON and validate native backup rows before loading them into the editor. Valid Postman collections, environments, native backups, auth settings and request bodies remain covered by tests. Native backup files with malformed rows are rejected with `INVALID_FORMAT`. Loading a saved request also restores its query parameters and selects the replacement tab, so edits apply correctly when starting from an empty tab. Browser regression tests cover imported parameters, string/boolean row edits, headers, JSON/form bodies, bearer/basic auth, cURL extraction, and malformed backup rejection; all API calls use mocked responses.

`npm run lint` rejects warnings as well as errors. GitHub Actions runs lint and API import tests before the production build. Local PDF canvas/blob previews deliberately use native images to preserve their intrinsic page ratios, with narrowly scoped lint exceptions.

Known checks still requiring follow-up:
- `npm audit`: 11 findings (7 high, 4 moderate) remain in transitive dependencies. The proposed automatic fixes downgrade Keystatic, Next.js lint config, or gray-matter; these downgrades were not applied. DOMPurify is overridden to `^3.4.17` to apply its available security patches.
- GitHub-hosted deployment and full AI model inference require separate verification.

## 📦 Deployment

Web นี้ใช้ **GitHub Actions** ในการ Deploy อัตโนมัติไปยัง **GitHub Pages**
- **Flow:** Push to `main` -> Build Static -> Deploy
- **Config:** `next.config.ts` ถูกตั้งค่า `images: { unoptimized: true }` เพื่อความเข้ากันได้

---

<div align="center">

### 📬 Contact Me

[![Email](https://img.shields.io/badge/Email-yuukun.eutopia@gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:yuukun.eutopia@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-@Yuukub-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/Yuukub)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Saranyoo_M.-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/saranyoo-m)

© 2026 Saranyuu M. All Rights Reserved.

</div>