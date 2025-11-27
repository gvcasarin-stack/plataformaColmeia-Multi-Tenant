'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ClientBillingTab } from './ClientBillingTab';
import { DollarSign } from 'lucide-react';

interface ClientBillingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName: string | null;
}

export function ClientBillingModal({
  open,
  onOpenChange,
  clientId,
  clientName,
}: ClientBillingModalProps) {
  if (!clientId || !clientName) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-indigo-600" />
            Gerenciar Faturamento
          </DialogTitle>
          <DialogDescription>
            Gerencie pacotes e assinaturas para {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <ClientBillingTab clientId={clientId} clientName={clientName} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
