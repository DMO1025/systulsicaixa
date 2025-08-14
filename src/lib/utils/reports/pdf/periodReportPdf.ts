import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { ExportParams, DailyCategoryDataItem } from '../types';
import { TAB_DEFINITIONS } from '@/components/reports/tabDefinitions';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

export const generatePeriodReportPdf = (doc: jsPDF, params: ExportParams, dateRangeStr: string) => {
    const { reportData, companyName } = params;
    if (reportData?.type !== 'period') return;
    const data = reportData.data;
    
    let finalY = 30;
    
    doc.setFontSize(14);
    doc.text(companyName || "Avalon Restaurante e Eventos Ltda", 40, finalY);
    finalY += 15;
    doc.setFontSize(10);
    doc.text(`Relatório Por Período: ${data.reportTitle}`, 40, finalY);
    finalY += 13;
    doc.setFontSize(9);
    doc.text(dateRangeStr, 40, finalY);
    finalY += 13;

    if (companyName === 'Rubi Restaurante e Eventos Ltda') {
        autoTable(doc, {
            body: [
                ['FAVORECIDO: RUBI RESTAURANTE E EVENTOS LTDA', 'BANCO: ITAÚ (341)'],
                ['CNPJ: 56.034.124/0001-42', 'AGENCIA: 0641 | CONTA CORRENTE: 98250'],
            ],
            startY: finalY,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    finalY += 10;
    
    Object.entries(data.dailyBreakdowns).forEach(([categoryId, items], index) => {
        if (items.length === 0) return;
        
        const tabDef = TAB_DEFINITIONS.find(t => t.id === categoryId);
        if (!tabDef) return;
        
        // Reorder columns to ensure Qtd comes before Valor
        const sortedCols = [...tabDef.cols].sort((a, b) => {
            if (a.key.toLowerCase().includes('qtd') || a.key.toLowerCase().includes('quantity')) return -1;
            if (b.key.toLowerCase().includes('qtd') || b.key.toLowerCase().includes('quantity')) return 1;
            if (a.key.toLowerCase().includes('valor') || a.key.toLowerCase().includes('value')) return 1;
            if (b.key.toLowerCase().includes('valor') || b.key.toLowerCase().includes('value')) return -1;
            return 0;
        });

        const head = [sortedCols.map(col => col.label)];
        const body = items.map(item => sortedCols.map(col => {
            const val = (item as any)[col.key];
            if (col.isCurrency) return formatCurrency(val);
            if (col.isNum) return formatQty(val);
            return val || '-';
        }));
        
        const summary = data.summary[categoryId];
        const footer = [];
        if (summary) {
            const footerRow: any[] = [{ content: 'TOTAL', colSpan: 1, styles: { fontStyle: 'bold' } }];
            sortedCols.slice(1).forEach(col => {
                if (col.key === 'qtd' || col.key === 'quantity') footerRow.push({ content: formatQty(summary.qtd), styles: { fontStyle: 'bold', halign: 'right' } });
                else if (col.key === 'valor' || col.key === 'total' || col.key === 'totalValue') footerRow.push({ content: formatCurrency(summary.total), styles: { fontStyle: 'bold', halign: 'right' } });
                else footerRow.push('');
            });
            footer.push(footerRow);
        }
        
        autoTable(doc, {
            head: [[tabDef.label]],
            startY: finalY,
            headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
        });
        
        autoTable(doc, {
            head: head,
            body: body,
            foot: footer,
            startY: (doc as any).lastAutoTable.finalY,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [240, 240, 240], textColor: 0 },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        });
        finalY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Summary tables at the end
    const tableStartY = finalY > doc.internal.pageSize.height - 150 ? 40 : finalY;
    if (finalY > doc.internal.pageSize.height - 150) doc.addPage();

    const grandTotalComCI = data.subtotalGeralComCI.total;
    const grandTotalSemCI = data.subtotalGeralSemCI.total;
    const ticketMedio = data.subtotalGeralSemCI.qtd > 0 ? grandTotalSemCI / data.subtotalGeralSemCI.qtd : 0;
    
    const summary = data.summary;
    const rsTotal = summary['rsMadrugada']?.total || 0 + summary['rsAlmocoPT']?.total || 0 + summary['rsAlmocoST']?.total || 0 + summary['rsJantar']?.total || 0;
    const rsQtd = summary['rsMadrugada']?.qtd || 0 + summary['rsAlmocoPT']?.qtd || 0 + summary['rsAlmocoST']?.qtd || 0 + summary['rsJantar']?.qtd || 0;
    const tmRS = rsQtd > 0 ? rsTotal / rsQtd : 0;

    const almocoQtd = (summary['mesa']?.qtd ?? 0) + (summary['hospedes']?.qtd ?? 0); // Simplified for now
    const almocoValor = (summary['mesa']?.total ?? 0) + (summary['hospedes']?.total ?? 0);
    const tmAlmoco = almocoQtd > 0 ? almocoValor / almocoQtd : 0;


    autoTable(doc, {
        body: [
            [{ content: 'Receita Total (com CI)', styles: { fontStyle: 'bold' } }, formatCurrency(grandTotalComCI)],
            [{ content: 'Receita Líquida (sem CI)', styles: { fontStyle: 'bold' } }, formatCurrency(grandTotalSemCI)]
        ],
        startY: tableStartY,
        theme: 'grid',
        tableWidth: 250,
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: 'right' } }
    });

    autoTable(doc, {
        head: [['Ticket Médio Serviços Restaurante']],
        body: [
            ['Room Service', formatCurrency(tmRS)],
            ['Almoço', formatCurrency(tmAlmoco)],
            ['Jantar', formatCurrency(0)], // Placeholder
            ['Frigobar', formatCurrency(0)] // Placeholder
        ],
        startY: tableStartY,
        theme: 'grid',
        tableWidth: 250,
        margin: { left: 300 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' } }
    });


    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 20);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);
    }
};
