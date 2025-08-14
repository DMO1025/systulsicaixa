
"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { DailyEntryFormData, SummaryCardItemsConfig, DailyLogEntry } from '@/lib/types';
import { getSetting } from '@/services/settingsService';
import { SUMMARY_CARD_CONFIGURABLE_ITEMS } from '@/lib/config/dashboard';
import { Button } from '@/components/ui/button';
import { ClipboardCopy, Loader2 } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { processEntryForTotals } from '@/lib/utils/calculations';

interface ResumoLateralCardProps {
  dailyData: DailyEntryFormData; 
}


const ResumoLateralCard: React.FC<ResumoLateralCardProps> = ({ dailyData }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [summaryConfig, setSummaryConfig] = useState<SummaryCardItemsConfig>({});
  
  useEffect(() => {
    async function loadConfig() {
      const config = await getSetting('summaryCardItemsConfig');
      const initialConfig: SummaryCardItemsConfig = {};
      SUMMARY_CARD_CONFIGURABLE_ITEMS.forEach(item => {
        initialConfig[item.id] = config ? config[item.id] !== false : true;
      });
      setSummaryConfig(initialConfig);
    }
    loadConfig();
  }, []);

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


  const summary = useMemo(() => {
    const config = summaryConfig;
    const totals = processEntryForTotals(dailyData as DailyLogEntry);

    // O TOTAL FITA é a soma das categorias visíveis.
    const totalFitaValor =
      (config.rsMadrugada ? totals.rsMadrugada.valor : 0) +
      (config.avulsoAssinado ? totals.cafeAvulsos.valor : 0) +
      (config.breakfast ? totals.breakfast.valor : 0) +
      (config.almoco ? totals.almoco.valor : 0) +
      (config.jantar ? totals.jantar.valor : 0) +
      (config.frigobar ? totals.frigobar.valor : 0) +
      (config.rwItalianoAlmoco ? totals.italianoAlmoco.valor : 0) +
      (config.rwItalianoJantar ? totals.italianoJantar.valor : 0) +
      (config.rwIndianoAlmoco ? totals.indianoAlmoco.valor : 0) +
      (config.rwIndianoJantar ? totals.indianoJantar.valor : 0) +
      (config.baliAlmoco ? totals.baliAlmoco.valor : 0) +
      (config.baliHappy ? totals.baliHappy.valor : 0);
    
    const totalFitaQtd =
      (config.rsMadrugada ? totals.rsMadrugada.qtdPedidos : 0) +
      (config.avulsoAssinado ? totals.cafeAvulsos.qtd : 0) +
      (config.breakfast ? totals.breakfast.qtd : 0) +
      (config.almoco ? totals.almoco.qtd : 0) +
      (config.jantar ? totals.jantar.qtd : 0) +
      (config.frigobar ? totals.frigobar.qtd : 0) +
      (config.rwItalianoAlmoco ? totals.italianoAlmoco.qtd : 0) +
      (config.rwItalianoJantar ? totals.italianoJantar.qtd : 0) +
      (config.rwIndianoAlmoco ? totals.indianoAlmoco.qtd : 0) +
      (config.rwIndianoJantar ? totals.indianoJantar.qtd : 0) +
      (config.baliAlmoco ? totals.baliAlmoco.qtd : 0) +
      (config.baliHappy ? totals.baliHappy.qtd : 0);

    const totalFitaItens = config.rsMadrugada ? totals.rsMadrugada.qtdPratos : 0;

    return {
      dateToDisplay: dailyData.date,
      
      // Individual items for display rows
      rsMadrugada: totals.rsMadrugada,
      cafeAvulsos: totals.cafeAvulsos,
      breakfast: totals.breakfast,
      almoco: totals.almoco,
      jantar: totals.jantar,
      italianoAlmoco: totals.italianoAlmoco,
      italianoJantar: totals.italianoJantar,
      indianoAlmoco: totals.indianoAlmoco,
      indianoJantar: totals.indianoJantar,
      baliAlmoco: totals.baliAlmoco,
      baliHappy: totals.baliHappy,
      frigobar: totals.frigobar,

      // Total Fita subtotal for display
      totalFita: { qtd: totalFitaQtd, itens: totalFitaItens, valor: totalFitaValor },

      // "Outros Serviços" items for display
      cafeHospedes: totals.cafeHospedes,
      almocoCI: totals.almocoCI,
      jantarCI: totals.jantarCI,
      eventosDireto: totals.eventos.direto,
      eventosHotel: totals.eventos.hotel,

      // Grand Totals for final section (directly from the source of truth)
      grandTotalComCI: totals.grandTotal.comCI,
      grandTotalSemCI: totals.grandTotal.semCI,
      totalCI: totals.totalCI,
      totalReajusteCI: totals.totalReajusteCI,
    };
  }, [dailyData, summaryConfig]);

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
            {summaryConfig.rsMadrugada && (
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
            {summaryConfig.avulsoAssinado && (
              <TableRow>
                <TableCell>AVULSOS CAFÉ</TableCell>
                <TableCell className="text-right">{summary.cafeAvulsos.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.cafeAvulsos.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.breakfast && (
              <TableRow>
                <TableCell>BREAKFAST</TableCell>
                <TableCell className="text-right">{summary.breakfast.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.breakfast.valor)}</TableCell>
              </TableRow>
            )}

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">SERVIÇOS RESTAURANTE</TableCell>
            </TableRow>
            {summaryConfig.almoco && (
              <TableRow>
                <TableCell>ALMOÇO</TableCell>
                <TableCell className="text-right">{summary.almoco.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.almoco.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.jantar && (
              <TableRow>
                <TableCell>JANTAR</TableCell>
                <TableCell className="text-right">{summary.jantar.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.jantar.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwItalianoAlmoco && (
              <TableRow>
                <TableCell>RW ITALIANO ALMOÇO</TableCell>
                <TableCell className="text-right">{summary.italianoAlmoco.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.italianoAlmoco.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwItalianoJantar && (
              <TableRow>
                <TableCell>RW ITALIANO JANTAR</TableCell>
                <TableCell className="text-right">{summary.italianoJantar.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.italianoJantar.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwIndianoAlmoco && (
              <TableRow>
                <TableCell>RW INDIANO ALMOÇO</TableCell>
                <TableCell className="text-right">{summary.indianoAlmoco.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.indianoAlmoco.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwIndianoJantar && (
              <TableRow>
                <TableCell>RW INDIANO JANTAR</TableCell>
                <TableCell className="text-right">{summary.indianoJantar.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.indianoJantar.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.baliAlmoco && (
              <TableRow>
                <TableCell>BALI ALMOÇO</TableCell>
                <TableCell className="text-right">{summary.baliAlmoco.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.baliAlmoco.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.baliHappy && (
              <TableRow>
                <TableCell>BALI HAPPY HOUR</TableCell>
                <TableCell className="text-right">{summary.baliHappy.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.baliHappy.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.frigobar && (
              <TableRow>
                <TableCell>FRIGOBAR</TableCell>
                <TableCell className="text-right">{summary.frigobar.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.frigobar.valor)}</TableCell>
              </TableRow>
            )}
            <TableRow className="font-semibold">
              <TableCell>TOTAL FITA</TableCell>
              <TableCell className="text-right">{summary.totalFita.qtd || '0'}</TableCell>
               <TableCell className="text-right">{summary.totalFita.itens || '0'}</TableCell> 
              <TableCell className="text-right">{formatCurrency(summary.totalFita.valor)}</TableCell>
            </TableRow>

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">OUTROS SERVIÇOS</TableCell>
            </TableRow>
            {summaryConfig.cafeHospedes && (
              <TableRow>
                <TableCell>CAFÉ HÓSPEDES</TableCell>
                <TableCell className="text-right">{summary.cafeHospedes.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.cafeHospedes.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.almocoCI && (
              <TableRow>
                <TableCell>ALMOÇO C.I.</TableCell>
                <TableCell className="text-right">{summary.almocoCI.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.almocoCI.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.jantarCI && (
              <TableRow>
                <TableCell>JANTAR C.I.</TableCell>
                <TableCell className="text-right">{summary.jantarCI.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.jantarCI.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.eventosDireto && (
              <TableRow>
                <TableCell>EVENTOS DIRETO</TableCell>
                <TableCell className="text-right">{summary.eventosDireto.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell> 
                <TableCell className="text-right">{formatCurrency(summary.eventosDireto.valor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.eventosHotel && (
              <TableRow>
                <TableCell>EVENTOS HOTEL</TableCell>
                <TableCell className="text-right">{summary.eventosHotel.qtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell> 
                <TableCell className="text-right">{formatCurrency(summary.eventosHotel.valor)}</TableCell>
              </TableRow>
            )}
            
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
