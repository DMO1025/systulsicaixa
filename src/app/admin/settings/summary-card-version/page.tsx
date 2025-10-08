"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ClipboardList } from 'lucide-react';
import { getSetting, saveSetting } from '@/services/settingsService';

type EventosInRestauranteSetting = 0 | 1;

export default function SummaryCardVersionSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedVersion, setSelectedVersion] = useState<EventosInRestauranteSetting>(0);
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
          const storedValue = await getSetting('eventosNoServicoRestaurante');
          if (storedValue === 1) {
            setSelectedVersion(1);
          } else {
            setSelectedVersion(0); // Default to 0 if not set or invalid
          }
        } catch (error) {
          console.error("Failed to load summary card version:", error);
          toast({ title: "Erro ao carregar configuração", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveSetting('eventosNoServicoRestaurante', selectedVersion);
      toast({ title: "Configuração Salva", description: `A versão do resumo lateral foi alterada para: ${selectedVersion === 0 ? 'Versão Padrão' : 'Versão Consolidada'}.` });
    } catch (error) {
      console.error("Failed to save summary card version:", error);
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
        <ClipboardList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Versão do Resumo Lateral</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Escolha o Modelo de Cálculo</CardTitle>
          <CardDescription>Selecione como os valores de "Eventos" devem ser tratados no resumo lateral da tela de lançamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={String(selectedVersion)} onValueChange={(value) => setSelectedVersion(Number(value) as EventosInRestauranteSetting)}>
            <div className="flex items-center space-x-2 p-4 border rounded-md hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="0" id="v1" />
              <Label htmlFor="v1" className="flex-1 cursor-pointer py-1">
                <span className="font-semibold">Versão Padrão</span>
                <p className="text-xs text-muted-foreground">"Eventos" é exibido como uma categoria separada em "Outros Serviços".</p>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-md hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
              <RadioGroupItem value="1" id="v2" />
              <Label htmlFor="v2" className="flex-1 cursor-pointer py-1">
                <span className="font-semibold">Versão Consolidada</span>
                 <p className="text-xs text-muted-foreground">O valor dos "Eventos" é somado diretamente aos "Serviços Restaurante" e não aparece como uma linha separada.</p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Versão
      </Button>
    </div>
  );
}
