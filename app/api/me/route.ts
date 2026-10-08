import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Dados do usuário logado (nome, e-mail e se é administrador). */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  return NextResponse.json(me);
}
