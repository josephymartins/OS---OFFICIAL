import { EditarClient } from '@/components/editar-client';

// Edição de OS 100% offline: os dados vêm do IndexedDB no cliente.
export default function EditarPage({ params }: { params: { id: string } }) {
  return <EditarClient id={params.id} />;
}
