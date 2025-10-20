
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { ExportParams, DailyLogEntry, FrigobarConsumptionLog, FrigobarItem, ReportExportData } from '../types';
import { getSetting } from '@/services/settingsService';
import { drawHeaderAndFooter } from './pdfUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');


export const generateControleFrigobarPdf = async (doc: jsPDF, params: ExportParams) => {
    const { range, includeItemsInPdf, reportData, view } = params;

    const dateRangeStr = range?.from 
      ? `Período: ${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : "Período não definido";
      
    const isConsolidated = view === 'consolidado';
    const title = `Relatório de Controle de Frigobar ${isConsolidated ? '(Consolidado por Dia)' : '(Descritivo)'}`;

    if (!reportData || !reportData.summary || !reportData.details) {
        doc.text("Nenhum dado encontrado para este relatório.", 40, 150);
        return;
    }

    const allLogs = (reportData.details.allLogs as any[]) || [];
    const dailyAggregates = (reportData.details.dailyAggregates as any[]) || [];
    const summary = reportData.summary as any;
    const totals = summary.financeiro || { consumo: 0, recebido: 0, abatimento: 0, diferenca: 0 };
    const checkouts = summary.checkouts || { efetivados: 0, prorrogados: 0, antecipados: 0 };
    const itemsSummary = summary.itemsSummary || [];
    const frigobarItemsList: FrigobarItem[] = (await getSetting('frigobarItems')) || [];
    
    const perdaValor = totals.diferenca < 0 ? Math.abs(totals.diferenca) : 0;
    const porcentagemPerda = totals.consumo > 0 ? (perdaValor / totals.consumo) * 100 : 0;

    let startY = drawHeaderAndFooter(doc, title, dateRangeStr, params, 1, 1);
    
    const subtotal = (totals.recebido || 0) - (totals.abatimento || 0);

    // Financial Summaries (always shown)
     autoTable(doc, {
        startY: startY,
        margin: { left: 40 },
        head: [['Resumo Geral', 'Valor']],
        body: [
            ['Total de Quartos Atendidos', formatQty(summary.financeiro?.totalUhsAtendidas)],
            ['Total de Itens Vendidos', formatQty(summary.financeiro?.totalItems)],
            ['Total Consumido (R$)', formatCurrency(totals.consumo)],
            ['Total Recebido (R$)', formatCurrency(totals.recebido)],
            [{ content: 'Total Diferença (R$)', styles: { fontStyle: 'bold' } }, { content: formatCurrency(subtotal), styles: { fontStyle: 'bold' } }],
            ['Valor Abatido', formatCurrency(totals.abatimento)],
            [{ content: 'Total Perda', styles: { fontStyle: 'bold', fillColor: '#fef2f2', textColor: '#b91c1c' } }, { content: formatCurrency(totals.diferenca), styles: { fontStyle: 'bold', fillColor: '#fef2f2', textColor: '#b91c1c' } }],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: '#f0f0f0', textColor: 0, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
        tableWidth: 250,
    });
    
    const lastYAfterFirstTable = (doc as any).lastAutoTable.finalY;

    // Side-by-side Summaries
    autoTable(doc, {
        startY: startY,
        head: [["Resumo Check-outs", "Quantidade"]],
        body: [
            ['Efetivados', checkouts.efetivados.toLocaleString('pt-BR')],
            ['Prorrogados', checkouts.prorrogados.toLocaleString('pt-BR')],
            ['Antecipados', checkouts.antecipados.toLocaleString('pt-BR')],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: '#f0f0f0', textColor: 0, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }},
        tableWidth: 250,
        margin: { left: 320 }
    });

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [[{ content: 'Porcentagem de Perda', colSpan: 2, styles: { halign: 'center' }}]],
        body: [
            [{ content: `${porcentagemPerda.toFixed(2)}%`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fontSize: 14, textColor: '#b91c1c' } }],
            ['Valor da Perda (R$)', formatCurrency(perdaValor)],
            ['Total Consumido (R$)', formatCurrency(totals.consumo)],
            [{ content: '(Perda / Total Consumido) * 100', colSpan: 2, styles: { fontSize: 7, fontStyle: 'italic', halign: 'center' } }]
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: '#fef2f2', textColor: '#b91c1c', fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }},
        tableWidth: 250,
        margin: { left: 320 },
    });
    
    const lastYAfterSideTables = Math.max(lastYAfterFirstTable, (doc as any).lastAutoTable.finalY);

    if (isConsolidated) {
        // Render Consolidated Table
        const head = [['Data', 'Valor Consumo', 'Valor Recebido', 'Valor Abatido', 'Diferença']];
        const body = dailyAggregates.map((day: any) => [
            day.date,
            formatCurrency(day.consumo),
            formatCurrency(day.recebido),
            formatCurrency(day.abatimento),
            formatCurrency(day.diferenca)
        ]);
        const footer = [[
            'TOTAL GERAL',
            formatCurrency(totals.consumo),
            formatCurrency(totals.recebido - totals.abatimento),
            formatCurrency(totals.abatimento),
            formatCurrency(totals.diferenca),
        ]];
        
        autoTable(doc, {
            startY: lastYAfterSideTables + 20,
            margin: { left: 40, right: 40 },
            head: head,
            body: body,
            foot: footer,
            theme: 'striped',
            showFoot: 'lastPage',
            styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'left' },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', halign: 'left' },
            columnStyles: { 
              0: { halign: 'left', cellWidth: 80 },
              1: { halign: 'left' },
              2: { halign: 'left' },
              3: { halign: 'left' },
              4: { halign: 'left' },
            },
            didDrawPage: (hookData) => {
               drawHeaderAndFooter(doc, title, dateRangeStr, params, hookData.pageNumber, (doc as any).internal.getNumberOfPages());
            }
        });
    } else {
        // Render Descriptive Table
        const head = [['Data', 'UH', 'Itens Consumidos', 'Vlr. Consumo', 'Vlr. Recebido', 'Diferença']];
        const body = allLogs.map((log: any) => {
            const itemsDetail = includeItemsInPdf ? Object.entries(log.items).map(([itemId, quantity]) => {
                const item = frigobarItemsList.find(i => i.id === itemId);
                return `${item?.name || 'Desconhecido'}: ${quantity}`;
            }).join('; ') : `(${Object.values(log.items).reduce((s: number, q: any) => s + q, 0)} itens)`;
            const isAntecipado = log.isAntecipado ? '*' : '';
            return [
                log.entryDate, `${isAntecipado}${log.uh}`, itemsDetail,
                formatCurrency(log.totalValue), formatCurrency(log.valorRecebido),
                formatCurrency((log.valorRecebido || 0) - log.totalValue)
            ];
        });
        const footer = [[
            { content: 'TOTAIS', colSpan: 3, styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatCurrency(totals.consumo), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatCurrency(totals.recebido - totals.abatimento), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatCurrency(totals.diferenca), styles: { fontStyle: 'bold', halign: 'left' } }
        ]];
        
        autoTable(doc, {
            startY: lastYAfterSideTables + 20,
            margin: { left: 40, right: 40 },
            head: head, body: body, foot: footer, theme: 'striped', showFoot: 'lastPage',
            styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'left' },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 
                0: { cellWidth: 55, halign: 'left' }, 
                1: { cellWidth: 40, halign: 'left' }, 
                2: { cellWidth: 'auto', halign: 'left' }, 
                3: { halign: 'left', cellWidth: 70 }, 
                4: { halign: 'left', cellWidth: 70 }, 
                5: { halign: 'left', cellWidth: 70 } 
            },
            didDrawPage: (hookData) => {
               drawHeaderAndFooter(doc, title, dateRangeStr, params, hookData.pageNumber, (doc as any).internal.getNumberOfPages());
            }
        });
    }

    if (includeItemsInPdf && itemsSummary.length > 0) {
        doc.addPage();
        drawHeaderAndFooter(doc, "Resumo de Itens - Controle de Frigobar", dateRangeStr, params, (doc as any).internal.getNumberOfPages(), (doc as any).internal.getNumberOfPages());
        const totalItemsQtd = itemsSummary.reduce((acc: number, item: any) => acc + item.qtd, 0);
        autoTable(doc, {
            head: [['Item', 'Qtd', 'Valor']],
            body: itemsSummary.map((item: any) => [item.name, item.qtd, formatCurrency(item.valor)]),
            foot: [[{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: totalItemsQtd.toString(), styles: { fontStyle: 'bold', halign: 'left' } }, { content: formatCurrency(totals.consumo), styles: { fontStyle: 'bold', halign: 'left' } }]],
            startY: 100, theme: 'grid', styles: { fontSize: 9, cellPadding: 5 },
            headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold', halign: 'left' },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 
              0: { halign: 'left' },
              1: { halign: 'left' }, 
              2: { halign: 'left' } 
            }
        });
    }
};
