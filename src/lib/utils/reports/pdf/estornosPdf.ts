
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
};

export const generateEstornosPdf = (doc: jsPDF, params: ExportParams) => {
    const { estornos, range, estornoCategory } = params;
    if (!estornos) return;

    const dateRangeStr = range?.from 
      ? `Período: ${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : "Período não definido";

    const categoryTitles: Record<string, string> = {
        'restaurante': 'Restaurante',
        'frigobar': 'Frigobar',
        'room-service': 'Room Service',
    };

    const categoryTitle = estornoCategory && estornoCategory !== 'all' 
        ? `- ${categoryTitles[estornoCategory] || estornoCategory}` 
        : '';
    const title = `Relatório de Estornos ${categoryTitle}`;
    const finalFilterText = `${dateRangeStr}${estornoCategory && estornoCategory !== 'all' ? ` | Categoria: ${categoryTitles[estornoCategory]}` : ''}`;


    const head = [['Data', 'Usuário', 'UH/NF', 'Motivo', 'Obs.', 'Qtd', 'Vlr. Nota', 'Vlr. Estorno', 'Diferença']];
    const body = estornos.map(item => [
        format(parseISO(item.date), 'dd/MM/yy'),
        item.registeredBy || '-',
        `UH: ${item.uh || '-'} / NF: ${item.nf || '-'}`,
        ESTORNO_REASON_LABELS[item.reason] || item.reason,
        item.observation || '-',
        formatQty(item.quantity),
        formatCurrency(item.valorTotalNota),
        formatCurrency(item.valorEstorno),
        formatCurrency((item.valorTotalNota || 0) - (item.valorEstorno || 0))
    ]);
    
    const totals = estornos.reduce((acc, item) => {
        acc.qtd += item.quantity || 0;
        acc.valorTotalNota += item.valorTotalNota || 0;
        acc.valorEstorno += item.valorEstorno || 0;
        acc.diferenca += (item.valorTotalNota || 0) - (item.valorEstorno || 0);
        return acc;
    }, { qtd: 0, valorTotalNota: 0, valorEstorno: 0, diferenca: 0 });

    const footer = [[
        { content: 'TOTAIS', colSpan: 5, styles: { fontStyle: 'bold' } },
        { content: formatQty(totals.qtd), styles: { fontStyle: 'bold', halign: 'right' } },
        formatCurrency(totals.valorTotalNota),
        { content: formatCurrency(totals.valorEstorno), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totals.diferenca), styles: { fontStyle: 'bold', halign: 'right' } }
    ]];
    
    const headerHeight = drawHeaderAndFooter(doc, title, finalFilterText, params, 1, (doc as any).internal.getNumberOfPages());

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
            0: { cellWidth: 40 },
            1: { cellWidth: 60 },
            2: { cellWidth: 60 },
            3: { cellWidth: 70 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 30, halign: 'right' },
            6: { cellWidth: 50, halign: 'right' },
            7: { cellWidth: 50, halign: 'right' },
            8: { cellWidth: 50, halign: 'right' },
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
