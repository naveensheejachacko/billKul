// Shared <head> tags, header and footer for every HTML page, injected at build
// time by the plugin in vite.config.ts. Pages only write their own <title>,
// description and content.
import { BMC_URL, REPO_URL, SITE_URL } from "../config";

export interface Page {
  /** URL path, with trailing slash */
  path: string;
  /** HTML entry file, relative to apps/web */
  file: string;
  priority: string;
}

export const PAGES: Page[] = [
  { path: "/", file: "index.html", priority: "1.0" },
  { path: "/gst-calculator/", file: "gst-calculator/index.html", priority: "0.8" },
  { path: "/gstin-validator/", file: "gstin-validator/index.html", priority: "0.8" },
  { path: "/gst-invoice-format/", file: "gst-invoice-format/index.html", priority: "0.7" },
  { path: "/export-invoice-lut/", file: "export-invoice-lut/index.html", priority: "0.7" },
];

const NAV: [string, string][] = [
  ["/gst-calculator/", "GST calculator"],
  ["/gstin-validator/", "GSTIN checker"],
  ["/gst-invoice-format/", "Invoice format"],
  ["/export-invoice-lut/", "Export invoices"],
];

const MARK =
  '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="var(--accent)" d="M5 2.5h14a1 1 0 0 1 1 1v18l-2.67-1.6-2.66 1.6L12 19.9l-2.67 1.6-2.66-1.6L4 21.5v-18a1 1 0 0 1 1-1Z"/><path stroke="#fff" stroke-width="1.6" stroke-linecap="round" d="M8 8h8M8 11.5h8M8 15h4.5"/></svg>';

export function headHtml(p: { url: string; title: string; description: string }): string {
  const image = `${SITE_URL}/og-image.png`;
  return [
    `<link rel="canonical" href="${p.url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="BillKul" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:url" content="${p.url}" />`,
    `<meta property="og:title" content="${p.title}" />`,
    `<meta property="og:description" content="${p.description}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${p.title}" />`,
    `<meta name="twitter:description" content="${p.description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="theme-color" content="#fbfaf8" />`,
    `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
  ].join("\n    ");
}

/** Header for the static tool and guide pages. `active` is the page slug. */
export function headerHtml(active: string): string {
  const links = NAV.map(
    ([href, label]) => `<a href="${href}"${href === `/${active}/` ? ' aria-current="page"' : ""}>${label}</a>`,
  ).join("");
  return `<header class="topbar site-top">
      <a class="wordmark" href="/">${MARK}BillKul</a>
      <nav class="site-nav" aria-label="Tools and guides">${links}</nav>
      <a class="btn btn-primary site-cta" href="/">Create invoice</a>
    </header>`;
}

export function footerHtml(): string {
  const links = [["/", "GST invoice generator"], ...NAV, [REPO_URL, "Source on GitHub"], [BMC_URL, "Buy me a coffee"]]
    .map(([href, label]) => `<a href="${href}">${label}</a>`)
    .join("");
  return `<footer class="footer site-foot">
      <nav aria-label="All pages">${links}</nav>
      <span>Free and open source. Not tax advice: check unusual cases with your CA.</span>
    </footer>`;
}

export function sitemapXml(today: string): string {
  const urls = PAGES.map(
    (p) => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
