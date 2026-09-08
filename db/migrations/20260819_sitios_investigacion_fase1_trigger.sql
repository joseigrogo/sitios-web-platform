-- Aplicada a Supabase (proyecto aoowwztkitctnwbbwbwk, "Sitios Web") el
-- 2026-08-19 vía apply_migration, nombre: sitios_investigacion_fase1_trigger.
-- Este archivo documenta lo ya aplicado — no es pendiente de correr.
--
-- Motivo: dispara la rutina de investigación automática (Fase 1, ver
-- db/scripts/fase1_investigacion_instrucciones.md) apenas
-- investigacion_estado pasa a 'solicitada' -- mismo patrón que
-- disparar_construccion_fase3 (Fase 3), a diferencia de esa cual ESTA
-- vez sí queda versionada en el repo (Fase 3 se aplicó directo contra
-- Supabase y nunca se guardó como archivo -- ver CONTEXT.md).
--
-- trig_01PP5RgzyEMLhGowTtvrFP1h es el RemoteTrigger real ("Investigación
-- automática de sitio (Fase 1)"), creado con conectores curados (solo
-- OpenSEO hosted app.openseo.so + Supabase). El token en
-- vault.decrypted_secrets ('investigacion_fase1_api_token') es un token
-- OAuth de cuenta completa (via `claude setup-token`), no un secreto
-- acotado a esta rutina -- mismo mecanismo ya aceptado para Fase 3.
--
-- Reversible: `drop trigger trigger_investigacion_fase1 on sitios;` /
-- `drop function disparar_investigacion_fase1();`

create or replace function disparar_investigacion_fase1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_token text;
begin
  if new.investigacion_estado = 'solicitada' and (old.investigacion_estado is distinct from 'solicitada') then
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'investigacion_fase1_api_token';

    perform net.http_post(
      url := 'https://api.anthropic.com/v1/claude_code/routines/trig_01PP5RgzyEMLhGowTtvrFP1h/fire',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_token
      ),
      body := jsonb_build_object('sitio_id', new.id::text)
    );
  end if;
  return new;
end;
$function$;

create trigger trigger_investigacion_fase1
  after update on sitios for each row execute function disparar_investigacion_fase1();
