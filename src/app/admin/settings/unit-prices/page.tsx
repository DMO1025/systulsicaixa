

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SALES_CHANNELS } from '@/lib/config/forms';
import type { SalesChannelId } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Save, DollarSign, Loader2, ArrowLeft } from 'lucide-react';
import type { ChannelUnitPricesConfig } from '@/lib/types';
import { getSetting, saveSetting } from '@/services/settingsService';
import { CurrencyInput } from '@/components/ui/currency-input';

const CHANNELS_FOR_UNIT_PRICE_CONFIG: SalesChannelId[] = [
  'cdmListaHospedes', 
  'cdmNoShow', 
  'cdmSemCheckIn',
  'breakfastEntry',
  'rwItalianoAlmocoEntry',
  'rwItalianoJantarEntry',
  'rwIndianoAlmocoEntry',
  'rwIndianoJantarEntry',
];

export default function UnitPricesSettingsPage() {
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [channelUnitPrices, setChannelUnitPrices] = useState<ChannelUnitPricesConfig>({});
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
          const storedUnitPricesConfig = await getSetting('channelUnitPricesConfig');
          setChannelUnitPrices(storedUnitPricesConfig || {});
        } catch (error) {
          console.error("Failed to load unit price settings:", error);
          toast({ title: "Erro ao carregar configurações", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingPage(false);
        }
      };
      loadSettings();
    }
  }, [userRole, authLoading, router, toast]);

  const handleUnitPriceChange = (channelId: SalesChannelId, value: number | undefined) => {
    setChannelUnitPrices(prev => ({
      ...prev,
      [channelId]: value
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await saveSetting('channelUnitPricesConfig', channelUnitPrices);
      toast({ title: "Configurações Salvas", description: "Os preços unitários foram salvos com sucesso." });
    } catch (error) {
      console.error("Failed to save unit price settings:", error);
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
        <DollarSign className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Configuração de Preços Unitários</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Preços Unitários por Canal de Venda</CardTitle>
          <CardDescription>Defina um preço unitário para canais específicos. O valor total será calculado automaticamente (Qtd x Preço Unitário) na tela de lançamento para os canais listados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CHANNELS_FOR_UNIT_PRICE_CONFIG.map(channelId => (
            <div key={channelId} className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-3 border rounded-md hover:bg-muted/50">
              <Label htmlFor={`price-${channelId}`} className="flex-1 min-w-[200px] text-sm font-medium">
                {SALES_CHANNELS[channelId]}
              </Label>
              <div className="relative w-full sm:w-auto sm:min-w-[150px]">
                <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <CurrencyInput
                  id={`price-${channelId}`}
                  placeholder="R$ 0,00"
                  value={channelUnitPrices[channelId]}
                  onValueChange={(value) => handleUnitPriceChange(channelId, value)}
                  className="pl-8 text-sm h-9"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Button onClick={handleSaveChanges} className="mt-4" disabled={isSaving}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar Preços Unitários
      </Button>
    </div>
  );
}
