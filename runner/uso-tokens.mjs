#!/usr/bin/env node
// Reporta cuántos tokens y cuánto costó la corrida que acaba de terminar.
//
// Por qué existe: mover las 3 fases a DeepSeek se decidió por costo, y sin
// esto no hay forma de saber qué gastó cada corrida — la pestaña "Uso" del
// workspace da el total de la cuenta, no el desglose por fase. OpenCode no
// imprime consumo, pero deja las sesiones en disco; esto las lee y suma.
//
// No conoce el esquema de OpenCode de memoria: busca recursivamente
// cualquier objeto con forma de uso (`tokens` con campos numéricos, `cost`
// numérico) y suma lo que encuentre. Si no encuentra nada, imprime qué SÍ
// había, para que la corrida siguiente ya nos diga el esquema real en vez de
// quedarnos adivinando.
//
// Nunca falla: el reporte de gasto no puede tumbar una fase que salió bien.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// La primera corrida real (34408985859) no encontró nada en las dos primeras:
// OpenCode guarda las sesiones en otro lado. Se amplían las raíces en vez de
// adivinar cuál es la buena, y si igual no aparece se imprime el árbol de
// directorios para saberlo de una vez (ver el bloque de diagnóstico al final).
const RAICES = [
  join(homedir(), '.local', 'share', 'opencode'),
  join(homedir(), '.config', 'opencode'),
  join(homedir(), '.opencode'),
  join(homedir(), '.cache', 'opencode'),
  ...(process.env.XDG_DATA_HOME ? [join(process.env.XDG_DATA_HOME, 'opencode')] : []),
  ...(process.env.GITHUB_WORKSPACE ? [join(process.env.GITHUB_WORKSPACE, '.opencode')] : []),
];
const IGNORAR = new Set(['node_modules', '.git', 'bin', 'cache', 'log']);
// auth.json guarda la API key del gateway en texto plano. GitHub enmascara el
// secreto completo (el JSON de OPENCODE_AUTH_JSON), no una subcadena suya, así
// que imprimir este archivo filtraría la key en claro en el log. Nunca leerlo.
const ARCHIVOS_PROHIBIDOS = new Set(['auth.json', 'credentials.json', '.env']);
const MAX_ARCHIVOS = 5000;

function* recorrer(dir, profundidad = 0) {
  if (profundidad > 8) return;
  let entradas;
  try {
    entradas = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entradas) {
    if (IGNORAR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* recorrer(p, profundidad + 1);
    else if (e.isFile() && e.name.endsWith('.json') && !ARCHIVOS_PROHIBIDOS.has(e.name)) yield p;
  }
}

const total = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 };
let costo = 0;
let conUso = 0;
const modelos = new Set();
const clavesVistas = new Set();

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// Recorre cualquier JSON buscando la forma "uso", sin asumir dónde está.
function buscarUso(nodo) {
  if (!nodo || typeof nodo !== 'object') return;
  if (Array.isArray(nodo)) {
    for (const x of nodo) buscarUso(x);
    return;
  }
  for (const k of Object.keys(nodo)) clavesVistas.add(k);

  if (typeof nodo.modelID === 'string') modelos.add(nodo.modelID);
  if (typeof nodo.model === 'string') modelos.add(nodo.model);

  const t = nodo.tokens ?? nodo.usage;
  if (t && typeof t === 'object' && !Array.isArray(t)) {
    const input = num(t.input ?? t.input_tokens ?? t.promptTokens);
    const output = num(t.output ?? t.output_tokens ?? t.completionTokens);
    if (input || output || t.reasoning || t.cache) {
      conUso++;
      total.input += input;
      total.output += output;
      total.reasoning += num(t.reasoning);
      total.cacheRead += num(t.cache?.read ?? t.cache_read_input_tokens);
      total.cacheWrite += num(t.cache?.write ?? t.cache_creation_input_tokens);
      costo += num(nodo.cost);
    }
  }

  for (const v of Object.values(nodo)) buscarUso(v);
}

let archivos = 0;
const muestras = [];
for (const raiz of RAICES) {
  try {
    statSync(raiz);
  } catch {
    continue;
  }
  for (const archivo of recorrer(raiz)) {
    if (++archivos > MAX_ARCHIVOS) break;
    try {
      const dato = JSON.parse(readFileSync(archivo, 'utf8'));
      buscarUso(dato);
      // Solo la RUTA y los nombres de las claves -- nunca los valores. Un
      // JSON de sesión puede tener credenciales dentro de un prompt, así que
      // volcar contenido crudo al log de Actions no es una opción.
      if (muestras.length < 5 && dato && typeof dato === 'object') {
        muestras.push(`${archivo}  →  claves: ${Object.keys(dato).slice(0, 20).join(', ')}`);
      }
    } catch {
      // Un JSON ilegible o a medio escribir no es motivo para no reportar el resto.
    }
  }
}

console.log('::group::Uso de tokens de esta corrida');
console.log(`archivos JSON leídos: ${archivos}`);

if (conUso === 0) {
  console.log('');
  console.log('No se encontró ningún bloque de uso con la forma esperada.');
  console.log('Archivos vistos (solo rutas y nombres de claves, nunca valores):');
  for (const m of muestras) console.log('  ' + m);

  // Sin esto quedaríamos adivinando dónde guarda OpenCode las sesiones. El
  // árbol de directorios (solo nombres de carpeta, ningún contenido) alcanza
  // para saberlo y ajustar las raíces en la corrida siguiente.
  console.log('');
  console.log('Árbol de directorios de OpenCode (solo carpetas, para ubicar las sesiones):');
  const listarDirs = (dir, prof = 0) => {
    if (prof > 3) return;
    let entradas;
    try {
      entradas = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      if (!e.isDirectory()) continue;
      const p = join(dir, e.name);
      let cuantos = 0;
      try {
        cuantos = readdirSync(p).length;
      } catch {}
      console.log(`  ${'  '.repeat(prof)}${e.name}/  (${cuantos} entradas)`);
      listarDirs(p, prof + 1);
    }
  };
  for (const raiz of RAICES) {
    try {
      statSync(raiz);
    } catch {
      continue;
    }
    console.log(`  ${raiz}`);
    listarDirs(raiz);
  }
} else {
  const suma = total.input + total.output + total.reasoning;
  console.log(`mensajes con uso:  ${conUso}`);
  if (modelos.size) console.log(`modelo(s):         ${[...modelos].join(', ')}`);
  console.log(`input:             ${total.input.toLocaleString('es')}`);
  console.log(`output:            ${total.output.toLocaleString('es')}`);
  if (total.reasoning) console.log(`reasoning:         ${total.reasoning.toLocaleString('es')}`);
  if (total.cacheRead) console.log(`cache leído:       ${total.cacheRead.toLocaleString('es')}`);
  if (total.cacheWrite) console.log(`cache escrito:     ${total.cacheWrite.toLocaleString('es')}`);
  console.log(`TOTAL tokens:      ${suma.toLocaleString('es')}`);
  // El costo lo reporta el gateway por mensaje; si viene en 0 puede ser que
  // este plan no lo exponga, no que la corrida haya sido gratis.
  console.log(costo > 0 ? `costo reportado:   USD ${costo.toFixed(4)}` : 'costo: no reportado por el gateway');
}
console.log('::endgroup::');
