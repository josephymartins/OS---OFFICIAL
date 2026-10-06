import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: { key: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: params.key } },
  });
  if (!row) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  return NextResponse.json({ value: JSON.parse(row.value) });
}

export async function PUT(req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { value } = (await req.json()) ?? {};
  const text = JSON.stringify(value ?? null);
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: params.key } },
    update: { value: text },
    create: { userId, key: params.key, value: text },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  await prisma.userSetting.deleteMany({ where: { userId, key: params.key } });
  return NextResponse.json({ ok: true });
}
