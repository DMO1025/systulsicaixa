
"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { DailyEntryFormData, SummaryCardItemsConfig, DailyLogEntry, EventosInRestauranteSetting } from '@/lib/types';
import { getSetting } from '@/services/settingsService';
import { SUMMARY_CARD_CONFIGURABLE_ITEMS } from '@/lib/config/dashboard';
import { Button } from '@/components/ui/button';
import { ClipboardCopy, Loader2 } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { processEntryForTotals } from '@/lib/utils/calculations/index';

interface ResumoLateralCardProps {
  dailyData: DailyEntryFormData; 
}


const ResumoLateralCard: React.FC<ResumoLateralCardProps> = ({ dailyData }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [summaryConfig, setSummaryConfig] = useState<SummaryCardItemsConfig>({});
  const [eventosNoServicoRestaurante, setEventosNoServicoRestaurante] = useState<EventosInRestauranteSetting>(0);
  
  useEffect(() => {
    async function loadConfig() {
      try {
        const [config, versionSetting] = await Promise.all([
          getSetting('summaryCardItemsConfig'),
          getSetting('eventosNoServicoRestaurante')
        ]);

        const initialConfig: SummaryCardItemsConfig = {};
        SUMMARY_CARD_CONFIGURABLE_ITEMS.forEach(item => {
          initialConfig[item.id] = config ? config[item.id] !== false : true;
        });
        
        setSummaryConfig(initialConfig);
        
        if (versionSetting === 1) {
            setEventosNoServicoRestaurante(1);
        } else {
            setEventosNoServicoRestaurante(0);
        }

      } catch (error) {
        console.error("Failed to load summary card configuration:", error);
        toast({ title: "Erro ao carregar configurações", description: "Não foi possível carregar as configurações do resumo lateral.", variant: "destructive" });
      }
    }
    loadConfig();
  }, [toast]);

  const summary = useMemo(() => {
    const config = summaryConfig;
    const totals = processEntryForTotals(dailyData as DailyLogEntry);

    const isV2 = eventosNoServicoRestaurante === 1;

    // Define base items for "SERVIÇOS RESTAURANTE" section
    const servicosRestauranteItems = [
      { id: 'almoco', label: 'ALMOÇO', data: totals.almoco, visible: config.almoco },
      { id: 'jantar', label: 'JANTAR', data: totals.jantar, visible: config.jantar },
      { id: 'rwItalianoAlmoco', label: 'RW ITALIANO ALMOÇO', data: totals.italianoAlmoco, visible: config.rwItalianoAlmoco },
      { id: 'rwItalianoJantar', label: 'RW ITALIANO JANTAR', data: totals.italianoJantar, visible: config.rwItalianoJantar },
      { id: 'rwIndianoAlmoco', label: 'RW INDIANO ALMOÇO', data: totals.indianoAlmoco, visible: config.rwIndianoAlmoco },
      { id: 'rwIndianoJantar', label: 'RW INDIANO JANTAR', data: totals.indianoJantar, visible: config.rwIndianoJantar },
      { id: 'baliAlmoco', label: 'BALI ALMOÇO', data: totals.baliAlmoco, visible: config.baliAlmoco },
      { id: 'baliHappy', label: 'BALI HAPPY HOUR', data: totals.baliHappy, visible: config.baliHappy },
      { id: 'frigobar', label: 'FRIGOBAR', data: totals.frigobar, visible: config.frigobar },
    ].filter(Boolean);
    
    // In V2, add EVENTOS (HOTEL) to this list
    if (isV2) {
      servicosRestauranteItems.push({ id: 'eventosHotel', label: 'EVENTOS (HOTEL)', data: totals.eventos.hotel, visible: config.eventosHotel });
    }

    // Define items for "OUTROS SERVIÇOS" section
    const outrosServicosItems = [
      { id: 'cafeHospedes', label: 'CAFÉ HÓSPEDES', data: totals.cafeHospedes, visible: config.cafeHospedes },
      { id: 'breakfast', label: 'BREAKFAST', data: totals.breakfast, visible: config.breakfast },
      { id: 'almocoCI', label: 'ALMOÇO C.I.', data: totals.almocoCI, visible: config.almocoCI },
      { id: 'jantarCI', label: 'JANTAR C.I.', data: totals.jantarCI, visible: config.jantarCI },
      // EVENTOS (HOTEL) is conditionally added here only if NOT in V2
      { id: 'eventosHotel', label: 'EVENTOS (HOTEL)', data: totals.eventos.hotel, visible: !isV2 && config.eventosHotel },
      // EVENTOS (DIRETO) is always here
      { id: 'eventosDireto', label: 'EVENTOS (DIRETO)', data: totals.eventos.direto, visible: config.eventosDireto },
    ].filter(Boolean);
    
    // Calculate SERVIÇOS RESTAURANTE total
    let servicosRestauranteTotal = servicosRestauranteItems.reduce((acc, item: any) => {
        // Here, we check visibility based on the original list, before adding the conditional evento hotel
        const originalItem = SUMMARY_CARD_CONFIGURABLE_ITEMS.find(i => i.id === item.id);
        const isVisibleInConfig = originalItem ? config[originalItem.id] !== false : true;

        if (isVisibleInConfig) {
            acc.qtd += item.data.qtd || 0;
            acc.valor += item.data.valor || 0;
        }
        return acc;
    }, { qtd: 0, valor: 0 });
    
    const totalFita = {
        qtd: (config.rsMadrugada ? totals.rsMadrugada.qtdPedidos : 0) + (config.avulsoAssinado ? totals.cafeAvulsos.qtd : 0) + servicosRestauranteTotal.qtd,
        itens: (config.rsMadrugada ? totals.rsMadrugada.qtdPratos : 0),
        valor: (config.rsMadrugada ? totals.rsMadrugada.valor : 0) + (config.avulsoAssinado ? totals.cafeAvulsos.valor : 0) + servicosRestauranteTotal.valor,
    };

    return {
      dateToDisplay: dailyData.date,
      config: summaryConfig,
      rsMadrugada: totals.rsMadrugada,
      cafeAvulsos: totals.cafeAvulsos,
      
      servicosRestauranteItems: servicosRestauranteItems,
      servicosRestauranteTotal: servicosRestauranteTotal,

      totalFita: totalFita,
      
      outrosServicosItems: outrosServicosItems,

      grandTotalComCI: totals.grandTotal.comCI,
      grandTotalSemCI: totals.grandTotal.semCI,
      totalCI: totals.totalCI,
      totalReajusteCI: totals.totalReajusteCI,
    };
  }, [dailyData, summaryConfig, eventosNoServicoRestaurante]);

  const displayDate = useMemo(() => {
    const dateValue = summary.dateToDisplay;
    if (dateValue) {
        if (dateValue instanceof Date && isValid(dateValue)) {
            return format(dateValue, 'dd/MM/yyyy', { locale: ptBR });
        } else if (typeof dateValue === 'string') {
            try {
                const parsed = parseISO(dateValue);
                if (isValid(parsed)) {
                    return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
                }
            } catch (e) {
                 // Fall through
            }
        }
    }
    return "Data Inválida"; 
  }, [summary.dateToDisplay]);


  const formatCurrency = (value: number) => {
      const formatted = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      return formatted.length > 18 ? value.toLocaleString('pt-BR') : formatted;
  }
  
  const handleCopy = async () => {
    if (!cardRef.current) return;
    setIsCopying(true);

    const captureHeader = cardRef.current.querySelector('.capture-header') as HTMLElement | null;
    const interactiveHeader = cardRef.current.querySelector('.interactive-header') as HTMLElement | null;

    try {
      // Prepare for capture: show the clean header, hide the interactive one
      if (captureHeader) captureHeader.style.display = 'block';
      if (interactiveHeader) interactiveHeader.style.display = 'flex';

      const blob = await toBlob(cardRef.current, {
        backgroundColor: 'hsl(var(--card))',
        pixelRatio: 2,
        style: {
            boxShadow: 'none',
        }
      });
      
      if (!blob) {
        throw new Error('Falha ao gerar a imagem.');
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      toast({
        title: "Copiado!",
        description: "O resumo foi copiado como uma imagem para a área de transferência.",
      });
    } catch (error) {
      console.error("Erro ao copiar imagem:", error);
      toast({
        title: "Erro ao Copiar",
        description: "Não foi possível copiar o resumo. Verifique as permissões do navegador.",
        variant: "destructive",
      });
    } finally {
        // Revert changes after capture
        if (captureHeader) captureHeader.style.display = 'none';
        if (interactiveHeader) interactiveHeader.style.display = 'flex';
        setIsCopying(false);
    }
  };


  return (
    <Card className="mt-8 lg:mt-0" ref={cardRef}>
      <div style={{ display: 'none' }} className="capture-header p-6 text-center bg-card">
        <CardTitle className="text-lg font-semibold">Caixa Tulsi</CardTitle>
        <CardDescription>{displayDate}</CardDescription>
      </div>
      <CardHeader className="text-center interactive-header">
        <CardTitle className="text-lg font-semibold">Caixa Tulsi</CardTitle>
        <CardDescription>{displayDate}</CardDescription>
        <div className="pt-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={isCopying}>
                {isCopying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCopy className="mr-2 h-4 w-4" />}
                Copiar como Imagem
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">PERÍODO</TableHead>
              <TableHead className="text-right">QTD</TableHead>
              <TableHead className="text-right">ITENS</TableHead>
              <TableHead className="text-right">VALOR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">MADRUGADA</TableCell>
            </TableRow>
            {summary.config.rsMadrugada && (
              <TableRow>
                <TableCell>RS MADRUGADA</TableCell>
                <TableCell className="text-right">{summary.rsMadrugada.qtdPedidos || '0'}</TableCell>
                <TableCell className="text-right">{summary.rsMadrugada.qtdPratos || '0'}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.rsMadrugada.valor)}</TableCell>
              </TableRow>
            )}

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">ITENS AVULSOS CAFÉ DA MANHÃ</TableCell>
            </TableRow>
            {summary.config.avulsoAssinado && (
              <TableRow>
                <TableCell>AVULSOS CAFÉ</TableCell>
                <TableCell className="text-right">{summary.cafeAvulsos.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.cafeAvulsos.valor)}</TableCell>
              </TableRow>
            )}

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">SERVIÇOS RESTAURANTE</TableCell>
            </TableRow>
            {summary.servicosRestauranteItems.map((item: any) => (
                item.visible && (
                    <TableRow key={item.id}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell className="text-right">{item.data.qtd || '0'}</TableCell>
                        <TableCell className="text-right">&nbsp;</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.data.valor)}</TableCell>
                    </TableRow>
                )
            ))}
           
            <TableRow className="font-semibold">
              <TableCell>TOTAL FITA</TableCell>
              <TableCell className="text-right">{summary.totalFita.qtd || '0'}</TableCell>
               <TableCell className="text-right">{summary.totalFita.itens || '0'}</TableCell> 
              <TableCell className="text-right">{formatCurrency(summary.totalFita.valor)}</TableCell>
            </TableRow>

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">OUTROS SERVIÇOS</TableCell>
            </TableRow>
            {summary.outrosServicosItems.map((item: any) => {
              if (item.visible) {
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell className="text-right">{item.data.qtd || '0'}</TableCell>
                    <TableCell className="text-right">&nbsp;</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.data.valor)}</TableCell>
                  </TableRow>
                )
              }
              return null;
            })}
            
            <TableRow className="font-semibold border-t-2 border-foreground">
              <TableCell>TOTAL GERAL COM CI</TableCell>
              <TableCell className="text-right">{summary.grandTotalComCI.qtd || 0}</TableCell>
              <TableCell className="text-right">{summary.rsMadrugada.qtdPratos || '0'}</TableCell>
              <TableCell className="text-right">{formatCurrency(summary.grandTotalComCI.valor)}</TableCell>
            </TableRow>
            <TableRow className="font-medium text-muted-foreground">
                <TableCell className="pl-6">(-) Total C.I.</TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell className="text-right">-{formatCurrency(summary.totalCI.valor)}</TableCell>
            </TableRow>
            <TableRow className="font-medium text-muted-foreground">
                <TableCell className="pl-6">(-) Reajuste C.I.</TableCell>
                <TableCell colSpan={2}></TableCell>
                <TableCell className="text-right">-{formatCurrency(summary.totalReajusteCI)}</TableCell>
            </TableRow>
            <TableRow className="font-semibold">
              <TableCell>TOTAL GERAL SEM CI</TableCell>
              <TableCell className="text-right">{summary.grandTotalSemCI.qtd || 0}</TableCell>
              <TableCell className="text-right">{summary.rsMadrugada.qtdPratos || '0'}</TableCell>
              <TableCell className="text-right">{formatCurrency(summary.grandTotalSemCI.valor)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ResumoLateralCard;
