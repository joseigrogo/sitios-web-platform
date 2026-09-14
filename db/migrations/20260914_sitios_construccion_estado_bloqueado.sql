-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-09-14 via execute_sql (no via apply_migration -- por eso no aparecia
-- en list_migrations pese a estar ya en produccion). Este archivo documenta
-- lo ya aplicado, con retraso: la base llevaba el fix desde el 2026-09-14
-- pero el repo no tenia el registro, dejando 20260818_sitios_construccion_estado.sql
-- desactualizado como fuente de verdad del schema.
--
-- Motivo: fase3_construccion_instrucciones.md pide explicitamente guardar
-- `construccion_estado = 'bloqueado: <motivo>'` cuando la rutina se topa con
-- algo que no puede resolver sola (ver lineas 118-123 y 80 del instructivo).
-- El CHECK original (20260818_sitios_construccion_estado.sql) solo permitia
-- 'solicitada' | 'en_curso' | 'terminada' -- la base rechazaba el propio
-- comportamiento que el instructivo manda, y la rutina no tenia forma de
-- reportar el bloqueo.
--
-- Descubierto el 2026-09-14 revisando 5 dias de corridas sin supervision.
--
-- Reversible: `alter table sitios drop constraint sitios_construccion_estado_check;`
-- seguido de recrear el CHECK de 20260818_sitios_construccion_estado.sql.

alter table sitios drop constraint sitios_construccion_estado_check;

alter table sitios add constraint sitios_construccion_estado_check
  check (
    construccion_estado is null
    or construccion_estado in ('solicitada', 'en_curso', 'terminada')
    or construccion_estado like 'bloqueado:%'
  );
