-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-09-14 via apply_migration.
--
-- Motivo: gap anotado en CONTEXT.md -- si `fase3_construccion_instrucciones.md`
-- cambia despues de que un sitio ya quedo `construccion_estado = 'terminada'`,
-- nada registraba con que version del instructivo se construyo. Paso una vez
-- con Makeover: se reconstruyo con un instructivo viejo y se detecto tarde,
-- a mano.
--
-- `construccion_instructivo_commit`: hash de commit de
-- `db/scripts/fase3_construccion_instrucciones.md` en `sitios-web-platform`
-- al momento en que la rutina escribe `construccion_estado = 'terminada'`
-- (paso 9 del instructivo). Lo escribe la rutina de Fase 3 (via conector o
-- UPDATE directo, igual que `construccion_estado`/`construccion_reporte`).
--
-- `construccion_instructivo_alerta`: la escribe un chequeo periodico aparte
-- (`runner/verificar-instructivo-vigente.mjs`), no la rutina de Fase 3. Si el
-- commit actual del instructivo difiere del guardado, deja una nota legible
-- (ej. "el instructivo cambio el <fecha>: revisar si conviene reconstruir").
-- Nunca dispara una reconstruccion sola -- la decision de reconstruir sigue
-- siendo un gate humano, igual que el resto de Fase 3/4/5 (Base 6).
--
-- Reversible: `alter table sitios drop column construccion_instructivo_commit;`
-- `alter table sitios drop column construccion_instructivo_alerta;`

alter table sitios add column construccion_instructivo_commit text;
alter table sitios add column construccion_instructivo_alerta text;
