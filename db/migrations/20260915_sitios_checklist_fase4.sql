-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-09-15 via apply_migration, nombre: sitios_checklist_fase4.
-- Este archivo documenta lo ya aplicado -- no es pendiente de correr.
--
-- Fase 4 (despliegue, dominio e indexacion) segun el diseno de CONTEXT.md
-- §16. Mismo patron que checklist_fase3_url/resultado, columnas propias en
-- vez de tabla aparte (Base 8): es el mismo motor de checklist
-- (ejecutarChecklistFase3) corrido contra el dominio de PRODUCCION en vez
-- de contra la preview del PR.
--
-- Diferencia real con Fase 3, no cosmetica: en Fase 3 el checklist es
-- medicion (guardar el veredicto no confirma ningun gate). En Fase 4 el
-- resultado SI es condicion del gate de salida -- "dominio resolviendo en
-- HTTPS, sin variantes compitiendo" y "sitemap accesible" son exactamente
-- lo que el checklist ya verifica contra una URL viva.
--
-- Las 3 confirmaciones humanas de Fase 4 (Search Console verificado,
-- sitemap enviado, indexacion solicitada) NO van en columnas: van en
-- `estado_gates -> 'fase4'`, mismo patron que `estado_gates -> 'fase2'`
-- ya usa para sus 3 entregables. No requieren migracion (jsonb).
--
-- Reversible: `alter table sitios drop column checklist_fase4_url;`
-- `alter table sitios drop column checklist_fase4_resultado;`

alter table sitios add column checklist_fase4_url text;
alter table sitios add column checklist_fase4_resultado jsonb;
