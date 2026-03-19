/**
 * Extrai assets da página (cores, fontes, textos, layout, imagens, CSS vars).
 * Roda o mesmo script que o usuário rodaria no console.
 *
 * Uso:
 *   npx tsx scripts/extract-page-assets.ts [url]
 *
 * Exemplo:
 *   npx tsx scripts/extract-page-assets.ts
 *   npx tsx scripts/extract-page-assets.ts http://localhost:5000/dashboard
 */
import { chromium } from "playwright";

const EXTRACT_SCRIPT = `
(function extractPageAssets() {
  const assets = {
    url: location.href,
    title: document.title,
    meta: {
      description: document.querySelector('meta[name=description]')?.content || '',
      ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
    },
    colors: [],
    fonts: [],
    text: {
      headings: [],
      bodySnippets: []
    },
    layout: {
      sections: 0,
      hasHero: false,
      hasCTA: false,
      navItems: []
    },
    images: [],
    cssVars: {}
  };

  const colorSet = new Set();
  document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    ['color','background-color','border-color','fill','stroke'].forEach(prop => {
      const v = s[prop];
      if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent' && v !== 'none') {
        colorSet.add(v);
      }
    });
  });
  assets.colors = [...colorSet].slice(0, 30);

  const fontSet = new Set();
  document.querySelectorAll('*').forEach(el => {
    const ff = getComputedStyle(el).fontFamily;
    if (ff) fontSet.add(ff.split(',')[0].replace(/['"]/g,'').trim());
  });
  assets.fonts = [...fontSet].filter(Boolean).slice(0, 12);

  document.querySelectorAll('h1,h2,h3').forEach(el => {
    const t = el.innerText?.trim();
    if (t && t.length > 2) assets.text.headings.push(t);
  });
  assets.text.headings = assets.text.headings.slice(0, 10);

  document.querySelectorAll('p').forEach(el => {
    const t = el.innerText?.trim();
    if (t && t.length > 40) assets.text.bodySnippets.push(t.slice(0, 120));
  });
  assets.text.bodySnippets = assets.text.bodySnippets.slice(0, 5);

  assets.layout.sections = document.querySelectorAll('section, [class*=section], [class*=hero], main > div').length;
  assets.layout.hasHero = !!document.querySelector('[class*=hero],[id*=hero],[class*=banner]');
  assets.layout.hasCTA = !!document.querySelector('[class*=cta],[class*=btn],[class*=button]');
  document.querySelectorAll('nav a, header a').forEach(a => {
    if (a.innerText?.trim()) assets.layout.navItems.push(a.innerText.trim());
  });
  assets.layout.navItems = [...new Set(assets.layout.navItems)].slice(0, 8);

  document.querySelectorAll('img').forEach(img => {
    if (img.naturalWidth > 60) {
      assets.images.push({
        src: img.src.substring(0, 100),
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  });
  assets.images = assets.images.slice(0, 8);

  const rootStyle = getComputedStyle(document.documentElement);
  const cssVarNames = [...document.styleSheets].flatMap(sheet => {
    try {
      return [...sheet.cssRules].flatMap(rule =>
        rule.style ? [...rule.style].filter(p => p.startsWith('--')) : []
      );
    } catch { return []; }
  });
  [...new Set(cssVarNames)].slice(0, 20).forEach(v => {
    assets.cssVars[v] = rootStyle.getPropertyValue(v).trim();
  });

  return assets;
})();
`;

async function main() {
  const url = process.argv[2] ?? process.env.CAPTURE_BASE_URL ?? "http://localhost:5000";

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);

    const assets = await page.evaluate(EXTRACT_SCRIPT);
    const json = JSON.stringify(assets, null, 2);
    console.log(json);
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
