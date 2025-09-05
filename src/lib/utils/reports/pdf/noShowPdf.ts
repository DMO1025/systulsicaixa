import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { ExportParams, CafeManhaNoShowItem } from '../types';
import { getControleCafeItems } from '../exportUtils';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

interface DezenaTotals {
    items: number;
    valor: number;
}

const drawHeaderAndFooter = (doc: jsPDF, title: string, dateStr: string, pageNumber: number, totalPages: number, companyName?: string, includeCompanyData?: boolean) => {
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
    doc.text(dateStr, 40, finalY);
    finalY += 13;
    
    if (includeCompanyData) {
        if (companyName === 'Rubi Restaurante e Eventos Ltda') {
            autoTable(doc, {
                body: [['FAVORECIDO: RUBI RESTAURANTE E EVENTOS LTDA', 'BANCO: ITAÚ (341)'], ['CNPJ: 56.034.124/0001-42', 'AGENCIA: 0641 | CONTA CORRENTE: 98250'],],
                startY: finalY, theme: 'plain', styles: { fontSize: 8, cellPadding: 1 },
            });
        } else if (companyName === 'Avalon Restaurante e Eventos Ltda') {
            autoTable(doc, {
                body: [['FAVORECIDO: AVALON RESTAURANTE E EVENTOS LTDA',  'BANCO: BRADESCO (237)'], ['CNPJ: 08.439.825/0001-19', 'AGENCIA: 07828 | CONTA CORRENTE: 0179750-6'],],
                startY: finalY, theme: 'plain', styles: { fontSize: 8, cellPadding: 1 },
            });
        }
        finalY = (doc as any).lastAutoTable.finalY || finalY;
    }
    
    
    doc.setFontSize(8);
    if (totalPages > 1) {
        doc.text(`Página ${pageNumber} de ${totalPages}`, doc.internal.pageSize.width - 70, doc.internal.pageSize.height - 20);
    }
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);
    
    return finalY;
};

export const generateNoShowPdf = async (doc: jsPDF, params: ExportParams) => {
    const { entries, range, selectedDezena, companyName, includeCompanyData } = params;

    const dateRangeStr = range?.from 
      ? `${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
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
    const totalPagesForThisExport = dezenasToProcess.filter(d => allItemsForMonth.some(item => filterByDezena(item.entryDate, d))).length;
    
    for (const dezena of dezenasToProcess) {
        const itemsForDezena = allItemsForMonth.filter(item => filterByDezena(item.entryDate, dezena));
        
        if (itemsForDezena.length === 0) continue;
        
        pageCounter++;
        if (pageCounter > 1) {
            doc.addPage();
        }
        
        const totalValor = itemsForDezena.reduce((sum, item) => sum + (item.valor || 0), 0);
        const dezenaTotals: DezenaTotals = { items: itemsForDezena.length, valor: totalValor };

        const startY = drawHeaderAndFooter(doc, `${title} - ${dezena}ª Dezena`, dateRangeStr, pageCounter, totalPagesForThisExport, companyName, includeCompanyData);

        const head = [['Data', 'Horário', 'Hóspede', 'UH', 'Reserva', 'Valor', 'Obs']];
        const body = itemsForDezena.map(item => [item.entryDate, item.horario || '-', item.hospede || '-', item.uh || '-', item.reserva || '-', formatCurrency(item.valor), item.observation || '-']);
        
        const footer = [[{ content: 'TOTAL', colSpan: 5, styles: { fontStyle: 'bold' } }, { content: formatCurrency(totalValor), styles: { fontStyle: 'bold', halign: 'right' } }, '']];
        
        autoTable(doc, { 
            head, 
            body, 
            foot: footer,
            startY: startY + 5, 
            theme: 'striped', 
            styles: { fontSize: 8 },
            headStyles: { halign: 'center' },
            footStyles: { halign: 'center', fillColor: [230, 230, 230], textColor: 0 },
            columnStyles: {
                0: { cellWidth: 55 }, 
                1: { cellWidth: 40 },
                2: { cellWidth: 120 }, // Hóspede
                3: { cellWidth: 30 }, 
                4: { cellWidth: 65 }, // Reserva - increased
                5: { cellWidth: 50, halign: 'right' },
                6: { cellWidth: 'auto' }, // Obs
            }
        });

        // Add summary table below the main table
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
