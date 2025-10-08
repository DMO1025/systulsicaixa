

import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { ExportParams, EstornoItem, EstornoReason } from '../types';
import { drawHeaderAndFooter } from './pdfUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

const ESTORNO_REASON_LABELS: Record<EstornoReason, string> = {
    'duplicidade': 'Duplicidade',
    'erro de lancamento': 'Erro de Lançamento',
    'pagamento direto': 'Pagamento Direto',
    'nao consumido': 'Não Consumido',
    'assinatura divergente': 'Assinatura Divergente',
    'cortesia': 'Cortesia',
    'relancamento': 'Relançamento',
};

export const generateEstornosPdf = (doc: jsPDF, params: ExportParams) => {
    const { estornos, range, estornoCategory, estornoReason } = params;
    if (!estornos || estornos.length === 0) return;

    let filteredEstornos = estornos;
    if (estornoCategory && estornoCategory !== 'all') {
      filteredEstornos = filteredEstornos.filter(item => item.category === estornoCategory);
    }
    if (estornoReason && estornoReason !== 'all') {
      filteredEstornos = filteredEstornos.filter(item => item.reason === estornoReason);
    }
    
    const categoryTitles: Record<string, string> = {
        'restaurante': 'Restaurante',
        'frigobar': 'Frigobar',
        'room-service': 'Room Service',
    };
    
    const isSpecificCategory = estornoCategory && estornoCategory !== 'all';
    const categoryTitle = isSpecificCategory ? categoryTitles[estornoCategory] : '';
    const title = `Relatório de Estornos${categoryTitle ? ` - ${categoryTitle}` : ''}`;
    const showCategoryColumn = !isSpecificCategory;

    const dateRangeStr = range?.from 
      ? `Período: ${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : "Período não definido";

    const headerHeight = drawHeaderAndFooter(doc, title, dateRangeStr, params, 1, (doc as any).internal.getNumberOfPages());
    
    const totals = filteredEstornos.reduce((acc, item) => {
        if (item.reason !== 'relancamento') {
          acc.qtd += item.quantity || 0;
          acc.valorTotalNota += item.valorTotalNota || 0;
        }
        acc.valorEstorno += item.valorEstorno || 0;
        
        let diferenca;
        if (!item.valorTotalNota || item.valorTotalNota === 0) {
            diferenca = 0;
        } else if(item.reason === 'relancamento') {
             diferenca = (item.valorTotalNota || 0) - (item.valorEstorno || 0);
        } else {
             diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
        }
        acc.diferenca += diferenca;

        return acc;
    }, { qtd: 0, valorTotalNota: 0, valorEstorno: 0, diferenca: 0 });

    const summaryByReason: Record<string, { qtd: number; valor: number }> = {};
    filteredEstornos.forEach(item => {
        const reason = ESTORNO_REASON_LABELS[item.reason] || item.reason;
        if (!summaryByReason[reason]) {
            summaryByReason[reason] = { qtd: 0, valor: 0 };
        }
        if(item.reason !== 'relancamento') {
             summaryByReason[reason].qtd += item.quantity || 0;
        }
        summaryByReason[reason].valor += item.valorEstorno || 0;
    });

    const summaryReasonBody = Object.entries(summaryByReason).map(([reason, data]) => [
        reason,
        formatQty(data.qtd),
        formatCurrency(data.valor),
    ]);

    const summaryFinancialBody = [
        ['Total de Itens Estornados', formatQty(totals.qtd)],
        ['Valor Total das Notas', formatCurrency(totals.valorTotalNota)],
        ['Balanço de Estornos', formatCurrency(totals.valorEstorno)],
        [{ content: 'Diferença Final', styles: { fontStyle: 'bold' }}, { content: formatCurrency(totals.diferenca), styles: { fontStyle: 'bold' } }],
    ];

    autoTable(doc, {
        head: [['Resumo Financeiro', 'Valor']],
        body: summaryFinancialBody,
        startY: headerHeight,
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
        tableWidth: 250,
        margin: { left: 40 },
    });

    autoTable(doc, {
        head: [['Resumo por Motivo', 'Qtd', 'Valor']],
        body: summaryReasonBody,
        startY: headerHeight,
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 
            0: { fontStyle: 'bold', cellWidth: 120 },
            1: { halign: 'right', cellWidth: 40 },
            2: { halign: 'right', cellWidth: 'auto' }
        },
        tableWidth: 250,
        margin: { left: 320 },
    });

    const headContent = ['Data', 'Usuário', 'UH/NF', 'Motivo', 'Obs.', 'Qtd', 'Vlr. Nota', 'Vlr. Estorno', 'Diferença'];
    if (showCategoryColumn) {
        headContent.splice(1, 0, 'Categoria');
    }
    const head = [headContent];

    const body = filteredEstornos.map(item => {
        const isCredit = item.reason === 'relancamento';
        let diferenca;
        if (!item.valorTotalNota || item.valorTotalNota === 0) {
            diferenca = 0;
        } else if (isCredit) {
            diferenca = (item.valorTotalNota || 0) - (item.valorEstorno || 0);
        } else {
            diferenca = (item.valorTotalNota || 0) + (item.valorEstorno || 0);
        }

        const row = [
            format(parseISO(item.date), 'dd/MM/yy'),
            item.registeredBy || '-',
            `UH: ${item.uh || '-'} / NF: ${item.nf || '-'}`,
            ESTORNO_REASON_LABELS[item.reason] || item.reason,
            item.observation || '-',
            formatQty(item.quantity),
            formatCurrency(item.valorTotalNota),
            { content: formatCurrency(item.valorEstorno), styles: { textColor: isCredit ? '#228B22' : '#DC143C' } },
            formatCurrency(diferenca)
        ];
        
        if (showCategoryColumn) {
            row.splice(1, 0, categoryTitles[item.category] || item.category);
        }
        return row;
    });
    
    const footerColSpan = showCategoryColumn ? 6 : 5;
    const footer = [[
        { content: 'TOTAIS', colSpan: footerColSpan, styles: { fontStyle: 'bold' } },
        { content: formatQty(totals.qtd), styles: { fontStyle: 'bold', halign: 'right' } },
        formatCurrency(totals.valorTotalNota),
        { content: formatCurrency(totals.valorEstorno), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totals.diferenca), styles: { fontStyle: 'bold', halign: 'right' } }
    ]];
    
    const tableStartY = (doc as any).lastAutoTable.finalY + 80;

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        theme: 'striped',
        showFoot: 'lastPage',
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 40 }, // Data
            [showCategoryColumn ? 1 : -1]: { cellWidth: 50 }, // Categoria
            [showCategoryColumn ? 2 : 1]: { cellWidth: 50 }, // Usuário
            [showCategoryColumn ? 3 : 2]: { cellWidth: 60 }, // UH/NF
            [showCategoryColumn ? 4 : 3]: { cellWidth: 60 }, // Motivo
            [showCategoryColumn ? 5 : 4]: { cellWidth: 'auto' }, // Obs
            [showCategoryColumn ? 6 : 5]: { cellWidth: 30, halign: 'right' }, // Qtd
            [showCategoryColumn ? 7 : 6]: { cellWidth: 50, halign: 'right' }, // Vlr Nota
            [showCategoryColumn ? 8 : 7]: { cellWidth: 50, halign: 'right' }, // Vlr Estorno
            [showCategoryColumn ? 9 : 8]: { cellWidth: 50, halign: 'right' }, // Diferença
        },
        startY: tableStartY,
        didDrawPage: (hookData) => {
           const totalPages = (doc as any).internal.getNumberOfPages();
           if(hookData.pageNumber > 1) {
             drawHeaderAndFooter(doc, title, dateRangeStr, params, hookData.pageNumber, totalPages);
           }
        }
    });
};
