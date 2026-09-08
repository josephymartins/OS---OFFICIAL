'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, FileDown, Loader2, FileText, CheckCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { extractPdfData } from '@/lib/pdf-parser';
import { generateAndGetPdf } from '@/lib/pdf-generator';
import { createOrder } from '@/lib/offline/orders';

interface FinalizeScreenProps {
  selectedServices: string[];
  observacoes: string;
  signatureData: string | null;
  onBack: () => void;
  onReset: () => void;
}

export function FinalizeScreen({
  selectedServices,
  observacoes,
  signatureData,
  onBack,
  onReset,
}: FinalizeScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [responsavel, setResponsavel] = useState('');
  const [dataAtendimento, setDataAtendimento] = useState('');
  const [horaEntrada, setHoraEntrada] = useState('');
  const [horaSaida, setHoraSaida] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [finalFileName, setFinalFileName] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Auto-fill date/time on mount
  useEffect(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setDataAtendimento(
      `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
    );
    setHoraEntrada(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (file?.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF');
      return;
    }
    setPdfFile(file);
    setExtracting(true);
    setExtractedData(null);

    try {
      // Local extraction - no API, no credits, works offline
      const data = await extractPdfData(file);
      if (data?.nome_cliente || data?.numero_os || data?.cnpj) {
        setExtractedData(data);
        toast.success('Dados do cliente extraídos!');
      } else {
        toast.warning('Não foi possível extrair dados deste PDF');
      }
    } catch (err: any) {
      console.error('Extract error:', err);
      toast.error('Erro ao extrair dados do PDF');
    } finally {
      setExtracting(false);
    }
  };

  // Save order + generated PDF locally in IndexedDB (works 100% offline)
  const saveOrderToDb = async (blob: Blob) => {
    try {
      await createOrder({
        clientName: extractedData?.nome_cliente ?? '',
        clientCpf: extractedData?.cpf_cliente ?? '',
        clientFantasia: extractedData?.fantasia ?? '',
        clientCnpj: extractedData?.cnpj ?? '',
        clientEndereco: extractedData?.endereco_cliente ?? '',
        clientCidade: extractedData?.cidade_cliente ?? '',
        clientCep: extractedData?.cep ?? '',
        clientTelefone: extractedData?.telefone_cliente ?? '',
        clientEmail: extractedData?.email_cliente ?? '',
        numeroOs: extractedData?.numero_os ?? '',
        equipamento: extractedData?.equipamento ?? '',
        tecnico: extractedData?.tecnico ?? responsavel ?? '',
        problemaInformado: extractedData?.problema_informado ?? '',
        dataAtendimento,
        horaEntrada,
        horaSaida,
        responsavel,
        selectedServices: JSON.stringify(selectedServices ?? []),
        observacoes: observacoes ?? '',
        signatureData: signatureData ?? null,
        status: 'finalizado',
        pdfBlob: blob,
      });
    } catch (err) {
      console.error('Erro ao salvar ordem localmente:', err);
    }
  };

  const handleGeneratePdf = async () => {
    if (!responsavel) {
      toast.error('Informe o responsável');
      return;
    }

    setGenerating(true);

    try {
      // Generate PDF entirely in the browser - no server, no API, no credits
      const { blob, fileName } = await generateAndGetPdf({
        selectedServices: selectedServices ?? [],
        observacoes: observacoes ?? '',
        signatureData: signatureData ?? null,
        responsavel,
        dataAtendimento,
        horaEntrada,
        horaSaida,
        extractedData: extractedData ?? {},
        uploadedFileName: pdfFile?.name ?? undefined,
      });

      const url = URL.createObjectURL(blob);
      setFinalFileName(fileName);
      setDownloadUrl(url);
      setPdfBlob(blob);
      setDone(true);
      toast.success('PDF gerado com sucesso!');

      // Save order + PDF locally in IndexedDB (offline)
      saveOrderToDb(blob);
    } catch (err: any) {
      console.error('Generate PDF error:', err);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const getFileName = () => {
    if (finalFileName) return finalFileName;
    return `OS_${extractedData?.nome_cliente ?? 'cliente'}_${dataAtendimento?.replace?.(/\//g, '-') ?? 'data'}.pdf`;
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = getFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareGoogleDrive = async () => {
    const blob = pdfBlob;
    if (!blob) return;
    try {
      const file = new File([blob], getFileName(), { type: 'application/pdf' });

      if (typeof navigator !== 'undefined' && navigator?.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Ordem de Serviço - ${extractedData?.nome_cliente ?? 'Cliente'}`,
          text: 'Relatório de Ordem de Serviço',
          files: [file],
        });
        toast.success('Arquivo compartilhado!');
      } else {
        // Fallback: download the file
        toast.info('Use o menu de compartilhamento do navegador para salvar no Google Drive');
        handleDownload();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Share error:', err);
        toast.error('Erro ao compartilhar. Tente baixar o PDF.');
        handleDownload();
      }
    }
  };

  if (done) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-display font-bold">PDF Gerado!</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6">O relatório está pronto para download</p>
        <div className="space-y-3">
          <Button onClick={handleDownload} className="w-full h-12 rounded-xl font-semibold">
            <FileDown className="w-5 h-5 mr-2" />
            Baixar PDF
          </Button>
          <Button
            onClick={handleShareGoogleDrive}
            className="w-full h-12 rounded-xl font-semibold bg-[#4285F4] hover:bg-[#3367D6] text-white"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Salvar no Google Drive
          </Button>
          <Button variant="outline" onClick={onReset} className="w-full h-12 rounded-xl font-semibold">
            Nova Ordem de Serviço
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight">Finalizar</h2>
          <p className="text-sm text-muted-foreground">Preencha os dados finais</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável</Label>
            <Input
              id="responsavel"
              placeholder="Nome do responsável"
              value={responsavel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResponsavel(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data">Data Atendimento</Label>
              <Input
                id="data"
                placeholder="DD/MM/AAAA"
                value={dataAtendimento}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataAtendimento(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entrada">Hora Entrada</Label>
              <Input
                id="entrada"
                placeholder="HH:MM"
                value={horaEntrada}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoraEntrada(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="saida">Hora Saída</Label>
            <Input
              id="saida"
              placeholder="HH:MM"
              value={horaSaida}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoraSaida(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <Label className="mb-2 block">PDF do Cliente (opcional)</Label>
          <p className="text-xs text-muted-foreground mb-3">Envie o PDF da O.S. para extrair dados do cliente automaticamente</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef?.current?.click?.()}
            className="w-full rounded-xl"
            disabled={extracting}
          >
            {extracting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extraindo dados...</>
            ) : pdfFile ? (
              <><FileText className="w-4 h-4 mr-2" /> {pdfFile?.name ?? 'Arquivo'}</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Escolher Arquivo</>
            )}
          </Button>

          {extractedData && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-800 mb-1">Dados extraídos:</p>
              <p className="text-xs text-green-700">{extractedData?.nome_cliente ?? 'N/A'}</p>
              {extractedData?.fantasia && (
                <p className="text-xs text-green-700">{extractedData.fantasia}</p>
              )}
              {extractedData?.numero_os && (
                <p className="text-xs text-green-700">O.S.: {extractedData.numero_os}</p>
              )}
            </div>
          )}
        </div>

        <Button
          onClick={handleGeneratePdf}
          className="w-full h-12 text-base font-semibold rounded-xl"
          disabled={generating}
        >
          {generating ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando PDF...</>
          ) : (
            <><FileDown className="w-5 h-5 mr-2" /> Salvar PDF</>
          )}
        </Button>
      </div>
    </div>
  );
}


