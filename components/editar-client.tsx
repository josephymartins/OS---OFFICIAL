'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, ClipboardList, Upload, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ServiceSelector } from '@/components/service-selector';
import { getOrder, updateOrder } from '@/lib/offline/orders';
import { savePdf } from '@/lib/offline/files';
import { generateAndGetPdf } from '@/lib/pdf-generator';
import { extractPdfData } from '@/lib/pdf-parser';

type Form = {
  clientName: string;
  clientFantasia: string;
  clientCpf: string;
  clientCnpj: string;
  clientEndereco: string;
  clientCidade: string;
  clientCep: string;
  clientTelefone: string;
  clientEmail: string;
  numeroOs: string;
  equipamento: string;
  tecnico: string;
  problemaInformado: string;
  detalhesSistema: string;
  contrato: string;
  pagamento: string;
  responsavel: string;
  dataAtendimento: string;
  horaEntrada: string;
  horaSaida: string;
  observacoes: string;
};

const EMPTY: Form = {
  clientName: '',
  clientFantasia: '',
  clientCpf: '',
  clientCnpj: '',
  clientEndereco: '',
  clientCidade: '',
  clientCep: '',
  clientTelefone: '',
  clientEmail: '',
  numeroOs: '',
  equipamento: '',
  tecnico: '',
  problemaInformado: '',
  detalhesSistema: '',
  contrato: '',
  pagamento: '',
  responsavel: '',
  dataAtendimento: '',
  horaEntrada: '',
  horaSaida: '',
  observacoes: '',
};

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={onChange} className="rounded-xl" placeholder={placeholder ?? label} />
    </div>
  );
}

export function EditarClient({ id }: { id: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [attachedName, setAttachedName] = useState('');

  const [form, setForm] = useState<Form>(EMPTY);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [hadPdf, setHadPdf] = useState(false);

  const set =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    (async () => {
      try {
        const order = await getOrder(id);
        if (!order) {
          setNotFound(true);
          return;
        }
        setForm({
          clientName: order.clientName ?? '',
          clientFantasia: order.clientFantasia ?? '',
          clientCpf: order.clientCpf ?? '',
          clientCnpj: order.clientCnpj ?? '',
          clientEndereco: order.clientEndereco ?? '',
          clientCidade: order.clientCidade ?? '',
          clientCep: order.clientCep ?? '',
          clientTelefone: order.clientTelefone ?? '',
          clientEmail: order.clientEmail ?? '',
          numeroOs: order.numeroOs ?? '',
          equipamento: order.equipamento ?? '',
          tecnico: order.tecnico ?? '',
          problemaInformado: order.problemaInformado ?? '',
          detalhesSistema: order.detalhesSistema ?? '',
          contrato: order.contrato ?? '',
          pagamento: order.pagamento ?? '',
          responsavel: order.responsavel ?? '',
          dataAtendimento: order.dataAtendimento ?? '',
          horaEntrada: order.horaEntrada ?? '',
          horaSaida: order.horaSaida ?? '',
          observacoes: order.observacoes ?? '',
        });
        setSignatureData(order.signatureData ?? null);
        setHadPdf(!!order.hasPdf);
        try {
          setSelectedServices(JSON.parse(order.selectedServices ?? '[]'));
        } catch {
          setSelectedServices([]);
        }
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

  // Lê o PDF do cliente e preenche os campos (só substitui o que o PDF trouxer)
  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF');
      return;
    }
    setExtracting(true);
    try {
      const d = await extractPdfData(file);
      if (!(d?.nome_cliente || d?.numero_os || d?.cnpj)) {
        toast.warning('Não foi possível extrair dados deste PDF');
        return;
      }
      setForm((f) => ({
        ...f,
        clientName: d.nome_cliente || f.clientName,
        clientFantasia: d.fantasia || f.clientFantasia,
        clientCpf: d.cpf_cliente || f.clientCpf,
        clientCnpj: d.cnpj || f.clientCnpj,
        clientEndereco: d.endereco_cliente || f.clientEndereco,
        clientCidade: d.cidade_cliente || f.clientCidade,
        clientCep: d.cep || f.clientCep,
        clientTelefone: d.telefone_cliente || f.clientTelefone,
        clientEmail: d.email_cliente || f.clientEmail,
        numeroOs: d.numero_os || f.numeroOs,
        equipamento: d.equipamento || f.equipamento,
        tecnico: d.tecnico || f.tecnico,
        problemaInformado: d.problema_informado || f.problemaInformado,
        detalhesSistema: d.detalhes_sistema || f.detalhesSistema,
        contrato: d.contrato || f.contrato,
        pagamento: d.pagamento || f.pagamento,
      }));
      setAttachedName(file.name);
      toast.success('Dados do cliente preenchidos! Confira e toque em Salvar Alterações.');
    } catch (err) {
      console.error('Extract error:', err);
      toast.error('Erro ao ler o PDF');
    } finally {
      setExtracting(false);
    }
  };

  // Gera o PDF a partir do que está na tela
  const buildPdf = () =>
    generateAndGetPdf({
      selectedServices: selectedServices ?? [],
      observacoes: form.observacoes ?? '',
      signatureData: signatureData ?? null,
      responsavel: form.responsavel,
      dataAtendimento: form.dataAtendimento,
      horaEntrada: form.horaEntrada,
      horaSaida: form.horaSaida,
      extractedData: {
        nome_cliente: form.clientName,
        fantasia: form.clientFantasia,
        numero_os: form.numeroOs,
        equipamento: form.equipamento,
        cpf_cliente: form.clientCpf,
        cnpj: form.clientCnpj,
        endereco_cliente: form.clientEndereco,
        cidade_cliente: form.clientCidade,
        cep: form.clientCep,
        telefone_cliente: form.clientTelefone,
        email_cliente: form.clientEmail,
        problema_informado: form.problemaInformado,
        detalhes_sistema: form.detalhesSistema,
        contrato: form.contrato,
        pagamento: form.pagamento,
        tecnico: form.tecnico || form.responsavel,
      },
    });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { blob, fileName } = await buildPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar o PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!form.responsavel.trim()) {
      toast.error('Informe o responsável');
      return;
    }
    setSaving(true);
    try {
      const patch: any = {
        clientName: form.clientName || null,
        clientFantasia: form.clientFantasia || null,
        clientCpf: form.clientCpf || null,
        clientCnpj: form.clientCnpj || null,
        clientEndereco: form.clientEndereco || null,
        clientCidade: form.clientCidade || null,
        clientCep: form.clientCep || null,
        clientTelefone: form.clientTelefone || null,
        clientEmail: form.clientEmail || null,
        numeroOs: form.numeroOs || null,
        equipamento: form.equipamento || null,
        tecnico: form.tecnico || null,
        problemaInformado: form.problemaInformado || null,
        detalhesSistema: form.detalhesSistema || null,
        contrato: form.contrato || null,
        pagamento: form.pagamento || null,
        responsavel: form.responsavel || null,
        dataAtendimento: form.dataAtendimento || null,
        horaEntrada: form.horaEntrada || null,
        horaSaida: form.horaSaida || null,
        observacoes: form.observacoes || null,
        selectedServices: JSON.stringify(selectedServices ?? []),
      };

      // Regenera o PDF para refletir as alterações
      try {
        const { blob } = await buildPdf();
        await savePdf(id, blob);
        patch.hasPdf = true;
      } catch (pdfErr) {
        console.error('Erro ao regenerar PDF:', pdfErr);
        patch.hasPdf = hadPdf;
        toast.warning('Ordem salva, mas não foi possível atualizar o PDF');
      }

      await updateOrder(id, patch);
      toast.success('Ordem atualizada com sucesso!');
      router.push('/historico');
    } catch (err) {
      console.error('Erro ao salvar ordem:', err);
      toast.error('Erro ao salvar alterações. Verifique a internet e tente de novo.');
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
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-3">
          <Label className="block">PDF do cliente</Label>
          <p className="text-xs text-muted-foreground">
            Anexe o PDF da O.S. para preencher os dados do cliente. Depois, toque em Salvar Alterações para gerar o arquivo.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleAttach}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl"
            disabled={extracting}
          >
            {extracting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Lendo o PDF...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> {attachedName ? 'Trocar PDF' : 'Anexar PDF do cliente'}</>
            )}
          </Button>
          {attachedName && (
            <p className="text-xs text-green-700">Dados lidos de: {attachedName}</p>
          )}
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <Field id="clientName" label="Cliente" value={form.clientName} onChange={set('clientName')} placeholder="Nome do cliente" />
          <Field id="clientFantasia" label="Nome Fantasia" value={form.clientFantasia} onChange={set('clientFantasia')} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="clientCpf" label="CPF" value={form.clientCpf} onChange={set('clientCpf')} />
            <Field id="clientCnpj" label="CNPJ" value={form.clientCnpj} onChange={set('clientCnpj')} />
          </div>
          <Field id="clientEndereco" label="Endereço" value={form.clientEndereco} onChange={set('clientEndereco')} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="clientCidade" label="Cidade" value={form.clientCidade} onChange={set('clientCidade')} />
            <Field id="clientCep" label="CEP" value={form.clientCep} onChange={set('clientCep')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="clientTelefone" label="Telefone" value={form.clientTelefone} onChange={set('clientTelefone')} />
            <Field id="clientEmail" label="E-mail" value={form.clientEmail} onChange={set('clientEmail')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="numeroOs" label="Número O.S." value={form.numeroOs} onChange={set('numeroOs')} placeholder="Número" />
            <Field id="equipamento" label="Equipamento" value={form.equipamento} onChange={set('equipamento')} />
          </div>
          <Field id="tecnico" label="Técnico" value={form.tecnico} onChange={set('tecnico')} />
          <div className="space-y-2">
            <Label htmlFor="problema">Problema informado</Label>
            <textarea
              id="problema"
              value={form.problemaInformado}
              onChange={set('problemaInformado')}
              placeholder="Problema informado pelo cliente..."
              className="w-full min-h-[80px] rounded-xl border border-border bg-card p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <Field id="responsavel" label="Responsável" value={form.responsavel} onChange={set('responsavel')} placeholder="Nome do responsável" />
          <div className="grid grid-cols-2 gap-3">
            <Field id="data" label="Data Atendimento" value={form.dataAtendimento} onChange={set('dataAtendimento')} placeholder="DD/MM/AAAA" />
            <Field id="entrada" label="Hora Entrada" value={form.horaEntrada} onChange={set('horaEntrada')} placeholder="HH:MM" />
          </div>
          <Field id="saida" label="Hora Saída" value={form.horaSaida} onChange={set('horaSaida')} placeholder="HH:MM" />
        </div>

        <div>
          <Label className="mb-2 block">Serviços realizados</Label>
          <ServiceSelector selectedServices={selectedServices} onToggle={handleToggle} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs">Observações</Label>
          <textarea
            id="obs"
            value={form.observacoes}
            onChange={set('observacoes')}
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

        <Button
          variant="outline"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          {downloading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando PDF...</>
          ) : (
            <><FileDown className="w-5 h-5 mr-2" /> Baixar PDF</>
          )}
        </Button>
      </main>
    </div>
  );
}
