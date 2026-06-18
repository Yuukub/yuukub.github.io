import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SITE_URL = "https://yuukub.com";
const locales = ["th", "en"];
const defaultLocale = "th";

// 1. Core pages
const corePages = [
  { path: "", priority: "1.0" },
  { path: "about", priority: "0.5" },
  { path: "contact", priority: "0.5" },
  { path: "privacy-policy", priority: "0.5" },
  { path: "terms", priority: "0.5" },
  { path: "tools", priority: "0.9" }
];

// 2. Discover tools
const toolsDir = path.join(process.cwd(), "src", "app", "[locale]", "tools");
let tools = [];
if (fs.existsSync(toolsDir)) {
  tools = fs.readdirSync(toolsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

// 3. Discover blog posts
const postsDir = path.join(process.cwd(), "posts");
let posts = [];
if (fs.existsSync(postsDir)) {
  posts = fs.readdirSync(postsDir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdoc"))
    .map((fileName) => {
      const slug = fileName.replace(/\.(md|mdoc)$/, "");
      const content = fs.readFileSync(path.join(postsDir, fileName), "utf8");
      const { data } = matter(content);
      return {
        slug,
        date: data.date ? new Date(data.date).toISOString().split("T")[0] : null
      };
    });
}

// Helper to generate alternate xhtml link tags for Google multilingual SEO
function generateAlternates(routePath) {
  const links = [];
  locales.forEach((locale) => {
    links.push(`    <xhtml:link rel="alternate" hreflang="${locale}" href="${SITE_URL}/${locale}/${routePath}" />`);
  });
  // Add x-default pointing to the default locale
  links.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${defaultLocale}/${routePath}" />`);
  return links.join("\n");
}

const urlEntries = [];

// Process core pages
corePages.forEach((page) => {
  const routePath = page.path ? `${page.path}/` : "";
  locales.forEach((locale) => {
    urlEntries.push(`  <url>
    <loc>${SITE_URL}/${locale}/${routePath}</loc>
${generateAlternates(routePath)}
    <priority>${page.priority}</priority>
  </url>`);
  });
});

// Process tools
tools.forEach((toolSlug) => {
  const routePath = `tools/${toolSlug}/`;
  const priority = toolSlug === "image-converter" ? "0.9" : "0.8";
  locales.forEach((locale) => {
    urlEntries.push(`  <url>
    <loc>${SITE_URL}/${locale}/${routePath}</loc>
${generateAlternates(routePath)}
    <priority>${priority}</priority>
  </url>`);
  });
});

// Process posts
posts.forEach((post) => {
  const routePath = `blog/${post.slug}/`;
  locales.forEach((locale) => {
    const lastmodTag = post.date ? `\n    <lastmod>${post.date}</lastmod>` : "";
    urlEntries.push(`  <url>
    <loc>${SITE_URL}/${locale}/${routePath}</loc>
${generateAlternates(routePath)}${lastmodTag}
    <priority>0.7</priority>
  </url>`);
  });
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(process.cwd(), "public", "sitemap.xml"), sitemap);
console.log(`Multilingual sitemap generated with ${urlEntries.length} URL entries for ${locales.length} languages.`);
