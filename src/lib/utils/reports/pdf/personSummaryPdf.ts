
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportParams } from '../types';
import { extractPersonTransactions } from '@/lib/reports/person/generator';
import { getConsumptionTypeLabel } from '../exportUtils';
import { drawHeaderAndFooter } from './pdfUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

export const generatePersonSummaryPdf = (doc: jsPDF, params: ExportParams) => {
    const { entries, consumptionType, range, month } = params;

    const { allTransactions } = extractPersonTransactions(entries, consumptionType || 'all');
    const summary: Record<string, { qtd: number, valor: number }> = {};
    allTransactions.forEach(t => {
        if (!summary[t.personName]) summary[t.personName] = { qtd: 0, valor: 0 };
        summary[t.personName].qtd += t.quantity;
        summary[t.personName].valor += t.value;
    });

    const body = Object.entries(summary).map(([name, totals]) => [
        name,
        formatQty(totals.qtd),
        formatCurrency(totals.valor)
    ]).sort((a,b) => (a[0] as string).localeCompare(b[0] as string));
    
    const grandTotals = Object.values(summary).reduce((acc, t) => {
        acc.qtd += t.qtd;
        acc.valor += t.valor;
        return acc;
    }, { qtd: 0, valor: 0 });

    const footer = [[
        { content: 'TOTAL GERAL', styles: { fontStyle: 'bold' } },
        { content: formatQty(grandTotals.qtd), styles: { fontStyle: 'bold', halign: 'left' } },
        { content: formatCurrency(grandTotals.valor), styles: { fontStyle: 'bold', halign: 'left' } }
    ]];

    const consumptionLabel = getConsumptionTypeLabel(consumptionType) || 'Todos';
    let dateRangeStr = '';
    if (month) {
        dateRangeStr = `Período: ${format(month, "MMMM 'de' yyyy", { locale: ptBR })}`;
    } else if (range?.from) {
        dateRangeStr = `Período: ${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} a ${range.to ? format(range.to, 'dd/MM/yyyy', { locale: ptBR }) : format(range.from, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    const finalFilterText = `${dateRangeStr} | Tipo de Consumo: ${consumptionLabel}`;
    const title = 'Resumo de Consumo por Pessoa';
    
    let startY = drawHeaderAndFooter(doc, title, finalFilterText, params, 1, (doc as any).internal.getNumberOfPages());
    startY += 50;

    autoTable(doc, {
        head: [['Pessoa', 'Total de Itens', 'Valor Total']],
        body: body,
        foot: footer,
        theme: 'striped',
        showFoot: 'lastPage',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'left' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', halign: 'left' },
        styles: { halign: 'left' },
        margin: { top: startY },
        didDrawPage: (hookData) => {
           const totalPages = (doc as any).internal.getNumberOfPages();
           if(totalPages > 1) {
            drawHeaderAndFooter(doc, title, finalFilterText, params, hookData.pageNumber, totalPages);
           }
        }
    });
};
