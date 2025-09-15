
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getDailyEntry, saveDailyEntry } from '@/services/dailyEntryService';
import type { DailyLogEntry, UnifiedPersonTransaction, FaturadoItem, ConsumoInternoItem, PeriodData } from '@/lib/types';
import { Loader2, Edit } from 'lucide-react';
import { parseISO } from 'date-fns';

interface EditObservationModalProps {
  transaction: UnifiedPersonTransaction;
  onObservationUpdated: (updatedTransaction: UnifiedPersonTransaction) => void;
}

const EditObservationModal: React.FC<EditObservationModalProps> = ({ transaction, onObservationUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [observationText, setObservationText] = useState(transaction.observation);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const transactionDate = parseISO(transaction.date.split('/').reverse().join('-'));
      const entry = await getDailyEntry(transactionDate) as DailyLogEntry | null;

      if (!entry) {
        throw new Error("Lançamento diário não encontrado para esta data.");
      }
      
      let itemUpdated = false;

      const updateItemObservation = (items: (FaturadoItem | ConsumoInternoItem)[]) => {
          const itemIndex = items.findIndex(i => i.id === transaction.id);
          if (itemIndex > -1) {
              items[itemIndex].observation = observationText;
              itemUpdated = true;
          }
      };

      const processPeriod = (period?: PeriodData) => {
          if (period?.subTabs?.faturado?.faturadoItems) {
              updateItemObservation(period.subTabs.faturado.faturadoItems);
          }
          if (period?.subTabs?.consumoInterno?.consumoInternoItems) {
              updateItemObservation(period.subTabs.consumoInterno.consumoInternoItems);
          }
      }
      
      processPeriod(entry.almocoPrimeiroTurno as PeriodData);
      if(!itemUpdated) processPeriod(entry.almocoSegundoTurno as PeriodData);
      if(!itemUpdated) processPeriod(entry.jantar as PeriodData);

      if (!itemUpdated) {
        throw new Error("Não foi possível encontrar o item específico para atualizar.");
      }

      await saveDailyEntry(transactionDate, entry);

      toast({ title: "Sucesso!", description: "Observação atualizada com sucesso." });
      onObservationUpdated({ ...transaction, observation: observationText });
      setIsOpen(false);

    } catch (error: any) {
      toast({ title: "Erro ao Salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50 group-hover:opacity-100">
          <Edit className="h-3.5 w-3.5" />
          <span className="sr-only">Editar Observação</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Observação</DialogTitle>
          <DialogDescription>
            Alterando observação para <span className="font-semibold">{transaction.personName}</span> do dia {transaction.date}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="observation-text">Observação</Label>
          <Textarea
            id="observation-text"
            value={observationText}
            onChange={(e) => setObservationText(e.target.value)}
            className="mt-2"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditObservationModal;
