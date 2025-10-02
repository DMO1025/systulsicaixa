
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCw } from 'lucide-react';
import type { EstornoItem } from '@/lib/types';


interface RelaunchModalProps {
  originalItem: EstornoItem;
  onSuccess: () => void;
}

export function RelaunchModal({ originalItem, onSuccess }: RelaunchModalProps) {
  const { toast } = useToast();
  const { username } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [additionalObservation, setAdditionalObservation] = useState('');

  const handleConfirmRelaunch = async () => {
    setIsSaving(true);

    const payload = {
        originalItemId: originalItem.id,
        originalItemDate: originalItem.date,
        additionalObservation: additionalObservation,
        registeredBy: username || 'sistema'
    };

    try {
      const response = await fetch('/api/estornos/relaunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();

      if (!response.ok) {
        console.error("[LOG DE ERRO RELAUNCH] Payload enviado:", payload);
        console.error("[LOG DE ERRO RELAUNCH] Resposta da API:", responseData);
        let errorDetails = '';
        if (responseData.errors) {
            errorDetails = Object.entries(responseData.errors).map(([field, errorObj]: [string, any]) => {
                if (errorObj && errorObj._errors && Array.isArray(errorObj._errors)) {
                    return `${field}: ${errorObj._errors.join(', ')}`;
                }
                return '';
            }).filter(Boolean).join(' | ');
        }
        
        const displayMessage = errorDetails || responseData.message || 'Falha ao relançar estorno.';
        throw new Error(displayMessage);
      }

      toast({ title: 'Sucesso!', description: responseData.message || 'Estorno relançado como crédito com sucesso.' });
      onSuccess();
      setIsOpen(false);
      setAdditionalObservation('');

    } catch (error) {
      toast({ title: "Erro ao Relançar", description: (error as Error).message, variant: "destructive", duration: 7000 });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-blue-500 h-8 w-8" title="Relançar Estorno">
          <RotateCw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Relançar Estorno como Crédito</DialogTitle>
          <DialogDescription>
            Isso criará um novo lançamento com o valor positivo de{' '}
            <span className="font-bold text-green-600">{Math.abs(originalItem.valorEstorno || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.
            O estorno original não será alterado.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="relaunch-observation">Observação Adicional (Opcional)</Label>
          <Textarea
            id="relaunch-observation"
            placeholder="Ex: Lançamento correto após verificação do consumo."
            value={additionalObservation}
            onChange={(e) => setAdditionalObservation(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleConfirmRelaunch} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Relançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
