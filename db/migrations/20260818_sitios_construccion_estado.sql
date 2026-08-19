-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-18 vía apply_migration, nombre: sitios_construccion_estado.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: la rutina de construcción automática (Fase 3, ver
-- db/scripts/fase3_construccion_instrucciones.md) necesita reportar su
-- progreso de vuelta para que el dashboard lo muestre -- son 3 estados,
-- ni uno más, anclados literal al ciclo de vida que ya describen esas
-- instrucciones (solicitada -> en_curso -> terminada), no inventados
-- aparte. `repo_github` ya existía sin usarse (mismo patrón que
-- estado_gates antes de Fase 2) -- ahí va la referencia al repo nuevo,
-- no se agrega una columna aparte para lo mismo (Base 8).
--
-- Reversible: `alter table sitios drop column construccion_estado;` /
-- `alter table sitios drop column construccion_reporte;`

alter table sitios add column construccion_estado text
  check (construccion_estado is null or construccion_estado in ('solicitada', 'en_curso', 'terminada'));
alter table sitios add column construccion_reporte text;
