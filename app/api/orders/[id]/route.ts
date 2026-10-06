import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { pickOrderFields, serializeOrder, withPdfFlag } from '@/lib/order-fields';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const order = await prisma.serviceOrder.findFirst({
    where: { id: params.id, userId },
    include: withPdfFlag,
  });
  if (!order) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  return NextResponse.json(serializeOrder(order));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const existing = await prisma.serviceOrder.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  const data = pickOrderFields((await req.json()) ?? {});
  const order = await prisma.serviceOrder.update({
    where: { id: params.id },
    data,
    include: withPdfFlag,
  });
  return NextResponse.json(serializeOrder(order));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  // O PDF é apagado junto (onDelete: Cascade).
  await prisma.serviceOrder.deleteMany({ where: { id: params.id, userId } });
  return NextResponse.json({ ok: true });
}
