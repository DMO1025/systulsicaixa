
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toPng } from 'html-to-image';
import type { DateRange } from 'react-day-picker';

import type { DailyLogEntry, PeriodId, DashboardItemVisibilityConfig, ReportData, GeneralReportViewData, PeriodReportViewData } from '@/lib/types';
import { PERIOD_DEFINITIONS, DASHBOARD_ACCUMULATED_ITEMS_CONFIG, SALES_CHANNELS } from '@/lib/constants';
import { getAllDailyEntries } from '@/services/dailyEntryService';
import { getSetting } from '@/services/settingsService';
import { generateReportData } from '@/lib/reportUtils';

import ReportToolbar from '@/components/reports/ReportToolbar';
import GeneralReportView from '@/components/reports/GeneralReportView';
import PeriodSpecificReportView from '@/components/reports/PeriodSpecificReportView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter } from "lucide-react";

export default function ReportsPage() {
  useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement>(null);

  const [allEntries, setAllEntries] = useState<DailyLogEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DailyLogEntry[]>([]);
  const [filterType, setFilterType] = useState< 'date' | 'period' | 'month' | 'range'>('period');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodId | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [visibilityConfig, setVisibilityConfig] = useState<DashboardItemVisibilityConfig>({});

  useEffect(() => {
    async function fetchInitialData() {
      setIsLoadingEntries(true);
      try {
        const [entries, visibility] = await Promise.all([
          getAllDailyEntries(),
          getSetting<DashboardItemVisibilityConfig>('dashboardItemVisibilityConfig')
        ]);
        setAllEntries(entries);
        setVisibilityConfig(visibility || {});
      } catch (error) {
        console.error("Falha ao carregar dados para os relatórios:", error);
        toast({ title: "Erro ao Carregar Dados", description: "Não foi possível carregar os registros.", variant: "destructive" });
        setAllEntries([]);
      } finally {
        setIsLoadingEntries(false);
      }
    }
    fetchInitialData();
  }, [toast]);

  const visiblePeriodDefinitions = useMemo(() => {
    return PERIOD_DEFINITIONS.filter(pDef => {
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
    const filterFocusParam = searchParams.get('filterFocus');
    const periodIdParam = searchParams.get('periodId') as PeriodId | null;
    const monthParam = searchParams.get('month');

    if (filterFocusParam === 'item' && periodIdParam && monthParam) {
      const parsedMonth = parseISO(monthParam);
      if (isValid(parsedMonth)) {
        setFilterType('period');
        setSelectedPeriod(periodIdParam);
        setSelectedMonth(parsedMonth);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    let entriesToDisplay: DailyLogEntry[] = [];
    if (filterType === 'date' && selectedDate && isValid(selectedDate)) {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      entriesToDisplay = allEntries.filter(entry => entry.id === dateString);
    } else if (filterType === 'range' && selectedRange?.from) {
      const fromDateStr = format(selectedRange.from, 'yyyy-MM-dd');
      const toDateStr = selectedRange.to ? format(selectedRange.to, 'yyyy-MM-dd') : fromDateStr;
      entriesToDisplay = allEntries.filter(entry => {
        if (entry.id && typeof entry.id === 'string') {
          return entry.id >= fromDateStr && entry.id <= toDateStr;
        }
        return false;
      });
    } else if (filterType === 'month' || filterType === 'period') {
      if (isValid(selectedMonth)) {
        const targetYear = selectedMonth.getFullYear();
        const targetMonth = selectedMonth.getMonth() + 1;
        entriesToDisplay = allEntries.filter(entry => {
          if (entry.id && typeof entry.id === 'string' && entry.id.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [entryYearStr, entryMonthStr] = entry.id.split('-');
            return parseInt(entryYearStr, 10) === targetYear && parseInt(entryMonthStr, 10) === targetMonth;
          }
          return false;
        });
      } else {
        entriesToDisplay = allEntries;
      }
    }
    setFilteredEntries(entriesToDisplay);
  }, [allEntries, filterType, selectedDate, selectedMonth, selectedRange]);

  const reportData = useMemo((): ReportData | null => {
    const periodForReport = filterType === 'range' ? 'all' : selectedPeriod;
    return generateReportData(filteredEntries, periodForReport);
  }, [filteredEntries, selectedPeriod, filterType]);

  const handleExport = async (formatType: 'pdf' | 'excel') => {
    if (!reportData) {
      toast({ title: "Nenhum dado para exportar", description: "Filtre por um período com dados antes de exportar.", variant: "destructive" });
      return;
    }

    const exportFileName = `Relatorio_${reportData.data.reportTitle.replace(/[\s()]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
    const formatCurrency = (value: number) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const formatNumber = (value: number) => (value || 0).toLocaleString('pt-BR');

    if (reportData.type === 'general') {
        const { dailyBreakdowns, summary } = reportData.data;
        const periodsToExport = visiblePeriodDefinitions;

        if (formatType === 'excel') {
            const wb = XLSX.utils.book_new();
            const headers = ["Data", ...periodsToExport.map(p => p.label), "Total COM C.I", "Reajuste C.I", "Total SEM C.I"];
            const sheetData = dailyBreakdowns.map(row => {
                const rowData: (string|number)[] = [row.date];
                periodsToExport.forEach(pDef => {
                    rowData.push(row.periodTotals[pDef.id]?.valor ?? 0);
                });
                rowData.push(row.totalComCI, row.totalReajusteCI, row.totalSemCI);
                return rowData;
            });
            const footer: (string|number)[] = ["TOTAL"];
            periodsToExport.forEach(pDef => {
                footer.push(summary.periodTotals[pDef.id]?.valor ?? 0);
            });
            footer.push(summary.grandTotalComCI, summary.grandTotalReajusteCI, summary.grandTotalSemCI);
            sheetData.push(footer);

            const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetData]);
            XLSX.utils.book_append_sheet(wb, ws, 'Geral por Período');
            XLSX.writeFile(wb, `${exportFileName}.xlsx`);
        } else { 
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.setFontSize(16);
            doc.text(reportData.data.reportTitle, 14, 20);
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`Período de Referência: ${reportData.data.reportTitle}`, 14, 25);
            
            const head = [["Data", ...periodsToExport.map(p => p.label.substring(0, 15)), "Total COM C.I", "Reajuste C.I", "Total SEM C.I"]];
            const body = dailyBreakdowns.map(row => {
                const rowData = [row.date];
                periodsToExport.forEach(pDef => {
                    rowData.push(formatCurrency(row.periodTotals[pDef.id]?.valor ?? 0));
                });
                rowData.push(formatCurrency(row.totalComCI), formatCurrency(row.totalReajusteCI), formatCurrency(row.totalSemCI));
                return rowData;
            });
            const foot = [["TOTAL"]];
            periodsToExport.forEach(pDef => {
                foot[0].push(formatCurrency(summary.periodTotals[pDef.id]?.valor ?? 0));
            });
            foot[0].push(formatCurrency(summary.grandTotalComCI), formatCurrency(summary.grandTotalReajusteCI), formatCurrency(summary.grandTotalSemCI));

            (doc as any).autoTable({
                startY: 30, head, body, foot,
                theme: 'grid',
                headStyles: { fillColor: [74, 180, 155], fontSize: 6, cellPadding: 1 },
                styles: { fontSize: 6, cellPadding: 1 },
                footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' }
            });
            doc.save(`${exportFileName}.pdf`);
        }
    } else if (selectedPeriod === 'cafeDaManha') {
        const { dailyBreakdowns, summary, subtotalGeralComCI } = reportData.data;
        const cdmBreakdown = dailyBreakdowns.cafeDaManhaDetails || [];
        
        const summaryItems = [
            { label: SALES_CHANNELS.cdmListaHospedes, data: summary.cdmListaHospedes },
            { label: SALES_CHANNELS.cdmNoShow, data: summary.cdmNoShow },
            { label: SALES_CHANNELS.cdmSemCheckIn, data: summary.cdmSemCheckIn },
            { label: SALES_CHANNELS.cdmCafeAssinado, data: summary.cdmCafeAssinado },
            { label: SALES_CHANNELS.cdmDiretoCartao, data: summary.cdmDiretoCartao },
        ];

        if (formatType === 'excel') {
            const wb = XLSX.utils.book_new();
            
            const summarySheetData = [
                [`Relatório: ${reportData.data.reportTitle}`],
                [`Mês: ${format(selectedMonth, "MMMM yyyy", { locale: ptBR })}`], [],
                ['Item', 'Qtd', 'Total']
            ];
            summaryItems.forEach(item => {
                if(item.data) summarySheetData.push([item.label, item.data.qtd, item.data.total]);
            });
            summarySheetData.push([]);
            summarySheetData.push(['SUBTOTAL GERAL', subtotalGeralComCI.qtd, subtotalGeralComCI.total]);
            const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

            const detailHeaders = ["Data", "Lista Hósp. (Qtd)", "Lista Hósp. (Vlr)", "No Show (Qtd)", "No Show (Vlr)", "Sem Check-in (Qtd)", "Sem Check-in (Vlr)", "Assinado (Qtd)", "Assinado (Vlr)", "Direto (Qtd)", "Direto (Vlr)"];
            const detailSheetData = cdmBreakdown.map(row => [
                row.date, row.listaHospedesQtd, row.listaHospedesValor, row.noShowQtd, row.noShowValor,
                row.semCheckInQtd, row.semCheckInValor, row.cafeAssinadoQtd, row.cafeAssinadoValor,
                row.diretoCartaoQtd, row.diretoCartaoValor
            ]);
            const wsDetail = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailSheetData]);
            XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalhes Diários');

            XLSX.writeFile(wb, `${exportFileName}.xlsx`);
        } else {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.setFontSize(16); doc.text(reportData.data.reportTitle, 14, 20);
            doc.setFontSize(9); doc.text(`Mês de Referência: ${format(selectedMonth, "MMMM yyyy", { locale: ptBR })}`, 14, 25);

            const summaryHead = [['Item', 'Qtd', 'Total']];
            const summaryBody = summaryItems.map(item => [item.label, formatNumber(item.data?.qtd ?? 0), formatCurrency(item.data?.total ?? 0)]);
            const summaryFoot = [['SUBTOTAL GERAL', formatNumber(subtotalGeralComCI.qtd), formatCurrency(subtotalGeralComCI.total)]];
            (doc as any).autoTable({ startY: 30, head: summaryHead, body: summaryBody, foot: summaryFoot, theme: 'grid' });

            const detailHead = [['Data', 'LH Qtd', 'LH Vlr', 'NS Qtd', 'NS Vlr', 'SCI Qtd', 'SCI Vlr', 'Ass. Qtd', 'Ass. Vlr', 'Dir. Qtd', 'Dir. Vlr']];
            const detailBody = cdmBreakdown.map(row => [
                row.date,
                formatNumber(row.listaHospedesQtd), formatCurrency(row.listaHospedesValor),
                formatNumber(row.noShowQtd), formatCurrency(row.noShowValor),
                formatNumber(row.semCheckInQtd), formatCurrency(row.semCheckInValor),
                formatNumber(row.cafeAssinadoQtd), formatCurrency(row.cafeAssinadoValor),
                formatNumber(row.diretoCartaoQtd), formatCurrency(row.diretoCartaoValor),
            ]);
            (doc as any).autoTable({ startY: (doc as any).lastAutoTable.finalY + 10, head: detailHead, body: detailBody, theme: 'grid', headStyles: { fontSize: 7 }, styles: { fontSize: 6 } });

            doc.save(`${exportFileName}.pdf`);
        }
    } else { 
        const { reportTitle, summary, subtotalGeralComCI, subtotalGeralSemCI, dailyBreakdowns } = reportData.data;
        const summaryTableItems = [
            { item: "FATURADOS", dataKey: "faturados" }, { item: "IFOOD", dataKey: "ifood" },
            { item: "RAPPI", dataKey: "rappi" }, { item: "MESA", dataKey: "mesa" },
            { item: "HÓSPEDES", dataKey: "hospedes" }, { item: "RETIRADA", dataKey: "retirada" },
            { item: "ROOM SERVICE", dataKey: "roomService" }, { item: "CONSUMO INTERNO", dataKey: "consumoInterno" },
            { item: "DIVERSOS", dataKey: "generic" },
        ];
        const tabDefinitions = [
            { id: 'faturados', label: 'FATURADOS', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD FAT.', isNum: true}, {key: 'hotel', label: 'R$ HOTEL', isCurrency: true}, {key: 'funcionario', label: 'R$ FUNC.', isCurrency: true}, {key: 'total', label: 'TOTAL FAT.', isCurrency: true}] },
            { id: 'ifood', label: 'IFOOD', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
            { id: 'rappi', label: 'RAPPI', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
            { id: 'mesa', label: 'MESA', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD TOTAIS', isNum: true}, {key: 'dinheiro', label: 'R$ DINHEIRO', isCurrency: true}, {key: 'credito', label: 'R$ CRÉDITO', isCurrency: true}, {key: 'debito', label: 'R$ DÉBITO', isCurrency: true}, {key: 'pix', label: 'R$ PIX', isCurrency: true}, {key: 'ticket', label: 'R$ TICKET', isCurrency: true}, {key: 'total', label: 'TOTAL MESA', isCurrency: true}] },
            { id: 'hospedes', label: 'HÓSPEDES', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD HÓSP.', isNum: true}, {key: 'valor', label: 'R$ PAG.', isCurrency: true}] },
            { id: 'retirada', label: 'RETIRADA', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
            { id: 'ci', label: 'C.I.', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD CI', isNum: true}, {key: 'reajuste', label: 'R$ REAJ.', isCurrency: true}, {key: 'total', label: 'R$ TOTAL CI', isCurrency: true}] },
            { id: 'roomService', label: 'ROOM SERVICE', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
            { id: 'generic', label: 'DIVERSOS', cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
        ];


        if (formatType === 'excel') {
          const wb = XLSX.utils.book_new();
          let summaryData = [
            [`Relatório: ${reportTitle}`],
            [`Mês de Referência: ${format(selectedMonth, "MMMM yyyy", { locale: ptBR })}`],
            [],
            ['Item', 'Qtd', 'Total']
          ];
          summaryTableItems.forEach(item => {
            const data = summary[item.dataKey as keyof typeof summary];
            if (data && (data.qtd > 0 || data.total > 0 || (item.dataKey === 'consumoInterno' && data.reajuste !== 0))) {
              summaryData.push([item.item, formatNumber(data.qtd), formatCurrency(data.total)]);
            }
          });
          summaryData.push([]);
          summaryData.push(['SUBTOTAL GERAL COM CI', formatNumber(subtotalGeralComCI.qtd), formatCurrency(subtotalGeralComCI.total)]);
          summaryData.push(['SUBTOTAL GERAL SEM CI', formatNumber(subtotalGeralSemCI.qtd), formatCurrency(subtotalGeralSemCI.total)]);
          const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
          XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Consolidado');

          tabDefinitions.forEach(tab => {
            const breakdownData = dailyBreakdowns[tab.id];
            if (breakdownData && breakdownData.length > 0) {
              const headers = tab.cols.map(c => c.label);
              const sheetData = breakdownData.map(row => 
                tab.cols.map(col => {
                  const value = row[col.key];
                  if (col.isCurrency) return Number(value) || 0;
                  if (col.isNum) return Number(value) || 0;
                  return value;
                })
              );
              const wsDetail = XLSX.utils.aoa_to_sheet([headers, ...sheetData]);
              XLSX.utils.book_append_sheet(wb, wsDetail, tab.label.substring(0, 30));
            }
          });
          XLSX.writeFile(wb, `${exportFileName}.xlsx`);
        } else if (formatType === 'pdf') {
          const doc = new jsPDF();
          let finalY = 20;

          doc.setFontSize(14);
          doc.text(reportTitle, 14, finalY);
          finalY += 5;
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`Mês de Referência: ${format(selectedMonth, "MMMM yyyy", { locale: ptBR })}`, 14, finalY);
          finalY += 10;
          
          const summaryHead = [['Item', 'Qtd', 'Total']];
          const summaryBody = summaryTableItems
            .map(item => {
              const data = summary[item.dataKey as keyof typeof summary];
              if (data && (data.qtd > 0 || data.total > 0 || (item.dataKey === 'consumoInterno' && data.reajuste !== 0))) {
                return [item.item, formatNumber(data.qtd), formatCurrency(data.total)];
              }
              return null;
            }).filter(Boolean) as (string | number)[][];
          summaryBody.push(['', '', '']);
          summaryBody.push([{content: 'SUBTOTAL GERAL COM CI', styles: {fontStyle: 'bold'}}, {content: formatNumber(subtotalGeralComCI.qtd), styles: {fontStyle: 'bold'}}, {content: formatCurrency(subtotalGeralComCI.total), styles: {fontStyle: 'bold'}}]);
          summaryBody.push([{content: 'SUBTOTAL GERAL SEM CI', styles: {fontStyle: 'bold'}}, {content: formatNumber(subtotalGeralSemCI.qtd), styles: {fontStyle: 'bold'}}, {content: formatCurrency(subtotalGeralSemCI.total), styles: {fontStyle: 'bold'}}]);
          
          (doc as any).autoTable({
            startY: finalY, head: summaryHead, body: summaryBody, theme: 'striped',
            headStyles: { fillColor: [74, 180, 155], fontSize: 7 }, styles: { fontSize: 6 },
            didDrawPage: (data: any) => { finalY = data.cursor.y; }
          });

          tabDefinitions.forEach(tab => {
            const breakdownData = dailyBreakdowns[tab.id];
            if (breakdownData && breakdownData.length > 0) {
              finalY = (doc as any).lastAutoTable.finalY || finalY;
              finalY += 10;
              if (finalY > 250) { doc.addPage(); finalY = 20; }
              doc.setFontSize(10);
              doc.text(`Detalhes - ${tab.label}`, 14, finalY);
              finalY += 7;
              const detailHead = [tab.cols.map(c => c.label)];
              const detailBody = breakdownData.map(row => 
                tab.cols.map(col => {
                  const value = row[col.key] ?? '-';
                  if (col.isCurrency) return formatCurrency(Number(value) || 0);
                  if (col.isNum) return formatNumber(Number(value) || 0);
                  return value;
                })
              );
              (doc as any).autoTable({
                startY: finalY, head: detailHead, body: detailBody, theme: 'grid',
                headStyles: { fontSize: 7, cellPadding: 1 }, styles: { fontSize: 6, cellPadding: 1 },
                didDrawPage: (data: any) => { finalY = data.cursor.y; }
              });
            }
          });

          if (chartRef.current) {
            try {
              const dataUrl = await toPng(chartRef.current, { quality: 0.95, pixelRatio: 2 });
              const chartWidth = doc.internal.pageSize.getWidth() - 28;
              const chartHeight = chartWidth * (9 / 16); // 16:9 aspect ratio

              finalY = (doc as any).lastAutoTable.finalY || finalY;
              if (finalY + 10 + chartHeight > doc.internal.pageSize.getHeight() - 15) {
                doc.addPage();
                finalY = 20;
              } else {
                finalY += 10;
              }
              doc.addImage(dataUrl, 'PNG', 14, finalY, chartWidth, chartHeight);
            } catch (err) {
              console.error('Falha ao capturar imagem do gráfico:', err);
              toast({ title: "Erro na Exportação", description: "Não foi possível incluir o gráfico no PDF.", variant: "destructive" });
            }
          }

          doc.save(`${exportFileName}.pdf`);
        }
    }
  };

  const getReportDescription = () => {
      if (isLoadingEntries) return "Carregando registros...";
      if (!reportData) return "Nenhum registro encontrado para os filtros selecionados.";
      
      switch (filterType) {
        case 'date':
          return `Mostrando dados para ${selectedDate ? format(selectedDate, "dd/MM/yyyy", {locale: ptBR}) : 'data selecionada'}.`;
        case 'month':
        case 'period':
          return `Mostrando dados para ${reportData.data.reportTitle} de ${format(selectedMonth, "MMMM yyyy", {locale: ptBR})}.`;
        case 'range':
            if (selectedRange?.from) {
                const fromDate = format(selectedRange.from, "dd/MM/yyyy", {locale: ptBR});
                const toDate = selectedRange.to ? format(selectedRange.to, "dd/MM/yyyy", {locale: ptBR}) : fromDate;
                return `Mostrando dados de ${fromDate} a ${toDate}.`;
            }
            return "Selecione um intervalo de datas.";
        default:
          return "Selecione os filtros para visualizar os dados.";
      }
  };

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
        isDataAvailable={!!reportData}
        isPeriodFilterDisabled={searchParams.get('filterFocus') === 'item' && !!searchParams.get('month')}
      />

      <Card>
        <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>{getReportDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <div className="text-center py-10 text-muted-foreground"><Filter className="mx-auto h-12 w-12 mb-4 animate-pulse" /><p>Carregando dados...</p></div>
          ) : reportData ? (
            reportData.type === 'general' 
              ? <GeneralReportView data={reportData.data} visiblePeriods={visiblePeriodDefinitions} />
              : <PeriodSpecificReportView data={reportData.data} periodId={selectedPeriod} chartRef={chartRef} />
          ) : (
            <div className="text-center py-10 text-muted-foreground"><Filter className="mx-auto h-12 w-12 mb-4" /><p>Nenhum registro encontrado. Selecione os filtros.</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
