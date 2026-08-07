// Parte 2 y 3 -- esqueleto de secciones + composicion interna + responsive.
// Uso: node extract_structure.mjs <url> <ancho> <alto> [etiqueta]
// Ejemplos:
//   node extract_structure.mjs https://ejemplo.com 1440 900 desktop
//   node extract_structure.mjs https://ejemplo.com 390 844 mobile
import { chromium } from 'playwright';

const [, , url, widthArg, heightArg, label] = process.argv;
if (!url) {
  console.error('uso: node extract_structure.mjs <url> <ancho> <alto> [etiqueta]');
  process.exit(1);
}
const viewport = { width: Number(widthArg) || 1440, height: Number(heightArg) || 900 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
await page.goto(url, { waitUntil: 'load', timeout: 30000 });

const cookieSelectors = [
  'button:has-text("Aceptar")', 'button:has-text("Accept")',
  '[id*="cookie" i] button', '[class*="cookie" i] button', '[class*="consent" i] button',
];
for (const sel of cookieSelectors) {
  try {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 1000 })) { await btn.click({ timeout: 1000 }); break; }
  } catch (e) {}
}
await page.waitForTimeout(800);

// scroll completo para disparar contenido lazy antes de medir -- igual que dembrandt
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let total = 0;
    const step = 400;
    const timer = setInterval(() => {
      window.scrollBy(0, step);
      total += step;
      if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
    }, 60);
  });
});
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

const data = await page.evaluate(() => {
  const landmarks = ['header', 'nav', 'main', 'section', 'article', 'footer', 'aside'];

  function describeChildren(el) {
    let target = el;
    let unwrapped = 0;
    while (target.children.length === 1 && target.children[0].tagName === 'DIV' && unwrapped < 3) {
      target = target.children[0];
      unwrapped++;
    }
    const kids = Array.from(target.children).filter(c => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const ys = kids.map(k => Math.round(k.getBoundingClientRect().y - target.getBoundingClientRect().y));
    const xs = kids.map(k => Math.round(k.getBoundingClientRect().x - target.getBoundingClientRect().x));
    const sameRow = xs.length > 1 && (new Set(ys.map(y => Math.round(y / 20)))).size <= Math.ceil(ys.length / 2);
    const style = kids.length ? getComputedStyle(target) : null;
    return {
      nivelesDesenvueltos: unwrapped,
      directChildren: kids.length,
      childTags: kids.map(k => k.tagName.toLowerCase()),
      contenedorDisplay: style ? style.display : null,
      contenedorGrid: style && style.display.includes('grid') ? style.gridTemplateColumns : null,
      arrangementGuess: kids.length <= 1 ? 'único' : (sameRow ? 'fila (misma Y aprox.)' : 'columna (Y creciente)'),
    };
  }

  const results = [];
  function walk(el, depth) {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      const isLandmark = landmarks.includes(tag);
      if (isLandmark) {
        const rect = child.getBoundingClientRect();
        const heading = child.querySelector('h1,h2,h3');
        results.push({
          depth, tag,
          y: Math.round(rect.y + window.scrollY),
          height: Math.round(rect.height),
          headingText: heading ? heading.textContent.trim().slice(0, 70) : null,
          ...describeChildren(child),
        });
      }
      walk(child, isLandmark ? depth + 1 : depth);
    }
  }
  walk(document.body, 0);

  return { sections: results, pageHeight: document.body.scrollHeight, viewport: { w: window.innerWidth, h: window.innerHeight } };
});

console.log(JSON.stringify({ etiqueta: label || `${viewport.width}x${viewport.height}`, ...data }, null, 2));
await browser.close();
