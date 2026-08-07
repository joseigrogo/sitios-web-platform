// Paso 0.5 de la Parte 5 -- correr junto a check_animation_libs.mjs,
// antes de decidir si hace falta el barrido fino manual.
//
// Usa el dominio Animation del protocolo CDP (vía sesión de Playwright)
// para ver si el navegador registra animaciones reales -- sirve para
// transiciones CSS (hover, focus, cualquier cosa con `transition:`
// declarado) y CSS Animations/Web Animations API. NO sirve para
// mecanismos donde JS escribe `element.style` directo por frame de
// scroll (confirmado: 0 eventos en ese caso, no es falla de la
// herramienta, ese tipo de escritura nunca crea un objeto Animation
// real del navegador).
//
// Uso: node check_cdp_animations.mjs <url> [scrollEndY]
import { chromium } from 'playwright';

const [, , url, scrollEndArg] = process.argv;
if (!url) {
  console.error('uso: node check_cdp_animations.mjs <url> [scrollEndY]');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
try { await page.locator('button:has-text("Aceptar")').first().click({ timeout: 1500 }); } catch (e) {}
await page.waitForTimeout(800);

const session = await page.context().newCDPSession(page);
await session.send('Animation.enable');

let capturadas = [];
session.on('Animation.animationStarted', (event) => {
  const a = event.animation;
  capturadas.push({
    tipo: a.type,
    nombre: a.name || null,
    duracion: a.source?.duration ?? null,
    easing: a.source?.easing ?? null,
  });
});

// Pase 1: hover sobre los primeros elementos interactivos visibles --
// barato, y da specs exactas de transición si existen.
const interactivos = await page.locator('a, button').all();
let revisados = 0;
for (const el of interactivos) {
  if (revisados >= 5) break;
  try {
    if (await el.isVisible({ timeout: 300 })) { await el.hover({ timeout: 500 }); revisados++; }
  } catch (e) {}
}
await page.waitForTimeout(400);
console.log(`=== Hover sobre ${revisados} elementos interactivos: ${capturadas.length} animaciones reales ===`);
const porNombre = {};
for (const c of capturadas) {
  const key = `${c.nombre}|${c.duracion}ms|${c.easing}`;
  porNombre[key] = (porNombre[key] || 0) + 1;
}
console.log(JSON.stringify(porNombre, null, 2));

// Pase 2: scroll por la pagina (o hasta scrollEndY si se dio) -- esto
// es lo que realmente responde si el scroll dispara animaciones reales.
// Mover el mouse afuera primero -- si queda sobre un elemento del pase
// de hover, contamina esto con transiciones de hover, no de scroll.
await page.mouse.move(5, 5);
await page.waitForTimeout(300);
capturadas = [];
const scrollEnd = Number(scrollEndArg) || await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y <= scrollEnd; y += 300) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(120);
}
console.log(`\n=== Scroll de 0 a ${scrollEnd}px: ${capturadas.length} animaciones reales capturadas ===`);
if (capturadas.length === 0) {
  console.log('Cero no significa "sin animación" -- significa que si hay algo, es JS escribiendo');
  console.log('estilos directo (transform/backgroundColor/etc por frame), no una animación real del');
  console.log('navegador. Hace falta el barrido fino manual (ver Parte 5 del research doc).');
} else {
  console.log(JSON.stringify(capturadas, null, 2));
}

await browser.close();
