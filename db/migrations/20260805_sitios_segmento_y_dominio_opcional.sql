-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-05 vía apply_migration, nombre: sitios_segmento_y_dominio_opcional.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: el esquema original asumía, sin haberlo decidido a propósito, que
-- todo sitio tiene dominio desde Fase 0 (cierto en los 4 sitios de Estarter,
-- que existían antes de este archivo) y que "segmento" no hacía falta como
-- columna propia. El primer cliente real distinto a Estarter (Capital Window
-- Cleaning) rompió ambos supuestos — ver BASES_DEL_SISTEMA.md, Base 2.
--
-- Reversible: `alter table sitios drop column segmento;` /
-- `alter table sitios alter column dominio set not null;` (esto último solo
-- si no hay filas con dominio null en ese momento).

alter table sitios add column segmento text not null default '';
alter table sitios alter column dominio drop not null;
