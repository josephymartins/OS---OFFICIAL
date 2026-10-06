import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const row = await prisma.orderPdf.findFirst({
    where: { orderId: params.id, order: { userId } },
  });
  if (!row) return NextResponse.json({ error: 'PDF não encontrado' }, { status: 404 });

  return new Response(row.data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const order = await prisma.serviceOrder.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  const data = new Uint8Array(await req.arrayBuffer());
  await prisma.orderPdf.upsert({
    where: { orderId: params.id },
    update: { data },
    create: { orderId: params.id, data },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  await prisma.orderPdf.deleteMany({ where: { orderId: params.id, order: { userId } } });
  return NextResponse.json({ ok: true });
}
