
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, PlusCircle, Calendar as CalendarIcon, Sparkles, ReceiptText, DollarSign, Undo2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllDailyEntries } from '@/services/dailyEntryService';
import type { DailyLogEntry, PeriodId, DashboardAnalysisInput, EstornoItem } from '@/lib/types';
import { format, isValid, parseISO, startOfMonth, subMonths, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { getSetting } from '@/services/settingsService';
import ReactMarkdown from 'react-markdown';
import { processEntriesForDashboard } from '@/lib/utils/dashboardCalculations';
import { DASHBOARD_ACCUMULATED_ITEMS_CONFIG } from '@/lib/config/dashboard';
import { PATHS, REPORTS_PATHS } from '@/lib/config/navigation';

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
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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

const EstornosTable: React.FC<{ totalEstornos: { detalhes: Record<string, { qtd: number; valor: number }>; total: { qtd: number; valor: number } } }> = ({ totalEstornos }) => {
  const categoryLabels: Record<string, string> = {
    'restaurante': 'ESTORNO RESTAURANTE',
    'frigobar': 'ESTORNO FRIGOBAR',
    'room-service': 'ESTORNO ROOM SERVICE',
    'outros': 'OUTROS ESTORNOS'
  };

  const hasDetails = Object.keys(totalEstornos.detalhes).length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold uppercase">CONTROLE DE ESTORNOS</CardTitle>
        <Undo2 className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-2 text-xs uppercase">ITEM</TableHead>
              <TableHead className="px-4 py-2 text-xs uppercase text-right">QTD</TableHead>
              <TableHead className="px-4 py-2 text-xs uppercase text-right">VALOR DEBITADO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasDetails && Object.entries(totalEstornos.detalhes).map(([category, data]) => (
                <TableRow key={category}>
                    <TableCell className="px-4 py-1 text-xs uppercase">{categoryLabels[category] || category.toUpperCase()}</TableCell>
                    <TableCell className="text-right px-4 py-1 text-xs uppercase">{data.qtd.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right px-4 py-1 text-xs uppercase">
                        <span className="bg-white text-destructive p-1 rounded-md">
                            - R$ {data.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </TableCell>
                </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell className="px-4 py-2 text-xs uppercase">TOTAL ESTORNOS</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">{totalEstornos.total.qtd.toLocaleString('pt-BR')}</TableCell>
              <TableCell className="text-right px-4 py-2 text-xs">
                <span className="bg-white text-destructive p-1 rounded-md">
                    - R$ {totalEstornos.total.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
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
      totalEstornos: { detalhes: {}, total: { qtd: 0, valor: 0 } },
      totalRSValor: 0,
      totalRSQtd: 0,
      totalAlmocoValor: 0,
      totalAlmocoQtd: 0,
      totalJantarValor: 0,
      totalJantarQtd: 0,
      totalFrigobarValor: 0,
      totalFrigobarQtd: 0,
    };
  }, []);

  const [dashboardData, setDashboardData] = useState(processedData);

  useEffect(() => {
    async function fetchDataAndProcess() {
      setIsLoading(true);
      setAnalysis('');

      try {
        const endDateForFetch = endOfMonth(selectedMonth);
        const startDateForFetch = startOfMonth(subMonths(selectedMonth, 2));

        const estornosStartDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
        const estornosEndDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
        const estornosPromises = ['restaurante', 'frigobar', 'room-service'].map(cat =>
            fetch(`/api/estornos?category=${cat}&startDate=${estornosStartDate}&endDate=${estornosEndDate}`).then(res => res.ok ? res.json() : [])
        );

        const [entriesInRange, visibilityConfig, ...estornosArrays] = await Promise.all([
            getAllDailyEntries(format(startDateForFetch, 'yyyy-MM-dd'), format(endDateForFetch, 'yyyy-MM-dd'), window.location.origin) as Promise<DailyLogEntry[]>,
            getSetting('dashboardItemVisibilityConfig'),
            ...estornosPromises
        ]);
        
        const allEstornos = estornosArrays.flat() as EstornoItem[];

        const targetYear = selectedMonth.getUTCFullYear();
        const targetMonth = selectedMonth.getUTCMonth();

        // Consolidate entries by ID to prevent duplicates
        const consolidatedEntriesMap = new Map<string, DailyLogEntry>();
        for (const entry of entriesInRange) {
            if (entry.id) {
                consolidatedEntriesMap.set(entry.id, entry);
            }
        }
        const consolidatedEntries = Array.from(consolidatedEntriesMap.values());


        const entriesForMonth = consolidatedEntries.filter(entry => {
            const entryDate = entry.date instanceof Date ? entry.date : parseISO(String(entry.date));
            if (!isValid(entryDate)) return false;
            const entryYearUTC = entryDate.getUTCFullYear();
            const entryMonthUTC = entryDate.getUTCMonth();
            return entryYearUTC === targetYear && entryMonthUTC === targetMonth;
        });

        setHasDataForMonth(entriesForMonth.length > 0 || allEstornos.length > 0);

        const monthTotals = processEntriesForDashboard(entriesForMonth, allEstornos);
        
        const dailyTotalsData = entriesForMonth.map(entry => {
          const { processEntryForTotals } = require('@/lib/utils/calculations'); // Local import to avoid server/client issues
          const entryTotals = processEntryForTotals(entry);
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
            createdAt: entry.createdAt,
            lastModifiedAt: entry.lastModifiedAt,
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

        const monthlyAggregates: Record<string, {
            monthLabel: string;
            valorComCI: number; qtdComCI: number;
            valorCI: number; qtdCI: number;
            reajusteCIValor: number;
        }> = {};

        for (let i = 0; i < 3; i++) { 
            const targetMonthDate = subMonths(selectedMonth, i);
            const monthKey = `${targetMonthDate.getFullYear()}-${String(targetMonthDate.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = format(targetMonthDate, "MMM/yy", { locale: ptBR });
            monthlyAggregates[monthKey] = {
                monthLabel, valorComCI: 0, qtdComCI: 0, valorCI: 0, qtdCI: 0, reajusteCIValor: 0,
            };
        }
        
        consolidatedEntries.forEach(entry => {
            const entryDateObj = entry.date instanceof Date ? entry.date : parseISO(String(entry.date));
            if (isValid(entryDateObj)) {
                const entryYearUTC = entryDateObj.getUTCFullYear();
                const entryMonthUTC = entryDateObj.getUTCMonth();
                const entryMonthKey = `${entryYearUTC}-${String(entryMonthUTC + 1).padStart(2, '0')}`;
        
                if (monthlyAggregates[entryMonthKey]) {
                    const { processEntryForTotals } = require('@/lib/utils/calculations'); // Local import
                    const entryTotals = processEntryForTotals(entry);
                    monthlyAggregates[entryMonthKey].valorComCI += entryTotals.grandTotal.comCI.valor;
                    monthlyAggregates[entryMonthKey].qtdComCI += entryTotals.grandTotal.comCI.qtd;
                    monthlyAggregates[entryMonthKey].valorCI += entryTotals.totalCI.valor;
                    monthlyAggregates[entryMonthKey].qtdCI += entryTotals.totalCI.qtd; 
                    monthlyAggregates[entryMonthKey].reajusteCIValor += entryTotals.totalReajusteCI;
                }
            }
        });
        
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
        const initialAcumulativoMensalState = DASHBOARD_ACCUMULATED_ITEMS_CONFIG.map(config => ({
            item: config.item,
            qtdDisplay: config.item === 'ROOM SERVICE' ? '0 / 0' : '0',
            valorTotal: 0,
            reportLink: config.periodId 
                ? `${REPORTS_PATHS.CLIENT_EXTRACT}?periodId=${config.periodId}&filterFocus=item&month=${currentMonthStr}` 
                : undefined,
            periodId: config.periodId as PeriodId | undefined,
        }));

        const updatedAcumulativoMensalData = initialAcumulativoMensalState.map(item => {
            switch (item.item) {
                case "ROOM SERVICE": return { ...item, qtdDisplay: `${monthTotals.roomService.qtdPedidos} / ${monthTotals.roomService.qtdPratos}`, valorTotal: monthTotals.roomService.valor };
                case "CAFÉ DA MANHÃ": return { ...item, qtdDisplay: monthTotals.cafeDaManha.qtd.toString(), valorTotal: monthTotals.cafeDaManha.valor };
                case "BREAKFAST": return { ...item, qtdDisplay: monthTotals.breakfast.qtd.toString(), valorTotal: monthTotals.breakfast.valor };
                case "ALMOÇO": return { ...item, qtdDisplay: monthTotals.almoco.qtd.toString(), valorTotal: monthTotals.almoco.valor };
                case "JANTAR": return { ...item, qtdDisplay: monthTotals.jantar.qtd.toString(), valorTotal: monthTotals.jantar.valor };
                case "RW ITALIANO ALMOÇO": return { ...item, qtdDisplay: monthTotals.italianoAlmoco.qtd.toString(), valorTotal: monthTotals.italianoAlmoco.valor };
                case "RW ITALIANO JANTAR": return { ...item, qtdDisplay: monthTotals.italianoJantar.qtd.toString(), valorTotal: monthTotals.italianoJantar.valor };
                case "RW INDIANO ALMOÇO": return { ...item, qtdDisplay: monthTotals.indianoAlmoco.qtd.toString(), valorTotal: monthTotals.indianoAlmoco.valor };
                case "RW INDIANO JANTAR": return { ...item, qtdDisplay: monthTotals.indianoJantar.qtd.toString(), valorTotal: monthTotals.indianoJantar.valor };
                case "BALI ALMOÇO": return { ...item, qtdDisplay: monthTotals.baliAlmoco.qtd.toString(), valorTotal: monthTotals.baliAlmoco.valor };
                case "BALI HAPPY HOUR": return { ...item, qtdDisplay: monthTotals.baliHappy.qtd.toString(), valorTotal: monthTotals.baliHappy.valor };
                case "FRIGOBAR": return { ...item, qtdDisplay: monthTotals.frigobar.qtd.toString(), valorTotal: monthTotals.frigobar.valor };
                case "EVENTOS (DIRETO)": return { ...item, qtdDisplay: monthTotals.eventosDireto.qtd.toString(), valorTotal: monthTotals.eventosDireto.valor };
                case "EVENTOS (HOTEL)": return { ...item, qtdDisplay: monthTotals.eventosHotel.qtd.toString(), valorTotal: monthTotals.eventosHotel.valor };
                default: return item;
            }
        });
        
        const finalVisibleData = updatedAcumulativoMensalData.filter(item => {
          return visibilityConfig?.[item.item] !== false; 
        });
        
        setDashboardData({
          dailyTotals: dailyTotalsData,
          acumulativoMensalData: finalVisibleData,
          monthlyEvolutionData: finalMonthlyEvolutionData,
          totalCIAlmoco: monthTotals.totalCIAlmoco,
          totalCIJantar: monthTotals.totalCIJantar,
          totalConsumoInternoGeral: monthTotals.totalConsumoInternoGeral,
          totalGeralSemCI: monthTotals.grandTotalSemCI,
          overallTotalRevenue: monthTotals.grandTotalComCI.valor,
          overallTotalTransactions: monthTotals.grandTotalComCI.qtd,
          totalReajusteCI: monthTotals.totalReajusteCI,
          totalEstornos: monthTotals.totalEstornos,
          totalRSValor: monthTotals.roomService.valor,
          totalRSQtd: monthTotals.roomService.qtdPedidos,
          totalAlmocoValor: monthTotals.almoco.valor,
          totalAlmocoQtd: monthTotals.almoco.qtd,
          totalJantarValor: monthTotals.jantar.valor,
          totalJantarQtd: monthTotals.jantar.qtd,
          totalFrigobarValor: monthTotals.frigobar.valor,
          totalFrigobarQtd: monthTotals.frigobar.qtd,
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
              <Link href={PATHS.ENTRY_BASE}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Ir para Lançamentos
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    
    const revenueString = dashboardData.overallTotalRevenue.toLocaleString('pt-BR');
    const revenueStringSemCI = dashboardData.totalGeralSemCI.valor.toLocaleString('pt-BR');

    return (
      <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total com CI</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {dashboardData.overallTotalTransactions.toLocaleString('pt-BR')} Itens
              </div>
              <div className={cn("font-bold", revenueString.length > 15 ? 'text-xl' : 'text-2xl')}>
                R$ {revenueString}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total sem CI</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {dashboardData.totalGeralSemCI.qtd.toLocaleString('pt-BR')} Itens
              </div>
              <div className={cn("font-bold", revenueStringSemCI.length > 15 ? 'text-xl' : 'text-2xl')}>
                R$ {revenueStringSemCI}
              </div>
            </CardContent>
          </Card>
          <SummaryCards
              totalRSValor={dashboardData.totalRSValor}
              totalRSQtd={dashboardData.totalRSQtd}
              totalAlmocoValor={dashboardData.totalAlmocoValor}
              totalAlmocoQtd={dashboardData.totalAlmocoQtd}
              totalJantarValor={dashboardData.totalJantarValor}
              totalJantarQtd={dashboardData.totalJantarQtd}
              totalFrigobarValor={dashboardData.totalFrigobarValor}
              totalFrigobarQtd={dashboardData.totalFrigobarQtd}
          />
        </div>
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
            <EstornosTable totalEstornos={dashboardData.totalEstornos} />
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
