import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireUserId } from '@/lib/auth';
import { pickOrderFields, serializeOrder, withPdfAndOwner, withPdfFlag } from '@/lib/order-fields';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const limit = Math.min(Number(params.get('limit')) || 200, 100000);
  // scope=all: só administradores veem as OS de todos os técnicos
  const all = params.get('scope') === 'all' && me.isAdmin;
  const orders = await prisma.serviceOrder.findMany({
    where: all ? {} : { userId: me.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: withPdfAndOwner,
  });
  return NextResponse.json(orders.map(serializeOrder));
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json();
  const data = pickOrderFields(body ?? {});
  const order = await prisma.serviceOrder.create({
    data: {
      ...data,
      selectedServices: data.selectedServices ?? '[]',
      status: data.status ?? 'finalizado',
      userId,
    },
    include: withPdfFlag,
  });
  return NextResponse.json(serializeOrder(order), { status: 201 });
}
