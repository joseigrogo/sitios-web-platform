-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-19 vía apply_migration, nombre: sitios_checklist_fase3.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: para que el dashboard muestre el resultado del checklist de
-- Fase 3 (cli sitio checklist-fase3) hace falta guardar el último
-- resultado -- mismo patrón que construccion_reporte, un solo sustrato
-- por responsabilidad (Base 8), nada de estado nuevo inventado.
--
-- Reversible: `alter table sitios drop column checklist_fase3_url;` /
-- `alter table sitios drop column checklist_fase3_resultado;`

alter table sitios add column checklist_fase3_url text;
alter table sitios add column checklist_fase3_resultado jsonb;
