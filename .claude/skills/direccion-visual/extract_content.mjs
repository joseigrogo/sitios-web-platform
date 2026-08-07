// Parte 2.5 -- copy real y catálogo de imágenes por sección. Complementa
// extract_structure.mjs (que da el esqueleto) con el contenido real:
// texto propio de cada sección + inventario de imágenes (URL real, alt,
// dimensiones). Para reproducción cercana, no dirección propia -- no
// forma parte del flujo por defecto (ver Paso 2.5 en direccion-visual.md).
// Uso: node extract_content.mjs <url>
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('uso: node extract_content.mjs <url>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'load', timeout: 30000 });

const cookieSelectors = [
  'button:has-text("Aceptar")', 'button:has-text("Accept")', 'button:has-text("Accept all")',
  '[id*="cookie" i] button', '[class*="cookie" i] button', '[class*="consent" i] button',
];
for (const sel of cookieSelectors) {
  try {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 1000 })) { await btn.click({ timeout: 1000 }); break; }
  } catch (e) {}
}
await page.waitForTimeout(800);

// scroll completo para disparar contenido lazy antes de leer -- igual
// que extract_structure.mjs y dembrandt
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
  const landmarks = ['header', 'nav', 'main', 'section', 'article', 'footer'];

  function imagesIn(el) {
    const imgs = [];
    el.querySelectorAll('img').forEach(img => {
      const r = img.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      imgs.push({
        src: img.currentSrc || img.src,
        alt: img.alt || null,
        width: img.naturalWidth || null,
        height: img.naturalHeight || null,
      });
    });
    // background-image además de <img> -- varios sitios meten fotos de
    // hero/producto como fondo CSS, no como <img>
    el.querySelectorAll('*').forEach(node => {
      const bg = getComputedStyle(node).backgroundImage;
      if (bg && bg.startsWith('url(')) {
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (m) imgs.push({ src: m[1], alt: null, width: null, height: null, background: true });
      }
    });
    const seen = new Set();
    return imgs.filter(i => (seen.has(i.src) ? false : (seen.add(i.src), true)));
  }

  const results = [];
  function walk(el, depth) {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      const isLandmark = landmarks.includes(tag);
      if (isLandmark) {
        const rect = child.getBoundingClientRect();
        const heading = child.querySelector('h1,h2,h3');
        // texto propio de esta sección, sin bajar a sub-secciones (evita
        // duplicar) y sin script/style/noscript -- confirmado en la
        // práctica que un <script> de inicialización (embed de Google
        // Maps) se cuela en innerText si no se saca explícito primero.
        const clone = child.cloneNode(true);
        clone.querySelectorAll(landmarks.join(',') + ', script, style, noscript').forEach(n => n.remove());
        const text = clone.innerText.replace(/\s+/g, ' ').trim().slice(0, 2000);
        results.push({
          depth, tag,
          y: Math.round(rect.y + window.scrollY),
          headingText: heading ? heading.textContent.trim().slice(0, 100) : null,
          text,
          images: imagesIn(child).slice(0, 15),
        });
      }
      walk(child, isLandmark ? depth + 1 : depth);
    }
  }
  walk(document.body, 0);

  return { sections: results.filter(s => s.depth <= 1), title: document.title };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
