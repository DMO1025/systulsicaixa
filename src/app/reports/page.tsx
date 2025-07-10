

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { DateRange } from 'react-day-picker';

import type { DailyLogEntry, PeriodId, DashboardItemVisibilityConfig, ReportData, GeneralReportViewData, PeriodReportViewData, PeriodData, EventosPeriodData, SalesChannelId, ChartConfig } from '@/lib/types';
import { PERIOD_DEFINITIONS, DASHBOARD_ACCUMULATED_ITEMS_CONFIG, SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/constants';
import { getAllDailyEntries } from '@/services/dailyEntryService';
import { getSetting } from '@/services/settingsService';
import { generateReportData, calculatePeriodGrandTotal, processEntryForTotals } from '@/lib/reportUtils';
import { getSafeNumericValue } from '@/lib/utils';


import ReportToolbar from '@/components/reports/ReportToolbar';
import GeneralReportView from '@/components/reports/GeneralReportView';
import PeriodSpecificReportView from '@/components/reports/PeriodSpecificReportView';
import SingleDayReportView from '@/components/reports/SingleDayReportView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Filter } from "lucide-react";
import ReportLineChart from '@/components/reports/ReportBarChart';
import PeriodReportLineChart from '@/components/reports/PeriodReportBarChart';

export default function ReportsPage() {
  useAuth();
  const searchParams = useSearchParams();
  const { toast } = useToast();

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
  const [datesWithEntries, setDatesWithEntries] = useState<Date[]>([]);
  const hasSetFromParams = useRef(false);

  useEffect(() => {
    async function fetchInitialMetadata() {
      try {
        const [entryDates, visibility] = await Promise.all([
          getAllDailyEntries(undefined, undefined, undefined, 'id'),
          getSetting<DashboardItemVisibilityConfig>('dashboardItemVisibilityConfig')
        ]);
        
        const dates = entryDates
          .map(entry => entry.id ? parseISO(String(entry.id)) : null)
          .filter((date): date is Date => date !== null && isValid(date));
        
        setDatesWithEntries(dates);
        setVisibilityConfig(visibility || {});
      } catch (error) {
        console.error("Falha ao carregar metadados para os relatórios:", error);
        toast({ title: "Erro ao Carregar Dados", description: "Não foi possível carregar os metadados dos registros.", variant: "destructive" });
      }
    }
    fetchInitialMetadata();
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
    if (isLoadingEntries || hasSetFromParams.current) return;

    const filterFocusParam = searchParams.get('filterFocus');
    const periodIdParam = searchParams.get('periodId') as PeriodId | null;
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
    const fetchDataForFilters = async () => {
      setIsLoadingEntries(true);
      setFilteredEntries([]); // Clear previous results

      let startDate: string | undefined;
      let endDate: string | undefined;

      if (filterType === 'date' && selectedDate && isValid(selectedDate)) {
        startDate = format(selectedDate, 'yyyy-MM-dd');
        endDate = startDate;
      } else if (filterType === 'range' && selectedRange?.from && isValid(selectedRange.from)) {
        startDate = format(selectedRange.from, 'yyyy-MM-dd');
        endDate = selectedRange.to && isValid(selectedRange.to) ? format(selectedRange.to, 'yyyy-MM-dd') : startDate;
      } else if (filterType === 'month' || filterType === 'period') {
        if (isValid(selectedMonth)) {
          startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
          endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
        }
      }
      
      if (!startDate || !endDate) {
        setIsLoadingEntries(false);
        return;
      }

      try {
        const entries = await getAllDailyEntries(startDate, endDate) as DailyLogEntry[];
        setFilteredEntries(entries);
      } catch (error) {
        console.error("Falha ao carregar dados para os relatórios:", error);
        toast({ title: "Erro ao Carregar Dados", description: "Não foi possível carregar os registros para os filtros selecionados.", variant: "destructive" });
      } finally {
        setIsLoadingEntries(false);
      }
    };

    fetchDataForFilters();
    
  }, [filterType, selectedDate, selectedMonth, selectedRange, toast]);

  const reportData = useMemo((): ReportData | null => {
    const periodForReport = (filterType === 'range' || filterType === 'month') ? 'all' : selectedPeriod;
    if (filterType === 'date') return null; // Let the dedicated component handle its own data
    return generateReportData(filteredEntries, periodForReport);
  }, [filteredEntries, selectedPeriod, filterType]);

  const { periodChartData, periodChartConfig, hasPeriodChartData } = useMemo(() => {
    if (!reportData || reportData.type !== 'period') {
        return { periodChartData: [], periodChartConfig: {}, hasPeriodChartData: false };
    }

    const { data } = reportData;
    const dataForChart: Record<string, Record<string, any>> = {};
    
    const allTabInfo = [
        { id: 'faturados', label: 'FATURADOS' }, { id: 'ifood', label: 'IFOOD' }, { id: 'rappi', label: 'RAPPI' },
        { id: 'mesa', label: 'MESA' }, { id: 'hospedes', label: 'HÓSPEDES' }, { id: 'retirada', label: 'RETIRADA' },
        { id: 'ci', label: 'C.I.' }, { id: 'roomService', label: 'ROOM SERVICE' }, { id: 'generic', label: 'DIVERSOS' },
        { id: 'cdmHospedes', label: 'HÓSPEDES (CAFÉ)' }, { id: 'cdmAvulsos', label: 'AVULSOS (CAFÉ)' },
        { id: 'madrugadaPagDireto', label: 'PAG. DIRETO' }, { id: 'madrugadaValorServico', label: 'VALOR SERVIÇO' },
    ];
    
    const availableCategories = allTabInfo.filter(tab => 
        data.dailyBreakdowns[tab.id] && data.dailyBreakdowns[tab.id].length > 0
    );

    availableCategories.forEach(tab => {
        const categoryId = tab.id;
        const categoryData = data.dailyBreakdowns[categoryId];
        
        categoryData.forEach(dailyItem => {
            const date = dailyItem.date;
            if (!dataForChart[date]) {
                dataForChart[date] = { date };
            }
            dataForChart[date][categoryId] = dailyItem.total ?? dailyItem.valor ?? 0;
        });
    });
    
    const finalChartData = Object.values(dataForChart).sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    const dynamicChartConfig: ChartConfig = {};
    const colors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "destructive", "primary", "secondary"];
    let colorIndex = 0;
    
    availableCategories.forEach(tab => {
        dynamicChartConfig[tab.id] = {
            label: tab.label,
            color: `hsl(var(--${colors[colorIndex % colors.length]}))`,
        };
        colorIndex++;
    });

    return {
        periodChartData: finalChartData,
        periodChartConfig: dynamicChartConfig,
        hasPeriodChartData: finalChartData.length > 0
    };
}, [reportData]);

  const getColumnWidths = (data: any[][]): { wch: number }[] => {
    const widths: { wch: number }[] = [];
    if (!data || data.length === 0) return widths;

    const maxLengths: number[] = [];
    data.forEach(row => {
        (row as any[]).forEach((cell, i) => {
            const length = cell ? String(cell).length : 0;
            if (!maxLengths[i] || length > maxLengths[i]) {
                maxLengths[i] = length;
            }
        });
    });
    return maxLengths.map(len => ({ wch: Math.max(12, len + 2) }));
  };

  const handleExport = async (formatType: 'pdf' | 'excel') => {
    const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const formatNumber = (value: number | undefined) => (value || 0).toLocaleString('pt-BR');
    
    const formatLabelForPdf = (label: string): string => {
        const parentheticalMatch = label.match(/^(.*?)\s*\((.*)\)\s*$/);
        if (parentheticalMatch) {
            const mainText = parentheticalMatch[1].trim().toUpperCase();
            const subText = parentheticalMatch[2].trim();
            return `${mainText} (${subText})`;
        }
        return label.toUpperCase();
    };

    if (filterType === 'date' && filteredEntries.length > 0 && selectedDate && isValid(selectedDate)) {
        const entry = filteredEntries[0];
        const reportDateStr = format(selectedDate, 'dd/MM/yyyy');
        const exportFileName = `Relatorio_Diario_${format(selectedDate, 'yyyy-MM-dd')}`;
        const { grandTotal, almocoCI, jantarCI, reajusteCI } = processEntryForTotals(entry);
        
        if (formatType === 'excel') {
            const wb = XLSX.utils.book_new();
            let aoa: (string|number)[][] = [];
            aoa.push([`Relatório Diário - ${reportDateStr}`], [], ["Receita Total (com CI)", grandTotal.comCI.valor], ["Receita Total (sem CI)", grandTotal.semCI.valor], ["Total de Itens/Transações", grandTotal.comCI.qtd], []);

            PERIOD_DEFINITIONS.forEach(pDef => {
                const periodData = entry[pDef.id];
                if (!periodData) return;
                const { valor: periodTotal } = calculatePeriodGrandTotal(periodData as any);
                let periodRows: (string|number)[][] = [];

                if (pDef.id === 'eventos') {
                    const evData = periodData as EventosPeriodData;
                    if (evData.items?.length > 0) {
                        periodRows.push(['Evento', 'Serviço', 'Local', 'Qtd', 'Valor']);
                        evData.items.forEach(item => {
                            (item.subEvents || []).forEach(sub => {
                                const serviceLabel = sub.serviceType === 'OUTRO' ? sub.customServiceDescription || 'Outro' : EVENT_SERVICE_TYPE_OPTIONS.find(o => o.value === sub.serviceType)?.label || sub.serviceType;
                                const locationLabel = EVENT_LOCATION_OPTIONS.find(o => o.value === sub.location)?.label || sub.location;
                                periodRows.push([item.eventName || 'Evento Sem Nome', serviceLabel || '-', locationLabel || '-', sub.quantity || 0, sub.totalValue || 0]);
                            });
                        });
                    }
                } else {
                    const pData = periodData as PeriodData;
                    const processChannels = (channels: any, prefix = "") => {
                        Object.entries(channels).forEach(([channelId, values]: [string, any]) => {
                            if (values && (values.qtd || values.vtotal)) {
                                periodRows.push([prefix + (SALES_CHANNELS[channelId as SalesChannelId] || channelId), values.qtd || 0, values.vtotal || 0]);
                            }
                        });
                    };
                    if (periodData && (pData.channels || pData.subTabs)) {
                        periodRows.push(['Item', 'Qtd', 'Valor']);
                    }
                    if (pData.channels) processChannels(pData.channels);
                    if (pData.subTabs) {
                        Object.entries(pData.subTabs).forEach(([subTabKey, subTabData]) => {
                            if (subTabData?.channels && Object.values(subTabData.channels).some(ch => ch?.qtd || ch?.vtotal)) {
                                periodRows.push([subTabKey.toUpperCase()]);
                                processChannels(subTabData.channels, "  ");
                            }
                        });
                    }
                }
                
                const hasObservations = (periodData as any)?.periodObservations?.trim().length > 0;
                if (periodRows.length > 0 || hasObservations) {
                    aoa.push([pDef.label.toUpperCase(), '', periodTotal], ...periodRows);
                    if (hasObservations) aoa.push(['Observações:', (periodData as any).periodObservations]);
                    aoa.push([]);
                }
            });

            if (entry.generalObservations) aoa.push(['Observações Gerais do Dia:', entry.generalObservations]);
            
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            ws['!cols'] = getColumnWidths(aoa);
            XLSX.utils.book_append_sheet(wb, ws, 'Relatório Diário');
            XLSX.writeFile(wb, `${exportFileName}.xlsx`);
        } else { // PDF
            const doc = new jsPDF();
            let y = 15;
            doc.setFontSize(16); doc.text(`Relatório Diário - ${reportDateStr}`, 14, y); y += 10;
            
            const getGroupedDataForPdf = (entry: DailyLogEntry, pDef: typeof PERIOD_DEFINITIONS[number]): { section: string; rows: { label: string; qtd?: number; valor?: number; }[] }[] => {
                const periodData = entry[pDef.id] as PeriodData | undefined;
                if (!periodData?.subTabs) return [];
            
                const sections: { section: string; rows: { label: string; qtd?: number; valor?: number; }[] }[] = [];
                const prefixes = { almocoPrimeiroTurno: 'apt', almocoSegundoTurno: 'ast', jantar: 'jnt' } as const;
                const prefix = prefixes[pDef.id as keyof typeof prefixes];
                if (!prefix) return [];
            
                const addSection = (title: string, dataRows: { label: string; qtd?: number; valor?: number; }[]) => {
                    if (dataRows.length > 0) sections.push({ section: title, rows: dataRows });
                };
            
                addSection("ROOM SERVICE", [{
                    label: `ROOM SERVICE (${prefix.toUpperCase()})`,
                    qtd: getSafeNumericValue(periodData, `subTabs.roomService.channels.${prefix}RoomServiceQtdPedidos.qtd`),
                    valor: getSafeNumericValue(periodData, `subTabs.roomService.channels.${prefix}RoomServicePagDireto.vtotal`) + getSafeNumericValue(periodData, `subTabs.roomService.channels.${prefix}RoomServiceValorServico.vtotal`)
                }]);
            
                addSection("HÓSPEDES", [{
                    label: `HÓSPEDES (${prefix.toUpperCase()})`,
                    qtd: getSafeNumericValue(periodData, `subTabs.hospedes.channels.${prefix}HospedesQtdHospedes.qtd`),
                    valor: getSafeNumericValue(periodData, `subTabs.hospedes.channels.${prefix}HospedesPagamentoHospedes.vtotal`)
                }]);

                const mesaRows = [
                    { label: `TOTAIS CLIENTE MESA (${prefix.toUpperCase()})`, qtd: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaTotaisQtd.qtd`) },
                    { label: `DINHEIRO (${prefix.toUpperCase()})`, valor: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaDinheiro.vtotal`) },
                    { label: `CRÉDITO (${prefix.toUpperCase()})`, valor: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaCredito.vtotal`) },
                    { label: `DÉBITO (${prefix.toUpperCase()})`, valor: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaDebito.vtotal`) },
                    { label: `PIX (${prefix.toUpperCase()})`, valor: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaPix.vtotal`) },
                    { label: `TICKET REFEIÇÃO (${prefix.toUpperCase()})`, valor: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaTicketRefeicao.vtotal`) },
                ];
                addSection("CLIENTE MESA", mesaRows);

                const deliveryRows = [
                    { label: `IFOOD (${prefix.toUpperCase()})`, qtd: getSafeNumericValue(periodData, `subTabs.delivery.channels.${prefix}DeliveryIfoodQtd.qtd`), valor: getSafeNumericValue(periodData, `subTabs.delivery.channels.${prefix}DeliveryIfoodValor.vtotal`) },
                    { label: `RAPPI (${prefix.toUpperCase()})`, qtd: getSafeNumericValue(periodData, `subTabs.delivery.channels.${prefix}DeliveryRappiQtd.qtd`), valor: getSafeNumericValue(periodData, `subTabs.delivery.channels.${prefix}DeliveryRappiValor.vtotal`) },
                    { label: `RETIRADA (${prefix.toUpperCase()})`, qtd: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaRetiradaQtd.qtd`), valor: getSafeNumericValue(periodData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaRetiradaValor.vtotal`) },
                ];
                addSection("DELIVERY & RETIRADA", deliveryRows);

                const faturadoRows = [
                    { label: 'FATURADOS (QTD)', qtd: getSafeNumericValue(periodData, `subTabs.ciEFaturados.channels.${prefix}CiEFaturadosFaturadosQtd.qtd`)},
                    { label: 'VALOR HOTEL (FATURADO)', valor: getSafeNumericValue(periodData, `subTabs.ciEFaturados.channels.${prefix}CiEFaturadosValorHotel.vtotal`)},
                    { label: 'VALOR FUNCIONÁRIO (FATURADO)', valor: getSafeNumericValue(periodData, `subTabs.ciEFaturados.channels.${prefix}CiEFaturadosValorFuncionario.vtotal`)}
                ];
                addSection("FATURADO", faturadoRows);

                const ciRows = [
                    { label: '* CONSUMO INTERNO - CI (QTD)', qtd: getSafeNumericValue(periodData, `subTabs.ciEFaturados.channels.${prefix}CiEFaturadosConsumoInternoQtd.qtd`) },
                    { label: 'REAJUSTE DE C.I', valor: getSafeNumericValue(periodData, `subTabs.ciEFaturados.channels.${prefix}CiEFaturadosReajusteCI.vtotal`) },
                    { label: 'TOTAL C.I', valor: getSafeNumericValue(periodData, `subTabs.ciEFaturados.channels.${prefix}CiEFaturadosTotalCI.vtotal`) }
                ];
                addSection("CONSUMO INTERNO", ciRows);

                return sections;
            };

            PERIOD_DEFINITIONS.forEach(pDef => {
                const periodData = entry[pDef.id];
                if (!periodData) return;
                const { valor: periodTotal } = calculatePeriodGrandTotal(periodData as any);
                const hasObservations = (periodData as any)?.periodObservations?.trim().length > 0;
                let hasContent = periodTotal > 0 || hasObservations;
                if (!hasContent && pDef.id === 'eventos') hasContent = (periodData as EventosPeriodData).items?.length > 0;
                if (!hasContent) return;

                if (y > 250) { doc.addPage(); y = 20; }
                doc.setFontSize(12); doc.text(`${pDef.label.toUpperCase()} - Total: ${formatCurrency(periodTotal)}`, 14, y); y += 7;

                if (pDef.id === 'eventos') {
                    const evData = periodData as EventosPeriodData;
                    if (evData.items?.length > 0) {
                        evData.items.forEach(item => {
                            if (y > 250) { doc.addPage(); y = 20; }
                            doc.setFontSize(10); doc.text(item.eventName || 'Evento Sem Nome', 14, y); y+= 5;
                            (doc as any).autoTable({
                                startY: y, head: [['Serviço', 'Local', 'Qtd', 'Valor']],
                                body: (item.subEvents || []).map(sub => [EVENT_SERVICE_TYPE_OPTIONS.find(o=>o.value===sub.serviceType)?.label||sub.serviceType, EVENT_LOCATION_OPTIONS.find(o=>o.value===sub.location)?.label||sub.location, formatNumber(sub.quantity), formatCurrency(sub.totalValue)]),
                                theme: 'grid', styles: { fontSize: 8 }, headStyles: { fontSize: 9 }
                            });
                            y = (doc as any).lastAutoTable.finalY + 5;
                        });
                    }
                } else if ((periodData as PeriodData).subTabs) {
                    const groupedData = getGroupedDataForPdf(entry, pDef);
                    if (groupedData.length > 0) {
                        const body: any[][] = [];
                        groupedData.forEach(section => {
                            body.push([{ content: section.section, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
                            section.rows.forEach(row => {
                                if (row.qtd !== undefined || row.valor !== undefined) {
                                    body.push([formatLabelForPdf(row.label), row.qtd !== undefined ? formatNumber(row.qtd) : '-', row.valor !== undefined ? formatCurrency(row.valor) : '-']);
                                }
                            });
                        });
                        (doc as any).autoTable({ startY: y, head: [['Item', 'Qtd', 'Valor']], body, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' }, headStyles: { fontSize: 9 }});
                        y = (doc as any).lastAutoTable.finalY + 5;
                    }
                } else if ((periodData as PeriodData).channels) {
                     const body = Object.entries((periodData as PeriodData).channels!).map(([id, val]) => [formatLabelForPdf(SALES_CHANNELS[id as SalesChannelId] || id), formatNumber(val?.qtd), formatCurrency(val?.vtotal)]);
                     if (body.length > 0) {
                        (doc as any).autoTable({ startY: y, head: [['Item', 'Qtd', 'Valor']], body, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fontSize: 9 }});
                        y = (doc as any).lastAutoTable.finalY + 5;
                     }
                }

                if(hasObservations){
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.setFontSize(10); doc.text('Observações:', 14, y); y += 5;
                    doc.setFontSize(9);
                    const splitText = doc.splitTextToSize((periodData as any).periodObservations, 180);
                    doc.text(splitText, 14, y); y += splitText.length * 4 + 5;
                }
            });
            if(entry.generalObservations) {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFontSize(12); doc.text('Observações Gerais do Dia', 14, y); y += 7;
                doc.setFontSize(9); doc.text(doc.splitTextToSize(entry.generalObservations, 180), 14, y);
            }
            doc.save(`${exportFileName}.pdf`);
        }
        return;
    }

    if (!reportData) {
      toast({ title: "Nenhum dado para exportar", description: "Filtre por um período com dados antes de exportar.", variant: "destructive" });
      return;
    }

    const exportFileName = `Relatorio_${reportData.data.reportTitle.replace(/[\s()]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;
    
    if (reportData.type === 'general') {
        const { dailyBreakdowns, summary } = reportData.data;
        const periodsToExport = visiblePeriodDefinitions;

        if (formatType === 'excel') {
            const wb = XLSX.utils.book_new();
            const headers: string[] = ["Data"];
            periodsToExport.forEach(p => {
                headers.push(`${p.label} (Qtd)`);
                headers.push(`${p.label} (Valor)`);
            });
            headers.push("Total Qtd", "Total COM C.I", "Reajuste C.I", "Líquido Qtd", "Total SEM C.I");

            const dataRows = dailyBreakdowns.map(row => {
                const rowData: (string|number)[] = [row.date];
                periodsToExport.forEach(pDef => {
                    rowData.push(row.periodTotals[pDef.id]?.qtd ?? 0);
                    rowData.push(row.periodTotals[pDef.id]?.valor ?? 0);
                });
                rowData.push(row.totalQtd, row.totalComCI, row.totalReajusteCI, row.totalQtd - row.totalCIQtd, row.totalSemCI);
                return rowData;
            });

            const footer: (string|number)[] = ["TOTAL"];
             periodsToExport.forEach(pDef => {
                footer.push(summary.periodTotals[pDef.id]?.qtd ?? 0);
                footer.push(summary.periodTotals[pDef.id]?.valor ?? 0);
            });
            footer.push(summary.grandTotalQtd, summary.grandTotalComCI, summary.grandTotalReajusteCI, summary.grandTotalQtd - summary.grandTotalCIQtd, summary.grandTotalSemCI);
            
            const dataForSheet = [headers, ...dataRows, footer];
            const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
            ws['!cols'] = getColumnWidths(dataForSheet);

            XLSX.utils.book_append_sheet(wb, ws, 'Geral por Período');
            XLSX.writeFile(wb, `${exportFileName}.xlsx`);
        } else {
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.setFontSize(16); doc.text(reportData.data.reportTitle, 14, 20);
            
            (doc as any).autoTable({
                startY: 25,
                head: [['', 'TOTAL', 'TOTAL COM CI', 'TOTAL SEM CI']],
                body: [['', formatCurrency(summary.grandTotalComCI), formatCurrency(summary.grandTotalSemCI)]],
                theme: 'striped'
            });

            let finalY = (doc as any).lastAutoTable.finalY + 10;


            const tableHeaders: string[] = ["Data"];
            periodsToExport.forEach(p => tableHeaders.push(`${p.label} (Qtd/Valor)`));
            tableHeaders.push("Total (Qtd/Valor)", "Reajuste C.I", "Líquido (Qtd/Valor)");

            const tableBody = dailyBreakdowns.map(row => {
                const rowData: (string|number)[] = [row.date];
                periodsToExport.forEach(pDef => rowData.push(`${formatNumber(row.periodTotals[pDef.id]?.qtd)} / ${formatCurrency(row.periodTotals[pDef.id]?.valor)}`));
                rowData.push(`${formatNumber(row.totalQtd)} / ${formatCurrency(row.totalComCI)}`);
                rowData.push(`- / ${formatCurrency(row.totalReajusteCI)}`);
                rowData.push(`${formatNumber(row.totalQtd - row.totalCIQtd)} / ${formatCurrency(row.totalSemCI)}`);
                return rowData;
            });
            const tableFooter: (string|number)[] = ["TOTAL"];
            periodsToExport.forEach(pDef => tableFooter.push(`${formatNumber(summary.periodTotals[pDef.id]?.qtd)} / ${formatCurrency(summary.periodTotals[pDef.id]?.valor)}`));
            tableFooter.push(`${formatNumber(summary.grandTotalQtd)} / ${formatCurrency(summary.grandTotalComCI)}`);
            tableFooter.push(`- / ${formatCurrency(summary.grandTotalReajusteCI)}`);
            tableFooter.push(`${formatNumber(summary.grandTotalQtd - summary.grandTotalCIQtd)} / ${formatCurrency(summary.grandTotalSemCI)}`);
            
            (doc as any).autoTable({ startY: finalY, head: [tableHeaders], body: tableBody, foot: [tableFooter], theme: 'grid', headStyles: { fontSize: 6, cellPadding: 1 }, styles: { fontSize: 6, cellPadding: 1 }});
            finalY = (doc as any).lastAutoTable.finalY + 10;
            
            doc.save(`${exportFileName}.pdf`);
        }
    } else { // Period-specific reports
        const { reportTitle, summary, subtotalGeralComCI, subtotalGeralSemCI, dailyBreakdowns } = reportData.data;
        const summaryItems = [
            { item: "FATURADOS", dataKey: "faturados" }, { item: "IFOOD", dataKey: "ifood" },
            { item: "RAPPI", dataKey: "rappi" }, { item: "MESA", dataKey: "mesa" },
            { item: "HÓSPEDES", dataKey: "hospedes" }, { item: "RETIRADA", dataKey: "retirada" },
            { item: "ROOM SERVICE", dataKey: "roomService" }, { item: "CONSUMO INTERNO", dataKey: "consumoInterno" },
            { item: "DIVERSOS", dataKey: "generic" },
        ];
        const cdmSummaryItems = [ { item: "HÓSPEDES (CAFÉ)", dataKey: "cdmHospedes" }, { item: "AVULSOS (CAFÉ)", dataKey: "cdmAvulsos" } ];
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
            { id: 'cdmHospedes', label: 'HÓSPEDES (CAFÉ)', cols: [ {key: 'date', label: 'DATA'}, {key: 'listaQtd', label: 'LISTA QTD', isNum: true}, {key: 'listaValor', label: 'LISTA VLR', isCurrency: true}, {key: 'noShowQtd', label: 'NO-SHOW QTD', isNum: true}, {key: 'noShowValor', label: 'NO-SHOW VLR', isCurrency: true}, {key: 'semCheckInQtd', label: 'S/ CHECK-IN QTD', isNum: true}, {key: 'semCheckInValor', label: 'S/ CHECK-IN VLR', isCurrency: true}, {key: 'total', label: 'TOTAL', isCurrency: true}] },
            { id: 'cdmAvulsos', label: 'AVULSOS (CAFÉ)', cols: [ {key: 'date', label: 'DATA'}, {key: 'assinadoQtd', label: 'ASSINADO QTD', isNum: true}, {key: 'assinadoValor', label: 'ASSINADO VLR', isCurrency: true}, {key: 'diretoQtd', label: 'DIRETO QTD', isNum: true}, {key: 'diretoValor', label: 'DIRETO VLR', isCurrency: true}, {key: 'total', label: 'TOTAL', isCurrency: true}] },
        ];
        
        if (formatType === 'excel') {
            const wb = XLSX.utils.book_new();
            const itemsToSummarize = selectedPeriod === 'cafeDaManha' ? cdmSummaryItems : summaryItems;
            let summaryData: any[][] = [[`Relatório: ${reportTitle}`], [`Mês de Referência: ${format(selectedMonth, "MMMM yyyy", { locale: ptBR })}`], [], ['Item', 'Qtd', 'Total']];
            itemsToSummarize.forEach(item => {
                const data = summary[item.dataKey as keyof typeof summary];
                if (data && (data.qtd > 0 || data.total > 0 || (item.dataKey === 'consumoInterno' && data.reajuste !== 0))) {
                  summaryData.push([item.item, data.qtd, data.total]);
                }
            });
            summaryData.push([], ['SUBTOTAL GERAL COM CI', subtotalGeralComCI.qtd, subtotalGeralComCI.total], ['SUBTOTAL GERAL SEM CI', subtotalGeralSemCI.qtd, subtotalGeralSemCI.total]);
            
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            summaryWs['!cols'] = getColumnWidths(summaryData);
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo Consolidado');

            tabDefinitions.forEach(tab => {
                const breakdownData = dailyBreakdowns[tab.id];
                if (breakdownData?.length > 0) {
                  const headers = tab.cols.map(c => c.label);
                  const sheetData = breakdownData.map(row => tab.cols.map(col => row[col.key]));
                  const dataForSheet = [headers, ...sheetData];
                  const ws = XLSX.utils.aoa_to_sheet(dataForSheet);
                  ws['!cols'] = getColumnWidths(dataForSheet);
                  XLSX.utils.book_append_sheet(wb, ws, tab.label.substring(0, 30));
                }
            });
            XLSX.writeFile(wb, `${exportFileName}.xlsx`);
        } else {
            const doc = new jsPDF();
            let finalY = 20;
            doc.setFontSize(14); doc.text(reportTitle, 14, finalY); finalY += 5;
            doc.setFontSize(9); doc.setTextColor(100); doc.text(`Mês de Referência: ${format(selectedMonth, "MMMM yyyy", { locale: ptBR })}`, 14, finalY); finalY += 10;
            
            const itemsToSummarize = selectedPeriod === 'cafeDaManha' ? cdmSummaryItems : summaryItems;
            const summaryBody = itemsToSummarize.map(item => {
                const data = summary[item.dataKey as keyof typeof summary];
                if (data && (data.qtd > 0 || data.total > 0 || (item.dataKey === 'consumoInterno' && (data.reajuste ?? 0) !== 0 ))) {
                  return [item.item, formatNumber(data.qtd), formatCurrency(data.total)];
                } return null;
            }).filter(Boolean) as (string|number)[][];
            
            (doc as any).autoTable({ startY: finalY, head: [['Item', 'Qtd', 'Total']], body: summaryBody, foot: [['SUBTOTAL COM CI', formatNumber(subtotalGeralComCI.qtd), formatCurrency(subtotalGeralComCI.total)], ['SUBTOTAL SEM CI', formatNumber(subtotalGeralSemCI.qtd), formatCurrency(subtotalGeralSemCI.total)]], theme: 'striped' });
            finalY = (doc as any).lastAutoTable.finalY + 10;

            tabDefinitions.forEach(tab => {
              const breakdownData = dailyBreakdowns[tab.id];
              if (breakdownData?.length > 0) {
                if (finalY > 250) { doc.addPage(); finalY = 20; }
                doc.setFontSize(10); doc.text(`Detalhes - ${tab.label}`, 14, finalY); finalY += 7;
                (doc as any).autoTable({
                    startY: finalY, head: [tab.cols.map(c => c.label)],
                    body: breakdownData.map(row => tab.cols.map(col => {
                        const value = row[col.key] ?? '-';
                        return col.isCurrency ? formatCurrency(Number(value) || 0) : col.isNum ? formatNumber(Number(value) || 0) : value;
                    })),
                    theme: 'grid', headStyles: { fontSize: 7, cellPadding: 1 }, styles: { fontSize: 6, cellPadding: 1 }
                });
                finalY = (doc as any).lastAutoTable.finalY + 10;
              }
            });

            doc.save(`${exportFileName}.pdf`);
        }
    }
  };

  const getReportDescription = () => {
      if (isLoadingEntries) return "Carregando registros...";
      
      switch (filterType) {
        case 'date':
          return `Mostrando o resumo detalhado para ${selectedDate ? format(selectedDate, "dd/MM/yyyy", {locale: ptBR}) : 'data selecionada'}.`;
        case 'month':
        case 'period':
          if (!reportData) return "Nenhum registro encontrado para os filtros selecionados.";
          const reportTitleForPeriod = reportData.data.reportTitle === 'GERAL (MÊS)' ? 'Todos os Períodos' : reportData.data.reportTitle;
          return `Mostrando dados para ${reportTitleForPeriod} de ${format(selectedMonth, "MMMM yyyy", {locale: ptBR})}.`;
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
        isDataAvailable={!!reportData || (filterType === 'date' && filteredEntries.length > 0)}
        isPeriodFilterDisabled={hasSetFromParams.current}
        datesWithEntries={datesWithEntries}
      />

      {!isLoadingEntries && filterType !== 'date' && reportData && (
        reportData.type === 'general' ? (
          <ReportLineChart 
            data={reportData.data.dailyBreakdowns} 
            title="Evolução Diária no Período"
            description="Visualização dos valores diários que compõem o total do período filtrado."
          />
        ) : reportData.type === 'period' && hasPeriodChartData ? (
          <PeriodReportLineChart 
            data={periodChartData} 
            config={periodChartConfig}
            title={`Evolução Diária - ${reportData.data.reportTitle}`} 
          />
        ) : null
      )}

      <Card>
        <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>{getReportDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <div className="text-center py-10 text-muted-foreground"><Filter className="mx-auto h-12 w-12 mb-4 animate-pulse" /><p>Carregando dados...</p></div>
          ) : filterType === 'date' && filteredEntries.length > 0 ? (
            <SingleDayReportView entry={filteredEntries[0]} />
          ) : reportData ? (
            reportData.type === 'general' 
              ? <GeneralReportView data={reportData.data} visiblePeriods={visiblePeriodDefinitions} />
              : <PeriodSpecificReportView data={reportData.data} periodId={selectedPeriod} />
          ) : (
            <div className="text-center py-10 text-muted-foreground"><Filter className="mx-auto h-12 w-12 mb-4" /><p>Nenhum registro encontrado. Selecione os filtros.</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
