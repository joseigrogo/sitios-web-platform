// Fallback del Paso 2 cuando --scroll (extract_composition.mjs) no
// detecta nada nuevo en una sección que ya se sabe animada (Paso 4 dio
// positivo): en vez de perseguir una firma de DOM perfecta, capturar en
// los mismos 5 puntos del rango de la sección y mirar las imágenes
// directo. Confirmado: detecta transiciones por opacity/superposición
// que el diff de firmas no puede ver (dos tarjetas visibles a la vez,
// una saliendo mientras la otra entra).
//
// Uso: node capture_checkpoints.mjs <url> "<texto del heading>" [outDir]
import { chromium } from 'playwright';
import fs from 'fs';

const [, , url, headingText, outDirArg] = process.argv;
if (!url || !headingText) {
  console.error('uso: node capture_checkpoints.mjs <url> "<texto del heading>" [outDir]');
  process.exit(1);
}
const outDir = outDirArg || './output';
fs.mkdirSync(outDir, { recursive: true });

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

const rect = await page.evaluate((headingText) => {
  const heading = Array.from(document.querySelectorAll('h1,h2,h3')).find(h => h.textContent.includes(headingText));
  if (!heading) return null;
  const section = heading.closest('section') || heading.closest('article') || heading.parentElement;
  const r = section.getBoundingClientRect();
  return { y: Math.round(r.y + window.scrollY), height: Math.round(r.height) };
}, headingText);

if (!rect) {
  console.error(`no se encontró ningún heading con texto "${headingText}"`);
  process.exit(1);
}

const checkpoints = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(rect.y + p * rect.height));
const rutas = [];
let i = 0;
for (const y of checkpoints) {
  i++;
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(500);
  const ruta = `${outDir}/checkpoint_${i}_y${y}.png`;
  await page.screenshot({ path: ruta });
  rutas.push(ruta);
}

console.log(JSON.stringify({ seccion: headingText, seccionY: rect.y, seccionAlto: rect.height, capturas: rutas }, null, 2));
await browser.close();
