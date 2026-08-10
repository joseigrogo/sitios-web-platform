-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-10 vía apply_migration, nombre: keywords_rol_nullable.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: `es_descarte` y `motivo_descarte` ya existían como columnas
-- nullable, pensadas exactamente para "una lista de descartes conscientes"
-- (Fase 1, Qué -- BASES_DEL_SISTEMA.md). Pero `rol` era NOT NULL, así que
-- insertar un descarte puro (sin rol estratégico) era imposible en la
-- práctica -- contradecía el propósito de esas dos columnas. Nadie lo había
-- notado porque esta es la primera vez que se intenta insertar un descarte
-- real: las primeras 29 filas de esta misma corrida (secundaria + long_tail
-- para Capital Window) tienen rol, así que nunca chocaron con el constraint.
-- Encontrado por el error real de Postgres al correr
-- `cli investigacion promover-keyword --descarte`, no por revisión de schema.
--
-- Reversible: `alter table keywords alter column rol set not null;` (solo
-- si no hay filas con rol null en ese momento).

alter table public.keywords alter column rol drop not null;
