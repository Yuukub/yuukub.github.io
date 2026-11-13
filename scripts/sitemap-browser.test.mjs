import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));

test("generated sitemap opens in Chrome without XSLT deprecation warnings", async () => {
  execFileSync(process.execPath, ["scripts/generate-sitemap.mjs"], { cwd: root });
  const xml = fs.readFileSync(path.join(root, "public/sitemap.xml"), "utf8");
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, "http://localhost").pathname;
    const contentTypes = {
      "/sitemap.xml": "application/xml; charset=utf-8",
      "/sitemap.xsl": "application/xslt+xml; charset=utf-8",
    };
    if (contentTypes[name]) {
      res.writeHead(200, { "Content-Type": contentTypes[name] });
      res.end(fs.readFileSync(path.join(root, "public", name.slice(1))));
    } else {
      res.writeHead(204);
      res.end();
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    const executablePath = process.env.CHROMIUM_EXECUTABLE ||
      (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    const messages = [];
    page.on("console", message => messages.push(message.text()));
    page.on("pageerror", error => messages.push(error.message));
    // The legacy XSL template uses external fonts; they aren't needed to reproduce the warning.
    await page.route("https://**/*", route => route.abort());
    const response = await page.goto(`http://127.0.0.1:${server.address().port}/sitemap.xml`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /application\/xml/);
    const data = await page.evaluate(source => {
      const doc = new DOMParser().parseFromString(source, "application/xml");
      const ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
      return {
        parseError: Boolean(doc.querySelector("parsererror")),
        namespace: doc.documentElement.namespaceURI,
        urls: [...doc.getElementsByTagNameNS(ns, "url")].map(url => ({
          loc: url.getElementsByTagNameNS(ns, "loc")[0]?.textContent,
          alternates: [...url.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "link")]
            .map(link => link.getAttribute("hreflang")),
        })),
      };
    }, xml);
    assert.equal(data.parseError, false);
    assert.equal(data.namespace, "http://www.sitemaps.org/schemas/sitemap/0.9");
    assert.ok(data.urls.length > 0);
    for (const url of data.urls) {
      assert.match(url.loc, /^https:\/\/yuukub\.com\/(th|en)\//);
      assert.deepEqual(url.alternates, ["th", "en", "x-default"]);
    }
    assert.deepEqual(messages.filter(message => /XSLT|XSLTProcessor/i.test(message)), []);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
