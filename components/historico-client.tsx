'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, ClipboardList, Calendar, User, Hash, Loader2, FileDown,
  Search, MoreVertical, Pencil, Trash2, Download, Upload, Archive, ArchiveRestore,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { listOrders, countServices, deleteOrder, setArchived } from '@/lib/offline/orders';
import { getPdfObjectUrl } from '@/lib/offline/files';
import { exportAllData, exportSingleOrder, importData } from '@/lib/offline/backup';
import { signedPdfFileName } from '@/lib/pdf-generator';

interface OrderSummary {
  id: string;
  clientName: string | null;
  clientFantasia: string | null;
  numeroOs: string | null;
  dataAtendimento: string | null;
  responsavel: string | null;
  status: string;
  archived: boolean;
  createdAt: string;
  serviceCount: number;
  hasPdf: boolean;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function sanitize(name?: string | null) {
  return (name ?? 'cliente').replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 40);
}

export function HistoricoClient() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrderSummary | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const loadOrders = async () => {
    try {
      const local = await listOrders(1000);
      const mapped: OrderSummary[] = (local ?? []).map((o) => ({
        id: o.id,
        clientName: o.clientName ?? null,
        clientFantasia: o.clientFantasia ?? null,
        numeroOs: o.numeroOs ?? null,
        dataAtendimento: o.dataAtendimento ?? null,
        responsavel: o.responsavel ?? null,
        status: o.status ?? 'finalizado',
        archived: !!o.archived,
        createdAt: o.createdAt ?? '',
        serviceCount: countServices(o.selectedServices),
        hasPdf: !!o.hasPdf,
      }));
      setOrders(mapped);
    } catch (err: any) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      if (o.archived && !showArchived) return false;
      if (!o.archived && showArchived) return false;
      if (!q) return true;
      const hay = [
        o.clientName, o.clientFantasia, o.numeroOs, o.responsavel, o.dataAtendimento,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, showArchived]);

  const archivedCount = useMemo(() => (orders ?? []).filter((o) => o.archived).length, [orders]);

  const handleDownloadPdf = async (orderId: string, clientName?: string | null) => {
    setDownloadingId(orderId);
    try {
      const url = await getPdfObjectUrl(orderId);
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = signedPdfFileName(clientName || 'cliente');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        toast.error('PDF não disponível para esta ordem');
      }
    } catch (err: any) {
      console.error('Download PDF error:', err);
      toast.error('Erro ao abrir PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportOne = async (order: OrderSummary) => {
    try {
      const res = await exportSingleOrder(order.id);
      if (!res) {
        toast.error('Ordem não encontrada');
        return;
      }
      triggerDownload(res.blob, `OS_${sanitize(order.clientName ?? order.clientFantasia)}.json`);
      toast.success('Ordem exportada!');
    } catch (err) {
      console.error('Export one error:', err);
      toast.error('Erro ao exportar a ordem');
    }
  };

  const handleExportAll = async () => {
    setBusy(true);
    try {
      const { blob, count } = await exportAllData();
      const stamp = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `backup_ordens_${stamp}.json`);
      toast.success(`Backup gerado com ${count} ordem(ns)!`);
    } catch (err) {
      console.error('Export all error:', err);
      toast.error('Erro ao gerar o backup');
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res = await importData(file);
      toast.success(`Importado: ${res.ordersImported} ordem(ns), ${res.pdfsImported} PDF(s)`);
      await loadOrders();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err?.message ?? 'Erro ao importar o backup');
    } finally {
      setBusy(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleArchive = async (order: OrderSummary) => {
    try {
      await setArchived(order.id, !order.archived);
      toast.success(order.archived ? 'Ordem desarquivada' : 'Ordem arquivada');
      await loadOrders();
    } catch (err) {
      console.error('Archive error:', err);
      toast.error('Erro ao arquivar');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOrder(deleteTarget.id);
      toast.success('Ordem excluída');
      setDeleteTarget(null);
      await loadOrders();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erro ao excluir');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-display font-semibold">Histórico</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Ferramentas: busca + backup */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, O.S., responsável..."
              className="rounded-xl pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg text-xs flex-1" disabled={busy} onClick={handleExportAll}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar backup
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg text-xs flex-1" disabled={busy} onClick={() => importInputRef.current?.click?.()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Importar backup
            </Button>
            <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
          </div>
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-medium text-primary flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              {showArchived ? 'Ver ordens ativas' : `Ver arquivadas (${archivedCount})`}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : (filtered?.length ?? 0) === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mt-3">
              {query.trim()
                ? 'Nenhuma ordem encontrada para a busca'
                : showArchived
                ? 'Nenhuma ordem arquivada'
                : 'Nenhuma ordem de serviço encontrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(filtered ?? []).map((order: OrderSummary, idx: number) => (
              <motion.div
                key={order?.id ?? idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                className="bg-card rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {order?.clientName ?? order?.clientFantasia ?? 'Cliente não informado'}
                    </p>
                    {order?.clientFantasia && order?.clientName && (
                      <p className="text-xs text-muted-foreground truncate">{order.clientFantasia}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order?.archived
                        ? 'bg-gray-100 text-gray-600'
                        : order?.status === 'finalizado'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order?.archived ? 'Arquivada' : order?.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/editar/${order.id}`}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportOne(order)}>
                          <Download className="w-4 h-4 mr-2" /> Exportar OS
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(order)}>
                          {order.archived ? (
                            <><ArchiveRestore className="w-4 h-4 mr-2" /> Desarquivar</>
                          ) : (
                            <><Archive className="w-4 h-4 mr-2" /> Arquivar</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteTarget(order)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {order?.numeroOs && (
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3" />
                      <span>O.S.: {order.numeroOs}</span>
                    </div>
                  )}
                  {order?.dataAtendimento && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{order.dataAtendimento}</span>
                    </div>
                  )}
                  {order?.responsavel && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span>{order.responsavel}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="w-3 h-3" />
                    <span>{order?.serviceCount ?? 0} serviços</span>
                  </div>
                </div>
                {order?.hasPdf && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full rounded-lg text-xs font-semibold h-9"
                    disabled={downloadingId === order.id}
                    onClick={() => handleDownloadPdf(order.id, order.clientName ?? order.clientFantasia)}
                  >
                    {downloadingId === order.id ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Carregando...</>
                    ) : (
                      <><FileDown className="w-3.5 h-3.5 mr-1.5" /> Ver PDF</>
                    )}
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ordem de serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ordem
              {deleteTarget?.clientName ? ` de "${deleteTarget.clientName}"` : ''} e seu PDF serão
              removidos permanentemente deste dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
