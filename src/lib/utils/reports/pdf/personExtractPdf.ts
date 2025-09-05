import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { ExportParams } from '../types';
import { extractPersonTransactions } from '@/lib/reports/person/generator';
import { getConsumptionTypeLabel } from '../exportUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

const drawHeaderOnce = (doc: jsPDF, title: string, dateRangeStr: string, companyName?: string, includeCompanyData?: boolean) => {
    let finalY = 30;
    if (includeCompanyData) {
        doc.setFontSize(14);
        doc.text(companyName || "Avalon Restaurante e Eventos Ltda", 40, finalY);
        finalY += 15;
    }

    doc.setFontSize(10);
    doc.text(title, 40, finalY);
    finalY += 13;
    doc.setFontSize(9);
    doc.text(dateRangeStr, 40, finalY);
    finalY += 13;

    if (includeCompanyData) {
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
        return (doc as any).lastAutoTable.finalY || finalY;
    }
    return finalY;
};

const drawFooter = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 70, doc.internal.pageSize.height - 20);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);
    }
}

export const generatePersonExtractPdf = (doc: jsPDF, params: ExportParams) => {
    const { entries, consumptionType, selectedClient, range, month, companyName, includeCompanyData } = params;
    
    const { allTransactions } = extractPersonTransactions(entries, consumptionType || 'all');
    
    const isSpecificPersonSelected = selectedClient && selectedClient !== 'all';
    const isSpecificConsumptionTypeSelected = consumptionType && consumptionType !== 'all';

    let transactionsToDisplay = allTransactions;
    if (isSpecificPersonSelected) {
        transactionsToDisplay = allTransactions.filter(t => t.personName === selectedClient);
    }

    const consumptionLabel = getConsumptionTypeLabel(consumptionType) || 'Todos';
    const clientLabel = isSpecificPersonSelected ? selectedClient : 'Todas as Pessoas';
    
    let dateRangeStr = '';
    if (month) {
        dateRangeStr = format(month, "MMMM 'de' yyyy");
    } else if (range?.from) {
        dateRangeStr = `${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`;
    }

    const head = [['Data', 'Pessoa', 'Origem', 'Observação', 'Valor']];
    const body = transactionsToDisplay.map(t => [t.date, t.personName, t.origin, t.observation, formatCurrency(t.value)]);
    
    const totalValor = transactionsToDisplay.reduce((acc, t) => acc + t.value, 0);
    const totalRegistros = transactionsToDisplay.length;

    const footer = [[
        { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: `Registros: ${formatQty(totalRegistros)}`, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totalValor), styles: { fontStyle: 'bold', halign: 'right' } }
    ]];
    
    let startY = drawHeaderOnce(doc, `Extrato Detalhado - ${clientLabel}`, `Período: ${dateRangeStr} | Tipo: ${consumptionLabel}`, companyName, includeCompanyData);

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        startY: startY + 15,
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
    });

    let summaryStartY = (doc as any).lastAutoTable.finalY + 20;

    const shouldShowFullSummary = !isSpecificPersonSelected && !isSpecificConsumptionTypeSelected;

    if (shouldShowFullSummary) {
        const summaryByType = allTransactions.reduce((acc, t) => {
            let typeKey: 'hotel' | 'funcionario' | 'consumoInterno' | 'outros' = 'outros';
            
            if (t.origin.includes('Faturado - Hotel')) typeKey = 'hotel';
            else if (t.origin.includes('Faturado - Funcionário')) typeKey = 'funcionario';
            else if (t.origin.includes('Consumo Interno')) typeKey = 'consumoInterno';
            
            acc[typeKey].qtd += t.quantity;
            acc[typeKey].valor += t.value;
            return acc;
        }, { hotel: { qtd: 0, valor: 0 }, funcionario: { qtd: 0, valor: 0 }, consumoInterno: { qtd: 0, valor: 0 }, outros: {qtd: 0, valor: 0} });

        const summaryCategoriesByType = [
            { label: 'Total Consumo Interno', data: summaryByType.consumoInterno },
            { label: 'Total Faturado (Funcionário)', data: summaryByType.funcionario },
            { label: 'Total Faturado (Hotel)', data: summaryByType.hotel },
            { label: 'Outros', data: summaryByType.outros }
        ].filter(cat => cat.data.valor > 0 || cat.data.qtd > 0);
        
        if (summaryCategoriesByType.length > 0) {
            const totalGeralByType = Object.values(summaryByType).reduce((acc, totals) => {
              acc.qtd += totals.qtd;
              acc.valor += totals.valor;
              return acc;
            }, { qtd: 0, valor: 0 });
            
            autoTable(doc, {
                head: [['Resumo Consolidado por Tipo', 'Total de Itens', 'Valor Total']],
                body: summaryCategoriesByType.map(cat => [cat.label, formatQty(cat.data.qtd), formatCurrency(cat.data.valor)]),
                foot: [[{ content: 'Total Geral (Tipo)', styles: { fontStyle: 'bold' } }, { content: formatQty(totalGeralByType.qtd), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(totalGeralByType.valor), styles: { fontStyle: 'bold', halign: 'right' } }]],
                startY: summaryStartY,
                theme: 'grid',
                headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' } }
            });
            summaryStartY = (doc as any).lastAutoTable.finalY + 15;
        }
    }
    
    const summaryByPeriod = transactionsToDisplay.reduce((acc, t) => {
        let periodKey: 'almoco' | 'jantar' | 'outros' = 'outros';

        if (t.origin.includes('Almoço')) periodKey = 'almoco';
        else if (t.origin.includes('Jantar')) periodKey = 'jantar';
        
        acc[periodKey].qtd += t.quantity;
        acc[periodKey].valor += t.value;
        return acc;
    }, { almoco: { qtd: 0, valor: 0 }, jantar: { qtd: 0, valor: 0 }, outros: { qtd: 0, valor: 0 } });
    
    const summaryCategoriesByPeriod = [
        { label: 'Total Almoço (PT + ST)', data: summaryByPeriod.almoco },
        { label: 'Total Jantar', data: summaryByPeriod.jantar },
        { label: 'Outros Períodos', data: summaryByPeriod.outros }
    ].filter(cat => cat.data.valor > 0 || cat.data.qtd > 0);
    
    if (summaryCategoriesByPeriod.length > 0) {
        const totalGeralByPeriod = Object.values(summaryByPeriod).reduce((acc, totals) => {
            acc.qtd += totals.qtd;
            acc.valor += totals.valor;
            return acc;
        }, { qtd: 0, valor: 0 });

        if (summaryStartY > doc.internal.pageSize.height - 150) {
             doc.addPage();
             summaryStartY = drawHeaderOnce(doc, `Continuação - Extrato Detalhado`, `Período: ${dateRangeStr}`, companyName, includeCompanyData) + 15;
        }

        autoTable(doc, {
            head: [['Resumo por Período', 'Total de Itens', 'Valor Total']],
            body: summaryCategoriesByPeriod.map(cat => [cat.label, formatQty(cat.data.qtd), formatCurrency(cat.data.valor)]),
            foot: [[{ content: 'Total Geral (Período)', styles: { fontStyle: 'bold' } }, { content: formatQty(totalGeralByPeriod.qtd), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(totalGeralByPeriod.valor), styles: { fontStyle: 'bold', halign: 'right' } }]],
            startY: summaryStartY,
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' } }
        });
    }

    drawFooter(doc);
};
