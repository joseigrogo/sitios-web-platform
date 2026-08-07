// Parte 4 -- efectos que Dembrandt no cubre (glass/blur, blend-modes).
// Uso: node extract_effects.mjs <url>
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('uso: node extract_effects.mjs <url>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
try { await page.locator('button:has-text("Aceptar")').first().click({ timeout: 1500 }); } catch (e) {}
await page.waitForTimeout(800);

const result = await page.evaluate(() => {
  const glass = [];
  const blend = [];
  document.querySelectorAll('body *').forEach(el => {
    const s = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    const backdrop = (s.backdropFilter && s.backdropFilter !== 'none') ? s.backdropFilter
                    : (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none') ? s.webkitBackdropFilter : null;
    if (backdrop) {
      glass.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 70),
        backdropFilter: backdrop,
        backgroundColor: s.backgroundColor,
        borderRadius: s.borderRadius,
        boxShadow: s.boxShadow !== 'none' ? s.boxShadow : null,
        y: Math.round(rect.y + window.scrollY),
        w: Math.round(rect.width), h: Math.round(rect.height),
      });
    }

    if (s.mixBlendMode && s.mixBlendMode !== 'normal') {
      blend.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 50), mode: s.mixBlendMode });
    }
  });
  return { glass, blend };
});

console.log(`=== backdrop-filter real encontrado: ${result.glass.length} elemento(s) ===`);
console.log(JSON.stringify(result.glass, null, 2));
console.log(`\n=== mix-blend-mode real encontrado: ${result.blend.length} elemento(s) ===`);
console.log(JSON.stringify(result.blend, null, 2));

await browser.close();
