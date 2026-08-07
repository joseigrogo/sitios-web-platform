// Composicion interna real de una seccion: baja varios niveles (no uno
// solo), salta wrappers de un hijo automaticamente a cualquier
// profundidad, y detecta imagenes/media reales -- no solo conteo de
// hijos. Complementa extract_structure.mjs (que da el esqueleto de la
// pagina), esto da el detalle DENTRO de una seccion puntual.
//
// Por defecto mide en reposo (scroll=0) -- rapido, pero puede
// subreportar secciones controladas por scroll (ver Parte 2 del
// research doc: encontró 1 de 3 tarjetas reales en una prueba real).
// Con --scroll, muestrea la sección en 5 puntos a lo largo de su propio
// rango de scroll y compara qué aparece en cada uno -- mas caro, pero
// es la unica forma real de no perderse contenido que el scroll dispara.
//
// Uso:
//   node extract_composition.mjs <url> "<heading>" [maxDepth]
//   node extract_composition.mjs <url> "<heading>" [maxDepth] --scroll
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const scrollMode = args.includes('--scroll');
const [url, headingText, maxDepthArg] = args.filter(a => a !== '--scroll');
if (!url || !headingText) {
  console.error('uso: node extract_composition.mjs <url> "<texto del heading>" [maxDepth] [--scroll]');
  process.exit(1);
}
const maxDepth = Number(maxDepthArg) || 5;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
try { await page.locator('button:has-text("Aceptar")').first().click({ timeout: 1500 }); } catch (e) {}
await page.waitForTimeout(800);

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

async function captureTree() {
  return page.evaluate(({ headingText, maxDepth }) => {
    const heading = Array.from(document.querySelectorAll('h1,h2,h3')).find(h => h.textContent.includes(headingText));
    if (!heading) return { error: `no se encontró ningún heading con texto "${headingText}"` };
    const section = heading.closest('section') || heading.closest('article') || heading.parentElement;

    function mediaInfo(el) {
      if (el.tagName === 'IMG') {
        return { tipo: 'img', src: el.currentSrc || el.src, aspecto: el.naturalWidth && el.naturalHeight ? +(el.naturalWidth / el.naturalHeight).toFixed(2) : null };
      }
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.includes('url(')) return { tipo: 'background-image', valor: bg.slice(0, 120) };
      if (el.tagName === 'SVG') return { tipo: 'svg' };
      return null;
    }

    const firmas = new Set();

    function walk(el, depth) {
      if (depth > maxDepth) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return null;

      let node = el;
      let saltados = 0;
      while (node.children.length === 1 && !mediaInfo(node) && saltados < 3) {
        const child = node.children[0];
        const cr = child.getBoundingClientRect();
        const nr = node.getBoundingClientRect();
        if (Math.abs(cr.width - nr.width) < 8 && Math.abs(cr.height - nr.height) < 8) { node = child; saltados++; }
        else break;
      }

      const media = mediaInfo(node);
      const directText = Array.from(node.childNodes)
        .filter(n => n.nodeType === 3 && n.textContent.trim())
        .map(n => n.textContent.trim()).join(' ').slice(0, 60) || null;

      const firma = `${node.tagName}|${media ? media.tipo + ':' + (media.src || media.valor || '') : ''}|${directText || ''}`;
      firmas.add(firma);

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
        media, texto: media ? null : directText,
        hijos: childNodes.length ? childNodes : undefined,
      };
    }

    const arbol = walk(section, 0);
    const rect = section.getBoundingClientRect();
    return {
      seccionY: Math.round(rect.y + window.scrollY),
      seccionAlto: Math.round(rect.height),
      firmasUnicas: firmas.size,
      firmas: Array.from(firmas),
      arbol,
    };
  }, { headingText, maxDepth });
}

if (!scrollMode) {
  const result = await captureTree();
  const { firmas, ...resto } = result;
  console.log(JSON.stringify(resto, null, 2));
  await browser.close();
  process.exit(0);
}

// --scroll: muestrear en 5 puntos del rango de la seccion
const first = await captureTree();
if (first.error) { console.log(JSON.stringify(first)); await browser.close(); process.exit(1); }

const { seccionY, seccionAlto } = first;
const checkpoints = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(seccionY + p * seccionAlto));

const capturas = [];
const todasLasFirmas = new Set();
for (const y of checkpoints) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(400);
  const r = await captureTree();
  r.firmas.forEach(f => todasLasFirmas.add(f));
  capturas.push({ scrollY: y, firmasUnicas: r.firmasUnicas, arbol: r.arbol });
}

console.log(JSON.stringify({
  seccionY, seccionAlto,
  resumen: `en reposo: ${capturas[0].firmasUnicas} elementos únicos -- a lo largo de todo el scroll: ${todasLasFirmas.size} elementos únicos (unión de los 5 puntos muestreados)`,
  capturas,
}, null, 2));

await browser.close();
