'use client';

import { useState, useCallback } from 'react';
import { ChevronRight, History } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceSelector } from '@/components/service-selector';
import { ReviewScreen } from '@/components/review-screen';
import { SignatureScreen } from '@/components/signature-screen';
import { FinalizeScreen } from '@/components/finalize-screen';
import { toast } from 'sonner';
import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';
import { SyncStatus } from '@/components/sync-status';
import { BackupFields } from '@/components/backup-fields';
import { EMPTY_BACKUP, backupError, hasBackup, type BackupInfo } from '@/lib/backup-info';

type Step = 'select' | 'review' | 'signature' | 'finalize';

export function HomeClient({ userName }: { userName: string }) {
  const [step, setStep] = useState<Step>('select');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [backup, setBackup] = useState<BackupInfo>(EMPTY_BACKUP);

  const handleViewReport = useCallback(() => {
    if ((selectedServices?.length ?? 0) === 0 && !hasBackup(backup)) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
    const err = backupError(backup);
    if (err) {
      toast.error(err);
      return;
    }
    setStep('review');
  }, [selectedServices, backup]);

  const handleGoToSignature = useCallback(() => {
    setStep('signature');
  }, []);

  const handleSaveSignature = useCallback((data: string) => {
    setSignatureData(data);
    setStep('finalize');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'review') setStep('select');
    else if (step === 'signature') setStep('review');
    else if (step === 'finalize') setStep('signature');
  }, [step]);

  const handleReset = useCallback(() => {
    setStep('select');
    setSelectedServices([]);
    setObservacoes('');
    setSignatureData(null);
    setBackup(EMPTY_BACKUP);
  }, []);

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm">
              <Image src="/logo-autocom.png" alt="AUTOCOM" width={32} height={32} className="object-cover w-full h-full" />
            </div>
            <span className="font-display font-semibold text-xs">Uso Externo</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/historico">
              <Button variant="ghost" size="icon-sm">
                <History className="w-4 h-4" />
              </Button>
            </Link>
            <LogoutButton className="text-xs text-muted-foreground underline px-2" />
          </div>
        </div>
      </header>

      <SyncStatus />

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 safe-bottom">
        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-6">
                <h1 className="text-xl font-display font-bold tracking-tight">Ordem de Serviço - Uso Externo</h1>
                <p className="text-sm text-muted-foreground mt-1">Selecione os serviços realizados</p>
              </div>
              <ServiceSelector
                selectedServices={selectedServices}
                onToggle={(item: string) => {
                  setSelectedServices((prev: string[]) =>
                    (prev ?? []).includes(item)
                      ? (prev ?? []).filter((s: string) => s !== item)
                      : [...(prev ?? []), item]
                  );
                }}
              />
              <div className="mt-3">
                <BackupFields value={backup} onChange={setBackup} />
              </div>
              <div className="mt-6">
                <label className="text-sm font-medium text-foreground block mb-2">Observações Adicionais</label>
                <textarea
                  value={observacoes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservacoes(e.target.value)}
                  placeholder="Digite observações sobre o atendimento..."
                  className="w-full min-h-[120px] rounded-xl border border-border bg-card p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="mt-6">
                <Button
                  onClick={handleViewReport}
                  className="w-full h-12 text-base font-semibold rounded-xl"
                >
                  Visualizar Relatório
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <ReviewScreen
                selectedServices={selectedServices}
                observacoes={observacoes}
                backup={backup}
                onSign={handleGoToSignature}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {step === 'signature' && (
            <motion.div
              key="signature"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <SignatureScreen
                onSave={handleSaveSignature}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {step === 'finalize' && (
            <motion.div
              key="finalize"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <FinalizeScreen
                selectedServices={selectedServices}
                observacoes={observacoes}
                signatureData={signatureData}
                backup={backup}
                onBack={handleBack}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
