import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserId } from '@/lib/auth';
import { pickOrderFields } from '@/lib/order-fields';

export const dynamic = 'force-dynamic';

/** Importa UMA ordem (e o PDF em base64, se vier) para o usuário logado. */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { order, pdfBase64 } = (await req.json()) ?? {};
  if (!order || typeof order !== 'object') {
    return NextResponse.json({ error: 'Ordem inválida' }, { status: 400 });
  }

  const data = pickOrderFields(order);
  data.selectedServices = data.selectedServices ?? '[]';
  data.status = data.status ?? 'finalizado';
  const createdAt = order.createdAt ? new Date(order.createdAt) : undefined;

  // Se o id já pertence a outro usuário, cria uma ordem nova em vez de sobrescrever.
  let id: string | undefined = typeof order.id === 'string' ? order.id : undefined;
  if (id) {
    const existing = await prisma.serviceOrder.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (existing && existing.userId !== userId) id = undefined;
  }

  const saved = id
    ? await prisma.serviceOrder.upsert({
        where: { id },
        update: data,
        create: { ...data, id, userId, createdAt },
      })
    : await prisma.serviceOrder.create({ data: { ...data, userId, createdAt } as any });

  if (typeof pdfBase64 === 'string' && pdfBase64.length > 0) {
    const bytes = new Uint8Array(Buffer.from(pdfBase64, 'base64'));
    await prisma.orderPdf.upsert({
      where: { orderId: saved.id },
      update: { data: bytes },
      create: { orderId: saved.id, data: bytes },
    });
  }

  return NextResponse.json({ id: saved.id, hasPdf: !!pdfBase64 });
}
