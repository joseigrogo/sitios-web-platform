import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function crearSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno (ver cli/.env.example). ' +
        'Tiene que ser la service_role key: RLS está activo sin políticas, así que la clave ' +
        'publicable no puede leer ni escribir estas tablas (CONTEXT.md §2).'
    );
  }

  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}
