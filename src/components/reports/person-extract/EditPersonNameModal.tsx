
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit } from 'lucide-react';

interface EditPersonNameModalProps {
  oldName: string;
  onNameUpdated: (oldName: string, newName: string) => void;
  startDate?: string;
  endDate?: string;
}

const EditPersonNameModal: React.FC<EditPersonNameModalProps> = ({ oldName, onNameUpdated, startDate, endDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState(oldName);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!newName.trim() || newName.trim() === oldName) {
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
        const response = await fetch('/api/rename-person', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                oldName,
                newName: newName.trim(),
                startDate,
                endDate
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao renomear a pessoa.');
        }

        const result = await response.json();

        toast({ title: "Sucesso!", description: result.message });
        onNameUpdated(oldName, newName.trim());
        setIsOpen(false);

    } catch (error: any) {
        toast({ title: "Erro ao Renomear", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  // Reset newName when dialog opens with a new oldName
  React.useEffect(() => {
    if (isOpen) {
      setNewName(oldName);
    }
  }, [isOpen, oldName]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-50 group-hover:opacity-100">
          <Edit className="h-3.5 w-3.5" />
          <span className="sr-only">Editar Nome</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear Pessoa/Setor</DialogTitle>
          <DialogDescription>
            Isso alterará todas as ocorrências de <span className="font-semibold">{oldName}</span> para o novo nome dentro do período do relatório.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="new-name">Novo Nome</Label>
          <Input
            id="new-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-2"
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

export default EditPersonNameModal;
