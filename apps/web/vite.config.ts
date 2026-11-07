import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { SITE_URL } from "./src/config";
import { PAGES, footerHtml, headHtml, headerHtml, robotsTxt, sitemapXml } from "./src/site/partials";

const root = fileURLToPath(new URL(".", import.meta.url));

/** Injects shared head tags, header and footer into every page, and emits sitemap.xml and robots.txt. */
function site(): Plugin {
  return {
    name: "billkul-site",
    transformIndexHtml(html, ctx) {
      const path = ctx.path.replace(/index\.html$/, ""); // "/" or "/gst-calculator/"
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "BillKul";
      const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
      return html
        .replace("<!--site-head-->", headHtml({ url: SITE_URL + path, title, description }))
        .replace(/<!--site-header:([a-z-]*)-->/, (_m, active: string) => headerHtml(active))
        .replace("<!--site-footer-->", footerHtml());
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(today) });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt() });
    },
  };
}

export default defineConfig({
  plugins: [react(), site()],
  optimizeDeps: { include: ["qrcode"] },
  build: {
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p.path === "/" ? "main" : p.path.slice(1, -1), root + p.file])),
    },
  },
});
