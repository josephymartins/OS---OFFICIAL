'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServiceSelector } from '@/components/service-selector';
import { getOrder, updateOrder } from '@/lib/offline/orders';
import { savePdf } from '@/lib/offline/files';
import { generateAndGetPdf } from '@/lib/pdf-generator';

export function EditarClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientFantasia, setClientFantasia] = useState('');
  const [numeroOs, setNumeroOs] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [dataAtendimento, setDataAtendimento] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSaida, setHoraSaida] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [hadPdf, setHadPdf] = useState(false);
  // Guarda os demais campos do cliente para preservar no PDF regenerado
  const [extra, setExtra] = useState<any>({});

  useEffect(() => {
    (async () => {
      try {
        const order = await getOrder(id);
        if (!order) {
          setNotFound(true);
          return;
        }
        setClientName(order.clientName ?? '');
        setClientFantasia(order.clientFantasia ?? '');
        setNumeroOs(order.numeroOs ?? '');
        setEquipamento(order.equipamento ?? '');
        setResponsavel(order.responsavel ?? '');
        setDataAtendimento(order.dataAtendimento ?? '');
        setHoraEntrada(order.horaEntrada ?? '');
        setHoraSaida(order.horaSaida ?? '');
        setObservacoes(order.observacoes ?? '');
        setSignatureData(order.signatureData ?? null);
        setHadPdf(!!order.hasPdf);
        try {
          setSelectedServices(JSON.parse(order.selectedServices ?? '[]'));
        } catch {
          setSelectedServices([]);
        }
        setExtra({
          clientCpf: order.clientCpf ?? '',
          clientCnpj: order.clientCnpj ?? '',
          clientEndereco: order.clientEndereco ?? '',
          clientCidade: order.clientCidade ?? '',
          clientCep: order.clientCep ?? '',
          clientTelefone: order.clientTelefone ?? '',
          clientEmail: order.clientEmail ?? '',
          problemaInformado: order.problemaInformado ?? '',
          tecnico: order.tecnico ?? '',
        });
      } catch (err) {
        console.error('Erro ao carregar ordem:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleToggle = (item: string) => {
    setSelectedServices((prev) =>
      (prev ?? []).includes(item)
        ? (prev ?? []).filter((s) => s !== item)
        : [...(prev ?? []), item]
    );
  };

  const handleSave = async () => {
    if (!responsavel.trim()) {
      toast.error('Informe o responsável');
      return;
    }
    setSaving(true);
    try {
      const patch: any = {
        clientName: clientName || null,
        clientFantasia: clientFantasia || null,
        numeroOs: numeroOs || null,
        equipamento: equipamento || null,
        responsavel: responsavel || null,
        dataAtendimento: dataAtendimento || null,
        horaEntrada: horaEntrada || null,
        horaSaida: horaSaida || null,
        observacoes: observacoes || null,
        selectedServices: JSON.stringify(selectedServices ?? []),
      };

      // Regenera o PDF localmente (offline) para refletir as alterações
      try {
        const extractedData = {
          nome_cliente: clientName,
          fantasia: clientFantasia,
          numero_os: numeroOs,
          equipamento,
          cpf_cliente: extra.clientCpf,
          cnpj: extra.clientCnpj,
          endereco_cliente: extra.clientEndereco,
          cidade_cliente: extra.clientCidade,
          cep: extra.clientCep,
          telefone_cliente: extra.clientTelefone,
          email_cliente: extra.clientEmail,
          problema_informado: extra.problemaInformado,
          tecnico: extra.tecnico || responsavel,
        };
        const { blob } = await generateAndGetPdf({
          selectedServices: selectedServices ?? [],
          observacoes: observacoes ?? '',
          signatureData: signatureData ?? null,
          responsavel,
          dataAtendimento,
          horaEntrada,
          horaSaida,
          extractedData,
        });
        await savePdf(id, blob);
        patch.hasPdf = true;
      } catch (pdfErr) {
        console.error('Erro ao regenerar PDF:', pdfErr);
        // Mantém o estado anterior do PDF se a regeneração falhar
        patch.hasPdf = hadPdf;
        toast.warning('Ordem salva, mas não foi possível atualizar o PDF');
      }

      await updateOrder(id, patch);
      toast.success('Ordem atualizada com sucesso!');
      router.push('/historico');
    } catch (err) {
      console.error('Erro ao salvar ordem:', err);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">Ordem de serviço não encontrada</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.push('/historico')}>
            Voltar ao histórico
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push('/historico')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-display font-semibold">Editar Ordem</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 safe-bottom space-y-4">
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Cliente</Label>
            <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} className="rounded-xl" placeholder="Nome do cliente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientFantasia">Nome Fantasia</Label>
            <Input id="clientFantasia" value={clientFantasia} onChange={(e) => setClientFantasia(e.target.value)} className="rounded-xl" placeholder="Nome fantasia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="numeroOs">Número O.S.</Label>
              <Input id="numeroOs" value={numeroOs} onChange={(e) => setNumeroOs(e.target.value)} className="rounded-xl" placeholder="Número" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="equipamento">Equipamento</Label>
              <Input id="equipamento" value={equipamento} onChange={(e) => setEquipamento(e.target.value)} className="rounded-xl" placeholder="Equipamento" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável</Label>
            <Input id="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="rounded-xl" placeholder="Nome do responsável" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data">Data Atendimento</Label>
              <Input id="data" value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)} className="rounded-xl" placeholder="DD/MM/AAAA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entrada">Hora Entrada</Label>
              <Input id="entrada" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} className="rounded-xl" placeholder="HH:MM" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="saida">Hora Saída</Label>
            <Input id="saida" value={horaSaida} onChange={(e) => setHoraSaida(e.target.value)} className="rounded-xl" placeholder="HH:MM" />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Serviços realizados</Label>
          <ServiceSelector selectedServices={selectedServices} onToggle={handleToggle} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs">Observações</Label>
          <textarea
            id="obs"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Observações sobre o atendimento..."
            className="w-full min-h-[100px] rounded-xl border border-border bg-card p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base font-semibold rounded-xl">
          {saving ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-5 h-5 mr-2" /> Salvar Alterações</>
          )}
        </Button>
      </main>
    </div>
  );
}
