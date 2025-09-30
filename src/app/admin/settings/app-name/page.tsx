
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Type } from 'lucide-react';
import { getSetting, saveSetting } from '@/services/settingsService';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Label } from '@/components/ui/label';

export default function AppNameSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { appName, setAppName: setGlobalAppName, isLoading: isAppConfigLoading } = useAppConfig();
  
  const [localAppName, setLocalAppName] = useState('');
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (userRole !== 'administrator') {
        toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
        router.push('/');
        return;
      }
      setIsLoadingPage(false);
    }
  }, [userRole, authLoading, router, toast]);

  useEffect(() => {
    if (!isAppConfigLoading && appName) {
      setLocalAppName(appName);
    }
  }, [appName, isAppConfigLoading]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const newName = localAppName.trim() || 'Caixa Tulsi'; // Default to 'Caixa Tulsi' if empty
      await saveSetting('appName', newName);
      setGlobalAppName(newName); // Update global state immediately
      toast({ title: "Nome Salvo", description: "O nome do aplicativo foi atualizado com sucesso." });
    } catch (error) {
      console.error("Failed to save app name:", error);
      toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoadingPage || isAppConfigLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Type className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Nome do Aplicativo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personalizar Nome do Aplicativo</CardTitle>
          <CardDescription>Altere o nome que aparece no cabeçalho, na tela de login e no título da página.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
             <Label htmlFor="app-name-input">Nome do App</Label>
             <Input 
                id="app-name-input"
                type="text"
                placeholder="Ex: Sistema Hotel"
                value={localAppName}
                onChange={(e) => setLocalAppName(e.target.value)}
            />
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
