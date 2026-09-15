-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-09-15 via apply_migration, nombre: sitios_agente_preferido.
--
-- Decision del usuario (2026-09-15): Codex CLI + suscripcion ChatGPT
-- Plus/Pro pasa a ser el agente por DEFAULT para las 3 fases, incluido el
-- cron automatico de cada hora -- DeepSeek (OpenCode) solo corre en un
-- sitio si ese sitio lo pide explicitamente. De ahi el default 'codex' en
-- vez de null: todo sitio existente o nuevo ya queda en 'codex' salvo que
-- alguien lo cambie a mano.
--
-- Riesgo aceptado a propósito, no un descuido: la suscripcion es uso
-- "incluido", no facturacion por token -- la misma categoria de limite
-- que ya saco las 3 fases de claude.ai una vez (ver SETUP.md §2e y
-- CONTEXT.md §14). El campo por sitio existe justamente para poder volver
-- un sitio puntual a 'opencode' si el limite de la cuenta se vuelve un
-- problema real, sin tocar el resto.
--
-- Los 3 instructivos (fase1/2/3) y runner/verificar-avance.mjs filtran por
-- esta columna al autodescubrir trabajo -- cada agente solo toma sitios
-- donde agente_preferido coincide con el suyo. El workflow ahora corre
-- los dos backends en cada tick del cron (antes solo opencode); el que no
-- tiene sitios asignados no-opea, mismo principio que "cero pendientes no
-- es anomalia".
--
-- Reversible: `alter table sitios drop column agente_preferido;`

alter table sitios add column agente_preferido text not null default 'codex'
  check (agente_preferido in ('opencode', 'codex'));
