/** Filtro de período das OS (usa a data de atendimento; se faltar, a data de criação). */

export type Periodo = 'tudo' | 'mes' | 'mes_passado' | '30d' | 'personalizado';

export const PERIODOS: Array<{ id: Periodo; label: string }> = [
  { id: 'tudo', label: 'Todo o período' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'personalizado', label: 'Personalizado' },
];

/** Data da OS: "dd/mm/aaaa" do atendimento, senão createdAt. */
export function orderDate(o: { dataAtendimento?: string | null; createdAt?: string | null }): Date | null {
  const m = (o.dataAtendimento ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (o.createdAt) {
    const d = new Date(o.createdAt);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

/** Intervalo [início, fim] (datas sem hora) do período escolhido; null = sem filtro. */
export function periodRange(p: Periodo, from?: string, to?: string, now = new Date()): [Date, Date] | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = new Date(y, m, now.getDate());
  switch (p) {
    case 'mes':
      return [new Date(y, m, 1), new Date(y, m + 1, 0)];
    case 'mes_passado':
      return [new Date(y, m - 1, 1), new Date(y, m, 0)];
    case '30d':
      return [new Date(y, m, now.getDate() - 29), today];
    case 'personalizado': {
      const a = from ? new Date(from + 'T00:00:00') : new Date(1970, 0, 1);
      const b = to ? new Date(to + 'T00:00:00') : today;
      return [a, b];
    }
    default:
      return null;
  }
}

export function inRange(d: Date | null, range: [Date, Date] | null): boolean {
  if (!range) return true;
  if (!d) return false;
  return d.getTime() >= range[0].getTime() && d.getTime() <= range[1].getTime();
}

export function formatRange(range: [Date, Date] | null): string {
  if (!range) return 'todo o período';
  const f = (d: Date) => d.toLocaleDateString('pt-BR');
  return `${f(range[0])} a ${f(range[1])}`;
}
