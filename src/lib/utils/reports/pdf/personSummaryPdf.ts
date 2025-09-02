import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ExportParams } from '../types';
import { extractPersonTransactions } from '@/lib/reports/person/generator';
import { getConsumptionTypeLabel } from '../exportUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

export const generatePersonSummaryPdf = (doc: jsPDF, params: ExportParams) => {
    const { entries, consumptionType, range, month, companyName } = params;

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
        { content: formatQty(grandTotals.qtd), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(grandTotals.valor), styles: { fontStyle: 'bold', halign: 'right' } }
    ]];

    const consumptionLabel = getConsumptionTypeLabel(consumptionType) || 'Todos';
    const dateRangeStr = range?.from
      ? `${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : month ? format(month, 'MMMM/yyyy') : '';

    autoTable(doc, {
        head: [['Pessoa', 'Total de Itens', 'Valor Total']],
        body: body,
        foot: footer,
        startY: 95,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        didDrawPage: (data) => {
            let finalY = 30;
            doc.setFontSize(14);
            doc.text(companyName || "Avalon Restaurante e Eventos Ltda", 40, finalY);
            finalY += 15;
            doc.setFontSize(10);
            doc.text('Resumo de Consumo por Pessoa', 40, finalY);
            finalY += 13;
            doc.setFontSize(9);
            doc.text(`Período: ${dateRangeStr} | Tipo: ${consumptionLabel}`, 40, finalY);
            finalY += 13;
            
             if (companyName === 'Rubi Restaurante e Eventos Ltda') {
                autoTable(doc, {
                    body: [['FAVORECIDO: RUBI RESTAURANTE E EVENTOS LTDA', 'BANCO: ITAÚ (341)'], ['CNPJ: 56.034.124/0001-42', 'AGENCIA: 0641 | CONTA CORRENTE: 98250'],],
                    startY: finalY, theme: 'plain', styles: { fontSize: 8, cellPadding: 1 },
                });
            } else if (companyName === 'Avalon Restaurante e Eventos Ltda') {
                 autoTable(doc, {
                    body: [['CNPJ: 08.439.825/0001-19', 'BANCO: BRADESCO (237)'], ['', 'AGENCIA: 07828 | CONTA CORRENTE: 0179750-6'],],
                    startY: finalY, theme: 'plain', styles: { fontSize: 8, cellPadding: 1 },
                });
            }

            doc.setFontSize(8);
            const pageCount = doc.internal.pages.length - 1;
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 20);
            doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);
        }
    });
};
