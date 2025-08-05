

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, max as maxDate, getYear, getMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { DateRange } from 'react-day-picker';

import type { DailyLogEntry, PeriodId, DashboardItemVisibilityConfig, ReportData, ChartConfig, FilterType, ChannelUnitPricesConfig } from '@/lib/types';
import { PERIOD_DEFINITIONS, getPeriodIcon } from '@/lib/config/periods';
import { DASHBOARD_ACCUMULATED_ITEMS_CONFIG } from '@/lib/config/dashboard';
import { getAllDailyEntries } from '@/services/dailyEntryService';
import { getSetting } from '@/services/settingsService';
import { exportReport, getConsumptionTypeLabel } from '@/lib/reportExporter';
import { generateReportData } from '@/lib/utils/reportGenerators';


import ReportToolbar from '@/components/reports/ReportToolbar';
import GeneralReportView from '@/components/reports/GeneralReportView';
import SingleDayReportView from '@/components/reports/SingleDayReportView';
import PeriodSpecificReportView from '@/components/reports/PeriodSpecificReportView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter, ListChecks, FileCheck2, Wallet, Refrigerator, CalendarDays, Sun, Moon, Coffee, Utensils, UtensilsCrossed, HelpCircle, Package, Building, Truck, Users, ClipboardCheck, BedDouble } from "lucide-react";
import ReportLineChart from '@/components/reports/ReportBarChart';
import PeriodReportLineChart from '@/components/reports/PeriodReportBarChart';
import ClientExtractView from '@/components/reports/ClientExtractView';
import ClientSummaryView from '@/components/reports/ClientSummaryView';
import ControleCafeReportView from '@/components/reports/ControleCafeReportView';
import { TAB_DEFINITIONS } from '@/components/reports/tabDefinitions';
import NoShowClientList from '@/components/period-forms/NoShowClientList';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [allEntries, setAllEntries] = useState<DailyLogEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DailyLogEntry[]>([]);
  const [filterType, setFilterType] = useState<FilterType>('period');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService'>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [visibilityConfig, setVisibilityConfig] = useState<DashboardItemVisibilityConfig>({});
  const [unitPricesConfig, setUnitPricesConfig] = useState<ChannelUnitPricesConfig>({});
  const [datesWithEntries, setDatesWithEntries] = useState<Date[]>([]);
  const hasSetFromParams = useRef(false);
  const [consumptionType, setConsumptionType] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');

  useEffect(() => {
    async function fetchInitialMetadata() {
      setIsLoadingEntries(true);
      try {
        const [allDbEntries, visibility, prices] = await Promise.all([
          getAllDailyEntries(undefined, undefined, undefined),
          getSetting<DashboardItemVisibilityConfig>('dashboardItemVisibilityConfig'),
          getSetting<ChannelUnitPricesConfig>('channelUnitPricesConfig'),
        ]);
        
        const validEntries = allDbEntries.filter(e => e.id).map(e => e as DailyLogEntry);
        setAllEntries(validEntries);
        setUnitPricesConfig(prices || {});

        const dates = validEntries
          .map(entry => entry.id ? parseISO(String(entry.id)) : null)
          .filter((date): date is Date => date !== null && isValid(date));
        
        setDatesWithEntries(dates);
        setVisibilityConfig(visibility || {});
      } catch (error) {
        console.error("Falha ao carregar metadados para os relatórios:", error);
        toast({ title: "Erro ao Carregar Dados", description: "Não foi possível carregar os metadados dos registros.", variant: "destructive" });
      } finally {
        setIsLoadingEntries(false);
      }
    }
    fetchInitialMetadata();
  }, [toast]);
  
  const visiblePeriodDefinitions = useMemo(() => {
    return PERIOD_DEFINITIONS.filter(pDef => {
        if (pDef.type !== 'entry') return false; // Exclude control types
        
        if (pDef.id === 'almocoPrimeiroTurno' || pDef.id === 'almocoSegundoTurno') {
            return visibilityConfig['ALMOÇO'] !== false;
        }
        const dashboardItem = DASHBOARD_ACCUMULATED_ITEMS_CONFIG.find(item => item.periodId === pDef.id);
        if (dashboardItem) {
            return visibilityConfig[dashboardItem.item] !== false;
        }
        return true;
    });
  }, [visibilityConfig]);

  useEffect(() => {
    if (isLoadingEntries || hasSetFromParams.current) return;

    const filterFocusParam = searchParams.get('filterFocus');
    const periodIdParam = searchParams.get('periodId') as PeriodId | 'frigobar' | 'consumoInterno' | 'faturado' | null;
    const monthParam = searchParams.get('month');
    
    if (filterFocusParam === 'item' && periodIdParam && monthParam) {
      const parsedMonth = parseISO(monthParam);
      if (isValid(parsedMonth)) {
        setFilterType('period');
        setSelectedPeriod(periodIdParam);
        setSelectedMonth(parsedMonth);
        hasSetFromParams.current = true;
      }
    }
  }, [searchParams, isLoadingEntries]);

  useEffect(() => {
    if (isLoadingEntries) return;

    let finalFilteredEntries: DailyLogEntry[] = [];
    
    if (filterType === 'date' && selectedDate && isValid(selectedDate)) {
        const targetId = format(selectedDate, 'yyyy-MM-dd');
        finalFilteredEntries = allEntries.filter(entry => entry.id === targetId);
    } else if ((filterType === 'range' || filterType.startsWith('controle-cafe') || filterType.startsWith('client-')) && selectedRange?.from && isValid(selectedRange.from)) {
        const fromId = format(selectedRange.from, 'yyyy-MM-dd');
        const toId = selectedRange.to ? format(selectedRange.to, 'yyyy-MM-dd') : fromId;
        finalFilteredEntries = allEntries.filter(entry => {
            if (typeof entry.id !== 'string') return false;
            return entry.id >= fromId && entry.id <= toId;
        });
    } else if (filterType === 'month' || filterType === 'period') {
        if (isValid(selectedMonth)) {
            const targetMonthStr = format(selectedMonth, 'yyyy-MM');
            finalFilteredEntries = allEntries.filter(entry => {
                if (typeof entry.id !== 'string') return false;
                return entry.id.startsWith(targetMonthStr);
            });
        }
    }
    setFilteredEntries(finalFilteredEntries);
  }, [filterType, selectedDate, selectedMonth, selectedRange, allEntries, isLoadingEntries]);

  const reportData = useMemo((): ReportData | null => {
    if (filterType === 'date' || filterType.startsWith('client-') || filterType.startsWith('controle-cafe')) return null;
    const periodForReport = (filterType === 'range' || filterType === 'month') ? 'all' : selectedPeriod;
    return generateReportData(filteredEntries, periodForReport);
  }, [filteredEntries, selectedPeriod, filterType]);

  const { periodChartData, periodChartConfig, hasPeriodChartData } = useMemo(() => {
    if (!reportData || reportData.type !== 'period') {
        return { periodChartData: [], periodChartConfig: {}, hasPeriodChartData: false };
    }

    const { data } = reportData;
    const tempChartData: Record<string, Record<string, any>> = {};
    
    // Get all categories that have data
    const availableCategories = Object.keys(data.dailyBreakdowns).filter(
      key => data.dailyBreakdowns[key] && data.dailyBreakdowns[key].length > 0
    );

    let start: Date | undefined, end: Date | undefined;
    if (filterType === 'range' && selectedRange?.from) {
        start = selectedRange.from;
        end = selectedRange.to || selectedRange.from;
    } else if (filterType === 'period' || filterType === 'month') {
        start = startOfMonth(selectedMonth);
        end = endOfMonth(selectedMonth);
    }
    
    if (!start || !end || !isValid(start) || !isValid(end)) {
        return { periodChartData: [], periodChartConfig: {}, hasPeriodChartData: false };
    }
    
    const entryDates = filteredEntries.map(e => parseISO(String(e.id))).filter(isValid);
    if(entryDates.length === 0) {
        return { periodChartData: [], periodChartConfig: {}, hasPeriodChartData: false };
    }
    const lastEntryDate = maxDate(entryDates);
    const finalEndDate = end > lastEntryDate ? lastEntryDate : end;

    const allDatesInRange = eachDayOfInterval({ start, end: finalEndDate });

    availableCategories.forEach(categoryId => {
        const categoryData = data.dailyBreakdowns[categoryId];
        
        categoryData.forEach(dailyItem => {
            const dateKey = parseISO(dailyItem.date.split('/').reverse().join('-')).toISOString().split('T')[0];
            
            if (!tempChartData[dateKey]) tempChartData[dateKey] = { date: dateKey };
            
            let valueToAdd = 0;
            if(categoryId.startsWith('faturado-')) {
                valueToAdd = dailyItem.valor || 0;
            } else if(categoryId === 'eventosDireto' || categoryId === 'eventosHotel') {
                valueToAdd = dailyItem.totalValue ?? 0;
            } else {
                valueToAdd = dailyItem.totalValue ?? dailyItem.total ?? dailyItem.valor ?? 0;
            }
            tempChartData[dateKey][categoryId] = (tempChartData[dateKey][categoryId] || 0) + valueToAdd;
        });
    });

    const finalChartData = allDatesInRange.map(date => {
        const dateKey = date.toISOString().split('T')[0];
        const dayData = tempChartData[dateKey] || { date: dateKey };

        const completeDayData: Record<string, any> = { date: dateKey };
        availableCategories.forEach(cat => {
            completeDayData[cat] = dayData[cat] || 0;
        });
        
        return completeDayData;
    });

    const dynamicChartConfig: ChartConfig = {};
    const colors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "destructive", "primary", "secondary"];
    let colorIndex = 0;
    
    availableCategories.forEach(catId => {
        const tabDef = TAB_DEFINITIONS.find(t => t.id === catId);
        dynamicChartConfig[catId] = {
            label: tabDef?.label || catId,
            color: `hsl(var(--${colors[colorIndex % colors.length]}))`,
        };
        colorIndex++;
    });

    return {
        periodChartData: finalChartData,
        periodChartConfig: dynamicChartConfig,
        hasPeriodChartData: finalChartData.length > 0 && availableCategories.length > 0,
    };
  }, [reportData, filterType, selectedRange, selectedMonth, filteredEntries]);


  const handleExport = async (formatType: 'pdf' | 'excel') => {
    if (filteredEntries.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Filtre por um período com dados antes de exportar.", variant: "destructive" });
      return;
    }
    await exportReport({
        formatType,
        filterType,
        entries: filteredEntries,
        reportData,
        date: selectedDate,
        month: selectedMonth,
        range: selectedRange,
        visiblePeriods: visiblePeriodDefinitions,
        consumptionType,
        selectedClient,
    });
  };

  const { titleIcon, reportDescription } = useMemo(() => {
    if (isLoadingEntries) {
        return {
            titleIcon: <Filter className="h-8 w-8 text-muted-foreground" />,
            reportDescription: "Carregando registros..."
        };
    }
    
    let IconComponent: React.ComponentType<{ className?: string }> = ListChecks;
    let description = "";

    const consumptionLabel = getConsumptionTypeLabel(consumptionType);
    const rangeStr = selectedRange?.from 
      ? `${format(selectedRange.from, "dd/MM/yyyy", {locale: ptBR})} a ${selectedRange.to ? format(selectedRange.to, "dd/MM/yyyy", {locale: ptBR}) : format(selectedRange.from, "dd/MM/yyyy", {locale: ptBR})}`
      : "intervalo não selecionado";

    switch (filterType) {
      case 'date':
        IconComponent = CalendarDays; 
        description = `Mostrando o resumo detalhado para ${selectedDate ? format(selectedDate, "dd/MM/yyyy", {locale: ptBR}) : 'data selecionada'}.`;
        break;
      case 'client-extract':
        IconComponent = Users;
        description = `Exibindo extrato para: ${selectedClient === 'all' ? 'Todas as Pessoas' : selectedClient} | Tipo: ${consumptionLabel} | Período: ${rangeStr}`;
        break;
      case 'client-summary':
        IconComponent = Building;
        description = `Mostrando resumo para o período: ${rangeStr} | Tipo: ${consumptionLabel}`;
        break;
      case 'month':
      case 'period':
        if (!reportData) {
            description = "Nenhum registro encontrado para os filtros selecionados.";
        } else {
            const reportTitleForPeriod = reportData.data.reportTitle === 'GERAL (MÊS)' ? 'Todos os Períodos' : reportData.data.reportTitle;
            if (selectedPeriod === 'consumoInterno') IconComponent = FileCheck2;
            else if (selectedPeriod === 'faturado') IconComponent = Wallet;
            else if (selectedPeriod === 'frigobar') IconComponent = Refrigerator;
            else if (selectedPeriod !== 'all') IconComponent = getPeriodIcon(selectedPeriod as PeriodId);
            description = `Mostrando dados para ${reportTitleForPeriod} de ${format(selectedMonth, "MMMM yyyy", {locale: ptBR})}.`;
        }
        break;
      case 'range':
      case 'controle-cafe-no-show':
      case 'controle-cafe':
        if (selectedRange?.from) {
            const fromDate = format(selectedRange.from, "dd/MM/yyyy", {locale: ptBR});
            const toDate = selectedRange.to ? format(selectedRange.to, "dd/MM/yyyy", {locale: ptBR}) : fromDate;
            const titlePrefix = filterType === 'controle-cafe-no-show' ? 'Controle No-Show Café da Manhã' : filterType === 'controle-cafe' ? 'Controle Café da Manhã' : 'Dados';
            IconComponent = filterType.startsWith('controle-cafe') ? ClipboardCheck : CalendarDays;
            description = `Mostrando ${titlePrefix} de ${fromDate} a ${toDate}.`;
        } else {
            description = "Selecione um intervalo de datas.";
        }
        break;
      default:
        description = "Selecione os filtros para visualizar os dados.";
        break;
    }
    return { titleIcon: <IconComponent className="h-8 w-8 text-muted-foreground" />, reportDescription: description };

  }, [isLoadingEntries, filterType, reportData, selectedDate, selectedMonth, selectedRange, selectedPeriod, consumptionType, selectedClient]);


  const renderChart = () => {
    if (isLoadingEntries || !reportData) return null;

    if (reportData.type === 'general' || (reportData.type === 'period' && selectedPeriod === 'all')) {
      return (
        <ReportLineChart 
          data={reportData.data.dailyBreakdowns} 
          title="Evolução Diária no Período"
          description="Visualização dos valores diários que compõem o total do período filtrado."
        />
      );
    }
    
    if (reportData.type === 'period' && hasPeriodChartData) {
      return (
        <PeriodReportLineChart 
          data={periodChartData} 
          config={periodChartConfig}
          title={`Evolução Diária - ${reportData.data.reportTitle}`} 
          connectNulls={true}
        />
      );
    }
    
    return null;
  };

  const renderContent = () => {
    if (isLoadingEntries) {
      return <div className="text-center py-10 text-muted-foreground"><Filter className="mx-auto h-12 w-12 mb-4 animate-pulse" /><p>Carregando dados...</p></div>
    }

    if (filterType === 'controle-cafe-no-show') {
      return <ControleCafeReportView entries={filteredEntries} type="no-show" />;
    }
    
    if (filterType === 'controle-cafe') {
      return <ControleCafeReportView entries={filteredEntries} type="controle" />;
    }

    if (filterType === 'client-extract') {
      return <ClientExtractView entries={filteredEntries} consumptionType={consumptionType} selectedClient={selectedClient} setSelectedClient={setSelectedClient} />
    }
    
    if (filterType === 'client-summary') {
      return <ClientSummaryView entries={filteredEntries} consumptionType={consumptionType} />
    }

    if (filterType === 'date' && filteredEntries.length > 0) {
      return <SingleDayReportView entry={filteredEntries[0]} />
    }

    if (reportData && reportData.type === 'general') {
      return <GeneralReportView data={reportData.data} visiblePeriods={visiblePeriodDefinitions} />
    }
    
    if (reportData && reportData.type === 'period') {
       return <PeriodSpecificReportView data={reportData.data} periodId={selectedPeriod} />
    }
    
    return <div className="text-center py-10 text-muted-foreground"><Filter className="mx-auto h-12 w-12 mb-4" /><p>Nenhum registro encontrado. Selecione os filtros.</p></div>
  };

  const isControlReport = filterType === 'controle-cafe' || filterType === 'controle-cafe-no-show';
  const mainContentSpan = isControlReport ? "lg:col-span-2" : "lg:col-span-3";


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>

      <ReportToolbar
        filterType={filterType}
        setFilterType={setFilterType}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        visiblePeriodDefinitions={visiblePeriodDefinitions}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedRange={selectedRange}
        setSelectedRange={setSelectedRange}
        handleExport={handleExport}
        isDataAvailable={!!reportData || filteredEntries.length > 0}
        isPeriodFilterDisabled={hasSetFromParams.current}
        datesWithEntries={datesWithEntries}
        consumptionType={consumptionType}
        setConsumptionType={setConsumptionType}
      />

      {renderChart()}

      <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6")}>
         <div className={cn(mainContentSpan)}>
            <Card>
              <CardHeader>
                  <div className="flex items-center gap-3 text-xl">
                      {titleIcon}
                      <div>
                          <CardTitle className="text-xl">Resultados</CardTitle>
                          <CardDescription>{reportDescription}</CardDescription>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                {renderContent()}
              </CardContent>
            </Card>
         </div>

        {isControlReport && (
            <div className="lg:col-span-1">
                <NoShowClientList
                    entries={filteredEntries}
                    unitPrices={unitPricesConfig}
                    type={filterType}
                />
            </div>
        )}
      </div>

    </div>
  );
}
