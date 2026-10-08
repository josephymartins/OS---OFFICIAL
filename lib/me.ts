/** Usuário logado (no navegador), com cache na página e cópia no aparelho para uso offline. */
import { api } from '@/lib/offline/api';
import { readCache, writeCache } from '@/lib/local-cache';

export interface Me {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
}

const KEY = 'me';
let cache: Promise<Me | null> | null = null;

export function getMe(): Promise<Me | null> {
  if (!cache) {
    cache = api('/api/me')
      .then(async (r) => {
        if (!r.ok) return null;
        const me = (await r.json()) as Me;
        writeCache(KEY, me);
        return me;
      })
      .catch(() => readCache<Me>(KEY) ?? null); // sem internet: último usuário conhecido
    cache.then((v) => { if (!v) cache = null; });
  }
  return cache;
}
