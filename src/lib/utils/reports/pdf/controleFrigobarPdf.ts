
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { ExportParams, DailyLogEntry, FrigobarConsumptionLog, FrigobarItem, ReportExportData } from '../types';
import { getSetting } from '@/services/settingsService';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export const generateControleFrigobarPdf = async (doc: jsPDF, params: ExportParams) => {
    const { range, includeItemsInPdf, reportData } = params;

    const dateRangeStr = range?.from 
      ? `Período: ${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : "Período não definido";
    const title = `Relatório de Controle de Frigobar`;

    if (!reportData || !reportData.summary || !reportData.details) {
        doc.text("Nenhum dado encontrado para este relatório.", 40, 150);
        return;
    }

    const allLogs = (reportData.details.allLogs as any[]) || [];
    const summary = reportData.summary;
    const totals = summary.financeiro;
    const checkouts = summary.checkouts;
    const frigobarItemsList: FrigobarItem[] = (await getSetting('frigobarItems')) || [];
    
    // Cabeçalho
    doc.setFontSize(14);
    doc.text(params.companyName || "Empresa", 40, 40);
    doc.setFontSize(10);
    doc.text(title, 40, 60);
    doc.text(dateRangeStr, 40, 75);

    // Resumos
    let startYResumos = 100;
    startYResumos += 30; // Extra margin

    autoTable(doc, {
        startY: startYResumos,
        margin: { left: 40 },
        head: [['Resumo Financeiro', 'Valor']],
        body: [
            ['Total de Quartos Atendidos', new Set((allLogs || []).map((log: any) => log.uh)).size.toLocaleString('pt-BR')],
            ['Total de Itens Vendidos', summary.itemsSummary.reduce((acc: number, item: any) => acc + item.qtd, 0).toLocaleString('pt-BR')],
            ['Total Consumido (R$)', formatCurrency(totals.consumo)],
            ['Total Recebido (R$)', formatCurrency(totals.recebido)],
            [{ content: 'Diferença Total (R$)', styles: { fontStyle: 'bold' } }, { content: formatCurrency(totals.diferenca), styles: { fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: '#f0f0f0', textColor: 0, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
        tableWidth: 250,
    });
    
    autoTable(doc, {
        startY: startYResumos,
        head: [["Resumo Check-outs", "Quantidade"]],
        body: [
            ['Check-outs Previstos', checkouts.previstos.toLocaleString('pt-BR')],
            ['Check-outs Prorrogados', checkouts.prorrogados.toLocaleString('pt-BR')],
            ['Check-outs Antecipados', checkouts.antecipados.toLocaleString('pt-BR')],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: '#f0f0f0', textColor: 0, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }},
        tableWidth: 250,
        margin: { left: 320 }
    });
    
    // Tabela de Consumo
    const head = [['Data', 'UH', 'Itens Consumidos', 'Vlr. Consumo', 'Vlr. Recebido', 'Diferença']];
    const body = allLogs.map((log: any) => {
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

    const footer = [[
        { content: 'TOTAIS', colSpan: 3, styles: { fontStyle: 'bold' } },
        { content: formatCurrency(totals.consumo), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totals.recebido), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totals.diferenca), styles: { fontStyle: 'bold', halign: 'right' } }
    ]];

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 80,
        margin: { left: 40, right: 40 },
        head: head,
        body: body,
        foot: footer,
        theme: 'striped',
        showFoot: 'lastPage',
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 40 },
            2: { cellWidth: 'auto' }, 
            3: { halign: 'right', cellWidth: 70 }, 
            4: { halign: 'right', cellWidth: 70 }, 
            5: { halign: 'right', cellWidth: 70 } 
        },
    });

    if (includeItemsInPdf && summary.itemsSummary.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text(params.companyName || "Empresa", 40, 40);
        doc.setFontSize(10);
        doc.text("Relatório de Controle de Frigobar - Resumo de Itens", 40, 60);
        doc.text(dateRangeStr, 40, 75);

        const totalItemsQtd = summary.itemsSummary.reduce((acc: number, item: any) => acc + item.qtd, 0);
        const totalItemsValor = summary.itemsSummary.reduce((acc: number, item: any) => acc + item.valor, 0);
        
        autoTable(doc, {
            head: [['Item', 'Qtd', 'Valor']],
            body: summary.itemsSummary.map((item: any) => [item.name, item.qtd, formatCurrency(item.valor)]),
            foot: [[{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: totalItemsQtd.toString(), styles: { fontStyle: 'bold', halign: 'right' } }, { content: formatCurrency(totalItemsValor), styles: { fontStyle: 'bold', halign: 'right' } }]],
            startY: 100,
            margin: { left: 40, right: 40 },
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 5 },
            headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
        });
    }
};
