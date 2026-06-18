import fs from 'fs';
import path from 'path';

const SITE_URL = "https://yuukub.com";
const outDir = path.join(process.cwd(), 'out');

// 1. Core pages
const corePages = [
  "about",
  "contact",
  "privacy-policy",
  "terms",
  "tools",
  "blog"
];

// 2. Discover tools
const toolsDir = path.join(process.cwd(), "src", "app", "[locale]", "tools");
let tools = [];
if (fs.existsSync(toolsDir)) {
  tools = fs.readdirSync(toolsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => `tools/${dirent.name}`);
}

// 3. Discover blog posts
const postsDir = path.join(process.cwd(), "posts");
let posts = [];
if (fs.existsSync(postsDir)) {
  posts = fs.readdirSync(postsDir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdoc"))
    .map((fileName) => {
      const slug = fileName.replace(/\.(md|mdoc)$/, "");
      return `blog/${slug}`;
    });
}

// Combine all routes
const routes = [...corePages, ...tools, ...posts];

console.log(`Generating redirects for ${routes.length} old routes...`);

routes.forEach((route) => {
  const routeDir = path.join(outDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <link rel="canonical" href="${SITE_URL}/th/${route}/">
  <meta http-equiv="refresh" content="0; url=/th/${route}/">
  <script>
    var lang = navigator.language.startsWith('en') ? 'en' : 'th';
    window.location.replace('/' + lang + '/${route}/');
  </script>
</head>
<body>
  <p>Redirecting to <a href="/th/${route}/">/th/${route}/</a>...</p>
</body>
</html>`;

  fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent);
});

console.log(`Successfully generated ${routes.length} redirect files.`);
