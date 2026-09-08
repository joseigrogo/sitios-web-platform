-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-19 vía apply_migration, nombre: sitios_investigacion_estado.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: la rutina de investigación automática (Fase 1, ver
-- db/scripts/fase1_investigacion_instrucciones.md) necesita reportar su
-- progreso de vuelta para que el dashboard lo muestre -- mismo ciclo de
-- vida que ya usa construccion_estado (solicitada -> en_curso ->
-- terminada), clonado a propósito, no un patrón nuevo.
--
-- El trigger + pg_net que dispara la rutina (mismo patrón que
-- trigger_construccion_fase3/disparar_construccion_fase3, ver
-- CONTEXT.md) se aplica y se documenta en una migración aparte, una vez
-- que existe el trigger_id real de RemoteTrigger -- no se puede escribir
-- antes de eso sin inventar un id.
--
-- Reversible: `alter table sitios drop column investigacion_estado;` /
-- `alter table sitios drop column investigacion_reporte;`

alter table sitios add column investigacion_estado text
  check (investigacion_estado is null or investigacion_estado in ('solicitada', 'en_curso', 'terminada'));
alter table sitios add column investigacion_reporte text;
