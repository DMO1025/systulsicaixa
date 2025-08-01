
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, PlusCircle, Calendar as CalendarIcon, Sparkles, ReceiptText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllDailyEntries } from '@/services/dailyEntryService';
import type { DailyLogEntry, PeriodId, DashboardAnalysisInput } from '@/lib/types';
import { format, isValid, parseISO, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { getSetting } from '@/services/settingsService';
import ReactMarkdown from 'react-markdown';
import { processEntryForTotals } from '@/lib/reportUtils';
import { DASHBOARD_ACCUMULATED_ITEMS_CONFIG } from '@/lib/config/dashboard';


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
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasDataForMonth, setHasDataForMonth] = useState(false);

  // Memoized state for all processed data
  const processedData = useMemo(() => {
    return {
      dailyTotals: [],
      acumulativoMensalData: [],
      monthlyEvolutionData: [],
      totalCIAlmoco: { qtd: 0, valor: 0 },
      totalCIJantar: { qtd: 0, valor: 0 },
      totalReajusteCI: 0,
      overallTotalRevenue: 0,
      overallTotalTransactions: 0,
      totalGeralSemCI: { qtd: 0, valor: 0 },
      totalConsumoInternoGeral: { qtd: 0, valor: 0 },
      totalRSValor: 0,
      totalRSQtd: 0,
      totalAlmocoValor: 0,
      totalAlmocoQtd: 0,
      totalJantarValor: 0,
      totalJantarQtd: 0,
    };
  }, []);

  const [dashboardData, setDashboardData] = useState(processedData);

  useEffect(() => {
    async function fetchDataAndProcess() {
      setIsLoading(true);
      setAnalysis('');

      try {
        // --- PERFORMANCE OPTIMIZATION ---
        // Fetch only the last 3 months of data relative to the selected month,
        // which is what's needed for the evolution chart and the current month's tables.
        const endDateForFetch = endOfMonth(selectedMonth);
        const startDateForFetch = startOfMonth(subMonths(selectedMonth, 2));

        const entriesInRange = await getAllDailyEntries(
            format(startDateForFetch, 'yyyy-MM-dd'),
            format(endDateForFetch, 'yyyy-MM-dd'),
            window.location.origin
        ) as DailyLogEntry[];
        
        const visibilityConfig = await getSetting('dashboardItemVisibilityConfig');
        
        const targetYear = selectedMonth.getUTCFullYear();
        const targetMonth = selectedMonth.getUTCMonth();

        const entriesForMonth = entriesInRange.filter(entry => {
            const entryDate = entry.date instanceof Date ? entry.date : parseISO(String(entry.date));
            if (!isValid(entryDate)) return false;
            // Use UTC methods to ignore timezone offsets and compare date parts directly.
            const entryYearUTC = entryDate.getUTCFullYear();
            const entryMonthUTC = entryDate.getUTCMonth();
            return entryYearUTC === targetYear && entryMonthUTC === targetMonth;
        });

        setHasDataForMonth(entriesForMonth.length > 0);
        
        let monthGrandTotalQtd = 0;
        let monthGrandTotalValor = 0;
        let monthGrandTotalSemCIQtd = 0;
        let monthGrandTotalSemCIValor = 0;
        let monthGrandTotalReajusteCI = 0;
        let monthGrandTotalCIQtd = 0;
        let monthGrandTotalCIValor = 0;
        let monthTotalCIAlmoco = { qtd: 0, valor: 0 };
        let monthTotalCIJantar = { qtd: 0, valor: 0 };

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
          const entryTotals = processEntryForTotals(entry);
          
          monthGrandTotalQtd += entryTotals.grandTotal.comCI.qtd;
          monthGrandTotalValor += entryTotals.grandTotal.comCI.valor;
          monthGrandTotalSemCIQtd += entryTotals.grandTotal.semCI.qtd;
          monthGrandTotalSemCIValor += entryTotals.grandTotal.semCI.valor;
          monthGrandTotalReajusteCI += entryTotals.reajusteCI.total;
          monthGrandTotalCIQtd += entryTotals.totalCI.qtd;
          monthGrandTotalCIValor += entryTotals.totalCI.valor;
          monthTotalCIAlmoco.qtd += entryTotals.almocoCI.qtd;
          monthTotalCIAlmoco.valor += entryTotals.almocoCI.valor;
          monthTotalCIJantar.qtd += entryTotals.jantarCI.qtd;
          monthTotalCIJantar.valor += entryTotals.jantarCI.valor;
          
          // Accumulate for monthly table
          accAcumulativo.roomService.pedidosQtd += entryTotals.roomServiceTotal.qtd;
          accAcumulativo.roomService.pratosMadrugadaQtd += entryTotals.rsMadrugada.qtdPratos || 0;
          accAcumulativo.roomService.valor += entryTotals.roomServiceTotal.valor;
          accAcumulativo.cafeDaManha.qtd += entryTotals.cafeHospedes.qtd + entryTotals.cafeAvulsos.qtd;
          accAcumulativo.cafeDaManha.valor += entryTotals.cafeHospedes.valor + entryTotals.cafeAvulsos.valor;
          accAcumulativo.breakfast.qtd += entryTotals.breakfast.qtd;
          accAcumulativo.breakfast.valor += entryTotals.breakfast.valor;
          accAcumulativo.almoco.qtd += entryTotals.almoco.qtd;
          accAcumulativo.almoco.valor += entryTotals.almoco.valor;
          accAcumulativo.jantar.qtd += entryTotals.jantar.qtd;
          accAcumulativo.jantar.valor += entryTotals.jantar.valor;
          accAcumulativo.italianoAlmoco.qtd += entryTotals.italianoAlmoco.qtd;
          accAcumulativo.italianoAlmoco.valor += entryTotals.italianoAlmoco.valor;
          accAcumulativo.italianoJantar.qtd += entryTotals.italianoJantar.qtd;
          accAcumulativo.italianoJantar.valor += entryTotals.italianoJantar.valor;
          accAcumulativo.indianoAlmoco.qtd += entryTotals.indianoAlmoco.qtd;
          accAcumulativo.indianoAlmoco.valor += entryTotals.indianoAlmoco.valor;
          accAcumulativo.indianoJantar.qtd += entryTotals.indianoJantar.qtd;
          accAcumulativo.indianoJantar.valor += entryTotals.indianoJantar.valor;
          accAcumulativo.baliAlmoco.qtd += entryTotals.baliAlmoco.qtd;
          accAcumulativo.baliAlmoco.valor += entryTotals.baliAlmoco.valor;
          accAcumulativo.baliHappy.qtd += entryTotals.baliHappy.qtd;
          accAcumulativo.baliHappy.valor += entryTotals.baliHappy.valor;
          accAcumulativo.frigobar.qtd += entryTotals.frigobar.qtd;
          accAcumulativo.frigobar.valor += entryTotals.frigobar.valor;
          accAcumulativo.eventosDireto.qtd += entryTotals.eventos.direto.qtd;
          accAcumulativo.eventosDireto.valor += entryTotals.eventos.direto.valor;
          accAcumulativo.eventosHotel.qtd += entryTotals.eventos.hotel.qtd;
          accAcumulativo.eventosHotel.valor += entryTotals.eventos.hotel.valor;

          let formattedDate = "Data Inválida";
          if (entry.id && typeof entry.id === 'string' && entry.id.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = entry.id.split('-');
            formattedDate = `${day}/${month}/${year}`;
          }

          return {
            id: entry.id,
            date: formattedDate,
            totalQtd: entryTotals.grandTotal.comCI.qtd,
            totalValor: entryTotals.grandTotal.comCI.valor,
          };
        }).sort((a, b) => { 
            const dateAValid = a.id && typeof a.id === 'string' && a.id.match(/^\d{4}-\d{2}-\d{2}$/);
            const dateBValid = b.id && typeof b.id === 'string' && b.id.match(/^\d{4}-\d{2}-\d{2}$/);

            if (dateAValid && dateBValid) {
                const dateA = parseISO(a.id); 
                const dateB = parseISO(b.id);
                if (isValid(dateA) && isValid(dateB)) {
                    return dateA.getTime() - dateB.getTime();
                }
            } else if (dateAValid) {
                return 1; 
            } else if (dateBValid) {
                return -1;  
            }
            return 0; 
        });

        // Monthly Evolution Data
        const monthlyAggregates: Record<string, {
            monthLabel: string;
            valorComCI: number; qtdComCI: number;
            valorCI: number; qtdCI: number;
            reajusteCIValor: number;
        }> = {};

        // 1. Initialize buckets for the last 3 months based on selected local month
        for (let i = 0; i < 3; i++) { 
            const targetMonthDate = subMonths(selectedMonth, i);
            const monthKey = `${targetMonthDate.getFullYear()}-${String(targetMonthDate.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = format(targetMonthDate, "MMM/yy", { locale: ptBR });
            monthlyAggregates[monthKey] = {
                monthLabel, valorComCI: 0, qtdComCI: 0, valorCI: 0, qtdCI: 0, reajusteCIValor: 0,
            };
        }
        
        // 2. Accumulate totals by iterating through the fetched range of entries
        entriesInRange.forEach(entry => {
            const entryDateObj = entry.date instanceof Date ? entry.date : parseISO(String(entry.date));
            if (isValid(entryDateObj)) {
                const entryYearUTC = entryDateObj.getUTCFullYear();
                const entryMonthUTC = entryDateObj.getUTCMonth();
                const entryMonthKey = `${entryYearUTC}-${String(entryMonthUTC + 1).padStart(2, '0')}`;
        
                if (monthlyAggregates[entryMonthKey]) {
                    const entryTotals = processEntryForTotals(entry);
                    monthlyAggregates[entryMonthKey].valorComCI += entryTotals.grandTotal.comCI.valor;
                    monthlyAggregates[entryMonthKey].qtdComCI += entryTotals.grandTotal.comCI.qtd;
                    monthlyAggregates[entryMonthKey].valorCI += entryTotals.totalCI.valor;
                    monthlyAggregates[entryMonthKey].qtdCI += entryTotals.totalCI.qtd; 
                    monthlyAggregates[entryMonthKey].reajusteCIValor += entryTotals.reajusteCI.total;
                }
            }
        });
        
        // 3. Sort and map data for the chart
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
                valorSemCI: data.valorComCI - data.valorCI - data.reajusteCIValor,
                valorCI: data.valorCI,
                reajusteCIValor: data.reajusteCIValor,
                qtdComCI: data.qtdComCI,
                qtdSemCI: data.qtdComCI - data.qtdCI,
            };
        });
          
        const currentMonthStr = format(selectedMonth, "yyyy-MM-dd");
        const initialAcumulativoMensalState = DASHBOARD_ACCUMULATED_ITEMS_CONFIG.filter(
            item => item.item !== 'ALMOÇO C.I.' && item.item !== 'JANTAR C.I.'
        ).map(config => ({
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
        
        setDashboardData({
          dailyTotals: processedTotals,
          acumulativoMensalData: finalVisibleData,
          monthlyEvolutionData: finalMonthlyEvolutionData,
          totalCIAlmoco: monthTotalCIAlmoco,
          totalCIJantar: monthTotalCIJantar,
          totalConsumoInternoGeral: { qtd: monthGrandTotalCIQtd, valor: monthGrandTotalCIValor },
          totalGeralSemCI: { qtd: monthGrandTotalSemCIQtd, valor: monthGrandTotalSemCIValor },
          overallTotalRevenue: monthGrandTotalValor,
          overallTotalTransactions: monthGrandTotalQtd,
          totalReajusteCI: monthGrandTotalReajusteCI,
          totalRSValor: accAcumulativo.roomService.valor,
          totalRSQtd: accAcumulativo.roomService.pedidosQtd,
          totalAlmocoValor: accAcumulativo.almoco.valor,
          totalAlmocoQtd: accAcumulativo.almoco.qtd,
          totalJantarValor: accAcumulativo.jantar.valor,
          totalJantarQtd: accAcumulativo.jantar.qtd,
        });

      } catch (error: any) {
        console.error("Falha ao buscar ou processar os lançamentos para o dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDataAndProcess();
  }, [selectedMonth]);

  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysis('');
    try {
      const input: DashboardAnalysisInput = {
        month: format(selectedMonth, 'MMMM yyyy', { locale: ptBR }),
        totalRevenue: dashboardData.overallTotalRevenue,
        totalTransactions: dashboardData.overallTotalTransactions,
        totalCIRecords: {
          almoco: dashboardData.totalCIAlmoco,
          jantar: dashboardData.totalCIJantar,
          total: dashboardData.totalConsumoInternoGeral
        },
        accumulatedItems: dashboardData.acumulativoMensalData.map(item => ({
          name: item.item,
          quantity: item.qtdDisplay,
          totalValue: item.valorTotal
        })),
        generalTotals: {
          withCI: {
            quantity: dashboardData.overallTotalTransactions,
            value: dashboardData.overallTotalRevenue
          },
          withoutCI: {
            quantity: dashboardData.totalGeralSemCI.qtd,
            value: dashboardData.totalGeralSemCI.valor
          },
          ciAdjustment: dashboardData.totalReajusteCI
        }
      };

      const response = await fetch('/api/dashboard-analysis', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'An error occurred while fetching the analysis.');
      }
      
      const result = await response.json();

      if (result.analysis) {
        setAnalysis(result.analysis);
      }
    } catch (error) {
        console.error("Error generating AI analysis:", error);
        setAnalysis(
          `Ocorreu um erro ao gerar a análise. Isso pode acontecer se a solicitação demorar muito para ser processada (timeout) ou se a chave de API do Google não estiver configurada no ambiente da Vercel. Por favor, tente novamente.`
        );
    } finally {
        setIsAnalyzing(false);
    }
  };

  const renderDashboardContent = () => {
    if (isLoading) {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-[124px]" />
            <Skeleton className="h-[124px]" />
            <Skeleton className="h-[124px] hidden lg:block" />
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
            totalComCI_Qtd={dashboardData.overallTotalTransactions}
            totalComCI_Valor={dashboardData.overallTotalRevenue}
            totalSemCI_Qtd={dashboardData.totalGeralSemCI.qtd}
            totalSemCI_Valor={dashboardData.totalGeralSemCI.valor}
            totalRSValor={dashboardData.totalRSValor}
            totalRSQtd={dashboardData.totalRSQtd}
            totalAlmocoValor={dashboardData.totalAlmocoValor}
            totalAlmocoQtd={dashboardData.totalAlmocoQtd}
            totalJantarValor={dashboardData.totalJantarValor}
            totalJantarQtd={dashboardData.totalJantarQtd}
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
            <DailyTotalsTable dailyTotals={dashboardData.dailyTotals} />
            <div className="space-y-6">
            <MonthlyAccumulatedTable data={dashboardData.acumulativoMensalData} />
            <InternalConsumptionTable 
                ciAlmoco={dashboardData.totalCIAlmoco}
                ciJantar={dashboardData.totalCIJantar}
                totalConsumoInternoGeral={dashboardData.totalConsumoInternoGeral}
                selectedMonth={selectedMonth}
            />
            <GeneralTotalsTable
                overallTotalTransactions={dashboardData.overallTotalTransactions}
                overallTotalRevenue={dashboardData.overallTotalRevenue}
                overallTotalReajusteCI={dashboardData.totalReajusteCI}
                totalGeralSemCI={dashboardData.totalGeralSemCI}
            />
            </div>
        </div>
        <MonthlyEvolutionChart 
            data={dashboardData.monthlyEvolutionData} 
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
