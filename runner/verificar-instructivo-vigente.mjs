#!/usr/bin/env node
// ¿Un sitio ya construido (Fase 3) quedó desactualizado porque el instructivo
// cambió después?
//
// Por qué existe: `sitios.repo_github` se reusa entre corridas (Fase 3 nunca
// crea un segundo repo para el mismo sitio), y una vez `construccion_estado
// = 'terminada'` nada vuelve a tocar ese sitio solo. Si
// `fase3_construccion_instrucciones.md` cambia después -- pasó de verdad el
// 2026-09-09 con Makeover, se reconstruyó con un instructivo viejo y se
// detectó tarde, a mano -- nadie se entera. Este chequeo no arregla nada
// solo: deja una nota visible y la decisión de reconstruir sigue siendo
// humana (Base 6), igual que el resto de Fase 3.
//
// Huella = sha256 del contenido del instructivo, no un commit de git: el
// checkout del workflow es superficial (fetch-depth: 1 por defecto), así que
// `git log` no puede confiar en encontrar el commit real que tocó el
// archivo. El hash de contenido no depende de cuánto historial haya.
//
// Uso: node runner/verificar-instructivo-vigente.mjs

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const INSTRUCTIVO = 'db/scripts/fase3_construccion_instrucciones.md';

function bogota(d) {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

async function main() {
  const urlBase = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlBase || !key) {
    console.log('Sin credenciales de Supabase: no se puede verificar, se omite.');
    return 0;
  }

  let hashActual;
  try {
    hashActual = createHash('sha256').update(readFileSync(INSTRUCTIVO)).digest('hex');
  } catch (err) {
    console.log(`No se pudo leer ${INSTRUCTIVO}: ${err.message}. Se omite.`);
    return 0;
  }

  const campos = 'id,nombre_marca,construccion_instructivo_hash,construccion_instructivo_alerta';
  const filtro = 'construccion_estado=eq.terminada&construccion_instructivo_hash=not.is.null';
  const res = await fetch(`${urlBase}/rest/v1/sitios?select=${campos}&${filtro}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.log(`Supabase respondió ${res.status}: no se puede verificar, se omite.`);
    return 0;
  }

  const sitios = await res.json();
  if (sitios.length === 0) {
    console.log('Ningún sitio terminado con hash guardado todavía.');
    return 0;
  }

  const mensajeDesactualizado =
    `el instructivo de Fase 3 cambió desde que este sitio se construyó ` +
    `(detectado el ${bogota(new Date())}) -- revisar a mano si conviene reconstruir`;

  let alertados = 0;
  let limpiados = 0;

  for (const sitio of sitios) {
    const desactualizado = sitio.construccion_instructivo_hash !== hashActual;
    const yaAlertado = typeof sitio.construccion_instructivo_alerta === 'string' && sitio.construccion_instructivo_alerta.length > 0;

    if (desactualizado && !yaAlertado) {
      const patch = await fetch(`${urlBase}/rest/v1/sitios?id=eq.${sitio.id}`, {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ construccion_instructivo_alerta: mensajeDesactualizado }),
      });
      if (patch.ok) {
        alertados++;
        console.log(`Marcado desactualizado: ${sitio.nombre_marca} (${sitio.id}).`);
      } else {
        console.log(`No se pudo marcar ${sitio.nombre_marca} (${sitio.id}): Supabase respondió ${patch.status}.`);
      }
    } else if (!desactualizado && yaAlertado) {
      // El hash vuelve a coincidir (reconstruido, o el instructivo volvió a
      // su versión anterior): la alerta ya no aplica.
      const patch = await fetch(`${urlBase}/rest/v1/sitios?id=eq.${sitio.id}`, {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ construccion_instructivo_alerta: null }),
      });
      if (patch.ok) {
        limpiados++;
        console.log(`Alerta limpiada (hash vuelve a coincidir): ${sitio.nombre_marca} (${sitio.id}).`);
      }
    }
  }

  console.log(`Revisados ${sitios.length} sitio(s) terminados: ${alertados} nuevo(s) alertado(s), ${limpiados} limpiado(s).`);
  return 0;
}

process.exitCode = await main();
