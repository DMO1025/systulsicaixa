

import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportParams, UnifiedPersonTransaction } from '../types';
import { getConsumptionTypeLabel } from '../exportUtils';
import { drawHeaderAndFooter } from './pdfUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

export const generatePersonExtractPdf = (doc: jsPDF, params: ExportParams) => {
    const { personTransactions, consumptionType, selectedClient, range, month } = params;
    
    const isSpecificPersonSelected = selectedClient && selectedClient !== 'all';
    
    let transactionsToDisplay: UnifiedPersonTransaction[] = personTransactions || [];
    if (isSpecificPersonSelected) {
        transactionsToDisplay = transactionsToDisplay.filter(t => t.personName === selectedClient);
    }

    const consumptionLabel = getConsumptionTypeLabel(consumptionType) || 'Todos';
    const clientLabel = isSpecificPersonSelected ? selectedClient : 'Todas as Pessoas';
    
    let dateRangeStr = '';
    if (month) {
        dateRangeStr = `Período: ${format(month, "MMMM 'de' yyyy", { locale: ptBR })}`;
    } else if (range?.from) {
        dateRangeStr = `Período: ${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} a ${range.to ? format(range.to, 'dd/MM/yyyy', { locale: ptBR }) : format(range.from, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    const finalFilterText = `${dateRangeStr} | Tipo de Consumo: ${consumptionLabel}`;
    const title = `Extrato Detalhado - ${clientLabel}`;

    const head = [['Data', 'Pessoa', 'Origem', 'Observação', 'Valor']];
    const body = transactionsToDisplay.map(t => [t.date, t.personName, t.origin, t.observation, formatCurrency(t.value)]);
    
    const totalValor = transactionsToDisplay.reduce((acc, t) => acc + t.value, 0);
    const totalRegistros = transactionsToDisplay.length;

    const footer = [[
        { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: `Registros: ${formatQty(totalRegistros)}`, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totalValor), styles: { fontStyle: 'bold', halign: 'right' } }
    ]];
    
    const headerHeight = drawHeaderAndFooter(doc, title, finalFilterText, params, 1, (doc as any).internal.getNumberOfPages());

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        theme: 'striped',
        showFoot: 'lastPage',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 55 }, 
            1: { cellWidth: 120 },
            2: { cellWidth: 120 }, 
            3: { cellWidth: 'auto' },
            4: { cellWidth: 60, halign: 'right' },
        },
        margin: { top: headerHeight },
        didDrawPage: (hookData) => {
           const totalPages = (doc as any).internal.getNumberOfPages();
           if(totalPages > 1) {
             drawHeaderAndFooter(doc, title, finalFilterText, params, hookData.pageNumber, totalPages);
           }
        }
    });
};
