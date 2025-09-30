
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { ExportParams, DailyLogEntry, FrigobarConsumptionLog, FrigobarItem } from '../types';
import { getSetting } from '@/services/settingsService';
import { drawHeaderAndFooter } from './pdfUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const generateSummaryTables = (doc: jsPDF, lastY: number, params: ExportParams, allLogs: (FrigobarConsumptionLog & { entryDate: string })[], frigobarItemsList: FrigobarItem[]) => {
    const { entries } = params;

    const totals = allLogs.reduce((acc, log) => {
        acc.consumo += log.totalValue || 0;
        acc.recebido += log.valorRecebido || 0;
        return acc;
    }, { consumo: 0, recebido: 0 });

    const checkouts = {
        previstos: entries.reduce((sum, day) => sum + ((day.controleFrigobar as any)?.checkoutsPrevistos || 0), 0),
        prorrogados: entries.reduce((sum, day) => sum + ((day.controleFrigobar as any)?.checkoutsProrrogados || 0), 0),
        antecipados: allLogs.filter(log => log.isAntecipado).length,
    };

    const itemsSummary = allLogs.reduce((acc, log) => {
        Object.entries(log.items).forEach(([itemId, quantity]) => {
            const itemInfo = frigobarItemsList.find(i => i.id === itemId);
            if (itemInfo) {
                if (!acc[itemId]) {
                    acc[itemId] = { name: itemInfo.name, qtd: 0, valor: 0 };
                }
                acc[itemId].qtd += quantity;
                acc[itemId].valor += quantity * itemInfo.price;
            }
        });
        return acc;
    }, {} as Record<string, { name: string; qtd: number; valor: number }>);
    
    const sortedItemsSummary = Object.values(itemsSummary).sort((a, b) => a.name.localeCompare(b.name));
    const totalItemsQtd = sortedItemsSummary.reduce((acc, item) => acc + item.qtd, 0);

    const summaryCardWidth = 160;
    const summaryCardMargin = 10;
    let currentX = 40;
    let newY = lastY + 20;
    
    // Check if there is enough space, otherwise add a new page
    if (newY > doc.internal.pageSize.height - 150) { 
        doc.addPage();
        const totalPages = (doc as any).internal.getNumberOfPages();
        newY = drawHeaderAndFooter(doc, `Relatório de Controle de Frigobar - Resumo`, params.date as any, params, totalPages, totalPages);
    }

    // CHECK-OUTS Table
    autoTable(doc, {
        head: [['CHECK-OUTS']],
        body: [
            ['Previstos', `${checkouts.previstos}`],
            ['Prorrogados', `${checkouts.prorrogados}`],
            ['Antecipados', `${checkouts.antecipados}`],
        ],
        startY: newY,
        theme: 'grid',
        tableWidth: summaryCardWidth,
        margin: { left: currentX },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } }
    });
    currentX += summaryCardWidth + summaryCardMargin;
    
    // TOTAIS FINANCEIROS Table
    autoTable(doc, {
        head: [['TOTAIS FINANCEIROS']],
        body: [
            ['Total Consumo', { content: formatCurrency(totals.consumo), styles: { textColor: [200, 0, 0] } }],
            ['Total Recebido', { content: formatCurrency(totals.recebido), styles: { textColor: [0, 150, 0] } }],
            [{ content: 'DIFERENÇA', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totals.recebido - totals.consumo), styles: { fontStyle: 'bold', textColor: (totals.recebido - totals.consumo >= 0 ? [0, 150, 0] : [200, 0, 0]) } }],
        ],
        startY: newY,
        theme: 'grid',
        tableWidth: summaryCardWidth,
        margin: { left: currentX },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } }
    });
    currentX += summaryCardWidth + summaryCardMargin;

    // ITENS Table
    if (sortedItemsSummary.length > 0) {
        autoTable(doc, {
            head: [['Item', 'Qtd', 'Valor']],
            body: sortedItemsSummary.map(item => [item.name, item.qtd, formatCurrency(item.valor)]),
            foot: [[{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: totalItemsQtd.toString(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(totals.consumo), styles: { fontStyle: 'bold', halign: 'right' } }]],
            startY: newY,
            theme: 'grid',
            tableWidth: summaryCardWidth,
            margin: { left: currentX },
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
        });
    }
}

export const generateControleFrigobarPdf = async (doc: jsPDF, params: ExportParams) => {
    const { entries, range } = params;

    const dateRangeStr = range?.from 
      ? `Período: ${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : "Período não definido";
    const title = `Relatório de Controle de Frigobar`;

    const allLogs: (FrigobarConsumptionLog & { entryDate: string })[] = [];
    entries.forEach(entry => {
        const frigobarData = entry.controleFrigobar as any;
        if (frigobarData?.logs && Array.isArray(frigobarData.logs)) {
            frigobarData.logs.forEach((log: FrigobarConsumptionLog) => {
                allLogs.push({ ...log, entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy') });
            });
        }
    });
    
    allLogs.sort((a, b) => parseISO(a.entryDate.split('/').reverse().join('-')).getTime() - parseISO(b.entryDate.split('/').reverse().join('-')).getTime() || a.uh.localeCompare(b.uh));

    const frigobarItemsList: FrigobarItem[] = (await getSetting('frigobarItems')) || [];

    const head = [['Data', 'UH', 'Itens Consumidos', 'Vlr. Consumo', 'Vlr. Recebido', 'Diferença']];
    const body = allLogs.map(log => {
        const itemsDetail = Object.entries(log.items).map(([itemId, quantity]) => {
            const item = frigobarItemsList.find(i => i.id === itemId);
            return `${item?.name || 'Desconhecido'}: ${quantity}`;
        }).join(', ');
        
        const isAntecipado = log.isAntecipado ? '*' : '';

        return [
            log.entryDate,
            `${isAntecipado}${log.uh}`,
            itemsDetail,
            formatCurrency(log.totalValue),
            formatCurrency(log.valorRecebido),
            formatCurrency((log.valorRecebido || 0) - log.totalValue)
        ];
    });

    const totals = allLogs.reduce((acc, log) => {
        acc.consumo += log.totalValue || 0;
        acc.recebido += log.valorRecebido || 0;
        return acc;
    }, { consumo: 0, recebido: 0 });

    const footer = [[
        { content: 'TOTAIS', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totals.consumo), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totals.recebido), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totals.recebido - totals.consumo), styles: { fontStyle: 'bold', halign: 'right' } }
    ]];
    
    const headerHeight = drawHeaderAndFooter(doc, title, dateRangeStr, params, 1, 1);

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        theme: 'striped',
        showFoot: 'lastPage',
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        columnStyles: { 
            0: {cellWidth: 60},
            1: {cellWidth: 40},
            2: { cellWidth: 'auto' }, 
            3: { halign: 'right', cellWidth: 70 }, 
            4: { halign: 'right', cellWidth: 70 }, 
            5: { halign: 'right', cellWidth: 70 } 
        },
        margin: { top: headerHeight },
        didDrawPage: (hookData) => {
           const totalPages = (doc as any).internal.getNumberOfPages();
           if(hookData.pageNumber === totalPages) {
                generateSummaryTables(doc, hookData.cursor?.y || 0, params, allLogs, frigobarItemsList);
           }
           // Redraw header on new pages if table spans multiple pages
           if (hookData.pageNumber > 1) {
             drawHeaderAndFooter(doc, title, dateRangeStr, params, hookData.pageNumber, totalPages);
           }
        },
        didParseCell: (data) => {
            if (data.column.index === 1 && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('*')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [255, 165, 0]; // Orange color for attention
            }
        }
    });

};
