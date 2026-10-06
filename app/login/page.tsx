'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.ok && !res.error) {
      window.location.href = '/';
    } else {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-slate-900">Ordem de Serviço</h1>
        <p className="text-sm text-slate-600">Entre com seu e-mail e senha.</p>

        <div className="space-y-1">
          <label className="text-sm text-slate-700" htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-700" htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-md bg-slate-900 px-3 py-2 font-medium text-white disabled:opacity-60">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Não tem conta? <a href="/cadastro" className="underline">Criar conta</a>
        </p>
      </form>
    </main>
  );
}
