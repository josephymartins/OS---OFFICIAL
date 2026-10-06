'use client';

/**
 * Proteção do app: sem login não mostra nada.
 * - Login por e-mail e senha (Supabase Auth). Não existe tela de cadastro:
 *   os técnicos são criados por você no painel do Supabase.
 * - Depois de entrar, mostra uma barra com o e-mail e o botão "Sair".
 * - Se houver ordens salvas NESTE aparelho (versão antiga, offline), oferece
 *   enviá-las para a nuvem. Os dados locais não são apagados.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  countLegacyOrders,
  isLegacyMigrated,
  migrateLegacyToCloud,
  type MigrationResult,
} from '@/lib/offline/legacy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado no Supabase.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com a internet. Tente novamente.';
  return message;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) setError(friendlyAuthError(error.message));
    setBusy(false);
  }

  return (
    <Centered>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">AUTOCOM</h1>
          <p className="text-sm text-muted-foreground">Ordem de Serviço — entre com seu acesso</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Centered>
  );
}

function MigrationBanner() {
  const [pending, setPending] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [result, setResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isLegacyMigrated()) return;
      const n = await countLegacyOrders();
      if (!cancelled) setPending(n);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await migrateLegacyToCloud((done, total) => setProgress([done, total]));
      setResult(r);
      if (r.failed === 0) setPending(0);
    } catch (err) {
      console.error(err);
      setResult({ total: pending, migrated: 0, failed: pending });
    } finally {
      setRunning(false);
    }
  }, [pending]);

  if (result && result.failed === 0) {
    return (
      <div className="border-b bg-green-50 px-4 py-2 text-sm text-green-900">
        {result.migrated} ordem(ns) enviada(s) para a nuvem. Agora aparecem em qualquer aparelho.
        Recarregue a página para ver o histórico.
      </div>
    );
  }
  if (pending === 0 && !result) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span>
        {result
          ? `${result.failed} ordem(ns) não foram enviadas. Verifique a internet e tente de novo.`
          : `Encontrei ${pending} ordem(ns) salvas só neste aparelho.`}
      </span>
      <Button size="sm" onClick={run} disabled={running}>
        {running ? `Enviando… ${progress[0]}/${progress[1]}` : 'Enviar para a nuvem'}
      </Button>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true);
      return;
    }
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <div className="space-y-2 rounded-xl border bg-card p-6">
          <h1 className="text-lg font-semibold">Configuração pendente</h1>
          <p className="text-sm text-muted-foreground">
            Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de
            ambiente (Vercel → Settings → Environment Variables) e faça um novo deploy.
          </p>
        </div>
      </Centered>
    );
  }

  if (!ready) {
    return (
      <Centered>
        <p className="text-center text-sm text-muted-foreground">Carregando…</p>
      </Centered>
    );
  }

  if (!session) return <LoginForm />;

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
        <span className="truncate">{session.user.email}</span>
        <button
          type="button"
          className="shrink-0 font-medium text-foreground underline underline-offset-2"
          onClick={() => getSupabase().auth.signOut()}
        >
          Sair
        </button>
      </div>
      <MigrationBanner />
      {children}
    </>
  );
}
