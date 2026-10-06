import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { pickOrderFields, serializeOrder, withPdfFlag } from '@/lib/order-fields';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 200, 100000);
  const orders = await prisma.serviceOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: withPdfFlag,
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
