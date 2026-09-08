import { HistoricoClient } from '@/components/historico-client';

// Histórico 100% offline: os dados vêm do IndexedDB no cliente.
export default function HistoricoPage() {
  return <HistoricoClient />;
}
