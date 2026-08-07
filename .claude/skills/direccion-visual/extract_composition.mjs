// Composicion interna real de una seccion: baja varios niveles (no uno
// solo), salta wrappers de un hijo automaticamente a cualquier
// profundidad, y detecta imagenes/media reales -- no solo conteo de
// hijos. Complementa extract_structure.mjs (que da el esqueleto de la
// pagina), esto da el detalle DENTRO de una seccion puntual.
//
// Uso: node extract_composition.mjs <url> "<texto del heading de la seccion>" [maxDepth]
import { chromium } from 'playwright';

const [, , url, headingText, maxDepthArg] = process.argv;
if (!url || !headingText) {
  console.error('uso: node extract_composition.mjs <url> "<texto del heading>" [maxDepth]');
  process.exit(1);
}
const maxDepth = Number(maxDepthArg) || 5;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
try { await page.locator('button:has-text("Aceptar")').first().click({ timeout: 1500 }); } catch (e) {}
await page.waitForTimeout(800);

// scroll completo, igual que los otros scripts, para que lazy-load ya haya resuelto
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let total = 0;
    const timer = setInterval(() => {
      window.scrollBy(0, 400); total += 400;
      if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
    }, 60);
  });
});
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);

const tree = await page.evaluate(({ headingText, maxDepth }) => {
  const heading = Array.from(document.querySelectorAll('h1,h2,h3')).find(h => h.textContent.includes(headingText));
  if (!heading) return { error: `no se encontró ningún heading con texto "${headingText}"` };
  const section = heading.closest('section') || heading.closest('article') || heading.parentElement;

  function mediaInfo(el) {
    if (el.tagName === 'IMG') {
      return { tipo: 'img', src: el.currentSrc || el.src, aspecto: el.naturalWidth && el.naturalHeight ? +(el.naturalWidth / el.naturalHeight).toFixed(2) : null };
    }
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      return { tipo: 'background-image', valor: bg.slice(0, 120) };
    }
    if (el.tagName === 'SVG') return { tipo: 'svg' };
    return null;
  }

  function walk(el, depth) {
    if (depth > maxDepth) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return null;

    // saltar wrappers de un solo hijo automaticamente, a cualquier profundidad
    let node = el;
    let saltados = 0;
    while (node.children.length === 1 && !mediaInfo(node) && saltados < 3) {
      const child = node.children[0];
      const cr = child.getBoundingClientRect();
      const nr = node.getBoundingClientRect();
      // solo saltar si el hijo ocupa casi lo mismo que el padre (wrapper real, no un padding intencional)
      if (Math.abs(cr.width - nr.width) < 8 && Math.abs(cr.height - nr.height) < 8) {
        node = child; saltados++;
      } else break;
    }

    const media = mediaInfo(node);
    const directText = Array.from(node.childNodes)
      .filter(n => n.nodeType === 3 && n.textContent.trim())
      .map(n => n.textContent.trim()).join(' ').slice(0, 60) || null;

    const visibleChildren = Array.from(node.children).filter(c => {
      const r = c.getBoundingClientRect();
      return r.width >= 4 && r.height >= 4;
    });

    const childNodes = visibleChildren.map(c => walk(c, depth + 1)).filter(Boolean);

    return {
      tag: node.tagName.toLowerCase(),
      cls: (node.className || '').toString().split(' ').filter(c => !/^[A-Za-z]+_[a-zA-Z0-9_]+__[a-zA-Z0-9]+$/.test(c)).slice(0, 2).join(' ') || null,
      w: Math.round(node.getBoundingClientRect().width),
      h: Math.round(node.getBoundingClientRect().height),
      media,
      texto: media ? null : directText,
      hijos: childNodes.length ? childNodes : undefined,
    };
  }

  return { seccionAlto: Math.round(section.getBoundingClientRect().height), arbol: walk(section, 0) };
}, { headingText, maxDepth });

console.log(JSON.stringify(tree, null, 2));
await browser.close();
