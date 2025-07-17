
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { useRouter } from 'next/navigation';
import { Save, Eye, Loader2, ArrowLeft } from 'lucide-react';
import type { CardVisibilityConfig } from '@/lib/types';
import { getSetting, saveSetting } from '@/services/settingsService';

const ALL_CARD_IDS = PERIOD_DEFINITIONS.map(p => p.id);

export default function VisibilitySettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [visibilityConfig, setVisibilityConfig] = useState<CardVisibilityConfig>({});
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
          const storedVisibilityConfig = await getSetting('cardVisibilityConfig');
          if (storedVisibilityConfig) {
            setVisibilityConfig(storedVisibilityConfig);
          } else {
            const defaultConfig: CardVisibilityConfig = {};
            ALL_CARD_IDS.forEach(id => { defaultConfig[id] = true; });
            setVisibilityConfig(defaultConfig);
          }
        } catch (error) {
          console.error("Failed to load visibility settings:", error);
          toast({ title: "Erro ao carregar configurações", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleCheckboxChange = (cardId: string, checked: boolean) => {
    setVisibilityConfig(prev => ({ ...prev, [cardId]: checked }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveSetting('cardVisibilityConfig', visibilityConfig);
      toast({ title: "Configurações Salvas", description: "A visibilidade dos cards foi salva com sucesso." });
    } catch (error) {
      console.error("Failed to save visibility settings:", error);
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
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações de Visibilidade dos Cards</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Visibilidade dos Cards na Seleção de Período</CardTitle>
          <CardDescription>Marque os cards que devem ser visíveis na tela de seleção de período para todos os usuários. Desmarcar um card o ocultará da seleção.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_CARD_IDS.map(cardId => {
            const period = PERIOD_DEFINITIONS.find(p => p.id === cardId);
            const label = period ? period.label : cardId;
            return (
              <div key={cardId} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                <Checkbox
                  id={`vis-${cardId}`}
                  checked={visibilityConfig[cardId] ?? true} 
                  onCheckedChange={(checked) => handleCheckboxChange(cardId, Boolean(checked))}
                  aria-label={`Visibilidade para ${label}`}
                />
                <Label htmlFor={`vis-${cardId}`} className="flex-1 cursor-pointer py-1">
                  {label}
                </Label>
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Alterações de Visibilidade
      </Button>
    </div>
  );
}
