'use client';

import { PenLine, ArrowLeft, CheckCircle2, MessageSquare, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { serviceCategories } from '@/lib/services-config';
import { hasBackup, type BackupInfo } from '@/lib/backup-info';

interface ReviewScreenProps {
  selectedServices: string[];
  observacoes: string;
  backup?: BackupInfo;
  onSign: () => void;
  onBack: () => void;
}

export function ReviewScreen({ selectedServices, observacoes, backup, onSign, onBack }: ReviewScreenProps) {
  // Group selected services by category
  const groupedServices = (serviceCategories ?? []).map((cat: any) => ({
    label: cat?.label ?? '',
    items: (cat?.items ?? []).filter((item: string) => (selectedServices ?? []).includes(`${cat?.id}::${item}`)),
  })).filter((group: any) => (group?.items?.length ?? 0) > 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-display font-bold tracking-tight">Treinamento Repassado</h2>
          <p className="text-sm text-muted-foreground">Revise os serviços selecionados</p>
        </div>
      </div>

      <div className="space-y-4">
        {(groupedServices ?? []).map((group: any, idx: number) => (
          <div key={idx} className="bg-card rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {group?.label}
            </h3>
            <ul className="space-y-2">
              {(group?.items ?? []).map((item: string, i: number) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {backup && hasBackup(backup) && (
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Backup
            </h3>
            <ul className="space-y-2 text-sm text-foreground">
              {backup.midiaExterna && (
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Backup em mídia externa</li>
              )}
              {backup.nuvem && (
                <li className="flex items-start gap-2"><span className="text-primary mt-0.5">•</span>Backup em nuvem</li>
              )}
            </ul>
            {backup.nuvem && (
              <div className="mt-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">E-mail do drive:</span> {backup.email}</p>
                <p><span className="text-muted-foreground">Senha do drive:</span> {backup.senha}</p>
              </div>
            )}
          </div>
        )}

        {observacoes && (
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações
            </h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{observacoes}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <Button onClick={onSign} className="flex-1 h-12 text-base font-semibold rounded-xl">
          <PenLine className="w-5 h-5 mr-2" />
          Assinar
        </Button>
      </div>
    </div>
  );
}
