-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-10 vía apply_migration, nombre: activar_rls_sin_politicas.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: cierra el pendiente de seguridad que CONTEXT.md §2 marcaba como
-- bloqueante desde el 2026-08-04. La hipótesis abierta en Parte 4 de
-- BASES_DEL_SISTEMA.md ("activarlo sin políticas es seguro porque
-- service_role lo bypassea") quedó CONFIRMADA con prueba real, no asumida.
--
-- ── Lo que la prueba encontró ANTES de aplicar esto ──
-- La clave publicable (`sb_publishable_...`, la que va embebida en cualquier
-- bundle de navegador) no solo leía las 6 tablas: también ESCRIBÍA. Un
-- INSERT vía POST /rest/v1/clientes con esa clave devolvió HTTP 201 y creó
-- la fila. No era un riesgo teórico — era acceso de escritura anónimo real.
-- (La fila de prueba, slug 'prueba-rls-borrar', se borró con service_role.)
--
-- ── Verificación DESPUÉS ──
--   - pg_roles: service_role y postgres tienen rolbypassrls = true;
--     anon y authenticated, false. Chequeado antes de aplicar.
--   - Lectura con clave pública: 0 filas en las 6 tablas (antes: 1 en
--     clientes, 1 en sitios).
--   - INSERT con clave pública: HTTP 401, "new row violates row-level
--     security policy".
--   - service_role (el camino del CLI): sin cambios, lee y escribe igual.
--
-- ── GOTCHA real encontrado en la prueba (falla silenciosa, ver Base 7) ──
-- Un DELETE con la clave pública devolvió **HTTP 204, como si hubiera
-- funcionado** — pero no borró nada: RLS ocultó la fila, el DELETE hizo
-- match con cero filas, y PostgREST reporta 204 igual. Un 204 bajo RLS NO
-- significa "borró"; significa "borró lo que podía ver", que puede ser nada.
-- Cualquier automatización que interprete 204 como confirmación de borrado
-- se va a equivocar en silencio.
--
-- ── Por qué SIN políticas ──
-- Deny-all para anon/authenticated es el default más restrictivo y es lo
-- correcto hoy: nada externo consume estas tablas. Las políticas de
-- solo-lectura para la "consola interna" (CONTEXT.md §2) se agregan cuando
-- esa consola exista, no antes. El linter de Supabase reporta
-- `rls_enabled_no_policy` en nivel INFO por esto — es esperado y deliberado,
-- no una omisión.
--
-- Reversible: alter table <tabla> disable row level security;

alter table public.clientes      enable row level security;
alter table public.sitios        enable row level security;
alter table public.keywords      enable row level security;
alter table public.hipotesis     enable row level security;
alter table public.ids_recursos  enable row level security;
alter table public.metricas_ads  enable row level security;
