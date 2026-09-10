#!/usr/bin/env node
// ¿La fase que acaba de correr movió algo, o salió en verde sin trabajar?
//
// Por qué existe: el 2026-09-09 una corrida de Fase 3 con kimi-k3 escribió un
// SELECT con una coma de más, Supabase lo rechazó, el agente abandonó — y
// GitHub Actions reportó los 10 pasos en verde. Sin mirar la base, esa corrida
// pasa por exitosa. Base 7: "el silencio es alarmante, no tranquilizador".
//
// Uso:  node runner/verificar-avance.mjs <fase> antes|despues <archivo-snapshot>
//
// "antes" guarda qué sitios estaban pendientes. "despues" compara: si alguno
// que estaba pendiente sigue EXACTAMENTE igual, la fase no lo tocó y el job
// falla. Cero pendientes al arrancar es el caso normal (no-op legítimo) y
// nunca falla.

import { readFileSync, writeFileSync } from 'node:fs';

// La "huella" de un sitio pendiente: si no cambió ninguno de estos campos, la
// fase no hizo nada con él. Se incluye el reporte porque una fase que quedó
// bloqueada igual escribe ahí el motivo — eso cuenta como avance.
const CAMPOS = {
  1: 'id,investigacion_estado,investigacion_reporte',
  2: 'id,fase_actual,estado_gates',
  3: 'id,construccion_estado,construccion_reporte,repo_github',
};

const FILTRO = {
  1: 'investigacion_estado=eq.solicitada&fase_actual=eq.investigacion',
  2: 'fase_actual=eq.spec',
  3: 'construccion_estado=eq.solicitada&fase_actual=eq.construccion',
};

async function main() {
  const [fase, modo, archivo] = process.argv.slice(2);
  if (!['1', '2', '3'].includes(fase) || !['antes', 'despues'].includes(modo) || !archivo) {
    console.error('uso: verificar-avance.mjs <1|2|3> <antes|despues> <archivo>');
    return 2;
  }

  const urlBase = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlBase || !key) {
    console.log('Sin credenciales de Supabase: no se puede verificar avance, se omite.');
    return 0;
  }

  const res = await fetch(`${urlBase}/rest/v1/sitios?select=${CAMPOS[fase]}&${FILTRO[fase]}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.log(`Supabase respondió ${res.status}: no se puede verificar avance, se omite.`);
    return 0;
  }

  const filas = await res.json();
  const huella = Object.fromEntries(filas.map((f) => [f.id, JSON.stringify(f)]));

  if (modo === 'antes') {
    writeFileSync(archivo, JSON.stringify(huella));
    const n = Object.keys(huella).length;
    console.log(n === 0 ? 'Sin trabajo pendiente al arrancar.' : `Pendientes al arrancar: ${n}`);
    return 0;
  }

  let antes = {};
  try {
    antes = JSON.parse(readFileSync(archivo, 'utf8'));
  } catch {
    console.log('Sin snapshot previo: no se puede comparar, se omite.');
    return 0;
  }

  const ids = Object.keys(antes);
  if (ids.length === 0) {
    console.log('No había trabajo pendiente: salir sin hacer nada era lo correcto.');
    return 0;
  }

  const sinTocar = ids.filter((id) => huella[id] === antes[id]);
  if (sinTocar.length === 0) {
    console.log(`Avance verificado: los ${ids.length} sitio(s) pendientes cambiaron de estado.`);
    return 0;
  }

  console.log(
    `::error::Fase ${fase} terminó sin tocar ${sinTocar.length} de ${ids.length} sitio(s) que estaban pendientes: ${sinTocar.join(', ')}`
  );
  console.log('El job habría salido en verde igual. Revisar el log de la fase: el agente');
  console.log('probablemente falló y abandonó en silencio (ej. una query mal formada).');
  return 1;
}

// process.exitCode en vez de process.exit(): con un fetch recién cerrado,
// process.exit() dispara una assertion de libuv en Windows y devuelve 127.
// Dejar que Node termine solo da el código correcto en los dos sistemas.
process.exitCode = await main();
