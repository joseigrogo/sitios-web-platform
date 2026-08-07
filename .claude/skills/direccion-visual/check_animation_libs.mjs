// Paso 0 de la Parte 5 (comportamiento de scroll) — preguntar antes de barrer a mano.
// Uso: node check_animation_libs.mjs <url>
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  console.error('uso: node check_animation_libs.mjs <url>');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1000);

const libs = await page.evaluate(() => ({
  gsap: typeof window.gsap !== 'undefined',
  scrollTrigger: typeof window.ScrollTrigger !== 'undefined',
  framerMotion: !!document.querySelector('[data-framer-name], [style*="--framer"]'),
  lenis: typeof window.Lenis !== 'undefined' || !!document.querySelector('html.lenis'),
  // GSAP empaquetado como módulo local (webpack/Next.js) no expone
  // window.gsap -- la huella real que deja en el DOM es este wrapper,
  // incluso cuando el chequeo de arriba da todo en false.
  pinSpacerFingerprint: !!document.querySelector('.pin-spacer, [class*="pin-spacer"]'),
  // Swiper (y librerías de carrusel en general) no son scroll-linked --
  // corren en su propio timer/autoplay. Una captura estática no puede
  // distinguir esto de una grilla fija -- confirmado encontrando esto
  // en producción después de reproducir una galería como grilla estática.
  swiper: typeof window.Swiper !== 'undefined' || !!document.querySelector('.swiper-initialized, .swiper-wrapper, [class*="swiper"]'),
}));

console.log(JSON.stringify(libs, null, 2));
if (libs.pinSpacerFingerprint && !libs.gsap && !libs.scrollTrigger) {
  console.log('\n⚠ Contradicción real: hay huella de pin-spacer en el DOM pero window.gsap/ScrollTrigger dan false.');
  console.log('  Interpretación: GSAP está empaquetado como módulo local, no expuesto global -- SÍ se está');
  console.log('  usando ScrollTrigger, pero no se puede consultar ScrollTrigger.getAll() desde afuera.');
  console.log('  El barrido fino manual sigue siendo necesario, pero ya se sabe qué mecanismo buscar.');
}

if (libs.swiper) {
  const wrapInfo = await page.evaluate(() => {
    const el = document.querySelector('.swiper-wrapper');
    if (!el) return null;
    const s = getComputedStyle(el);
    return { transform: s.transform, transitionDuration: s.transitionDuration };
  });
  console.log('\n⚠ Swiper detectado -- NO es scroll-linked, corre en su propio timer (autoplay).');
  console.log('  Una captura estática es indistinguible de una grilla fija -- verificar siempre que');
  console.log('  haya movimiento propio antes de asumir que algo con varias imágenes en fila es');
  console.log('  estático (ver Parte 5 de fase2_direccion_visual.md, sección de carruseles).');
  if (wrapInfo) {
    console.log('  .swiper-wrapper ahora mismo:', JSON.stringify(wrapInfo));
    console.log('  El mecanismo completo sale de leer transform + transition-duration directo --');
    console.log('  no hace falta el barrido fino para esto, a diferencia del scroll-driven de GSAP.');
  }
}

if (libs.scrollTrigger) {
  const triggers = await page.evaluate(() =>
    window.ScrollTrigger.getAll().map(t => ({
      start: t.start, end: t.end, pin: !!t.pin, vars: Object.keys(t.vars || {}),
    }))
  );
  console.log('\nScrollTrigger.getAll() -- configuración real, no hace falta barrer:');
  console.log(JSON.stringify(triggers, null, 2));
} else if (libs.lenis || libs.framerMotion) {
  console.log('\nLibrería de scroll/motion detectada (lenis y/o framerMotion), pero ninguna expone');
  console.log('un equivalente a ScrollTrigger.getAll() -- no hay configuración que leer directo.');
  console.log('lenis suaviza/inercia el scroll nativo (afecta el "feel" aunque no dispare animaciones');
  console.log('por sección) -- si eso importa para la reproducción, sigue haciendo falta el barrido fino');
  console.log('manual para ver qué anima, no solo cómo se siente el scroll (ver Parte 5 del research doc).');
} else {
  console.log('\nNinguna librería reconocida -- si hay animación de scroll, hace falta el barrido fino manual (ver Parte 5 de fase2_direccion_visual.md).');
}

await browser.close();
