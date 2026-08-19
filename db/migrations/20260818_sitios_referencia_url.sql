-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-18 vía apply_migration, nombre: sitios_referencia_url.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: para automatizar una primera pasada de Fase 3 (construcción) hace
-- falta guardar el link del sitio de referencia por sitio -- mismo insumo de
-- una sola URL que ya usa el skill de dirección visual (CONTEXT.md §9), no
-- un formato nuevo. Deliberadamente NO se agrega todavía ninguna columna de
-- "estado de construcción" -- ese ciclo de vida depende de lo que salga de
-- estudiar el mapeo real en capital-window (en curso), agregar estados
-- ahora sería inventarlos sin evidencia (Base 3).
--
-- Reversible: `alter table sitios drop column referencia_url;`

alter table sitios add column referencia_url text;
