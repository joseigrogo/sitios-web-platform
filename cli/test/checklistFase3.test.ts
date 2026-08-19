import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ejecutarChecklistFase3 } from '../src/lib/checklistFase3.js';
import type { DependenciasChecklistFase3, RespuestaFetch } from '../src/lib/checklistFase3.js';

const TEXTO_LARGO =
  'Este es un párrafo real con contenido visible en el HTML crudo, pensado para superar el umbral mínimo de palabras que el chequeo de SSR o SSG exige antes de considerar que la página tiene contenido de verdad sin depender de hidratación del lado del cliente para mostrar nada útil a un rastreador que no ejecuta JavaScript en absoluto.';

function htmlCompleto(): string {
  return `<html><head>
    <link rel="canonical" href="https://ejemplo.com/">
    <meta property="og:title" content="Título">
    <meta property="og:description" content="Descripción">
    <meta property="og:image" content="https://ejemplo.com/img.jpg">
    <meta property="og:url" content="https://ejemplo.com/">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"Ejemplo"}</script>
  </head><body>
    <h1>Encabezado</h1>
    <p>${TEXTO_LARGO}</p>
    <img src="/foto.webp" width="100" height="100" alt="foto">
  </body></html>`;
}

function respuesta(parcial: Partial<RespuestaFetch> & { html?: string }): RespuestaFetch {
  return {
    status: 200,
    html: parcial.html ?? '',
    headers: {},
    urlFinal: 'https://ejemplo.com/',
    cadenaRedirects: [],
    ...parcial,
  };
}

// Fake completo: todo pasa. Cada test parte de esto y rompe un solo pedazo.
function crearFetchFalso(overrides: Record<string, (url: string) => RespuestaFetch | undefined> = {}): DependenciasChecklistFase3 {
  return {
    async fetchPagina(url) {
      for (const resolver of Object.values(overrides)) {
        const r = resolver(url);
        if (r) return r;
      }
      if (url.includes('/robots.txt')) {
        return respuesta({ html: 'User-agent: *\nAllow: /\nSitemap: https://ejemplo.com/sitemap.xml', urlFinal: url });
      }
      if (url.includes('/sitemap.xml')) {
        return respuesta({ html: '<urlset><url><loc>https://ejemplo.com/</loc></url></urlset>', urlFinal: url });
      }
      if (url.includes('/esto-no-deberia-existir-')) {
        return respuesta({ status: 404, html: 'not found', urlFinal: url });
      }
      // Las 4 variantes de dominio (http/https, con/sin www) todas caen acá
      // y todas devuelven el mismo destino final -- dominio canónico OK.
      return respuesta({ html: htmlCompleto(), urlFinal: 'https://ejemplo.com/' });
    },
  };
}

test('página completa: pasan los 8 puntos verificables, 2 quedan manuales', async () => {
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', crearFetchFalso());

  const manuales = resultado.items.filter((i) => i.pasa === null);
  const verificables = resultado.items.filter((i) => i.pasa !== null);

  assert.equal(manuales.length, 2);
  assert.deepEqual(
    manuales.map((i) => i.id).sort(),
    ['search_console', 'taxonomia_eventos']
  );
  assert.equal(verificables.length, 8);
  assert.ok(
    verificables.every((i) => i.pasa === true),
    `esperaba que los 8 verificables pasaran, fallaron: ${verificables.filter((i) => !i.pasa).map((i) => i.id).join(', ')}`
  );
  assert.equal(resultado.pasaTodo, true);
});

test('SSR/SSG falla con un shell vacío de SPA', async () => {
  const deps = crearFetchFalso({
    principal: (url) => (url === 'https://ejemplo.com/' ? respuesta({ html: '<html><body><div id="root"></div></body></html>', urlFinal: url }) : undefined),
  });
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  const item = resultado.items.find((i) => i.id === 'ssr_ssg')!;
  assert.equal(item.pasa, false);
  assert.equal(resultado.pasaTodo, false);
});

test('canonical falla si no existe el link', async () => {
  const deps = crearFetchFalso({
    principal: (url) => (url === 'https://ejemplo.com/' ? respuesta({ html: htmlCompleto().replace(/<link rel="canonical"[^>]*>/, ''), urlFinal: url }) : undefined),
  });
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  assert.equal(resultado.items.find((i) => i.id === 'canonical')!.pasa, false);
});

test('Open Graph incompleto si falta og:image', async () => {
  const deps = crearFetchFalso({
    principal: (url) =>
      url === 'https://ejemplo.com/' ? respuesta({ html: htmlCompleto().replace(/<meta property="og:image"[^>]*>/, ''), urlFinal: url }) : undefined,
  });
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  assert.equal(resultado.items.find((i) => i.id === 'open_graph_twitter')!.pasa, false);
});

test('robots_sitemap falla si robots.txt no referencia el sitemap', async () => {
  const deps = crearFetchFalso({
    robots: (url) => (url.includes('/robots.txt') ? respuesta({ html: 'User-agent: *\nAllow: /', urlFinal: url }) : undefined),
  });
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  assert.equal(resultado.items.find((i) => i.id === 'robots_sitemap')!.pasa, false);
});

test('json_ld marca AggregateRating autoreferenciado como no pasa', async () => {
  const html = htmlCompleto().replace(
    '"@type":"LocalBusiness"',
    '"@type":"AggregateRating"'
  );
  const deps = crearFetchFalso({
    principal: (url) => (url === 'https://ejemplo.com/' ? respuesta({ html, urlFinal: url }) : undefined),
  });
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  const item = resultado.items.find((i) => i.id === 'json_ld')!;
  assert.equal(item.pasa, false);
  assert.match(item.detalle, /AggregateRating/);
});

test('404_reales falla si una URL inexistente devuelve 200 (soft 404)', async () => {
  const deps = crearFetchFalso({
    falso404: (url) => (url.includes('/esto-no-deberia-existir-') ? respuesta({ status: 200, html: 'Not Found (pero con 200)', urlFinal: url }) : undefined),
  });
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  assert.equal(resultado.items.find((i) => i.id === '404_reales')!.pasa, false);
});

test('imagenes falla si falta width/height', async () => {
  const deps = crearFetchFalso({
    principal: (url) =>
      url === 'https://ejemplo.com/' ? respuesta({ html: htmlCompleto().replace('width="100" height="100"', ''), urlFinal: url }) : undefined,
  });
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  assert.equal(resultado.items.find((i) => i.id === 'imagenes')!.pasa, false);
});

test('dominio_canonico falla si www y no-www terminan en destinos distintos', async () => {
  const deps: DependenciasChecklistFase3 = {
    async fetchPagina(url) {
      if (url.includes('/robots.txt')) return respuesta({ html: 'Sitemap: https://ejemplo.com/sitemap.xml', urlFinal: url });
      if (url.includes('/sitemap.xml')) return respuesta({ html: '<urlset><url><loc>https://ejemplo.com/</loc></url></urlset>', urlFinal: url });
      if (url.includes('/esto-no-deberia-existir-')) return respuesta({ status: 404, html: '', urlFinal: url });
      // www.ejemplo.com queda como destino propio, distinto del resto --
      // exactamente el caso real que este chequeo tiene que atrapar.
      if (url.startsWith('http://www.ejemplo.com') || url.startsWith('https://www.ejemplo.com')) {
        return respuesta({ html: htmlCompleto(), urlFinal: url });
      }
      return respuesta({ html: htmlCompleto(), urlFinal: 'https://ejemplo.com/' });
    },
  };
  const resultado = await ejecutarChecklistFase3('https://ejemplo.com/', deps);
  const item = resultado.items.find((i) => i.id === 'dominio_canonico')!;
  assert.equal(item.pasa, false);
  assert.equal(resultado.pasaTodo, false);
});
