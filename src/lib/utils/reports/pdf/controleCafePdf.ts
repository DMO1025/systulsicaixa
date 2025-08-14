import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, getDate, getMonth, getYear, addMonths, lastDayOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { ExportParams, ControleCafeItem, ChannelUnitPricesConfig } from '../types';
import { getControleCafeItems } from '../exportUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

interface DezenaTotals {
    adultoQtd: number;
    crianca01Qtd: number;
    crianca02Qtd: number;
    contagemManual: number;
    semCheckIn: number;
    totalGeral: number;
    totalValor: number;
}

const drawHeaderAndFooter = (doc: jsPDF, title: string, dateStr: string, pageNumber: number, totalPages: number, companyName?: string) => {
    let finalY = 30;
    doc.setFontSize(14);
    doc.text(companyName || "Avalon Restaurante e Eventos Ltda", 40, finalY);
    finalY += 15;
    doc.setFontSize(10);
    doc.text(title, 40, finalY);
    finalY += 13;
    doc.setFontSize(9);
    doc.text(dateStr, 40, finalY);
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
    
    doc.setFontSize(8);
    if (totalPages > 1) {
        doc.text(`Página ${pageNumber} de ${totalPages}`, doc.internal.pageSize.width - 70, doc.internal.pageSize.height - 20);
    }
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);
    
    return finalY;
};

export const generateControleCafePdf = async (doc: jsPDF, params: ExportParams) => {
    const { entries, month, selectedDezena, companyName, unitPrices } = params;

    const cafePrice = unitPrices?.cdmListaHospedes || 0;
    const monthStart = month ? new Date(month.getFullYear(), month.getMonth(), 1) : new Date();
    const dateRangeStr = format(monthStart, "MMMM 'de' yyyy", { locale: ptBR });
    const title = 'Relatório de Controle - Café da Manhã';
    
    const mesSelecionado = getMonth(monthStart);
    const anoSelecionado = getYear(monthStart);
    
    const allItemsForMonth = getControleCafeItems(entries, 'controle') as (Partial<ControleCafeItem> & {entryDate: string})[];

    const filterByDezena = (itemDateStr: string, dezena: string) => {
        const itemDate = parseISO(itemDateStr.split('/').reverse().join('-'));
        const dia = getDate(itemDate);
        const proximoMes = addMonths(new Date(anoSelecionado, mesSelecionado, 1), 1);
        const mesDoProximoMes = getMonth(proximoMes);
        const anoDoProximoMes = getYear(proximoMes);
        const mesLancamento = getMonth(itemDate);
        const anoLancamento = getYear(itemDate);
        
        if (dezena === '1') return dia >= 2 && dia <= 11;
        if (dezena === '2') return dia >= 12 && dia <= 21;
        if (dezena === '3') {
            if (mesLancamento === mesSelecionado && anoLancamento === anoSelecionado && dia >= 22) {
                return true;
            }
            if (mesLancamento === mesDoProximoMes && anoLancamento === anoDoProximoMes && dia === 1) {
                return true;
            }
        }
        return false;
    };
    
    const dezenasToProcess = selectedDezena && selectedDezena !== 'all' ? [selectedDezena] : ['1', '2', '3'];

    let pageCounter = 0;
    
    const totalPagesForThisExport = dezenasToProcess.filter(d => allItemsForMonth.some(item => filterByDezena(item.entryDate, d))).length;

    for (const dezena of dezenasToProcess) {
        const itemsForDezena = allItemsForMonth.filter(item => filterByDezena(item.entryDate, dezena));
        
        if (itemsForDezena.length === 0) continue;
        
        pageCounter++;
        if (pageCounter > 1) {
            doc.addPage();
        }

        const head = [['Data', 'Adultos', 'Criança 01', 'Criança 02', 'Cont. Manual', 'Sem Check-in', 'Total Dia', 'Valor Dia (R$)']];
        const dezenaTotals: DezenaTotals = { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0, totalGeral: 0, totalValor: 0 };
        
        const body = itemsForDezena.map(item => {
            const totalDia = (item.adultoQtd || 0) + (item.crianca01Qtd || 0) + (item.crianca02Qtd || 0) + (item.contagemManual || 0) + (item.semCheckIn || 0);
            const valorDia = totalDia * cafePrice;
            
            dezenaTotals.adultoQtd += item.adultoQtd || 0;
            dezenaTotals.crianca01Qtd += item.crianca01Qtd || 0;
            dezenaTotals.crianca02Qtd += item.crianca02Qtd || 0;
            dezenaTotals.contagemManual += item.contagemManual || 0;
            dezenaTotals.semCheckIn += item.semCheckIn || 0;
            dezenaTotals.totalGeral += totalDia;
            dezenaTotals.totalValor += valorDia;
            
            return [item.entryDate, formatQty(item.adultoQtd), formatQty(item.crianca01Qtd), formatQty(item.crianca02Qtd), formatQty(item.contagemManual), formatQty(item.semCheckIn), formatQty(totalDia), formatCurrency(valorDia)];
        });

        const startY = drawHeaderAndFooter(doc, `${title} - ${dezena}ª Dezena`, dateRangeStr, pageCounter, totalPagesForThisExport, companyName);
        
        const footer = [[
            { content: 'TOTAL', styles: { fontStyle: 'bold' } }, 
            { content: formatQty(dezenaTotals.adultoQtd), styles: { fontStyle: 'bold' } },
            { content: formatQty(dezenaTotals.crianca01Qtd), styles: { fontStyle: 'bold' } },
            { content: formatQty(dezenaTotals.crianca02Qtd), styles: { fontStyle: 'bold' } },
            { content: formatQty(dezenaTotals.contagemManual), styles: { fontStyle: 'bold' } },
            { content: formatQty(dezenaTotals.semCheckIn), styles: { fontStyle: 'bold' } },
            { content: formatQty(dezenaTotals.totalGeral), styles: { fontStyle: 'bold' } },
            { content: formatCurrency(dezenaTotals.totalValor), styles: { fontStyle: 'bold' } },
        ]];

        autoTable(doc, { 
            head, 
            body,
            foot: footer,
            startY: startY + 5, 
            theme: 'striped', 
            styles: { fontSize: 8 }, 
            headStyles: { halign: 'center' }, 
            bodyStyles: { halign: 'center' },
            footStyles: { halign: 'center', fillColor: [230, 230, 230], textColor: 0 }
        });

        // Add summary table below the main table
        const totalCriancas = dezenaTotals.crianca01Qtd + dezenaTotals.crianca02Qtd;
        autoTable(doc, {
            body: [
                [{ content: 'RESUMO FISCAL', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }],
                ['Total Adultos', formatQty(dezenaTotals.adultoQtd)],
                ['Total Crianças', formatQty(totalCriancas)],
                ['Total Contagem Manual', formatQty(dezenaTotals.contagemManual)],
                ['Total Sem Check-in', formatQty(dezenaTotals.semCheckIn)],
                [{ content: 'Valor Total (R$)', styles: { fontStyle: 'bold' } }, { content: formatCurrency(dezenaTotals.totalValor), styles: { fontStyle: 'bold' } }],
            ],
            startY: (doc as any).lastAutoTable.finalY + 15,
            theme: 'grid',
            styles: { fontSize: 9 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right' }
            },
            tableWidth: 250,
        });
    }
};
