
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportParams, GeneralReportViewData, PeriodDefinition } from '../types';
import { getPeriodIcon } from '@/lib/config/periods';
import { drawHeaderAndFooter } from './pdfUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

export const generateGeneralReportPdf = (doc: jsPDF, params: ExportParams) => {
    const { reportData, visiblePeriods, month, range } = params;

    if (reportData?.type !== 'general') return;
    const data = reportData.data;

    const dateRangeStr = range?.from 
      ? `${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : month ? format(month, 'MMMM \'de\' yyyy', { locale: ptBR }) : '';

    
    const reportablePeriods = visiblePeriods.reduce((acc, p) => {
        if (p.type !== 'entry' || p.id === 'madrugada') return acc;
        if (p.id.includes('almoco')) {
            if (!acc.find(item => item.id === 'almoco')) {
                acc.push({ ...p, id: 'almoco', label: 'Almoço' });
            }
        } else {
            acc.push(p);
        }
        return acc;
    }, [] as any[]);

    const roomServiceDef = { id: 'roomService', label: 'Room Service' };
    const allHeaders = [roomServiceDef, ...reportablePeriods];
    
    const head = [
        ['Data', ...allHeaders.map(h => h.label), 'TOTAL GERAL', 'REAJUSTE C.I', 'TOTAL LÍQUIDO']
    ];
    
    const body = data.dailyBreakdowns.map(row => {
        const almocoTotal = {
            qtd: (row.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (row.periodTotals['almocoSegundoTurno']?.qtd ?? 0),
            valor: (row.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (row.periodTotals['almocoSegundoTurno']?.valor ?? 0)
        };
        const periodTotalsForDay = { ...row.periodTotals, almoco: almocoTotal };
        
        return [
            row.date,
            ...allHeaders.map(h => {
                const periodTotal = periodTotalsForDay[h.id as keyof typeof periodTotalsForDay] || { qtd: 0, valor: 0 };
                return `${formatCurrency(periodTotal.valor)}\n(${formatQty(periodTotal.qtd)} qtd)`;
            }),
            `${formatCurrency(row.totalComCI)}\n(${formatQty(row.totalQtd)} qtd)`,
            formatCurrency(row.totalReajusteCI),
            formatCurrency(row.totalSemCI),
        ];
    });
    
    const almocoTotalSummary = {
        qtd: (data.summary.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.qtd ?? 0),
        valor: (data.summary.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.valor ?? 0)
    };
    const periodTotalsForSummary = { ...data.summary.periodTotals, almoco: almocoTotalSummary };

    const footer = [[
        'TOTAL',
        ...allHeaders.map(h => {
             const periodTotal = periodTotalsForSummary[h.id as keyof typeof periodTotalsForSummary] || { qtd: 0, valor: 0 };
             return `${formatCurrency(periodTotal.valor)}\n(${formatQty(periodTotal.qtd)} qtd)`;
        }),
        `${formatCurrency(data.summary.grandTotalComCI)}\n(${formatQty(data.summary.grandTotalQtd)} qtd)`,
        formatCurrency(data.summary.grandTotalReajusteCI),
        formatCurrency(data.summary.grandTotalSemCI)
    ]];

    const headerHeight = drawHeaderAndFooter(doc, `Relatório Geral - ${data.reportTitle}`, dateRangeStr, params, 1, (doc as any).internal.getNumberOfPages());

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        theme: 'striped',
        styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak', halign: 'left', valign: 'middle' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'left', fontSize: 7 },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', fontSize: 7, halign: 'left' },
        showFoot: 'lastPage',
        margin: { top: headerHeight + 50 },
        didDrawPage: (hookData) => {
            const totalPages = (doc as any).internal.getNumberOfPages();
            if(totalPages > 1) {
                drawHeaderAndFooter(doc, `Relatório Geral - ${data.reportTitle}`, dateRangeStr, params, hookData.pageNumber, totalPages);
            }
        }
    });
};
