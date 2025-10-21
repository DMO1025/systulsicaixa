
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, getDate, getMonth, getYear, addMonths, lastDayOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportParams, ControleCafeItem, ChannelUnitPricesConfig, DailyLogEntry, CafeManhaNoShowItem } from '../types';
import { getControleCafeItems } from '../exportUtils';
import { drawHeaderAndFooter } from './pdfUtils';

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

export const generateControleCafePdf = async (doc: jsPDF, params: ExportParams) => {
    const { entries, range, selectedDezena, unitPrices } = params;

    const cafePrice = unitPrices?.cdmListaHospedes || 0;
    const dateRangeStr = range?.from 
      ? `${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : "Período não definido";
    const title = 'Relatório de Controle - Café da Manhã';
    
    const mesSelecionado = range?.from ? getMonth(range.from) : new Date().getMonth();
    const anoSelecionado = range?.from ? getYear(range.from) : new Date().getFullYear();
    
    const allItemsForMonth = getControleCafeItems(entries, 'controle') as (Partial<ControleCafeItem> & {entryDate: string})[];

    const filterByDezena = (itemDateStr: string, dezena: string) => {
        const itemDate = parseISO(itemDateStr.split('/').reverse().join('-'));
        const dia = getDate(itemDate);
        const mes = getMonth(itemDate);
        const ano = getYear(itemDate);

        // Date logic specific to this report (from day 2 to day 1 of next month)
        const firstDayOfMonth = new Date(anoSelecionado, mesSelecionado, 1);
        const nextMonthDate = addMonths(firstDayOfMonth, 1);
        const nextMonth = getMonth(nextMonthDate);
        const nextMonthYear = getYear(nextMonthDate);
        
        if (dezena === '1') { // Dias 2 a 11 do mês selecionado
            return mes === mesSelecionado && ano === anoSelecionado && dia >= 2 && dia <= 11;
        }
        if (dezena === '2') { // Dias 12 a 21 do mês selecionado
            return mes === mesSelecionado && ano === anoSelecionado && dia >= 12 && dia <= 21;
        }
        if (dezena === '3') { // Dias 22 do mês selecionado até dia 1 do próximo mês
            if (mes === mesSelecionado && ano === anoSelecionado && dia >= 22) return true;
            if (mes === nextMonth && ano === nextMonthYear && dia === 1) return true;
        }
        return false;
    };
    
    const dezenasToProcess = selectedDezena && selectedDezena !== 'all' ? [selectedDezena] : ['1', '2', '3'];

    let pageCounter = 0;
    
    const dezenasComDados = dezenasToProcess.filter(d => allItemsForMonth.some(item => filterByDezena(item.entryDate, d)));
    const totalPagesForThisExport = dezenasComDados.length;

    if (dezenasComDados.length === 0) {
        // Draw a single page saying no data
        drawHeaderAndFooter(doc, title, dateRangeStr, params, 1, 1);
        doc.text("Nenhum dado encontrado para o período e filtros selecionados.", 40, 150);
        return;
    }

    for (const dezena of dezenasComDados) {
        const itemsForDezena = allItemsForMonth.filter(item => filterByDezena(item.entryDate, dezena));
        
        pageCounter++;
        if (pageCounter > 1) {
            doc.addPage();
        }
        
        const subTitle = `${title} - ${dezena}ª Dezena`;
        let startY = drawHeaderAndFooter(doc, subTitle, dateRangeStr, params, pageCounter, totalPagesForThisExport);
        startY += 50;

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

        const footer = [[
            { content: 'TOTAL', styles: { fontStyle: 'bold' } }, 
            { content: formatQty(dezenaTotals.adultoQtd), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatQty(dezenaTotals.crianca01Qtd), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatQty(dezenaTotals.crianca02Qtd), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatQty(dezenaTotals.contagemManual), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatQty(dezenaTotals.semCheckIn), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatQty(dezenaTotals.totalGeral), styles: { fontStyle: 'bold', halign: 'left' } },
            { content: formatCurrency(dezenaTotals.totalValor), styles: { fontStyle: 'bold', halign: 'left' } },
        ]];

        autoTable(doc, { 
            head, 
            body,
            foot: footer,
            theme: 'striped', 
            styles: { fontSize: 8, halign: 'left' }, 
            headStyles: { halign: 'left' }, 
            bodyStyles: { halign: 'left' },
            footStyles: { halign: 'left', fillColor: [230, 230, 230], textColor: 0 },
            margin: { top: startY },
            didDrawPage: (hookData) => {
                if (totalPagesForThisExport > 1) {
                    drawHeaderAndFooter(doc, subTitle, dateRangeStr, params, hookData.pageNumber, totalPagesForThisExport);
                }
            }
        });

        const totalCriancas = dezenaTotals.crianca01Qtd + dezenaTotals.crianca02Qtd;
        autoTable(doc, {
            body: [
                [{ content: 'RESUMO FISCAL', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }],
                ['Total Adultos:', formatQty(dezenaTotals.adultoQtd)],
                ['Total Crianças:', formatQty(totalCriancas)],
                ['Total Contagem Manual:', formatQty(dezenaTotals.contagemManual)],
                ['Total Sem Check-in:', formatQty(dezenaTotals.semCheckIn)],
                [{ content: 'Total de Pessoas', styles: { fontStyle: 'bold' } }, { content: formatQty(dezenaTotals.totalGeral), styles: { fontStyle: 'bold' } }],
                [{ content: 'Valor Total (R$)', styles: { fontStyle: 'bold' } }, { content: formatCurrency(dezenaTotals.totalValor), styles: { fontStyle: 'bold' } }],
            ],
            startY: (doc as any).lastAutoTable.finalY + 15,
            theme: 'grid',
            styles: { fontSize: 9, halign: 'left' },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'left' }
            },
            tableWidth: 250,
        });
    }
};
