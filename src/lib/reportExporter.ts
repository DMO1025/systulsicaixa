

"use client";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, parseISO, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { DailyLogEntry, ReportData, FilterType, PeriodDefinition, GeneralReportViewData, PeriodReportViewData, DailyCategoryDataItem, FaturadoItem, ConsumoInternoItem, PeriodData, CafeManhaNoShowItem, ControleCafeItem, ChannelUnitPricesConfig } from '@/lib/types';
import { PERIOD_DEFINITIONS } from './config/periods';
import { EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from './config/forms';
import { TAB_DEFINITIONS } from '@/components/reports/tabDefinitions';
import { extractPersonTransactions } from './reportUtils';
import { getSetting } from '@/services/settingsService';


interface ExportParams {
    formatType: 'pdf' | 'excel';
    filterType: FilterType;
    entries: DailyLogEntry[];
    reportData: ReportData | null;
    date?: Date;
    month?: Date;
    range?: { from?: Date; to?: Date };
    visiblePeriods: PeriodDefinition[];
    selectedClient?: string;
    consumptionType?: string;
}

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

export const getConsumptionTypeLabel = (consumptionType?: string): string | null => {
    if (!consumptionType) return null;
    switch (consumptionType) {
        case 'all': return 'Todos';
        case 'ci': return 'Consumo Interno';
        case 'faturado-all': return 'Faturado (Todos)';
        case 'faturado-hotel': return 'Faturado (Hotel)';
        case 'faturado-funcionario': return 'Faturado (Funcionário)';
        default: return null;
    }
}

const getFilename = (parts: (string | undefined | null)[], ext: string): string => {
    return parts
        .filter(Boolean)
        .join('_')
        .replace(/[\s/\\?%*:|"<>]/g, '_') + `.${ext}`;
};


const addHeaderAndFooter = (doc: jsPDF, title: string, dateRange: string) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Header
        doc.setFontSize(14);
        doc.text("Empresa de Exemplo LTDA", 40, 30);
        doc.setFontSize(10);
        doc.text(title, 40, 45);
        doc.setFontSize(9);
        doc.text(dateRange, 40, 58);


        // Footer
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 20);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);
    }
};

const getControleCafeItems = (entries: DailyLogEntry[], type: 'no-show' | 'controle'): (CafeManhaNoShowItem & { entryDate: string })[] | (Partial<ControleCafeItem> & { entryDate: string })[] => {
    if (type === 'no-show') {
      const items: (CafeManhaNoShowItem & { entryDate: string })[] = [];
      entries.forEach(entry => {
          const noShowData = entry.cafeManhaNoShow as any;
          if (noShowData?.items && Array.isArray(noShowData.items)) {
              noShowData.items.forEach((item: CafeManhaNoShowItem) => {
                  items.push({
                      ...item,
                      entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                  });
              });
          }
      });
      return items.sort((a, b) => a.entryDate.localeCompare(b.entryDate) || (a.horario || '').localeCompare(b.horario || ''));
    } else {
        const items: (Partial<ControleCafeItem> & { entryDate: string })[] = [];
        entries.forEach(entry => {
            const controleData = entry.controleCafeDaManha as any;
            if (controleData) {
                items.push({
                    ...controleData,
                    entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                });
            }
        });
        return items.sort((a,b) => a.entryDate.localeCompare(b.entryDate));
    }
};


// --- PDF Generation ---

const generateControleCafePdf = async (doc: jsPDF, entries: DailyLogEntry[], type: 'no-show' | 'controle', dateRangeStr: string) => {
    const unitPrices = await getSetting<ChannelUnitPricesConfig>('channelUnitPricesConfig');
    const cafePrice = unitPrices?.cdmListaHospedes || 0;

    const processDezena = (dezenaEntries: DailyLogEntry[], dezenaLabel: string, isFirstPage: boolean) => {
        if (dezenaEntries.length === 0) return;

        if (!isFirstPage) {
            doc.addPage();
        }

        const title = type === 'no-show' 
            ? `Relatório de Controle - No-Show Café da Manhã (${dezenaLabel})`
            : `Relatório de Controle - Café da Manhã (${dezenaLabel})`;

        addHeaderAndFooter(doc, title, dateRangeStr);

        if (type === 'no-show') {
            const allItems = getControleCafeItems(dezenaEntries, 'no-show') as (CafeManhaNoShowItem & { entryDate: string })[];
            const head = [['Data', 'Horário', 'Hóspede', 'UH', 'Reserva', 'Valor', 'Observação']];
            const body = allItems.map(item => [
                item.entryDate,
                item.horario || '-',
                item.hospede || '-',
                item.uh || '-',
                item.reserva || '-',
                formatCurrency(item.valor),
                item.observation || '-',
            ]);
            const totalValor = allItems.reduce((sum, item) => sum + (item.valor || 0), 0);
            const foot = [[{ content: `TOTAL FATURADO (${dezenaLabel}): ${formatCurrency(totalValor)}`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } }]];
            autoTable(doc, { head, body, foot, startY: 70, theme: 'striped', showFoot: 'lastPage' });
        } else {
            const allItems = getControleCafeItems(dezenaEntries, 'controle') as (Partial<ControleCafeItem> & { entryDate: string })[];
            const head = [['Data', 'Adultos', 'Criança 01', 'Criança 02', 'Cont. Manual', 'Sem Check-in', 'TOTAL DIA']];
            
            const body = allItems.map(item => {
                const totalDia = (item.adultoQtd || 0) + (item.crianca01Qtd || 0) + (item.crianca02Qtd || 0) + (item.contagemManual || 0) + (item.semCheckIn || 0);
                return [
                    item.entryDate,
                    formatQty(item.adultoQtd),
                    formatQty(item.crianca01Qtd),
                    formatQty(item.crianca02Qtd),
                    formatQty(item.contagemManual),
                    formatQty(item.semCheckIn),
                    formatQty(totalDia)
                ];
            });

            const totals = allItems.reduce((acc, item) => {
                acc.adultoQtd += item.adultoQtd || 0;
                acc.crianca01Qtd += item.crianca01Qtd || 0;
                acc.crianca02Qtd += item.crianca02Qtd || 0;
                acc.contagemManual += item.contagemManual || 0;
                acc.semCheckIn += item.semCheckIn || 0;
                return acc;
            }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0 });

            const totalPessoasDezena = totals.adultoQtd + totals.crianca01Qtd + totals.crianca02Qtd + totals.contagemManual + totals.semCheckIn;
            const totalValorDezena = totalPessoasDezena * cafePrice;
            
            const fiscalSummaryBody = [
                ['Total Adultos:', formatQty(totals.adultoQtd)],
                ['Total Crianças:', formatQty(totals.crianca01Qtd + totals.crianca02Qtd)],
                ['Total Contagem Manual:', formatQty(totals.contagemManual)],
                ['Total Sem Check-in:', formatQty(totals.semCheckIn)],
            ];

            const foot = [
                ['TOTAIS DA DEZENA', formatQty(totals.adultoQtd), formatQty(totals.crianca01Qtd), formatQty(totals.crianca02Qtd), formatQty(totals.contagemManual), formatQty(totals.semCheckIn), formatQty(totalPessoasDezena)],
            ];
            autoTable(doc, { head, body, foot, startY: 70, theme: 'striped', showFoot: 'lastPage' });

            const finalY = (doc as any).lastAutoTable.finalY;

            autoTable(doc, {
                head: [['RESUMO FISCAL', `(${dezenaLabel})`]],
                body: fiscalSummaryBody,
                startY: finalY + 15,
                theme: 'plain',
                headStyles: { fontStyle: 'bold', fontSize: 11 },
                bodyStyles: { fontSize: 9 },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`VALOR TOTAL (ESTIMADO - ${dezenaLabel}):`, (doc as any).lastAutoTable.finalY + 20, 40);
            doc.text(formatCurrency(totalValorDezena), (doc as any).lastAutoTable.finalY + 20, 200);

        }
    };
    
    const primeiraDezenaEntries = entries.filter(e => getDate(parseISO(String(e.id))) <= 10);
    const segundaDezenaEntries = entries.filter(e => {
        const day = getDate(parseISO(String(e.id)));
        return day > 10 && day <= 20;
    });
    const terceiraDezenaEntries = entries.filter(e => getDate(parseISO(String(e.id))) > 20);
    
    processDezena(primeiraDezenaEntries, "1ª Dezena", true);
    processDezena(segundaDezenaEntries, "2ª Dezena", primeiraDezenaEntries.length === 0);
    processDezena(terceiraDezenaEntries, "3ª Dezena", primeiraDezenaEntries.length === 0 && segundaDezenaEntries.length === 0);
};

const generateGeneralReportPdf = (doc: jsPDF, data: GeneralReportViewData, visiblePeriods: PeriodDefinition[]) => {
    const reportablePeriods = visiblePeriods.filter(p => p.type === 'entry' && p.id !== 'madrugada');
    const roomServiceDef = { id: 'roomService', label: 'Room Service' };
    
    const head = [
        ['Data', roomServiceDef.label, ...reportablePeriods.map(p => p.label), 'TOTAL GERAL', 'REAJUSTE C.I', 'TOTAL LÍQUIDO']
    ];
    const body = data.dailyBreakdowns.map(row => [
        row.date,
        formatCurrency(row.periodTotals['roomService']?.valor),
        ...reportablePeriods.map(p => formatCurrency(row.periodTotals[p.id]?.valor)),
        formatCurrency(row.totalComCI),
        formatCurrency(row.totalReajusteCI),
        formatCurrency(row.totalSemCI)
    ]);
    const foot = [[
        'TOTAL',
        formatCurrency(data.summary.periodTotals['roomService']?.valor),
        ...reportablePeriods.map(p => formatCurrency(data.summary.periodTotals[p.id]?.valor)),
        formatCurrency(data.summary.grandTotalComCI),
        formatCurrency(data.summary.grandTotalReajusteCI),
        formatCurrency(data.summary.grandTotalSemCI)
    ]];

    autoTable(doc, {
        head: head,
        body: body,
        foot: foot,
        startY: 70,
        theme: 'striped',
        showHead: 'firstPage',
        showFoot: 'lastPage',
        headStyles: { fillColor: [50, 50, 50] },
        footStyles: { fillColor: [75, 75, 75] },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 45 },
        },
    });
};

const generatePeriodReportPdf = (doc: jsPDF, data: PeriodReportViewData) => {
    let yPos = 70;
    
    const availableCategories = Object.keys(data.dailyBreakdowns).filter(
      key => data.dailyBreakdowns[key] && data.dailyBreakdowns[key].length > 0
    );

    availableCategories.forEach(categoryKey => {
        const items = data.dailyBreakdowns[categoryKey];
        if (items.length === 0) return;
        
        const tabDef = TAB_DEFINITIONS.find(t => t.id === categoryKey);
        if (!tabDef) return;

        doc.setFontSize(12);
        doc.text(tabDef.label.toUpperCase(), 40, yPos);
        yPos += 15;

        const headers = tabDef.cols.map(c => c.label);
        const body = items.map(item => tabDef.cols.map(c => {
            const value = (item as any)[c.key];
            if (c.isCurrency) return formatCurrency(value);
            if (c.isNum) return formatQty(value);
            return value;
        }));
        
        const summaryRow = data.summary[categoryKey];
        const foot = summaryRow ? [tabDef.cols.map((col, index) => {
            if (index === 0) return 'TOTAL';
            if (col.key === 'qtd' || col.key === 'quantity') return formatQty(summaryRow.qtd);
            if (col.key === 'valor' || col.key === 'totalValue' || col.key === 'total') return formatCurrency(summaryRow.total);
            return '';
        })] : undefined;


        autoTable(doc, {
            head: [headers],
            body: body,
            foot: foot,
            startY: yPos,
            theme: 'grid',
            showHead: 'firstPage',
            showFoot: foot ? 'lastPage' : 'never',
            styles: { fontSize: 8 },
            didDrawPage: (hookData) => {
                yPos = hookData.cursor?.y ? hookData.cursor.y + 20 : 70;
            }
        });
        yPos = (doc as any).lastAutoTable.finalY + 20;
    });
};

const generatePersonExtractPdf = (doc: jsPDF, entries: DailyLogEntry[], consumptionType: string, selectedPerson?: string) => {
    let { allTransactions } = extractPersonTransactions(entries, consumptionType);
    
    if (selectedPerson && selectedPerson !== 'all') {
        allTransactions = allTransactions.filter(t => t.personName === selectedPerson);
    }
    
    const head = [['Pessoa', 'Data', 'Origem', 'Observação', 'Qtd', 'Valor']];
    const body = allTransactions.map(t => [t.personName, t.date, t.origin, t.observation, formatQty(t.quantity), formatCurrency(t.value)]);
    
    const totals = allTransactions.reduce((acc, t) => {
        acc.qtd += t.quantity;
        acc.valor += t.value;
        return acc;
    }, { qtd: 0, valor: 0 });

    const foot = [['TOTAL', '', '', '', formatQty(totals.qtd), formatCurrency(totals.valor)]];

    autoTable(doc, { head, body, foot, startY: 70, theme: 'striped', showHead: 'firstPage', showFoot: 'lastPage' });
};

const generatePersonSummaryPdf = (doc: jsPDF, entries: DailyLogEntry[], consumptionType: string) => {
    const { allTransactions } = extractPersonTransactions(entries, consumptionType);
    const summary: Record<string, { qtd: number; valor: number }> = {};
    allTransactions.forEach(t => {
        if (!summary[t.personName]) summary[t.personName] = { qtd: 0, valor: 0 };
        summary[t.personName].qtd += t.quantity;
        summary[t.personName].valor += t.value;
    });

    const head = [['Pessoa', 'Total de Itens', 'Valor Total']];
    const body = Object.entries(summary).map(([name, totals]) => [name, formatQty(totals.qtd), formatCurrency(totals.valor)]);

    const grandTotals = Object.values(summary).reduce((acc, t) => {
        acc.qtd += t.qtd;
        acc.valor += t.valor;
        return acc;
    }, { qtd: 0, valor: 0 });
    
    const foot = [['TOTAL GERAL', formatQty(grandTotals.qtd), formatCurrency(grandTotals.valor)]];
    
    autoTable(doc, { head, body, foot, startY: 70, theme: 'striped', showHead: 'firstPage', showFoot: 'lastPage' });
};



const exportToPdf = async (params: ExportParams) => {
    const { filterType, entries, reportData, date, month, range, visiblePeriods, selectedClient: selectedPerson, consumptionType } = params;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    let title = "Relatório";
    let dateRangeStr = "";
    let filename = "";
    
    const monthYearDisplayStr = month ? format(month, "MMMM 'de' yyyy", { locale: ptBR }) : '';
    const consumptionLabel = getConsumptionTypeLabel(consumptionType);
    const rangeDisplayStr = range?.from 
      ? `${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : monthYearDisplayStr;

    const rangeFilenameStr = range?.from
      ? `${format(range.from, 'yyyy-MM-dd')}_a_${range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd')}`
      : month ? format(month, 'yyyy-MM') : 'periodo_indefinido';

    if (filterType === 'date' && date) {
        title = `Relatório Detalhado do Dia`;
        dateRangeStr = format(date, 'PPP', { locale: ptBR });
        filename = getFilename(['Relatorio_Dia', format(date, 'yyyy-MM-dd')], 'pdf');
        // A lógica de exportação de dia único ainda precisa ser implementada se necessário
    } else if (filterType === 'range' && range?.from) {
        title = `Relatório Consolidado Geral`;
        dateRangeStr = `De: ${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`;
        filename = getFilename(['Relatorio_Geral', rangeFilenameStr], 'pdf');
        if (reportData?.type === 'general') {
            addHeaderAndFooter(doc, title, dateRangeStr);
            generateGeneralReportPdf(doc, reportData.data, visiblePeriods);
        }
    } else if (filterType === 'month' || filterType === 'period') {
        const periodTitle = reportData?.data.reportTitle || 'Mês';
        title = `Relatório Consolidado - ${periodTitle}`;
        dateRangeStr = monthYearDisplayStr;
        filename = getFilename(['Relatorio', periodTitle, rangeFilenameStr], 'pdf');
        addHeaderAndFooter(doc, title, dateRangeStr);
        if (reportData?.type === 'general') generateGeneralReportPdf(doc, reportData.data, visiblePeriods);
        if (reportData?.type === 'period') generatePeriodReportPdf(doc, reportData.data);
    } else if (filterType === 'client-extract') {
        const personName = selectedPerson && selectedPerson !== 'all' ? selectedPerson : 'Todas as Pessoas';
        title = `Extrato Detalhado - ${personName}`;
        dateRangeStr = `Período: ${rangeDisplayStr} | Tipo de Consumo: ${consumptionLabel}`;
        filename = getFilename(['Extrato_Pessoa', personName, consumptionLabel, rangeFilenameStr], 'pdf');
        addHeaderAndFooter(doc, title, dateRangeStr);
        generatePersonExtractPdf(doc, entries, consumptionType || 'all', selectedPerson);
    } else if (filterType === 'client-summary') {
        title = `Resumo por Pessoa`;
        dateRangeStr = `Período: ${rangeDisplayStr} | Tipo de Consumo: ${consumptionLabel}`;
        filename = getFilename(['Resumo_Pessoas', consumptionLabel, rangeFilenameStr], 'pdf');
        addHeaderAndFooter(doc, title, dateRangeStr);
        generatePersonSummaryPdf(doc, entries, consumptionType || 'all');
    } else if (filterType === 'controle-cafe' && range?.from) {
        filename = getFilename(['Controle_Cafe', rangeFilenameStr], 'pdf');
        await generateControleCafePdf(doc, entries, 'controle', rangeDisplayStr);
    } else if (filterType === 'controle-cafe-no-show' && range?.from) {
        filename = getFilename(['Controle_Cafe_NoShow', rangeFilenameStr], 'pdf');
        await generateControleCafePdf(doc, entries, 'no-show', rangeDisplayStr);
    }
    
    doc.save(filename);
};

// --- Excel Generation ---

const generateControleCafeExcel = (wb: XLSX.WorkBook, entries: DailyLogEntry[], type: 'no-show' | 'controle') => {
    if (type === 'no-show') {
      const allItems = getControleCafeItems(entries, 'no-show') as (CafeManhaNoShowItem & { entryDate: string })[];
      const dataForSheet = allItems.map(item => ({
          'Data': item.entryDate,
          'Horário': item.horario,
          'Hóspede': item.hospede,
          'UH': item.uh,
          'Reserva': item.reserva,
          'Valor': item.valor,
          'Observação': item.observation,
      }));
      const totalValor = allItems.reduce((sum, item) => sum + (item.valor || 0), 0);
      dataForSheet.push({
        'Data': 'TOTAL',
        'Horário': '',
        'Hóspede': '',
        'UH': '',
        'Reserva': '',
        'Valor': totalValor,
        'Observação': '',
      });
      const ws = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Controle_Cafe_NoShow');
    } else {
      const allItems = getControleCafeItems(entries, 'controle') as (Partial<ControleCafeItem> & { entryDate: string })[];
      const dataForSheet = allItems.map(item => ({
          'Data': item.entryDate,
          'Adultos': item.adultoQtd,
          'Criança 01': item.crianca01Qtd,
          'Criança 02': item.crianca02Qtd,
          'Contagem Manual': item.contagemManual,
          'Sem Check-in': item.semCheckIn,
      }));
      const totals = allItems.reduce((acc, item) => {
            acc.adultoQtd += item.adultoQtd || 0;
            acc.crianca01Qtd += item.crianca01Qtd || 0;
            acc.crianca02Qtd += item.crianca02Qtd || 0;
            acc.contagemManual += item.contagemManual || 0;
            acc.semCheckIn += item.semCheckIn || 0;
            return acc;
        }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0 });

      dataForSheet.push({
        'Data': 'TOTAL',
        'Adultos': totals.adultoQtd,
        'Criança 01': totals.crianca01Qtd,
        'Criança 02': totals.crianca02Qtd,
        'Contagem Manual': totals.contagemManual,
        'Sem Check-in': totals.semCheckIn,
      });
      const ws = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Controle_Cafe');
    }
};

const generateGeneralReportExcel = (wb: XLSX.WorkBook, data: GeneralReportViewData, visiblePeriods: PeriodDefinition[]) => {
    const roomServiceDef = { id: 'roomService', label: 'Room Service' };
    const reportablePeriods = visiblePeriods.filter(p => p.type === 'entry' && p.id !== 'madrugada');

    const dataForSheet = data.dailyBreakdowns.map(row => {
        const rowData: { [key: string]: any } = { Data: row.date };
        
        rowData[`${roomServiceDef.label} (Qtd)`] = row.periodTotals[roomServiceDef.id]?.qtd || 0;
        rowData[`${roomServiceDef.label} (R$)`] = row.periodTotals[roomServiceDef.id]?.valor || 0;
        
        reportablePeriods.forEach(p => {
            rowData[`${p.label} (Qtd)`] = row.periodTotals[p.id]?.qtd || 0;
            rowData[`${p.label} (R$)`] = row.periodTotals[p.id]?.valor || 0;
        });
        rowData['Total GERAL (Qtd)'] = row.totalQtd;
        rowData['Total GERAL (R$)'] = row.totalComCI;
        rowData['Total Reajuste CI (R$)'] = row.totalReajusteCI;
        rowData['Total LÍQUIDO (R$)'] = row.totalSemCI;
        return rowData;
    });
    
    const totalsRow: { [key: string]: any } = { Data: 'TOTAL' };
    
    totalsRow[`${roomServiceDef.label} (Qtd)`] = data.summary.periodTotals[roomServiceDef.id]?.qtd || 0;
    totalsRow[`${roomServiceDef.label} (R$)`] = data.summary.periodTotals[roomServiceDef.id]?.valor || 0;

    reportablePeriods.forEach(p => {
        totalsRow[`${p.label} (Qtd)`] = data.summary.periodTotals[p.id]?.qtd || 0;
        totalsRow[`${p.label} (R$)`] = data.summary.periodTotals[p.id]?.valor || 0;
    });
    totalsRow['Total GERAL (Qtd)'] = data.summary.grandTotalQtd;
    totalsRow['Total GERAL (R$)'] = data.summary.grandTotalComCI;
    totalsRow['Total Reajuste CI (R$)'] = data.summary.grandTotalReajusteCI;
    totalsRow['Total LÍQUIDO (R$)'] = data.summary.grandTotalSemCI;
    dataForSheet.push(totalsRow);

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Geral');
};

const generatePeriodReportExcel = (wb: XLSX.WorkBook, data: PeriodReportViewData) => {
    Object.entries(data.dailyBreakdowns).forEach(([category, items]) => {
        if (items.length > 0) {
            const dataForSheet = [...items];
            const summary = data.summary[category];
            if (summary) {
                const totalRow: any = { date: 'TOTAL' };
                if (summary.total !== undefined) totalRow.total = summary.total;
                if (summary.qtd !== undefined) totalRow.qtd = summary.qtd;
                dataForSheet.push(totalRow);
            }
            const ws = XLSX.utils.json_to_sheet(dataForSheet);
            XLSX.utils.book_append_sheet(wb, ws, category.substring(0, 31));
        }
    });
};

const generatePersonExtractExcel = (wb: XLSX.WorkBook, entries: DailyLogEntry[], consumptionType: string, selectedPerson?: string) => {
    let { allTransactions } = extractPersonTransactions(entries, consumptionType);
    if(selectedPerson && selectedPerson !== 'all') {
      allTransactions = allTransactions.filter(t => t.personName === selectedPerson);
    }
     const dataForSheet = allTransactions.map(t => ({
        'Pessoa': t.personName,
        'Data': t.date,
        'Origem': t.origin,
        'Observação': t.observation,
        'Quantidade': t.quantity,
        'Valor': t.value
     }));

     const totals = allTransactions.reduce((acc, t) => {
        acc.qtd += t.quantity;
        acc.valor += t.value;
        return acc;
    }, { qtd: 0, valor: 0 });

    const totalRow = {
        'Pessoa': 'TOTAL',
        'Data': '',
        'Origem': '',
        'Observação': '',
        'Quantidade': totals.qtd,
        'Valor': totals.valor
    };
    dataForSheet.push(totalRow);

     const ws = XLSX.utils.json_to_sheet(dataForSheet);
     XLSX.utils.book_append_sheet(wb, ws, 'Extrato_Pessoas');
};

const generatePersonSummaryExcel = (wb: XLSX.WorkBook, entries: DailyLogEntry[], consumptionType: string) => {
    const { allTransactions } = extractPersonTransactions(entries, consumptionType);
    const summary: Record<string, { qtd: number; valor: number }> = {};
    allTransactions.forEach(t => {
        if (!summary[t.personName]) summary[t.personName] = { qtd: 0, valor: 0 };
        summary[t.personName].qtd += t.quantity;
        summary[t.personName].valor += t.value;
    });

    const dataForSheet = Object.entries(summary).map(([name, totals]) => ({
        'Pessoa': name,
        'Total de Itens': totals.qtd,
        'Valor Total': totals.valor
    }));
    
    const grandTotals = Object.values(summary).reduce((acc, t) => {
        acc.qtd += t.qtd;
        acc.valor += t.valor;
        return acc;
    }, { qtd: 0, valor: 0 });

    const totalRow = {
        'Pessoa': 'TOTAL GERAL',
        'Total de Itens': grandTotals.qtd,
        'Valor Total': grandTotals.valor
    };
    dataForSheet.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo_Pessoas');
};


const exportToExcel = async (params: ExportParams) => {
    const { filterType, entries, reportData, date, month, range, visiblePeriods, selectedClient: selectedPerson, consumptionType } = params;
    const wb = XLSX.utils.book_new();
    let filename = "";
    
    const monthYearStr = month ? format(month, 'MMMM_yyyy', { locale: ptBR }) : null;
    const consumptionLabel = getConsumptionTypeLabel(consumptionType);
    const rangeFilenameStr = range?.from
      ? `${format(range.from, 'yyyy-MM-dd')}_a_${range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd')}`
      : month ? format(month, 'yyyy-MM') : 'periodo_indefinido';

    if (filterType === 'controle-cafe') {
        filename = getFilename(['Controle_Cafe', rangeFilenameStr], 'xlsx');
        generateControleCafeExcel(wb, entries, 'controle');
    } else if (filterType === 'controle-cafe-no-show') {
        filename = getFilename(['Controle_Cafe_NoShow', rangeFilenameStr], 'xlsx');
        generateControleCafeExcel(wb, entries, 'no-show');
    } else if (reportData?.type === 'general') {
        filename = getFilename(['Relatorio_Geral', monthYearStr], 'xlsx');
        generateGeneralReportExcel(wb, reportData.data, visiblePeriods);
    } else if (reportData?.type === 'period') {
        filename = getFilename(['Relatorio', reportData.data.reportTitle, monthYearStr], 'xlsx');
        generatePeriodReportExcel(wb, reportData.data);
    } else if (filterType === 'client-extract') {
        const personName = selectedPerson && selectedPerson !== 'all' ? selectedPerson : 'Todas_as_Pessoas';
        filename = getFilename(['Extrato_Pessoa', personName, consumptionLabel, rangeFilenameStr], 'xlsx');
        generatePersonExtractExcel(wb, entries, consumptionType || 'all', selectedPerson);
    } else if (filterType === 'client-summary') {
        filename = getFilename(['Resumo_Pessoas', consumptionLabel, rangeFilenameStr], 'xlsx');
        generatePersonSummaryExcel(wb, entries, consumptionType || 'all');
    }

    if(filename) {
        XLSX.writeFile(wb, filename);
    }
};


export const exportReport = async (params: ExportParams) => {
    if (params.formatType === 'pdf') {
        await exportToPdf(params);
    } else if (params.formatType === 'excel') {
        await exportToExcel(params);
    }
};

    