
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportParams, CafeManhaNoShowItem } from '../types';
import { getControleCafeItems } from '../exportUtils';
import { drawHeaderAndFooter } from './pdfUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

interface DezenaTotals {
    items: number;
    valor: number;
}

export const generateNoShowPdf = async (doc: jsPDF, params: ExportParams) => {
    const { entries, range, selectedDezena } = params;

    const dateRangeStr = range?.from 
      ? `${format(range.from, 'dd/MM/yyyy', { locale: ptBR })} a ${range.to ? format(range.to, 'dd/MM/yyyy', { locale: ptBR }) : format(range.from, 'dd/MM/yyyy', { locale: ptBR })}`
      : "Período não definido";
      
    const title = 'Relatório de No-Show - Café da Manhã';
    
    const allItemsForMonth = getControleCafeItems(entries, 'no-show') as (CafeManhaNoShowItem & {entryDate: string})[];

    const filterByDezena = (itemDateStr: string, dezena: string) => {
        const itemDate = parseISO(itemDateStr.split('/').reverse().join('-'));
        const dia = getDate(itemDate);

        if (dezena === '1') return dia >= 1 && dia <= 10;
        if (dezena === '2') return dia >= 11 && dia <= 20;
        if (dezena === '3') return dia >= 21;
        
        return false;
    };
    
    const dezenasToProcess = selectedDezena && selectedDezena !== 'all' ? [selectedDezena] : ['1', '2', '3'];

    let pageCounter = 0;
    const dezenasComDados = dezenasToProcess.filter(d => allItemsForMonth.some(item => filterByDezena(item.entryDate, d)));
    const totalPagesForThisExport = dezenasComDados.length;
    
    for (const dezena of dezenasComDados) {
        const itemsForDezena = allItemsForMonth.filter(item => filterByDezena(item.entryDate, dezena));
        
        pageCounter++;
        if (pageCounter > 1) {
            doc.addPage();
        }
        
        const totalValor = itemsForDezena.reduce((sum, item) => sum + (item.valor || 0), 0);
        const dezenaTotals: DezenaTotals = { items: itemsForDezena.length, valor: totalValor };
        
        const subTitle = `${title} - ${dezena}ª Dezena`;
        let startY = drawHeaderAndFooter(doc, subTitle, dateRangeStr, params, 1, 1);
        startY += 50;

        const head = [['Data', 'Horário', 'Hóspede', 'UH', 'Reserva', 'Valor', 'Obs']];
        const body = itemsForDezena.map(item => [item.entryDate, item.horario || '-', item.hospede || '-', item.uh || '-', item.reserva || '-', formatCurrency(item.valor), item.observation || '-']);
        
        const footer = [[{ content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalValor), styles: { fontStyle: 'bold', halign: 'right' } }, '']];
        
        autoTable(doc, { 
            head, 
            body, 
            foot: footer,
            theme: 'striped', 
            styles: { fontSize: 8 },
            headStyles: { halign: 'center' },
            footStyles: { halign: 'center', fillColor: [230, 230, 230], textColor: 0 },
            columnStyles: {
                0: { cellWidth: 55 }, 
                1: { cellWidth: 40 },
                2: { cellWidth: 120 },
                3: { cellWidth: 30 }, 
                4: { cellWidth: 65 },
                5: { cellWidth: 50, halign: 'right' },
                6: { cellWidth: 'auto' },
            },
            margin: { top: startY },
            didDrawPage: (hookData) => {
                const isNewAutoTablePage = hookData.pageNumber > 1;
                const finalPageNumber = pageCounter + hookData.pageNumber - 1;
                 if (isNewAutoTablePage) {
                    startY = drawHeaderAndFooter(doc, subTitle, dateRangeStr, params, finalPageNumber, totalPagesForThisExport);
                 }
            }
        });

        autoTable(doc, {
            body: [
                [{ content: 'RESUMO NO-SHOW', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }],
                ['Total de Pessoas/Itens', dezenaTotals.items.toLocaleString('pt-BR')],
                ['Valor Total', formatCurrency(dezenaTotals.valor)],
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
