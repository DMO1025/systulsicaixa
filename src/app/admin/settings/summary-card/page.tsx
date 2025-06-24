
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SUMMARY_CARD_CONFIGURABLE_ITEMS, type SummaryCardItemId } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { Save, ListChecks, Loader2, ArrowLeft } from 'lucide-react';
import { getSetting, saveSetting } from '@/services/settingsService';
import type { SummaryCardItemsConfig } from '@/lib/types';


export default function SummaryCardSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [itemsConfig, setItemsConfig] = useState<SummaryCardItemsConfig>({});
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
          const storedConfig = await getSetting('summaryCardItemsConfig');
          const initialConfig: SummaryCardItemsConfig = {};
          SUMMARY_CARD_CONFIGURABLE_ITEMS.forEach(item => {
            initialConfig[item.id] = storedConfig ? storedConfig[item.id] !== false : true;
          });
          setItemsConfig(initialConfig);
        } catch (error) {
          console.error("Failed to load summary card items settings:", error);
          toast({ title: "Erro ao carregar configurações", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleCheckboxChange = (itemId: SummaryCardItemId, checked: boolean) => {
    setItemsConfig(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveSetting('summaryCardItemsConfig', itemsConfig);
      toast({ title: "Configurações Salvas", description: "As configurações do resumo lateral foram salvas com sucesso." });
    } catch (error) {
      console.error("Failed to save summary card items settings:", error);
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
        <ListChecks className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Inclusão de Itens no Resumo Lateral</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Controle de Itens nos Totais</CardTitle>
          <CardDescription>Marque os itens que devem ser incluídos nos cálculos de "TOTAL FITA", "TOTAL GERAL COM CI" e "TOTAL GERAL SEM CI" no resumo lateral da tela de lançamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUMMARY_CARD_CONFIGURABLE_ITEMS.map(item => (
              <div key={item.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                <Checkbox
                  id={`item-${item.id}`}
                  checked={itemsConfig[item.id] ?? true} 
                  onCheckedChange={(checked) => handleCheckboxChange(item.id, Boolean(checked))}
                  aria-label={`Inclusão de ${item.label} nos totais`}
                />
                <Label htmlFor={`item-${item.id}`} className="flex-1 cursor-pointer py-1 text-sm">
                  {item.label}
                </Label>
              </div>
            ))}
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
