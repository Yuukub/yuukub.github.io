import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SITE_URL = "https://yuukub.com";
const postsDir = path.join(process.cwd(), "posts");

const postFiles = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

const postEntries = postFiles.map((fileName) => {
  const slug = fileName.replace(/\.md$/, "");
  const content = fs.readFileSync(path.join(postsDir, fileName), "utf8");
  const { data } = matter(content);
  return `  <url>
    <loc>${SITE_URL}/blog/${slug}/</loc>
    <lastmod>${new Date(data.date).toISOString().split("T")[0]}</lastmod>
    <priority>0.7</priority>
  </url>`;
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog/</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about/</loc>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy-policy/</loc>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${SITE_URL}/tools/</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/tools/image-converter/</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/tools/xmlrpc-checker/</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/tools/hash-generator/</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/tools/password-generator/</loc>
    <priority>0.8</priority>
  </url>
${postEntries.join("\n")}
</urlset>
`;

fs.writeFileSync(path.join(process.cwd(), "public", "sitemap.xml"), sitemap);
console.log(`Sitemap generated with ${postEntries.length} blog posts.`);
