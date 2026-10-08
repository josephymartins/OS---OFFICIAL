'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, PenLine, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SignatureScreen } from '@/components/signature-screen';
import {
  getTechnicianSignature,
  removeTechnicianSignature,
  saveTechnicianSignature,
} from '@/lib/technician';
import { getMe } from '@/lib/me';

/** Tela "Minha assinatura": o técnico desenha uma vez e ela entra em todas as OS. */
export function AssinaturaTecnicoClient() {
  const [signature, setSignature] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getTechnicianSignature(), getMe()])
      .then(([sig, me]) => {
        setSignature(sig);
        setName(me?.name || me?.email || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (dataUrl: string) => {
    setBusy(true);
    try {
      await saveTechnicianSignature(dataUrl);
      setSignature(dataUrl);
      setDrawing(false);
      toast.success('Assinatura salva! Ela vai entrar nas próximas OS.');
    } catch {
      toast.error('Não foi possível salvar. Verifique a internet e tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remover sua assinatura salva?')) return;
    setBusy(true);
    try {
      await removeTechnicianSignature();
      setSignature(null);
      toast.success('Assinatura removida');
    } finally {
      setBusy(false);
    }
  };

  if (drawing) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 safe-bottom">
        <SignatureScreen
          title="Minha assinatura"
          subtitle="Desenhe a sua assinatura de técnico"
          onSave={handleSave}
          onBack={() => setDrawing(false)}
        />
        {busy && <p className="mt-3 text-center text-sm text-muted-foreground">Salvando…</p>}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/">
            <Button variant="ghost" size="icon-sm"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="font-display font-semibold">Minha assinatura</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Sua assinatura entra automaticamente no lado da AUTOCOM em todas as OS que você gerar.
        </p>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : signature ? (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature} alt="Sua assinatura" className="mx-auto max-h-28 bg-white rounded-lg border border-border p-2" />
              <div className="mx-auto mt-2 w-3/4 border-t border-foreground/60" />
              <p className="mt-1 text-xs text-muted-foreground">{name ? `${name} — Técnico` : 'Técnico'}</p>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Você ainda não salvou uma assinatura.</p>
          )}
        </div>

        <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => setDrawing(true)} disabled={busy || loading}>
          <PenLine className="w-5 h-5 mr-2" /> {signature ? 'Desenhar nova assinatura' : 'Desenhar minha assinatura'}
        </Button>
        {signature && (
          <Button variant="outline" className="w-full h-11 rounded-xl text-red-600" onClick={handleRemove} disabled={busy}>
            <Trash2 className="w-4 h-4 mr-2" /> Remover assinatura
          </Button>
        )}
      </main>
    </div>
  );
}
