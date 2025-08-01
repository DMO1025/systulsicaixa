

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Briefcase, Trash2, UserPlus } from 'lucide-react'; 
import { getSetting, saveSetting } from '@/services/settingsService';
import { v4 as uuidv4 } from 'uuid';
import type { BilledClient } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


export default function BilledClientsSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<BilledClient[]>([]);
  const [newClientName, setNewClientName] = useState('');
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (userRole !== 'administrator') {
        toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
        router.push('/');
        return;
      }
      
      const loadSettings = async () => {
        setIsLoadingPage(true);
        try {
          const storedClients = await getSetting('billedClients');
          if (Array.isArray(storedClients)) {
            setClients(storedClients);
          } else {
            setClients([]);
          }
        } catch (error) {
          console.error("Failed to load billed clients:", error);
          toast({ title: "Erro ao carregar itens", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleAddClient = () => {
    if (!newClientName.trim()) {
        toast({ title: "Nome Inválido", description: "O nome não pode estar em branco.", variant: "destructive"});
        return;
    }
    setClients(prev => [...(Array.isArray(prev) ? prev : []), { id: uuidv4(), name: newClientName.trim() }]);
    setNewClientName('');
  };

  const handleRemoveClient = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  };
  
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const validClients = clients.filter(c => c && c.id && c.name && c.name.trim() !== '');
      await saveSetting('billedClients', validClients);
      toast({ title: "Itens Salvos", description: "A lista de pessoas/setores foi salva com sucesso." });
    } catch (error) {
      console.error("Failed to save billed clients:", error);
      toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoadingPage) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Briefcase className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Cadastro de Pessoas/Setores Faturados</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Item</CardTitle>
          <CardDescription>Adicione pessoas ou setores à lista que aparecerá como sugestão no formulário de lançamentos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
            <Input 
                type="text"
                placeholder="Nome da Pessoa ou Setor"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClient()}
            />
            <Button onClick={handleAddClient} className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar
            </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Lista de Cadastros</CardTitle>
            <CardDescription>Gerencie a lista de pessoas e setores cadastrados. Lembre-se de salvar as alterações.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead className="w-[100px] text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clients && clients.length > 0 ? (
                            clients.map(client => (
                                <TableRow key={client.id}>
                                    <TableCell>{client.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveClient(client.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">Nenhum item cadastrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Alterações
      </Button>
    </div>
  );
}
