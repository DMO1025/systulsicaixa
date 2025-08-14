
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, max as maxDate, getYear, getMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { DateRange } from 'react-day-picker';
import { REPORTS_GROUPS } from '@/lib/config/navigation';

import type { DailyLogEntry, PeriodId, DashboardItemVisibilityConfig, ReportData, ChartConfig, FilterType, ChannelUnitPricesConfig } from '@/lib/types';
import { PERIOD_DEFINITIONS, getPeriodIcon } from '@/lib/config/periods';
import { DASHBOARD_ACCUMULATED_ITEMS_CONFIG } from '@/lib/config/dashboard';
import { getAllDailyEntries } from '@/services/dailyEntryService';
import { getSetting } from '@/services/settingsService';
import { exportReport } from '@/lib/utils/reports/exportUtils';
import { generateReportData } from '@/lib/utils/reportGenerators';


import ReportToolbar from '@/components/reports/ReportToolbar';
import GeneralReportView from '@/components/reports/general/GeneralReportView';
import SingleDayReportView from '@/components/reports/daily/SingleDayReportView';
import PeriodSpecificReportView from '@/components/reports/period/PeriodSpecificReportView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter, ListChecks, FileCheck2, Wallet, Refrigerator, CalendarDays, Sun, Moon, Coffee, Utensils, UtensilsCrossed, HelpCircle, Package, Building, Truck, Users, ClipboardCheck, BedDouble, Loader2, BarChartBig, CalendarRange, ListFilter, UserSquare, History } from "lucide-react";
import ReportLineChart from '@/components/reports/ReportBarChart';
import PeriodReportLineChart from '@/components/reports/PeriodReportBarChart';
import ClientExtractView from '@/components/reports/person-extract/ClientExtractView';
import ClientSummaryView from '@/components/reports/person-summary/ClientSummaryView';
import ControleCafeReportView from '@/components/reports/controle-cafe/ControleCafeReportView';
import { TAB_DEFINITIONS } from '@/components/reports/tabDefinitions';
import NoShowClientList from '@/components/reports/controle-cafe/NoShowClientList';
import { cn } from '@/lib/utils';
import { getAuditLogs } from '@/services/auditService';
import AuditLogView from '@/components/reports/audit/AuditLogView';
import ResumoLateralCard from '@/components/shared/ResumoLateralCard';
import ClientReportSummary from '@/components/reports/person/ClientReportSummary';

export default function ReportsPage() {
  useAuth();
  const params = useParams();
  const { toast } = useToast();

  const [allEntries, setAllEntries] = useState<DailyLogEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DailyLogEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService'>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [visibilityConfig, setVisibilityConfig] = useState<DashboardItemVisibilityConfig>({});
  const [unitPricesConfig, setUnitPricesConfig] = useState<ChannelUnitPricesConfig>({});
  const [datesWithEntries, setDatesWithEntries] = useState<Date[]>([]);
  const hasSetFromParams = useRef(false);
  const [consumptionType, setConsumptionType] = useState('all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [companyName, setCompanyName] = useState('');
  const [selectedDezena, setSelectedDezena] = useState('all');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const filterType: FilterType = (params.filterType as FilterType) || 'month';

  const reportInfo = useMemo(() => {
    return REPORTS_GROUPS.flatMap(g => g.items).find(item => item.id === filterType);
  }, [filterType]);

  useEffect(() => {
    async function fetchInitialMetadata() {
      setIsLoading(true);
      try {
        const promises: any[] = [
          getAllDailyEntries(undefined, undefined, undefined),
          getSetting<DashboardItemVisibilityConfig>('dashboardItemVisibilityConfig'),
          getSetting<ChannelUnitPricesConfig>('channelUnitPricesConfig'),
        ];
        
        if (filterType === 'history') {
            promises.push(getAuditLogs());
        }

        const [allDbEntries, visibility, prices, fetchedAuditLogs] = await Promise.all(promises);
        
        const validEntries = allDbEntries.filter(e => e.id).map(e => e as DailyLogEntry);
        setAllEntries(validEntries);
        setUnitPricesConfig(prices || {});

        const dates = validEntries
          .map(entry => entry.id ? parseISO(String(entry.id)) : null)
          .filter((date): date is Date => date !== null && isValid(date));
        
        setDatesWithEntries(dates);
        setVisibilityConfig(visibility || {});
        if (fetchedAuditLogs) {
            setAuditLogs(fetchedAuditLogs);
        }
      } catch (error) {
        console.error("Falha ao carregar metadados para os relatórios:", error);
        toast({ title: "Erro ao Carregar Dados", description: "Não foi possível carregar os metadados dos registros.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialMetadata();
  }, [toast, filterType]);
  
  const visiblePeriodDefinitions = useMemo(() => {
    return PERIOD_DEFINITIONS.filter(pDef => {
        if (pDef.type !== 'entry') return false;
        
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
    if (isLoading || filterType === 'history') return;

    let finalFilteredEntries: DailyLogEntry[] = [];
    
    if (filterType === 'date' && selectedDate && isValid(selectedDate)) {
        const targetId = format(selectedDate, 'yyyy-MM-dd');
        finalFilteredEntries = allEntries.filter(entry => entry.id === targetId);
    } else if ((filterType === 'range' || filterType.startsWith('client-')) && selectedRange?.from && isValid(selectedRange.from)) {
        const fromId = format(selectedRange.from, 'yyyy-MM-dd');
        const toId = selectedRange.to ? format(selectedRange.to, 'yyyy-MM-dd') : fromId;
        finalFilteredEntries = allEntries.filter(entry => {
            if (typeof entry.id !== 'string') return false;
            return entry.id >= fromId && entry.id <= toId;
        });
    } else if (filterType === 'month' || filterType === 'period' || filterType.startsWith('controle-cafe')) {
        if (isValid(selectedMonth)) {
            const targetMonthStr = format(selectedMonth, 'yyyy-MM');
            finalFilteredEntries = allEntries.filter(entry => {
                if (typeof entry.id !== 'string') return false;
                return entry.id.startsWith(targetMonthStr);
            });
        }
    }
    setFilteredEntries(finalFilteredEntries);
  }, [filterType, selectedDate, selectedMonth, selectedRange, allEntries, isLoading]);

  const reportData = useMemo((): ReportData | null => {
    if (filterType === 'date' || filterType.startsWith('client-') || filterType.startsWith('controle-cafe') || filterType === 'history') return null;
    const periodForReport = (filterType === 'range' || filterType === 'month') ? 'all' : selectedPeriod;
    return generateReportData(filteredEntries, periodForReport);
  }, [filteredEntries, selectedPeriod, filterType]);

  const { periodChartData, periodChartConfig, hasPeriodChartData } = useMemo(() => {
    if (!reportData || reportData.type !== 'period') {
        return { periodChartData: [], periodChartConfig: {}, hasPeriodChartData: false };
    }

    const { data } = reportData;
    const tempChartData: Record<string, Record<string, any>> = {};
    
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
    if (filterType !== 'history' && filteredEntries.length === 0) {
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
        companyName,
        selectedDezena,
        unitPrices: unitPricesConfig,
        toast,
    });
  };

  const renderChart = () => {
    if (!reportData) return null;

    if (reportData.type === 'general') {
        return (
            <ReportLineChart
                data={reportData.data.dailyBreakdowns}
                title="Evolução Diária (Geral)"
                description="Receita diária, incluindo consumo interno e reajustes."
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
    if (isLoading) {
      return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mx-auto h-10 w-10 animate-spin" /><p className="mt-4">Carregando dados...</p></div>
    }

    if (filterType === 'history') {
        return <AuditLogView logs={auditLogs} />;
    }

    if (filterType === 'controle-cafe-no-show') {
      return <ControleCafeReportView entries={filteredEntries} type="no-show" unitPrices={unitPricesConfig} />;
    }
    
    if (filterType === 'controle-cafe') {
      return <ControleCafeReportView entries={filteredEntries} type="controle" unitPrices={unitPricesConfig} />;
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
  
  const renderAside = () => {
    const showControlsAside = filterType === 'controle-cafe' || filterType === 'controle-cafe-no-show';
    const showDateAside = filterType === 'date' && filteredEntries.length > 0;
    const showPersonAside = filterType.startsWith('client-');

    if (!showControlsAside && !showDateAside && !showPersonAside) {
        return null;
    }

    return (
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit">
            {showControlsAside && <NoShowClientList entries={filteredEntries} unitPrices={unitPricesConfig} type={filterType}/>}
            {showDateAside && <ResumoLateralCard dailyData={filteredEntries[0]} />}
            {showPersonAside && <ClientReportSummary entries={filteredEntries} consumptionType={consumptionType} />}
        </aside>
    );
  };

  const showToolbar = filterType !== 'history';
  const showChart = filterType !== 'history' && !filterType.startsWith('client') && !filterType.startsWith('controle-cafe') && filterType !== 'date';
  const showAside = useMemo(() => {
    return filterType === 'controle-cafe' || filterType === 'controle-cafe-no-show' || (filterType === 'date' && filteredEntries.length > 0) || filterType.startsWith('client-');
  }, [filterType, filteredEntries]);


  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{reportInfo?.title || 'Relatórios'}</h1>
          <p className="text-lg text-muted-foreground pt-1">Gere e analise os dados do sistema.</p>
        </div>
      </div>
      
      {showToolbar && (
        <ReportToolbar
            filterType={filterType}
            setFilterType={() => {}} // Controlled by layout now
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
            isDataAvailable={!!reportData || filteredEntries.length > 0 || (filterType === 'history' && auditLogs.length > 0)}
            datesWithEntries={datesWithEntries}
            consumptionType={consumptionType}
            setConsumptionType={setConsumptionType}
            companyName={companyName}
            setCompanyName={setCompanyName}
            selectedDezena={selectedDezena}
            setSelectedDezena={setSelectedDezena}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("space-y-6", showAside ? "lg:col-span-2" : "lg:col-span-3")}>
            {showChart && renderChart()}
            {renderContent()}
        </div>
        
        {renderAside()}

      </div>
    </div>
  );
}
