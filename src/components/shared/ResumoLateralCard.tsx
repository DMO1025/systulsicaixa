
"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { DailyEntryFormData, PeriodId, EventosPeriodData, EventItemData, SubEventItem, SummaryCardItemsConfig } from '@/lib/types';
import { getSetting } from '@/services/settingsService';
import { SUMMARY_CARD_CONFIGURABLE_ITEMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ClipboardCopy, Loader2 } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

interface ResumoLateralCardProps {
  dailyData: DailyEntryFormData; 
}

const getSafeNumericValue = (data: any, path: string, defaultValue: number = 0): number => {
  if (data === undefined || data === null) return defaultValue;
  const parts = path.split('.');
  let current = data;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }
  const numValue = current !== undefined && current !== null ? parseFloat(String(current)) : defaultValue;
  return isNaN(numValue) ? defaultValue : numValue;
};


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
    try {
      // Temporarily make hidden header visible for capture
      const headerElement = cardRef.current.querySelector('.capture-header') as HTMLElement;
      if (headerElement) headerElement.style.display = 'block';

      const blob = await toBlob(cardRef.current, {
        backgroundColor: 'hsl(var(--card))',
        pixelRatio: 2,
        style: {
            boxShadow: 'none', // Remove shadow from capture
        }
      });
      
      if (headerElement) headerElement.style.display = 'none'; // Hide it again

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
        setIsCopying(false);
    }
  };


  const calculateTotalValorForPeriod = (periodId: PeriodId, data: DailyEntryFormData) => {
    if (periodId === 'eventos') {
      return 0; 
    }

    const periodData = data[periodId];
    if (!periodData || typeof periodData === 'string') return 0;

    let total = 0;
    if ('channels' in periodData && periodData.channels) {
      Object.values(periodData.channels).forEach(channel => {
        total += getSafeNumericValue(channel, 'vtotal');
      });
    }
    if ('subTabs' in periodData && periodData.subTabs) {
      Object.values(periodData.subTabs).forEach(subTab => {
        if (subTab?.channels) {
          Object.values(subTab.channels).forEach(channel => {
            total += getSafeNumericValue(channel, 'vtotal');
          });
        }
      });
    }
    return total;
  };

  const calculateTotalQtdForPeriod = (periodId: PeriodId, data: DailyEntryFormData) => {
     if (periodId === 'eventos') {
      return 0;
    }
    const periodData = data[periodId];
     if (!periodData || typeof periodData === 'string') return 0;


    let totalQtd = 0;
    if ('channels' in periodData && periodData.channels) {
      Object.values(periodData.channels).forEach(channel => {
        totalQtd += getSafeNumericValue(channel, 'qtd');
      });
    }
    if ('subTabs' in periodData && periodData.subTabs) {
      Object.values(periodData.subTabs).forEach(subTab => {
        if (subTab?.channels) {
          Object.values(subTab.channels).forEach(channel => {
            totalQtd += getSafeNumericValue(channel, 'qtd');
          });
        }
      });
    }
    return totalQtd;
  };

  const summary = useMemo(() => {
    const data = dailyData; 
    const config = summaryConfig;

    const rsMadrugadaQtd = getSafeNumericValue(data, 'madrugada.channels.madrugadaRoomServiceQtdPedidos.qtd');
    const rsMadrugadaItens = getSafeNumericValue(data, 'madrugada.channels.madrugadaRoomServiceQtdPratos.qtd');
    const rsMadrugadaValor = getSafeNumericValue(data, 'madrugada.channels.madrugadaRoomServicePagDireto.vtotal') +
                             getSafeNumericValue(data, 'madrugada.channels.madrugadaRoomServiceValorServico.vtotal');

    const avulsoAssinadoQtd = getSafeNumericValue(data, 'cafeDaManha.channels.cdmCafeAssinado.qtd');
    const avulsoAssinadoValor = getSafeNumericValue(data, 'cafeDaManha.channels.cdmCafeAssinado.vtotal');
    const buffetCafeDiretoQtd = getSafeNumericValue(data, 'cafeDaManha.channels.cdmDiretoCartao.qtd');
    const buffetCafeDiretoValor = getSafeNumericValue(data, 'cafeDaManha.channels.cdmDiretoCartao.vtotal');
    
    const cdmListaHospedesValor = getSafeNumericValue(data, 'cafeDaManha.channels.cdmListaHospedes.vtotal');
    const cdmListaHospedesQtd = getSafeNumericValue(data, 'cafeDaManha.channels.cdmListaHospedes.qtd');
    const cdmNoShowValor = getSafeNumericValue(data, 'cafeDaManha.channels.cdmNoShow.vtotal');
    const cdmNoShowQtd = getSafeNumericValue(data, 'cafeDaManha.channels.cdmNoShow.qtd');
    const cdmSemCheckInValor = getSafeNumericValue(data, 'cafeDaManha.channels.cdmSemCheckIn.vtotal');
    const cdmSemCheckInQtd = getSafeNumericValue(data, 'cafeDaManha.channels.cdmSemCheckIn.qtd');

    const cafeHospedesTotalQtd = cdmListaHospedesQtd + cdmNoShowQtd + cdmSemCheckInQtd;
    const cafeHospedesTotalValor = cdmListaHospedesValor + cdmNoShowValor + cdmSemCheckInValor;

    const almocoPrimeiroTurnoValor = calculateTotalValorForPeriod('almocoPrimeiroTurno', data);
    const almocoSegundoTurnoValor = calculateTotalValorForPeriod('almocoSegundoTurno', data);
    const almocoValor = almocoPrimeiroTurnoValor + almocoSegundoTurnoValor;

    const almocoPrimeiroTurnoQtd = calculateTotalQtdForPeriod('almocoPrimeiroTurno', data);
    const almocoSegundoTurnoQtd = calculateTotalQtdForPeriod('almocoSegundoTurno', data);
    const almocoQtd = almocoPrimeiroTurnoQtd + almocoSegundoTurnoQtd;

    const jantarValor = calculateTotalValorForPeriod('jantar', data);
    const jantarQtd = calculateTotalQtdForPeriod('jantar', data);
    
    const frigobarValor = calculateTotalValorForPeriod('frigobar', data);
    const frigobarQtd = calculateTotalQtdForPeriod('frigobar', data); 
    
    const breakfastValor = calculateTotalValorForPeriod('breakfast', data);
    const breakfastQtd = calculateTotalQtdForPeriod('breakfast', data);

    const italianoAlmocoValor = calculateTotalValorForPeriod('italianoAlmoco', data);
    const italianoAlmocoQtd = calculateTotalQtdForPeriod('italianoAlmoco', data);
    
    const italianoJantarValor = calculateTotalValorForPeriod('italianoJantar', data);
    const italianoJantarQtd = calculateTotalQtdForPeriod('italianoJantar', data);

    const indianoAlmocoValor = calculateTotalValorForPeriod('indianoAlmoco', data);
    const indianoAlmocoQtd = calculateTotalQtdForPeriod('indianoAlmoco', data);

    const indianoJantarValor = calculateTotalValorForPeriod('indianoJantar', data);
    const indianoJantarQtd = calculateTotalQtdForPeriod('indianoJantar', data);


    let eventosDiretoValor = 0;
    let eventosDiretoQtd = 0;
    let eventosHotelValor = 0;
    let eventosHotelQtd = 0;

    const eventosData = data.eventos as EventosPeriodData | undefined;
    (eventosData?.items || []).forEach(item => {
      (item.subEvents || []).forEach(subEvent => {
        const qty = subEvent.quantity || 0;
        const val = subEvent.totalValue || 0;
        if (subEvent.location === 'DIRETO') {
          eventosDiretoQtd += qty;
          eventosDiretoValor += val;
        } else if (subEvent.location === 'HOTEL') {
          eventosHotelQtd += qty;
          eventosHotelValor += val;
        }
      });
    });

    const totalFitaValor =
      (config.rsMadrugada ? rsMadrugadaValor : 0) +
      (config.avulsoAssinado ? avulsoAssinadoValor : 0) +
      (config.buffetCafeDireto ? buffetCafeDiretoValor : 0) +
      (config.breakfast ? breakfastValor : 0) +
      (config.almoco ? almocoValor : 0) +
      (config.jantar ? jantarValor : 0) +
      (config.frigobar ? frigobarValor : 0) +
      (config.rwItalianoAlmoco ? italianoAlmocoValor : 0) +
      (config.rwItalianoJantar ? italianoJantarValor : 0) +
      (config.rwIndianoAlmoco ? indianoAlmocoValor : 0) +
      (config.rwIndianoJantar ? indianoJantarValor : 0);
    
    const totalFitaQtd =
      (config.rsMadrugada ? rsMadrugadaQtd : 0) +
      (config.avulsoAssinado ? avulsoAssinadoQtd : 0) +
      (config.buffetCafeDireto ? buffetCafeDiretoQtd : 0) +
      (config.breakfast ? breakfastQtd : 0) +
      (config.almoco ? almocoQtd : 0) +
      (config.jantar ? jantarQtd : 0) +
      (config.frigobar ? frigobarQtd : 0) +
      (config.rwItalianoAlmoco ? italianoAlmocoQtd : 0) +
      (config.rwItalianoJantar ? italianoJantarQtd : 0) +
      (config.rwIndianoAlmoco ? indianoAlmocoQtd : 0) +
      (config.rwIndianoJantar ? indianoJantarQtd : 0);

    const almocoCIValor =
      getSafeNumericValue(data, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosTotalCI.vtotal') +
      getSafeNumericValue(data, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosTotalCI.vtotal');
    const almocoCIQtd =
      getSafeNumericValue(data, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosConsumoInternoQtd.qtd') +
      getSafeNumericValue(data, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosConsumoInternoQtd.qtd');
    const jantarCIValor = getSafeNumericValue(data, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosTotalCI.vtotal');
    const jantarCIQtd = getSafeNumericValue(data, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosConsumoInternoQtd.qtd');

    const totalGeralComCIValor = 
        totalFitaValor +
        (config.cafeHospedes ? cafeHospedesTotalValor : 0) +
        (config.almocoCI ? almocoCIValor : 0) +
        (config.jantarCI ? jantarCIValor : 0) +
        (config.eventosDireto ? eventosDiretoValor : 0) +
        (config.eventosHotel ? eventosHotelValor : 0);

    const totalGeralComCIQtd = 
        totalFitaQtd + 
        (config.rsMadrugada ? rsMadrugadaItens : 0) + 
        (config.cafeHospedes ? cafeHospedesTotalQtd : 0) +
        (config.almocoCI ? almocoCIQtd : 0) +
        (config.jantarCI ? jantarCIQtd : 0) +
        (config.eventosDireto ? eventosDiretoQtd : 0) +
        (config.eventosHotel ? eventosHotelQtd : 0);

    const totalGeralSemCIValor = totalGeralComCIValor - (almocoCIValor + jantarCIValor);
    const totalGeralSemCIQtd = totalGeralComCIQtd - (almocoCIQtd + jantarCIQtd);

    return {
      dateToDisplay: data.date,
      rsMadrugadaQtd, rsMadrugadaItens, rsMadrugadaValor,
      avulsoAssinadoQtd, avulsoAssinadoValor,
      buffetCafeDiretoQtd, buffetCafeDiretoValor,
      cafeHospedesTotalQtd, cafeHospedesTotalValor, 
      almocoQtd, almocoValor,
      jantarQtd, jantarValor,
      frigobarQtd, frigobarValor,
      breakfastQtd, breakfastValor,
      italianoAlmocoQtd, italianoAlmocoValor,
      italianoJantarQtd, italianoJantarValor,
      indianoAlmocoQtd, indianoAlmocoValor,
      indianoJantarQtd, indianoJantarValor,
      eventosDiretoQtd, eventosDiretoValor,
      eventosHotelQtd, eventosHotelValor,
      totalFitaValor, totalFitaQtd,
      almocoCIQtd, almocoCIValor,
      jantarCIQtd, jantarCIValor,
      totalGeralComCIQtd, totalGeralComCIValor,
      totalGeralSemCIQtd, totalGeralSemCIValor,
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


  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card className="mt-8 lg:mt-0" ref={cardRef}>
      <div style={{ display: 'none' }} className="capture-header p-6 text-center bg-card">
        <CardTitle className="text-lg font-semibold">SysTulsi Caixa</CardTitle>
        <CardDescription>{displayDate}</CardDescription>
      </div>
      <CardHeader className="text-center">
        <CardTitle className="text-lg font-semibold">SysTulsi Caixa</CardTitle>
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
                <TableCell className="text-right">{summary.rsMadrugadaQtd || '0'}</TableCell>
                <TableCell className="text-right">{summary.rsMadrugadaItens || '0'}</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.rsMadrugadaValor)}</TableCell>
              </TableRow>
            )}

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">ITENS AVULSOS CAFÉ DA MANHÃ</TableCell>
            </TableRow>
            {summaryConfig.avulsoAssinado && (
              <TableRow>
                <TableCell>AVULSO ASSINADO</TableCell>
                <TableCell className="text-right">{summary.avulsoAssinadoQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.avulsoAssinadoValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.buffetCafeDireto && (
              <TableRow>
                <TableCell>BUFFET CAFÉ DIRETO</TableCell>
                <TableCell className="text-right">{summary.buffetCafeDiretoQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.buffetCafeDiretoValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.breakfast && (
              <TableRow>
                <TableCell>BREAKFAST</TableCell>
                <TableCell className="text-right">{summary.breakfastQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.breakfastValor)}</TableCell>
              </TableRow>
            )}

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">SERVIÇOS RESTAURANTE</TableCell>
            </TableRow>
            {summaryConfig.almoco && (
              <TableRow>
                <TableCell>ALMOÇO</TableCell>
                <TableCell className="text-right">{summary.almocoQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.almocoValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.jantar && (
              <TableRow>
                <TableCell>JANTAR</TableCell>
                <TableCell className="text-right">{summary.jantarQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.jantarValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwItalianoAlmoco && (
              <TableRow>
                <TableCell>RW ITALIANO ALMOÇO</TableCell>
                <TableCell className="text-right">{summary.italianoAlmocoQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.italianoAlmocoValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwItalianoJantar && (
              <TableRow>
                <TableCell>RW ITALIANO JANTAR</TableCell>
                <TableCell className="text-right">{summary.italianoJantarQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.italianoJantarValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwIndianoAlmoco && (
              <TableRow>
                <TableCell>RW INDIANO ALMOÇO</TableCell>
                <TableCell className="text-right">{summary.indianoAlmocoQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.indianoAlmocoValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.rwIndianoJantar && (
              <TableRow>
                <TableCell>RW INDIANO JANTAR</TableCell>
                <TableCell className="text-right">{summary.indianoJantarQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.indianoJantarValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.frigobar && (
              <TableRow>
                <TableCell>FRIGOBAR</TableCell>
                <TableCell className="text-right">{summary.frigobarQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.frigobarValor)}</TableCell>
              </TableRow>
            )}
            <TableRow className="font-semibold">
              <TableCell>TOTAL FITA</TableCell>
              <TableCell className="text-right">{summary.totalFitaQtd || '0'}</TableCell>
               <TableCell className="text-right">{summary.rsMadrugadaItens || '0'}</TableCell> 
              <TableCell className="text-right">{formatCurrency(summary.totalFitaValor)}</TableCell>
            </TableRow>

            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="font-semibold text-sm">OUTROS SERVIÇOS</TableCell>
            </TableRow>
            {summaryConfig.cafeHospedes && (
              <TableRow>
                <TableCell>CAFÉ HÓSPEDES</TableCell>
                <TableCell className="text-right">{summary.cafeHospedesTotalQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.cafeHospedesTotalValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.almocoCI && (
              <TableRow>
                <TableCell>ALMOÇO C.I</TableCell>
                <TableCell className="text-right">{summary.almocoCIQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.almocoCIValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.jantarCI && (
              <TableRow>
                <TableCell>JANTAR C.I</TableCell>
                <TableCell className="text-right">{summary.jantarCIQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell>
                <TableCell className="text-right">{formatCurrency(summary.jantarCIValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.eventosDireto && (
              <TableRow>
                <TableCell>EVENTOS DIRETO</TableCell>
                <TableCell className="text-right">{summary.eventosDiretoQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell> 
                <TableCell className="text-right">{formatCurrency(summary.eventosDiretoValor)}</TableCell>
              </TableRow>
            )}
            {summaryConfig.eventosHotel && (
              <TableRow>
                <TableCell>EVENTOS HOTEL</TableCell>
                <TableCell className="text-right">{summary.eventosHotelQtd || '0'}</TableCell>
                <TableCell className="text-right">&nbsp;</TableCell> 
                <TableCell className="text-right">{formatCurrency(summary.eventosHotelValor)}</TableCell>
              </TableRow>
            )}

            <TableRow className="font-semibold border-t-2 border-foreground">
              <TableCell>TOTAL GERAL COM CI</TableCell>
              <TableCell className="text-right">{summary.totalGeralComCIQtd || '0'}</TableCell>
               <TableCell className="text-right">{summary.rsMadrugadaItens || '0'}</TableCell>
              <TableCell className="text-right">{formatCurrency(summary.totalGeralComCIValor)}</TableCell>
            </TableRow>
            <TableRow className="font-semibold">
              <TableCell>TOTAL GERAL SEM CI</TableCell>
              <TableCell className="text-right">{summary.totalGeralSemCIQtd || '0'}</TableCell>
              <TableCell className="text-right">{summary.rsMadrugadaItens || '0'}</TableCell>
              <TableCell className="text-right">{formatCurrency(summary.totalGeralSemCIValor)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ResumoLateralCard;
