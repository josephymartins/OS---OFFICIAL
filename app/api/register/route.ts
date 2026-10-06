import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cria uma conta nova. Se CONVITE_CODIGO estiver definido, exige esse código. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) ?? {};
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const codigo = String(body.codigo ?? '').trim();

  const convite = process.env.CONVITE_CODIGO;
  if (convite && codigo !== convite) {
    return NextResponse.json({ error: 'Código de convite inválido.' }, { status: 403 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return NextResponse.json({ error: 'Já existe uma conta com esse e-mail.' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, password: hash } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
