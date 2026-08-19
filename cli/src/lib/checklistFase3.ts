import { parse as parseHtml, type HTMLElement } from 'node-html-parser';

// Los 10 puntos vienen literales de Proceso_GENERAL_de_Lanzamiento_Sitios.md
// (Fase 3, "Checklist antes de publicar") -- no se inventó ninguno acá.
// Base de referencia para qué campos vale la pena extraer de un HTML real:
// AgriciDaniel/claude-seo (MIT), scripts/parse_html.py y fetch_page.py --
// candidato ya identificado en BASES_DEL_SISTEMA.md (Base 7), nunca traído
// como código. Se reimplementa acá en TypeScript (no se agrega Python como
// runtime nuevo, Base 8) tomando prestado el diseño de qué chequear, no el
// código en sí.

export interface RespuestaFetch {
  status: number;
  html: string;
  headers: Record<string, string>;
  urlFinal: string;
  cadenaRedirects: string[];
}

export interface DependenciasChecklistFase3 {
  fetchPagina(url: string, opciones?: { seguirRedirects?: boolean }): Promise<RespuestaFetch>;
}

export interface ResultadoItem {
  id: string;
  nombre: string;
  // null = no verificable automáticamente con lo que hay hoy (necesita
  // credenciales o inspección de código fuente) -- nunca se inventa un
  // pasa/no-pasa para esto (Base 3, "cero datos inventados" aplicado acá).
  pasa: boolean | null;
  detalle: string;
}

export interface ChecklistFase3Resultado {
  url: string;
  items: ResultadoItem[];
  pasaTodo: boolean;
}

function itemManual(id: string, nombre: string, motivo: string): ResultadoItem {
  return { id, nombre, pasa: null, detalle: motivo };
}

function chequearSsr(dom: HTMLElement): ResultadoItem {
  const texto = dom.querySelector('body')?.text?.trim() ?? '';
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  const pasa = palabras >= 50;
  return {
    id: 'ssr_ssg',
    nombre: 'SSR/SSG en páginas SEO',
    pasa,
    detalle: pasa
      ? `${palabras} palabras de texto real en el HTML sin ejecutar JS.`
      : `Solo ${palabras} palabra(s) en el HTML crudo -- probablemente el contenido depende de hidratación del lado del cliente, no de SSR/SSG.`,
  };
}

function chequearCanonical(dom: HTMLElement, urlFinal: string): ResultadoItem {
  const href = dom.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!href) {
    return { id: 'canonical', nombre: 'Canonical único y consistente', pasa: false, detalle: 'No se encontró <link rel="canonical"> en el HTML.' };
  }
  try {
    const absoluta = new URL(href, urlFinal).toString();
    return { id: 'canonical', nombre: 'Canonical único y consistente', pasa: true, detalle: `Canonical: ${absoluta}` };
  } catch {
    return { id: 'canonical', nombre: 'Canonical único y consistente', pasa: false, detalle: `El canonical "${href}" no es una URL válida.` };
  }
}

function chequearOgTwitter(dom: HTMLElement): ResultadoItem {
  const leerMeta = (prop: string) =>
    dom.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ??
    dom.querySelector(`meta[name="${prop}"]`)?.getAttribute('content');

  const ogRequeridos = ['og:title', 'og:description', 'og:image', 'og:url'];
  const ogFaltantes = ogRequeridos.filter((p) => !leerMeta(p));
  const tieneTwitterCard = Boolean(leerMeta('twitter:card'));
  const pasa = ogFaltantes.length === 0 && tieneTwitterCard;

  return {
    id: 'open_graph_twitter',
    nombre: 'Open Graph / Twitter cards por página',
    pasa,
    detalle: [
      ogFaltantes.length > 0 ? `Open Graph incompleto, falta: ${ogFaltantes.join(', ')}.` : 'Open Graph completo.',
      tieneTwitterCard ? 'twitter:card presente.' : 'Falta twitter:card.',
    ].join(' '),
  };
}

async function chequearRobotsSitemap(url: string, deps: DependenciasChecklistFase3): Promise<ResultadoItem> {
  const base = new URL(url).origin;
  const robots = await deps.fetchPagina(`${base}/robots.txt`, { seguirRedirects: false });
  const sitemap = await deps.fetchPagina(`${base}/sitemap.xml`, { seguirRedirects: false });

  const robotsOk = robots.status === 200;
  const sitemapOk = sitemap.status === 200 && sitemap.html.includes('<urlset');
  const robotsReferenciaSitemap = robots.html.toLowerCase().includes('sitemap:');
  const pasa = robotsOk && sitemapOk && robotsReferenciaSitemap;

  return {
    id: 'robots_sitemap',
    nombre: 'robots.txt + sitemap.xml completos',
    pasa,
    detalle: [
      robotsOk ? 'robots.txt responde 200.' : `robots.txt devolvió ${robots.status}.`,
      sitemapOk ? 'sitemap.xml responde 200 y tiene <urlset>.' : `sitemap.xml devolvió ${sitemap.status} o no parece un sitemap válido.`,
      robotsReferenciaSitemap ? 'robots.txt referencia el sitemap.' : 'robots.txt no referencia ningún Sitemap:.',
    ].join(' '),
  };
}

function chequearJsonLd(dom: HTMLElement): ResultadoItem {
  const scripts = dom.querySelectorAll('script[type="application/ld+json"]');
  if (scripts.length === 0) {
    return { id: 'json_ld', nombre: 'JSON-LD válido', pasa: false, detalle: 'No se encontró ningún <script type="application/ld+json">.' };
  }

  const bloques: unknown[] = [];
  const errores: string[] = [];
  for (const s of scripts) {
    try {
      bloques.push(JSON.parse(s.text));
    } catch {
      errores.push('Un bloque JSON-LD no es JSON válido.');
    }
  }

  const sinContextoOTipo = bloques.filter(
    (b) => typeof b !== 'object' || b === null || !('@context' in (b as object)) || !('@type' in (b as object))
  ).length;
  if (sinContextoOTipo > 0) errores.push(`${sinContextoOTipo} bloque(s) sin @context o @type.`);

  // Falla ya documentada en Proceso_GENERAL (nota de Fase 3): Google prohíbe
  // el review snippet de una empresa sobre sí misma.
  const tieneReviewAutoreferenciado = bloques.some((b) => {
    const tipo = (b as Record<string, unknown> | null)?.['@type'];
    return tipo === 'AggregateRating' || tipo === 'Review';
  });
  if (tieneReviewAutoreferenciado) {
    errores.push(
      'Hay un bloque AggregateRating/Review -- confirmar que son reseñas de terceros verificadas, Google prohíbe el review snippet de una empresa sobre sí misma (ver Proceso_GENERAL, nota de Fase 3).'
    );
  }

  return {
    id: 'json_ld',
    nombre: 'JSON-LD válido',
    pasa: errores.length === 0,
    detalle:
      errores.length === 0
        ? `${bloques.length} bloque(s) JSON-LD, estructura básica válida. Validación completa contra Rich Results Test de Google no automatizada -- confirmar en search.google.com/test/rich-results.`
        : errores.join(' '),
  };
}

async function chequear404Real(url: string, deps: DependenciasChecklistFase3): Promise<ResultadoItem> {
  const base = new URL(url).origin;
  const rutaFalsa = `${base}/esto-no-deberia-existir-${Date.now()}`;
  const respuesta = await deps.fetchPagina(rutaFalsa, { seguirRedirects: false });
  const pasa = respuesta.status === 404;

  return {
    id: '404_reales',
    nombre: '404 reales, no soft 404',
    pasa,
    detalle: pasa
      ? 'Una URL inexistente devuelve 404 real.'
      : `Una URL inexistente devolvió ${respuesta.status} -- si es 200, es un soft 404 (falla silenciosa real para crawlers).`,
  };
}

function chequearImagenes(dom: HTMLElement): ResultadoItem {
  const imgs = dom.querySelectorAll('img');
  if (imgs.length === 0) {
    return { id: 'imagenes', nombre: 'Imágenes con dimensiones y formato moderno', pasa: true, detalle: 'No hay <img> en la página.' };
  }

  const formatosModernos = ['.webp', '.avif'];
  let sinDimensiones = 0;
  let formatoAntiguo = 0;

  for (const img of imgs) {
    const src = img.getAttribute('src') ?? '';
    if (!img.getAttribute('width') || !img.getAttribute('height')) sinDimensiones++;
    if (src && !src.startsWith('data:') && !formatosModernos.some((ext) => src.toLowerCase().includes(ext))) {
      formatoAntiguo++;
    }
  }

  const pasa = sinDimensiones === 0 && formatoAntiguo === 0;
  return {
    id: 'imagenes',
    nombre: 'Imágenes con dimensiones y formato moderno',
    pasa,
    detalle: [
      sinDimensiones > 0 ? `${sinDimensiones}/${imgs.length} imágenes sin width/height explícitos.` : 'Todas las imágenes tienen width/height.',
      formatoAntiguo > 0 ? `${formatoAntiguo}/${imgs.length} imágenes no están en formato moderno (webp/avif).` : 'Todas en formato moderno.',
    ].join(' '),
  };
}

function construirVariantesDominio(original: URL): string[] {
  const host = original.hostname.replace(/^www\./, '');
  const variantes = new Set<string>();
  for (const protocolo of ['http', 'https']) {
    for (const h of [host, `www.${host}`]) {
      variantes.add(`${protocolo}://${h}${original.pathname}`);
    }
  }
  return [...variantes];
}

async function chequearDominioCanonico(url: string, deps: DependenciasChecklistFase3): Promise<ResultadoItem> {
  const variantes = construirVariantesDominio(new URL(url));
  const destinos = new Set<string>();

  for (const variante of variantes) {
    const respuesta = await deps.fetchPagina(variante, { seguirRedirects: true });
    const u = new URL(respuesta.urlFinal);
    destinos.add(`${u.protocol}//${u.host}`);
  }

  const pasa = destinos.size === 1;
  return {
    id: 'dominio_canonico',
    nombre: 'Un solo dominio canónico',
    pasa,
    detalle: pasa
      ? `Las ${variantes.length} variantes (http/https, con/sin www) terminan en el mismo destino: ${[...destinos][0]}.`
      : `Las variantes terminan en destinos distintos: ${[...destinos].join(', ')} -- falta forzar la redirección a uno solo.`,
  };
}

export async function ejecutarChecklistFase3(url: string, deps: DependenciasChecklistFase3): Promise<ChecklistFase3Resultado> {
  const respuesta = await deps.fetchPagina(url, { seguirRedirects: true });
  const dom = parseHtml(respuesta.html);

  const items: ResultadoItem[] = [
    chequearSsr(dom),
    chequearCanonical(dom, respuesta.urlFinal),
    chequearOgTwitter(dom),
    await chequearRobotsSitemap(respuesta.urlFinal, deps),
    chequearJsonLd(dom),
    await chequear404Real(respuesta.urlFinal, deps),
    chequearImagenes(dom),
    itemManual(
      'taxonomia_eventos',
      'Taxonomía de eventos cableada con el helper',
      'No verificable contra una URL en vivo -- requiere inspeccionar el código fuente (buscar pushDataLayerEvent). No implementado en esta versión.'
    ),
    await chequearDominioCanonico(respuesta.urlFinal, deps),
    itemManual(
      'search_console',
      'Search Console conectado desde el día 1',
      'Requiere la API de Search Console con credenciales propias, no configuradas todavía en este proyecto -- confirmar a mano en search.google.com/search-console.'
    ),
  ];

  const verificables = items.filter((i) => i.pasa !== null);
  const pasaTodo = verificables.length > 0 && verificables.every((i) => i.pasa === true);

  return { url: respuesta.urlFinal, items, pasaTodo };
}

export function crearDependenciasFetchReal(): DependenciasChecklistFase3 {
  return {
    async fetchPagina(url, opciones = {}) {
      const seguir = opciones.seguirRedirects ?? true;
      const cadenaRedirects: string[] = [];
      let actual = url;

      for (let saltos = 0; saltos < 10; saltos++) {
        const res = await fetch(actual, { redirect: 'manual' });
        const headers = Object.fromEntries(res.headers.entries());

        if (seguir && res.status >= 300 && res.status < 400 && res.headers.has('location')) {
          cadenaRedirects.push(actual);
          actual = new URL(res.headers.get('location')!, actual).toString();
          continue;
        }

        return { status: res.status, html: await res.text(), headers, urlFinal: actual, cadenaRedirects };
      }

      throw new Error(`Demasiados redirects (>10) empezando en ${url}`);
    },
  };
}
