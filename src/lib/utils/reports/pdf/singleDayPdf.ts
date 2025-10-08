
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportParams, PeriodData, EventosPeriodData, SalesChannelId } from '../types';
import { processEntryForTotals as calculateTotals } from '@/lib/utils/api/v1/calculations';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';
import { drawHeaderAndFooter } from './pdfUtils';


const formatCurrency = (value: number | undefined) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const formatNumber = (value: number | undefined) => (value || 0).toLocaleString('pt-BR');

const renderPeriodDataVertical = (periodData: PeriodData) => {
    const body: (string | number)[][] = [];

    const addRow = (label: string, value: string | number) => {
        body.push([label, value]);
    };

    if (!periodData) {
        return body;
    }

    if (periodData.channels) {
        Object.entries(periodData.channels).forEach(([channelId, values]) => {
            if (values && (values.qtd !== undefined || values.vtotal !== undefined)) {
                 const label = SALES_CHANNELS[channelId as SalesChannelId] || channelId;
                 const parts = [];
                 if(values.qtd) parts.push(`Qtd: ${formatNumber(values.qtd)}`);
                 if(values.vtotal) parts.push(`Valor: ${formatCurrency(values.vtotal)}`);
                 addRow(label, parts.join(' / '));
            }
        });
    }

    if (periodData.subTabs) {
        Object.entries(periodData.subTabs).forEach(([subTabKey, subTabData]) => {
            const subTabRows: (string|number)[][] = [];
             if (subTabData?.channels) {
                 Object.entries(subTabData.channels).forEach(([channelId, values]) => {
                    if (values && (values.qtd || values.vtotal)) {
                        const label = SALES_CHANNELS[channelId as SalesChannelId] || channelId;
                        const parts = [];
                        if(values.qtd) parts.push(`Qtd: ${formatNumber(values.qtd)}`);
                        if(values.vtotal) parts.push(`Valor: ${formatCurrency(values.vtotal)}`);
                        subTabRows.push([`  ${label}`, parts.join(' / ')]);
                    }
                 });
            }
             if (subTabRows.length > 0) {
                body.push([{ content: subTabKey.toUpperCase(), colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f0f0f0' } }]);
                body.push(...subTabRows);
            }
        });
    }
    
    return body.filter(row => row[1] !== '-' && row[1] !== formatCurrency(0) && row[1] !== '0' && row[1] !== 'Qtd: 0 / Valor: R$ 0,00' && row[1] !== '');
};


const renderEventosDataVertical = (eventosData: EventosPeriodData) => {
    const body: (string | number)[][] = [];
    (eventosData.items || []).forEach(item => {
        if (!item.eventName && (!item.subEvents || item.subEvents.length === 0)) return;
        body.push([{ content: item.eventName || 'Evento', colSpan: 2, styles: { fontStyle: 'bold' } }]);
        (item.subEvents || []).forEach(sub => {
            const serviceLabel = sub.serviceType === 'OUTRO' 
                ? sub.customServiceDescription || 'Outro' 
                : EVENT_SERVICE_TYPE_OPTIONS.find(opt => opt.value === sub.serviceType)?.label || sub.serviceType;
            const locationLabel = EVENT_LOCATION_OPTIONS.find(opt => opt.value === sub.location)?.label || sub.location;
            const parts = [];
            if(sub.quantity) parts.push(`Qtd: ${formatNumber(sub.quantity)}`);
            if(sub.totalValue) parts.push(`Valor: ${formatCurrency(sub.totalValue)}`);

            if (parts.length > 0) {
                body.push([`  ${serviceLabel} (${locationLabel})`, parts.join(' / ')]);
            }
        });
    });
    return body;
};


export const generateSingleDayReportPdf = (doc: jsPDF, params: ExportParams) => {
    const { entries } = params;
    if (entries.length === 0) return;
    const entry = entries[0];
    const dateRangeStr = format(parseISO(String(entry.id)), 'PPP', { locale: ptBR });
    
    const headerHeight = drawHeaderAndFooter(doc, "Relatório Detalhado do Dia", dateRangeStr, params, 1, 1);
    
    const totals = calculateTotals(entry);
    const ticketMedio = totals.grandTotal.semCI.qtd > 0 
        ? totals.grandTotal.semCI.valor / totals.grandTotal.semCI.qtd 
        : 0;
    
    autoTable(doc, {
        margin: { top: headerHeight + 50 }, // Added extra margin
        body: [
            ['Receita Total (com CI)', 'Receita Líquida (sem CI)', 'Ticket Médio (sem CI)'],
            [formatCurrency(totals.grandTotal.comCI.valor), formatCurrency(totals.grandTotal.semCI.valor), formatCurrency(ticketMedio)]
        ],
        theme: 'striped', styles: { halign: 'center', fontSize: 9, cellPadding: 3 }
    });
    
    const summaryItems = [
        { label: 'Room Service (Total)', data: totals.roomServiceTotal },
        { label: 'Café da Manhã (Total)', data: { qtd: totals.cafeHospedes.qtd + totals.cafeAvulsos.qtd, valor: totals.cafeHospedes.valor + totals.cafeAvulsos.valor } },
        { label: 'Breakfast', data: totals.breakfast },
        { label: 'Almoço (Consolidado)', data: totals.almoco },
        { label: 'Jantar (Consolidado)', data: totals.jantar },
        { label: 'RW Italiano Almoço', data: totals.italianoAlmoco },
        { label: 'RW Italiano Jantar', data: totals.italianoJantar },
        { label: 'RW Indiano Almoço', data: totals.indianoAlmoco },
        { label: 'RW Indiano Jantar', data: totals.indianoJantar },
        { label: 'Bali Almoço', data: totals.baliAlmoco },
        { label: 'Bali Happy Hour', data: totals.baliHappy },
        { label: 'Frigobar (Total)', data: totals.frigobar },
        { label: 'Eventos (Direto)', data: totals.eventos.direto },
        { label: 'Eventos (Hotel)', data: totals.eventos.hotel },
    ];
    
    const summaryTableBody = summaryItems
        .filter(item => item.data.valor > 0 || item.data.qtd > 0)
        .map(item => [item.label, formatNumber(item.data.qtd), formatCurrency(item.data.valor)]);


    if (summaryTableBody.length > 0) {
        autoTable(doc, {
            head: [['Resumo por Período', 'Itens', 'Valor Total']],
            body: summaryTableBody,
            startY: (doc as any).lastAutoTable.finalY + 15,
            theme: 'grid',
            headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 
                0: { cellWidth: 'auto', fontStyle: 'bold' },
                1: { cellWidth: 100, halign: 'right' }, 
                2: { cellWidth: 120, halign: 'right' } 
            }
        });
    }

    const periodsWithData = PERIOD_DEFINITIONS.filter(pDef => {
        const periodData = entry[pDef.id as keyof typeof entry];
        if (!periodData || typeof periodData !== 'object' || Object.keys(periodData).length === 0) return false;
        
        if(JSON.stringify(periodData) === '{}') return false;

        if (pDef.id === 'eventos') {
            return (periodData as EventosPeriodData).items?.some(item => 
                item.subEvents?.some(sub => (sub.quantity ?? 0) > 0 || (sub.totalValue ?? 0) > 0)
            );
        }

        const pData = periodData as PeriodData;
        const hasChannels = pData.channels && Object.values(pData.channels).some(v => (v?.qtd ?? 0) > 0 || (v?.vtotal ?? 0) > 0);
        const hasSubTabs = pData.subTabs && Object.values(pData.subTabs).some(st => 
            (st?.channels && Object.values(st.channels).some(v => (v?.qtd ?? 0) > 0 || (v?.vtotal ?? 0) > 0)) ||
            (st?.faturadoItems && st.faturadoItems.length > 0) ||
            (st?.consumoInternoItems && st.consumoInternoItems.length > 0)
        );
        return hasChannels || hasSubTabs;
    });

    periodsWithData.forEach((pDef, index) => {
        const periodData = entry[pDef.id as keyof typeof entry];
        
        doc.addPage();
        let pageStartY = drawHeaderAndFooter(doc, `Detalhes do Período: ${pDef.label}`, dateRangeStr, params, index + 2, periodsWithData.length + 1);
        pageStartY += 50; // Extra margin

        const bodyData = pDef.id === 'eventos'
            ? renderEventosDataVertical(periodData as EventosPeriodData)
            : renderPeriodDataVertical(periodData as PeriodData);

        if (bodyData.length > 0) {
            autoTable(doc, {
                head: [[pDef.label, 'Detalhes']],
                body: bodyData,
                startY: pageStartY,
                theme: 'grid',
                headStyles: {fillColor: [60, 60, 60], textColor: 255},
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 'auto' },
                    1: { halign: 'right', cellWidth: 200 }
                }
            });
        }
    });

    if (entry.generalObservations && entry.generalObservations.trim()) {
        doc.addPage();
        let obsStartY = drawHeaderAndFooter(doc, 'Observações Gerais do Dia', dateRangeStr, params, periodsWithData.length + 2, periodsWithData.length + 2);
        autoTable(doc, {
            head: [['Observações Gerais do Dia']],
            body: [[entry.generalObservations]],
            startY: obsStartY + 50,
        });
    }
};
