
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DASHBOARD_ACCUMULATED_ITEMS_CONFIG } from '@/lib/config/dashboard';
import { useRouter } from 'next/navigation';
import { Save, LayoutList, Loader2, ArrowLeft } from 'lucide-react';
import { getSetting, saveSetting } from '@/services/settingsService';

const ALL_DASHBOARD_ITEMS = DASHBOARD_ACCUMULATED_ITEMS_CONFIG.map(i => i.item);

export default function DashboardVisibilitySettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [visibilityConfig, setVisibilityConfig] = useState<Record<string, boolean>>({});
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
          const storedConfig = await getSetting('dashboardItemVisibilityConfig');
          // If a stored config exists, use it. Otherwise, default all to true.
          const initialConfig: Record<string, boolean> = {};
          ALL_DASHBOARD_ITEMS.forEach(item => {
            // visible if storedConfig exists and is not explicitly false, or if no storedConfig exists
            initialConfig[item] = storedConfig ? storedConfig[item] !== false : true;
          });
          setVisibilityConfig(initialConfig);
        } catch (error) {
          console.error("Failed to load dashboard visibility settings:", error);
          toast({ title: "Erro ao carregar configurações", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setVisibilityConfig(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveSetting('dashboardItemVisibilityConfig', visibilityConfig);
      toast({ title: "Configurações Salvas", description: "A visibilidade dos itens do dashboard foi salva com sucesso." });
    } catch (error) {
      console.error("Failed to save dashboard visibility settings:", error);
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
        <LayoutList className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Visibilidade do Dashboard</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Visibilidade dos Itens no "Acumulativo Mensal"</CardTitle>
          <CardDescription>Marque os itens que devem ser visíveis na tabela do dashboard. Desmarcar um item o ocultará.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ALL_DASHBOARD_ITEMS.map(itemId => (
            <div key={itemId} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
              <Checkbox
                id={`vis-${itemId}`}
                checked={visibilityConfig[itemId] ?? true} 
                onCheckedChange={(checked) => handleCheckboxChange(itemId, Boolean(checked))}
                aria-label={`Visibilidade para ${itemId}`}
              />
              <Label htmlFor={`vis-${itemId}`} className="flex-1 cursor-pointer py-1">
                {itemId}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Alterações de Visibilidade
      </Button>
    </div>
  );
}
