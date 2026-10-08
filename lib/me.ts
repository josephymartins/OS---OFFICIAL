/** Usuário logado (no navegador), com cache durante a sessão da página. */
import { api } from '@/lib/offline/api';

export interface Me {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
}

let cache: Promise<Me | null> | null = null;

export function getMe(): Promise<Me | null> {
  if (!cache) {
    cache = api('/api/me')
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .catch(() => null);
    cache.then((v) => { if (!v) cache = null; });
  }
  return cache;
}
