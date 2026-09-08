-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-19 vía apply_migration, nombre: sitios_investigacion_fase1_trigger_drop.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: revierte 20260819_sitios_investigacion_fase1_trigger.sql (y su
-- fix de URL, 20260819_sitios_investigacion_fase1_trigger_fix_url.sql).
-- Probado de verdad contra el sitio de prueba descartable
-- (4225f79e-c5cb-4480-a7f9-1d4142a76cad) -- el POST de pg_net salió
-- (confirmado en net._http_response) pero volvió 401
-- "authentication_error" dos veces, con dos URLs distintas y plausibles.
-- El token de `claude setup-token` no autentica contra la API de rutinas
-- desde afuera de una sesión real -- llamar a la herramienta
-- RemoteTrigger SÍ autentica (token en proceso, nunca copiado a mano).
--
-- Implicación real, fuera del alcance de esta tarea pero real: el
-- trigger equivalente de Fase 3 (disparar_construccion_fase3) usa el
-- mismo mecanismo y nunca se probó contra un caso real -- es probable
-- que esté igual de roto. No se toca acá.
--
-- Reemplazo: una rutina programada (cron, vía skill `schedule`) que
-- revisa investigacion_estado='solicitada' cada 15-30 min y dispara
-- trig_01PP5RgzyEMLhGowTtvrFP1h con RemoteTrigger action:run -- mismo
-- resultado final, mecanismo distinto, ya confirmado que autentica.
--
-- Reversible: no aplica (esto ya es la reversión).

drop trigger if exists trigger_investigacion_fase1 on sitios;
drop function if exists disparar_investigacion_fase1();
