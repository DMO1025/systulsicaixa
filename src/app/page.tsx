
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, PlusCircle, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllDailyEntries } from '@/services/dailyEntryService';
import type { DailyLogEntry, PeriodId, EventosPeriodData, SalesItem, EvolutionChartConfig, ProcessedDailyTotal, AcumulativoMensalItem, MonthlyEvolutionDataItem, PeriodData, Settings } from '@/lib/types';
import { PERIOD_DEFINITIONS, SALES_CHANNELS, DASHBOARD_ACCUMULATED_ITEMS_CONFIG } from '@/lib/constants';
import { format, isValid, parseISO, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { getSafeNumericValue } from '@/lib/utils';
import { getSetting } from '@/services/settingsService';
import { generateDashboardAnalysis, type DashboardAnalysisInput } from '@/ai/flows/dashboard-analysis-flow';
import ReactMarkdown from 'react-markdown';


import SummaryCards from '@/components/dashboard/SummaryCards';
import DailyTotalsTable from '@/components/dashboard/DailyTotalsTable';
import MonthlyAccumulatedTable from '@/components/dashboard/MonthlyAccumulatedTable';
import InternalConsumptionTable from '@/components/dashboard/InternalConsumptionTable';
import GeneralTotalsTable from '@/components/dashboard/GeneralTotalsTable';
import MonthlyEvolutionChart from '@/components/dashboard/MonthlyEvolutionChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';


const evolutionChartConfig: EvolutionChartConfig = {
  valorComCI: { label: "Valor COM CI", color: "hsl(var(--chart-1))" },
  valorSemCI: { label: "Valor SEM CI", color: "hsl(var(--chart-2))" },
  reajusteCIValor: { label: "Reajuste CI", color: "hsl(var(--chart-3))" },
  qtdComCI: { label: "Qtd COM CI", color: "hsl(var(--chart-4))" },
  qtdSemCI: { label: "Qtd SEM CI", color: "hsl(var(--chart-5))" },
};

const calculatePeriodGrandTotal = (periodEntryData: PeriodData | EventosPeriodData | undefined | string): { qtd: number; valor: number } => {
  if (!periodEntryData || typeof periodEntryData === 'string') return { qtd: 0, valor: 0 };

  let totalQtd = 0;
  let totalValor = 0;

  if ('items' in periodEntryData) { 
    const evData = periodEntryData as EventosPeriodData;
    (evData.items || []).forEach(item => {
      (item.subEvents || []).forEach(subEvent => {
        totalQtd += subEvent.quantity || 0;
        totalValor += subEvent.totalValue || 0;
      });
    });
  } else { 
    const pData = periodEntryData as PeriodData;
    if (pData.channels) {
      Object.values(pData.channels).forEach(channel => {
        totalQtd += getSafeNumericValue(channel, 'qtd');
        totalValor += getSafeNumericValue(channel, 'vtotal');
      });
    }
    if (pData.subTabs) {
      Object.values(pData.subTabs).forEach(subTab => {
        if (subTab?.channels) {
          Object.values(subTab.channels).forEach(channel => {
            totalQtd += getSafeNumericValue(channel, 'qtd');
            totalValor += getSafeNumericValue(channel, 'vtotal');
          });
        }
      });
    }
  }
  return { qtd: totalQtd, valor: totalValor };
};

const MonthYearSelector = ({ selectedMonth, setSelectedMonth }: { selectedMonth: Date, setSelectedMonth: (date: Date) => void }) => {
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthIndex = selectedMonth.getMonth();

    const months = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(2000, i), 'MMMM', { locale: ptBR })
    }));

    const currentSystemYear = new Date().getFullYear();
    const years = Array.from({ length: currentSystemYear - 2019 }, (_, i) => 2020 + i).reverse();

    const handleMonthChange = (monthValue: string) => {
        const newMonthIndex = parseInt(monthValue, 10);
        if (!isNaN(newMonthIndex)) {
            const newDate = new Date(selectedYear, newMonthIndex, 1);
            setSelectedMonth(newDate);
        }
    };

    const handleYearChange = (yearValue: string) => {
        const newYear = parseInt(yearValue, 10);
        if (!isNaN(newYear)) {
            const newDate = new Date(newYear, selectedMonthIndex, 1);
            setSelectedMonth(newDate);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pb-4">
                 <div>
                    <CardTitle className="text-lg flex items-center gap-2"><CalendarIcon className="h-5 w-5"/>Filtro de Mês</CardTitle>
                    <CardDescription>Selecione o mês e o ano para visualizar os dados retroativos.</CardDescription>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex-1">
                        <Select value={selectedMonthIndex.toString()} onValueChange={handleMonthChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o Mês" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(month => (
                                    <SelectItem key={month.value} value={month.value.toString()}>{month.label.charAt(0).toUpperCase() + month.label.slice(1)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex-1">
                         <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o Ano" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
};


export default function DashboardPage() {
  const { userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTotals, setDailyTotals] = useState<ProcessedDailyTotal[]>([]);
  
  const [totalCIAlmoco, setTotalCIAlmoco] = useState({ qtd: 0, valor: 0 });
  const [totalCIJantar, setTotalCIJantar] = useState({ qtd: 0, valor: 0 });
  const [totalReajusteCIAlmocoValor, setTotalReajusteCIAlmocoValor] = useState(0);
  const [totalReajusteCIJantarValor, setTotalReajusteCIJantarValor] = useState(0);

  const [acumulativoMensalData, setAcumulativoMensalData] = useState<AcumulativoMensalItem[]>([]);
  const [monthlyEvolutionData, setMonthlyEvolutionData] = useState<MonthlyEvolutionDataItem[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasDataForMonth, setHasDataForMonth] = useState(false);


  useEffect(() => {
    async function fetchDataAndProcess() {
      setIsLoading(true);
      setAnalysis('');

      try {
        const endDate = endOfMonth(selectedMonth);
        const startDate = startOfMonth(subMonths(selectedMonth, 2));

        const entriesForPeriod = await getAllDailyEntries(
            format(startDate, 'yyyy-MM-dd'),
            format(endDate, 'yyyy-MM-dd')
        );

        const visibilityConfig = await getSetting('dashboardItemVisibilityConfig');
        
        const targetYear = selectedMonth.getFullYear();
        const targetMonth = selectedMonth.getMonth();

        const entriesForMonth = entriesForPeriod.filter(entry => {
            const entryDate = entry.date instanceof Date ? entry.date : parseISO(String(entry.date));
            return isValid(entryDate) && entryDate.getFullYear() === targetYear && entryDate.getMonth() === targetMonth;
        });

        setHasDataForMonth(entriesForMonth.length > 0);
        
        let accCIAlmocoQtd = 0;
        let accCIAlmocoValor = 0;
        let accCIJantarQtd = 0;
        let accCIJantarValor = 0;
        let accReajusteCIAlmoco = 0;
        let accReajusteCIJantar = 0;

        const accAcumulativo = {
          roomService: { pedidosQtd: 0, pratosMadrugadaQtd: 0, valor: 0 },
          cafeDaManha: { qtd: 0, valor: 0 },
          breakfast: { qtd: 0, valor: 0 },
          italianoAlmoco: { qtd: 0, valor: 0 },
          italianoJantar: { qtd: 0, valor: 0 },
          indianoAlmoco: { qtd: 0, valor: 0 },
          indianoJantar: { qtd: 0, valor: 0 },
          almoco: { qtd: 0, valor: 0 },
          jantar: { qtd: 0, valor: 0 },
          baliAlmoco: { qtd: 0, valor: 0 },
          baliHappy: { qtd: 0, valor: 0 },
          frigobar: { qtd: 0, valor: 0 },
          eventosDireto: { qtd: 0, valor: 0 },
          eventosHotel: { qtd: 0, valor: 0 },
        };
        
        const processedTotals = entriesForMonth.map(entry => {
          let currentEntryTotalValor = 0;
          let currentEntryTotalQtd = 0;
          let entryGrandTotal = {valor: 0, qtd: 0};
          
          let allPeriodDefinitions = PERIOD_DEFINITIONS;
          // Add a temporary frigobar definition if old data exists
          if ((entry as any).frigobar) {
             allPeriodDefinitions = [...PERIOD_DEFINITIONS, { id: "frigobar" }] as any;
          }


          allPeriodDefinitions.forEach(pDef => {
            const { qtd, valor } = calculatePeriodGrandTotal(entry[pDef.id as keyof typeof entry]);
            entryGrandTotal.qtd += qtd;
            entryGrandTotal.valor += valor;
          });

          // Specific accumulations
          const rsMadrugadaData = calculatePeriodGrandTotal(entry.madrugada);
          accAcumulativo.roomService.pedidosQtd += getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPedidos.qtd');
          accAcumulativo.roomService.pratosMadrugadaQtd += getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPratos.qtd');
          accAcumulativo.roomService.valor += rsMadrugadaData.valor;
          
          const cafeTotal = calculatePeriodGrandTotal(entry.cafeDaManha);
          accAcumulativo.cafeDaManha.qtd += cafeTotal.qtd;
          accAcumulativo.cafeDaManha.valor += cafeTotal.valor;

          const breakfastTotal = calculatePeriodGrandTotal(entry.breakfast);
          accAcumulativo.breakfast.qtd += breakfastTotal.qtd;
          accAcumulativo.breakfast.valor += breakfastTotal.valor;
          
          const almocoPTTotal = calculatePeriodGrandTotal(entry.almocoPrimeiroTurno);
          const almocoSTTotal = calculatePeriodGrandTotal(entry.almocoSegundoTurno);
          accAcumulativo.almoco.qtd += almocoPTTotal.qtd + almocoSTTotal.qtd;
          accAcumulativo.almoco.valor += almocoPTTotal.valor + almocoSTTotal.valor;

          const italianoAlmocoTotal = calculatePeriodGrandTotal(entry.italianoAlmoco);
          accAcumulativo.italianoAlmoco.qtd += italianoAlmocoTotal.qtd;
          accAcumulativo.italianoAlmoco.valor += italianoAlmocoTotal.valor;

          const italianoJantarTotal = calculatePeriodGrandTotal(entry.italianoJantar);
          accAcumulativo.italianoJantar.qtd += italianoJantarTotal.qtd;
          accAcumulativo.italianoJantar.valor += italianoJantarTotal.valor;

          const indianoAlmocoTotal = calculatePeriodGrandTotal(entry.indianoAlmoco);
          accAcumulativo.indianoAlmoco.qtd += indianoAlmocoTotal.qtd;
          accAcumulativo.indianoAlmoco.valor += indianoAlmocoTotal.valor;

          const indianoJantarTotal = calculatePeriodGrandTotal(entry.indianoJantar);
          accAcumulativo.indianoJantar.qtd += indianoJantarTotal.qtd;
          accAcumulativo.indianoJantar.valor += indianoJantarTotal.valor;
          
          const jantarTotal = calculatePeriodGrandTotal(entry.jantar);
          accAcumulativo.jantar.qtd += jantarTotal.qtd;
          accAcumulativo.jantar.valor += jantarTotal.valor;

          const baliAlmocoTotal = calculatePeriodGrandTotal(entry.baliAlmoco);
          accAcumulativo.baliAlmoco.qtd += baliAlmocoTotal.qtd;
          accAcumulativo.baliAlmoco.valor += baliAlmocoTotal.valor;

          const baliHappyTotal = calculatePeriodGrandTotal(entry.baliHappy);
          accAcumulativo.baliHappy.qtd += baliHappyTotal.qtd;
          accAcumulativo.baliHappy.valor += baliHappyTotal.valor;
          
          // New frigobar calculation
          const frigobarPT = calculatePeriodGrandTotal((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.frigobar as any);
          const frigobarST = calculatePeriodGrandTotal((entry.almocoSegundoTurno as PeriodData)?.subTabs?.frigobar as any);
          const frigobarJNT = calculatePeriodGrandTotal((entry.jantar as PeriodData)?.subTabs?.frigobar as any);
          const oldFrigobar = calculatePeriodGrandTotal((entry as any).frigobar); // fallback
          accAcumulativo.frigobar.qtd += frigobarPT.qtd + frigobarST.qtd + frigobarJNT.qtd + oldFrigobar.qtd;
          accAcumulativo.frigobar.valor += frigobarPT.valor + frigobarST.valor + frigobarJNT.valor + oldFrigobar.valor;
          

          const eventosData = entry.eventos as EventosPeriodData | undefined;
          let entryEventosDiretoQtd = 0, entryEventosDiretoValor = 0;
          let entryEventosHotelQtd = 0, entryEventosHotelValor = 0;
          (eventosData?.items || []).forEach(item => {
            (item.subEvents || []).forEach(subEvent => {
              const qty = subEvent.quantity || 0;
              const val = subEvent.totalValue || 0;
              if (subEvent.location === 'DIRETO') {
                entryEventosDiretoQtd += qty;
                entryEventosDiretoValor += val;
              } else if (subEvent.location === 'HOTEL') {
                entryEventosHotelQtd += qty;
                entryEventosHotelValor += val;
              }
            });
          });
          accAcumulativo.eventosDireto.qtd += entryEventosDiretoQtd;
          accAcumulativo.eventosDireto.valor += entryEventosDiretoValor;
          accAcumulativo.eventosHotel.qtd += entryEventosHotelQtd;
          accAcumulativo.eventosHotel.valor += entryEventosHotelValor;

          currentEntryTotalValor = entryGrandTotal.valor;
          currentEntryTotalQtd = entryGrandTotal.qtd;
          
          const entryCIAlmocoQtd = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosConsumoInternoQtd.qtd') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosConsumoInternoQtd.qtd');
          const entryCIAlmocoValor = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosTotalCI.vtotal') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosTotalCI.vtotal');
          const entryCIJantarQtd = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosConsumoInternoQtd.qtd');
          const entryCIJantarValor = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosTotalCI.vtotal');
          const entryReajusteCIAlmoco = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosReajusteCI.vtotal') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosReajusteCI.vtotal');
          const entryReajusteCIJantar = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosReajusteCI.vtotal');
          
          accCIAlmocoQtd += entryCIAlmocoQtd;
          accCIAlmocoValor += entryCIAlmocoValor;
          accCIJantarQtd += entryCIJantarQtd;
          accCIJantarValor += entryCIJantarValor;
          accReajusteCIAlmoco += entryReajusteCIAlmoco;
          accReajusteCIJantar += entryReajusteCIJantar;
          
          let formattedDate = "Data Inválida";
          if (entry.id && typeof entry.id === 'string' && entry.id.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = entry.id.split('-');
            formattedDate = `${day}/${month}/${year}`;
          }

          return {
            id: entry.id,
            date: formattedDate,
            totalQtd: currentEntryTotalQtd,
            totalValor: currentEntryTotalValor,
          };
        }).sort((a, b) => { 
            const dateAValid = a.id && typeof a.id === 'string' && a.id.match(/^\d{4}-\d{2}-\d{2}$/);
            const dateBValid = b.id && typeof b.id === 'string' && b.id.match(/^\d{4}-\d{2}-\d{2}$/);

            if (dateAValid && dateBValid) {
                const dateA = parseISO(a.id); 
                const dateB = parseISO(b.id);
                if (isValid(dateA) && isValid(dateB)) {
                    return dateB.getTime() - dateA.getTime();
                }
            } else if (dateAValid) {
                return -1; 
            } else if (dateBValid) {
                return 1;  
            }
            return 0; 
        });

        const monthlyAggregates: Record<string, {
            monthLabel: string;
            valorComCI: number; qtdComCI: number;
            valorCI: number; qtdCI: number;
            reajusteCIValor: number;
        }> = {};

        for (let i = 0; i < 3; i++) { 
            const targetMonthStartDate = startOfMonth(subMonths(selectedMonth, i)); 
            const monthKey = format(targetMonthStartDate, "yyyy-MM");
            const monthLabel = format(targetMonthStartDate, "MMM/yy", { locale: ptBR });
            monthlyAggregates[monthKey] = {
                monthLabel,
                valorComCI: 0, qtdComCI: 0,
                valorCI: 0, qtdCI: 0,
                reajusteCIValor: 0,
            };
        }

        entriesForPeriod.forEach(entry => {
          const entryDateObj = entry.date instanceof Date ? entry.date : parseISO(String(entry.date));
          if (isValid(entryDateObj)) {
              const entryMonthKey = format(entryDateObj, "yyyy-MM");
              if (monthlyAggregates[entryMonthKey]) {
                  const entryCIAlmocoQtd = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosConsumoInternoQtd.qtd') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosConsumoInternoQtd.qtd');
                  const entryCIAlmocoValor = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosTotalCI.vtotal') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosTotalCI.vtotal');
                  const entryCIJantarQtd = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosConsumoInternoQtd.qtd');
                  const entryCIJantarValor = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosTotalCI.vtotal');
                  const entryReajusteCIAlmoco = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosReajusteCI.vtotal') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosReajusteCI.vtotal');
                  const entryReajusteCIJantar = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosReajusteCI.vtotal');
                  
                  let grandTotalQtd = 0;
                  let grandTotalValor = 0;
                  
                  let allPeriodDefinitions = PERIOD_DEFINITIONS;
                  if ((entry as any).frigobar) {
                    allPeriodDefinitions = [...PERIOD_DEFINITIONS, { id: "frigobar" }] as any;
                  }

                  allPeriodDefinitions.forEach(pDef => {
                    const {qtd, valor} = calculatePeriodGrandTotal(entry[pDef.id as keyof typeof entry]);
                    grandTotalQtd += qtd;
                    grandTotalValor += valor;
                  });

                  monthlyAggregates[entryMonthKey].valorComCI += grandTotalValor;
                  monthlyAggregates[entryMonthKey].qtdComCI += grandTotalQtd;
                  monthlyAggregates[entryMonthKey].valorCI += entryCIAlmocoValor + entryCIJantarValor; 
                  monthlyAggregates[entryMonthKey].qtdCI += entryCIAlmocoQtd + entryCIJantarQtd; 
                  monthlyAggregates[entryMonthKey].reajusteCIValor += entryReajusteCIAlmoco + entryReajusteCIJantar;
              }
          }
        });
        
        setDailyTotals(processedTotals);
        setTotalCIAlmoco({ qtd: accCIAlmocoQtd, valor: accCIAlmocoValor });
        setTotalCIJantar({ qtd: accCIJantarQtd, valor: accCIJantarValor });
        setTotalReajusteCIAlmocoValor(accReajusteCIAlmoco);
        setTotalReajusteCIJantarValor(accReajusteCIJantar);
        
        const currentMonthStr = format(selectedMonth, "yyyy-MM-dd");
        const initialAcumulativoMensalState: AcumulativoMensalItem[] = DASHBOARD_ACCUMULATED_ITEMS_CONFIG.map(config => ({
            item: config.item,
            qtdDisplay: config.item === 'ROOM SERVICE' ? '0 / 0' : '0',
            valorTotal: 0,
            reportLink: config.periodId 
                ? `/reports?filterType=period&periodId=${config.periodId}&filterFocus=item&month=${currentMonthStr}` 
                : undefined,
            periodId: config.periodId as PeriodId | undefined,
        }));


        const updatedAcumulativoMensalData = initialAcumulativoMensalState.map(item => {
            switch (item.item) {
                case "ROOM SERVICE": return { ...item, qtdDisplay: `${accAcumulativo.roomService.pedidosQtd} / ${accAcumulativo.roomService.pratosMadrugadaQtd}`, valorTotal: accAcumulativo.roomService.valor };
                case "CAFÉ DA MANHÃ": return { ...item, qtdDisplay: accAcumulativo.cafeDaManha.qtd.toString(), valorTotal: accAcumulativo.cafeDaManha.valor };
                case "BREAKFAST": return { ...item, qtdDisplay: accAcumulativo.breakfast.qtd.toString(), valorTotal: accAcumulativo.breakfast.valor };
                case "ALMOÇO": return { ...item, qtdDisplay: accAcumulativo.almoco.qtd.toString(), valorTotal: accAcumulativo.almoco.valor };
                case "JANTAR": return { ...item, qtdDisplay: accAcumulativo.jantar.qtd.toString(), valorTotal: accAcumulativo.jantar.valor };
                case "RW ITALIANO ALMOÇO": return { ...item, qtdDisplay: accAcumulativo.italianoAlmoco.qtd.toString(), valorTotal: accAcumulativo.italianoAlmoco.valor };
                case "RW ITALIANO JANTAR": return { ...item, qtdDisplay: accAcumulativo.italianoJantar.qtd.toString(), valorTotal: accAcumulativo.italianoJantar.valor };
                case "RW INDIANO ALMOÇO": return { ...item, qtdDisplay: accAcumulativo.indianoAlmoco.qtd.toString(), valorTotal: accAcumulativo.indianoAlmoco.valor };
                case "RW INDIANO JANTAR": return { ...item, qtdDisplay: accAcumulativo.indianoJantar.qtd.toString(), valorTotal: accAcumulativo.indianoJantar.valor };
                case "BALI ALMOÇO": return { ...item, qtdDisplay: accAcumulativo.baliAlmoco.qtd.toString(), valorTotal: accAcumulativo.baliAlmoco.valor };
                case "BALI HAPPY HOUR": return { ...item, qtdDisplay: accAcumulativo.baliHappy.qtd.toString(), valorTotal: accAcumulativo.baliHappy.valor };
                case "FRIGOBAR": return { ...item, qtdDisplay: accAcumulativo.frigobar.qtd.toString(), valorTotal: accAcumulativo.frigobar.valor };
                case "EVENTOS DIRETO": return { ...item, qtdDisplay: accAcumulativo.eventosDireto.qtd.toString(), valorTotal: accAcumulativo.eventosDireto.valor };
                case "EVENTOS HOTEL": return { ...item, qtdDisplay: accAcumulativo.eventosHotel.qtd.toString(), valorTotal: accAcumulativo.eventosHotel.valor };
                default: return item;
            }
        });
        
        const finalVisibleData = updatedAcumulativoMensalData.filter(item => {
          return visibilityConfig?.[item.item] !== false; 
        });
        setAcumulativoMensalData(finalVisibleData);

        const sortedMonthKeys = Object.keys(monthlyAggregates).sort((keyA, keyB) => {
            const dateA = parseISO(keyA + "-01");
            const dateB = parseISO(keyB + "-01");
            return dateA.getTime() - dateB.getTime(); 
        });
        
        const finalMonthlyEvolutionData = sortedMonthKeys.map(monthKey => {
            const data = monthlyAggregates[monthKey];
            return {
                month: data.monthLabel,
                valorComCI: data.valorComCI,
                valorSemCI: data.valorComCI - data.valorCI, 
                reajusteCIValor: data.reajusteCIValor,
                qtdComCI: data.qtdComCI,
                qtdSemCI: data.qtdComCI - data.qtdCI,
            };
        });
          
        setMonthlyEvolutionData(finalMonthlyEvolutionData.reverse());

      } catch (error: any) {
        console.error("Falha ao buscar ou processar os lançamentos para o dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDataAndProcess();
  }, [selectedMonth]);

  const overallTotalRevenue = useMemo(() => {
    return dailyTotals.reduce((sum, item) => sum + item.totalValor, 0);
  }, [dailyTotals]);

  const overallTotalTransactions = useMemo(() => {
    return dailyTotals.reduce((sum, item) => sum + item.totalQtd, 0);
  }, [dailyTotals]);

  const totalConsumoInternoGeral = useMemo(() => {
    return {
      qtd: totalCIAlmoco.qtd + totalCIJantar.qtd,
      valor: totalCIAlmoco.valor + totalCIJantar.valor,
    };
  }, [totalCIAlmoco, totalCIJantar]);

  const overallTotalReajusteCI = useMemo(() => {
    return totalReajusteCIAlmocoValor + totalReajusteCIJantarValor;
  }, [totalReajusteCIAlmocoValor, totalReajusteCIJantarValor]);

  const totalGeralSemCI = useMemo(() => {
    const valorSemCI = overallTotalRevenue - totalConsumoInternoGeral.valor - overallTotalReajusteCI;
    const qtdSemCI = overallTotalTransactions - totalConsumoInternoGeral.qtd;

    return {
      qtd: qtdSemCI,
      valor: valorSemCI,
    };
  }, [overallTotalTransactions, overallTotalRevenue, totalConsumoInternoGeral, overallTotalReajusteCI]);
  
  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysis('');
    try {
      const input: DashboardAnalysisInput = {
        month: format(selectedMonth, 'MMMM yyyy', { locale: ptBR }),
        totalRevenue: overallTotalRevenue,
        totalTransactions: overallTotalTransactions,
        totalCIRecords: {
          almoco: totalCIAlmoco,
          jantar: totalCIJantar,
          total: totalConsumoInternoGeral
        },
        accumulatedItems: acumulativoMensalData.map(item => ({
          name: item.item,
          quantity: item.qtdDisplay,
          totalValue: item.valorTotal
        })),
        generalTotals: {
          withCI: {
            quantity: overallTotalTransactions,
            value: overallTotalRevenue
          },
          withoutCI: {
            quantity: totalGeralSemCI.qtd,
            value: totalGeralSemCI.valor
          },
          ciAdjustment: overallTotalReajusteCI
        }
      };

      const result = await generateDashboardAnalysis(input);
      if (result.analysis) {
        setAnalysis(result.analysis);
      }
    } catch (error) {
        console.error("Error generating AI analysis:", error);
        setAnalysis("Ocorreu um erro ao gerar a análise. Por favor, tente novamente.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderDashboardContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[108px]" />
            <Skeleton className="h-[108px]" />
            <Skeleton className="h-[108px] hidden lg:block" />
            <Skeleton className="h-[108px] hidden lg:block" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[600px]" />
            <div className="space-y-6">
              <Skeleton className="h-[400px]" />
              <Skeleton className="h-[150px]" />
              <Skeleton className="h-[150px]" />
            </div>
          </div>
          <Skeleton className="h-[400px]" />
        </>
      );
    }

    if (!hasDataForMonth) {
      return (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Nenhum Lançamento Encontrado</CardTitle>
            <CardDescription>
              Não há dados para o mês de {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p>Você pode começar adicionando um novo lançamento.</p>
            <Button asChild>
              <Link href="/entry">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ir para Lançamentos
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <SummaryCards 
            totalRevenue={overallTotalRevenue} 
            totalTransactions={overallTotalTransactions} 
        />
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-semibold">Análise de Tendências com IA</CardTitle>
              </div>
              <Button onClick={handleGenerateAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Gerar Análise
              </Button>
            </div>
          </CardHeader>
          {(isAnalyzing || analysis) && (
             <CardContent>
                {isAnalyzing ? (
                   <div className="flex items-center justify-center py-4">
                     <Loader2 className="h-6 w-6 animate-spin text-primary" />
                     <p className="ml-3 text-muted-foreground">Analisando dados...</p>
                   </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/50 p-4">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                )}
             </CardContent>
          )}
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
            <DailyTotalsTable dailyTotals={dailyTotals} />
            <div className="space-y-6">
            <MonthlyAccumulatedTable data={acumulativoMensalData} />
            <InternalConsumptionTable 
                ciAlmoco={totalCIAlmoco}
                ciJantar={totalCIJantar}
                totalConsumoInternoGeral={totalConsumoInternoGeral}
            />
            <GeneralTotalsTable
                overallTotalTransactions={overallTotalTransactions}
                overallTotalRevenue={overallTotalRevenue}
                overallTotalReajusteCI={overallTotalReajusteCI}
                totalGeralSemCI={totalGeralSemCI}
            />
            </div>
        </div>
        <MonthlyEvolutionChart 
            data={monthlyEvolutionData} 
            chartConfig={evolutionChartConfig} 
            isLoading={isLoading}
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground font-medium">
            Exibindo dados para: <span className="text-primary font-semibold">{format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}</span>
        </p>
      </div>
      
      {userRole === 'administrator' && (
        <MonthYearSelector selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
      )}

      {renderDashboardContent()}
    </div>
  );
}
