'use client';

import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';

export default function CadastroPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, codigo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Não foi possível criar a conta.');
      }
      const login = await signIn('credentials', { email, password, redirect: false });
      if (login?.ok && !login.error) {
        window.location.href = '/';
      } else {
        window.location.href = '/login';
      }
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível criar a conta.');
      setLoading(false);
    }
  }

  const input = 'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900';
  const label = 'text-sm text-slate-700';

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-slate-900">Criar conta</h1>

        <div className="space-y-1">
          <label className={label} htmlFor="name">Nome</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={input} />
        </div>
        <div className="space-y-1">
          <label className={label} htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div className="space-y-1">
          <label className={label} htmlFor="password">Senha (mín. 8 caracteres)</label>
          <input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </div>
        <div className="space-y-1">
          <label className={label} htmlFor="confirm">Confirmar senha</label>
          <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
        </div>
        <div className="space-y-1">
          <label className={label} htmlFor="codigo">Código de convite</label>
          <input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={input} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="w-full rounded-md bg-slate-900 px-3 py-2 font-medium text-white disabled:opacity-60">
          {loading ? 'Criando...' : 'Criar conta'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Já tem conta? <a href="/login" className="underline">Entrar</a>
        </p>
      </form>
    </main>
  );
}
