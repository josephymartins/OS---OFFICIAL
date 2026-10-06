/**
 * Cliente do Supabase (somente navegador).
 *
 * Variáveis necessárias (Vercel → Settings → Environment Variables):
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * A chave "anon" é pública por desenho: quem protege os dados é o login
 * e as políticas RLS definidas em supabase/schema.sql.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!url && !!anonKey;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** Id do usuário logado (lança erro se não houver sessão). */
export async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('Sessão expirada. Entre novamente.');
  return uid;
}
