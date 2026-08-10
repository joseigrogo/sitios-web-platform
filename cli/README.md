# cli

CLI determinista de la plataforma (Base 4/8 de `../BASES_DEL_SISTEMA.md`). Primer
comando: Fase 0 (encuadre). El *qué* y el *porqué* de cada regla viven en
`../BASES_DEL_SISTEMA.md` — este README es solo cómo correrlo.

## Setup

```bash
npm install
cp .env.example .env   # completar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
```

RLS está activo desde el 2026-08-10 y `service_role` lo bypassea, así que
este CLI funciona con normalidad (ver `../CONTEXT.md` §2). La
`SUPABASE_SERVICE_ROLE_KEY` es una credencial privada — no va a git ni a un
cliente; `.env` está gitignoreado.

El `.env` se carga con `process.loadEnvFile` (built-in de Node ≥ 20.12, sin
dependencia extra), resuelto contra la ubicación del módulo — funciona igual
en dev (`tsx` desde `src/`), build (`node` desde `dist/`) o `cli` global
después de `npm link`.

## Comandos

```bash
npm run dev -- cliente alta \
  --cliente-slug capital-window-cleaning \
  --cliente-nombre "Capital Window Cleaning" \
  --cliente-vertical limpieza_ventanas \
  --cliente-modelo unico \
  --cliente-respaldo-legal "Ninguno — confirmado sin licencia vigente" \
  --sitio-nombre-marca "Capital Window Cleaning" \
  --sitio-arquetipo landing_directa \
  --sitio-segmento "Propietarios residenciales en DC — evidencia: spec.md"

npm run dev -- sitio gate-fase0 <sitioId>              # solo verifica
npm run dev -- sitio gate-fase0 <sitioId> --confirmar  # verifica y, si pasa, hace el flip a investigacion
```

Si `--cliente-slug` ya existe, `cliente alta` salta la creación del cliente y
solo agrega el sitio — no hace falta pasar el resto de flags de `--cliente-*`.

### Orden en que falla

1. Flags obligatorios faltantes — los ataja Commander, antes de correr nada.
2. Validación local (slug, y los 3 campos de sitio) — antes de abrir conexión,
   así un flag mal puesto nunca se reporta como un error de credenciales.
3. Credenciales faltantes — recién acá se necesita `.env`.
4. Validación que depende de la base (los campos obligatorios de un cliente
   *nuevo*, incluido `--cliente-respaldo-legal`) — solo se puede evaluar
   después de consultar si el slug ya existe.

## Test

```bash
npm test   # node:test contra repos falsos en memoria — nunca toca Supabase real
```
