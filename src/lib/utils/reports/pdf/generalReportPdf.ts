import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { ExportParams } from '../types';

const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatQty = (value: number | undefined) => Number(value || 0).toLocaleString('pt-BR');

export const generateGeneralReportPdf = (doc: jsPDF, params: ExportParams, dateRangeStr: string) => {
    const { reportData, visiblePeriods, companyName } = params;

    if (reportData?.type !== 'general') return;
    const data = reportData.data;
    
    // Consolidate "Almoço" periods and respect visibility
    const reportablePeriods = visiblePeriods.reduce((acc, p) => {
        if (p.type !== 'entry' || p.id === 'madrugada') return acc; // Exclude madrugada as it's part of Room Service
        if (p.id.includes('almoco')) {
            if (!acc.find(item => item.id === 'almoco')) {
                acc.push({ ...p, id: 'almoco', label: 'Almoço' });
            }
        } else {
            acc.push(p);
        }
        return acc;
    }, [] as any[]);

    const roomServiceDef = { id: 'roomService', label: 'Room Service' };
    const allHeaders = [roomServiceDef, ...reportablePeriods];
    
    const head = [
        ['Data', ...allHeaders.map(h => h.label), 'Total GERAL', 'Reajuste C.I', 'Total LÍQUIDO']
    ];
    
    const body = data.dailyBreakdowns.map(row => {
        const almocoTotal = {
            qtd: (row.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (row.periodTotals['almocoSegundoTurno']?.qtd ?? 0),
            valor: (row.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (row.periodTotals['almocoSegundoTurno']?.valor ?? 0)
        };
        const periodTotalsForDay = { ...row.periodTotals, almoco: almocoTotal };
        
        return [
            row.date,
            ...allHeaders.map(h => {
                const periodTotal = periodTotalsForDay[h.id as keyof typeof periodTotalsForDay] || { qtd: 0, valor: 0 };
                return `${formatCurrency(periodTotal.valor)}\n(${formatQty(periodTotal.qtd)} qtd)`;
            }),
            `${formatCurrency(row.totalComCI)}\n(${formatQty(row.totalQtd)} qtd)`,
            formatCurrency(row.totalReajusteCI),
            formatCurrency(row.totalSemCI),
        ];
    });
    
    const almocoTotalSummary = {
        qtd: (data.summary.periodTotals['almocoPrimeiroTurno']?.qtd ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.qtd ?? 0),
        valor: (data.summary.periodTotals['almocoPrimeiroTurno']?.valor ?? 0) + (data.summary.periodTotals['almocoSegundoTurno']?.valor ?? 0)
    };
    const periodTotalsForSummary = { ...data.summary.periodTotals, almoco: almocoTotalSummary };

    const footer = [[
        'TOTAL',
        ...allHeaders.map(h => {
             const periodTotal = periodTotalsForSummary[h.id as keyof typeof periodTotalsForSummary] || { qtd: 0, valor: 0 };
             return `${formatCurrency(periodTotal.valor)}\n(${formatQty(periodTotal.qtd)} qtd)`;
        }),
        `${formatCurrency(data.summary.grandTotalComCI)}\n(${formatQty(data.summary.grandTotalQtd)} qtd)`,
        formatCurrency(data.summary.grandTotalReajusteCI),
        formatCurrency(data.summary.grandTotalSemCI)
    ]];

    autoTable(doc, {
        head: head,
        body: body,
        foot: footer,
        startY: 95,
        theme: 'striped',
        styles: { fontSize: 6, cellPadding: 2, overflow: 'linebreak', halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7 },
        footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', fontSize: 7, halign: 'center' },
        didDrawPage: (data) => {
            let finalY = 30;
            doc.setFontSize(14);
            doc.text(companyName || "Avalon Restaurante e Eventos Ltda", 40, finalY);
            finalY += 15;
            doc.setFontSize(10);
            doc.text(`Relatório Geral - ${reportData.data.reportTitle}`, 40, finalY);
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
            }

            doc.setFontSize(8);
            const pageCount = doc.internal.pages.length - 1;
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 20);
            doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);
        },
        willDrawPage: (hookData) => {
             // Add summary tables at the end of the last page
            if (hookData.pageNumber === hookData.pageCount) {
                const summary = data.summary;
                const tmGeral = (summary.grandTotalQtd - summary.grandTotalCIQtd > 0)
                    ? summary.grandTotalSemCI / (summary.grandTotalQtd - summary.grandTotalCIQtd)
                    : 0;

                const rsTotal = summary.periodTotals.roomService || { qtd: 0, valor: 0 };
                const tmRS = rsTotal.qtd > 0 ? rsTotal.valor / rsTotal.qtd : 0;

                const almocoQtd = almocoTotalSummary.qtd;
                const almocoValor = almocoTotalSummary.valor;
                const tmAlmoco = almocoQtd > 0 ? almocoValor / almocoQtd : 0;

                const jantarTotal = summary.periodTotals.jantar || { qtd: 0, valor: 0 };
                const tmJantar = jantarTotal.qtd > 0 ? jantarTotal.valor / jantarTotal.qtd : 0;

                const frigobarTotal = summary.periodTotals.frigobar || { qtd: 0, valor: 0 };
                const tmFrigobar = frigobarTotal.qtd > 0 ? frigobarTotal.valor / frigobarTotal.qtd : 0;
                
                const tableStartY = hookData.cursor?.y ? hookData.cursor.y + 20 : 40;
                
                autoTable(doc, {
                    body: [
                        [{ content: 'Receita Total (com CI)', styles: { fontStyle: 'bold' } }, formatCurrency(summary.grandTotalComCI)],
                        [{ content: 'Receita Líquida (sem CI)', styles: { fontStyle: 'bold' } }, formatCurrency(summary.grandTotalSemCI)]
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
                        ['Jantar', formatCurrency(tmJantar)],
                        ['Frigobar', formatCurrency(tmFrigobar)]
                    ],
                    startY: tableStartY,
                    theme: 'grid',
                    tableWidth: 250,
                    margin: { left: 300 },
                    headStyles: { fontStyle: 'bold' },
                    columnStyles: { 1: { halign: 'right' } }
                });
            }
        }
    });
};
