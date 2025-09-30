
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyLogEntry, EventosPeriodData, PeriodData, SalesChannelId } from '../types';
import { processEntryForTotals } from '@/lib/utils/calculations';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';


const formatCurrency = (value: number | undefined) => Number(value || 0);
const formatNumber = (value: number | undefined) => Number(value || 0);

export const generateSingleDayReportExcel = (wb: XLSX.WorkBook, entry: DailyLogEntry, companyName?: string) => {
    const dateStr = format(parseISO(String(entry.id)), 'dd/MM/yyyy', { locale: ptBR });
    const sheetName = `Relatorio_${format(parseISO(String(entry.id)), 'yyyy-MM-dd')}`;
    const ws_data: any[][] = [];

    // Header
    ws_data.push([companyName || "Avalon Restaurante e Eventos Ltda"]);
    ws_data.push([`Relatório Detalhado do Dia: ${dateStr}`]);
    ws_data.push([]); // Spacer

    // Summary Cards
    const totals = processEntryForTotals(entry);
    const ticketMedio = totals.grandTotal.semCI.qtd > 0 
        ? totals.grandTotal.semCI.valor / totals.grandTotal.semCI.qtd 
        : 0;

    ws_data.push(['Resumo do Dia']);
    const summaryData = [
        ["Receita Total (com CI)", formatCurrency(totals.grandTotal.comCI.valor)],
        ["Receita Líquida (sem CI)", formatCurrency(totals.grandTotal.semCI.valor)],
        ["Ticket Médio (sem CI)", formatCurrency(ticketMedio)]
    ];
    ws_data.push(...summaryData);
    ws_data.push([]); // Spacer

    // Period Details
    PERIOD_DEFINITIONS.forEach(pDef => {
        const periodData = entry[pDef.id as keyof typeof entry];
        if (!periodData || typeof periodData !== 'object' || Object.keys(periodData).length === 0) {
            return;
        }

        ws_data.push([pDef.label]); // Period Title
        ws_data.push(['Item', 'Qtd', 'Valor (R$)']); // Period Headers

        if (pDef.id === 'eventos') {
            const eventosData = periodData as EventosPeriodData;
            (eventosData.items || []).forEach(item => {
                ws_data.push([{v: item.eventName || 'Evento', s: { font: { bold: true } }}, '', '']);
                (item.subEvents || []).forEach(sub => {
                    const serviceLabel = sub.serviceType === 'OUTRO' 
                        ? sub.customServiceDescription || 'Outro' 
                        : EVENT_SERVICE_TYPE_OPTIONS.find(opt => opt.value === sub.serviceType)?.label || sub.serviceType;
                    const locationLabel = EVENT_LOCATION_OPTIONS.find(opt => opt.value === sub.location)?.label || sub.location;
                    ws_data.push([`  ${serviceLabel} (${locationLabel})`, formatNumber(sub.quantity), formatCurrency(sub.totalValue)]);
                });
            });
        } else {
            const pData = periodData as PeriodData;
            if (pData.channels) {
                Object.entries(pData.channels).forEach(([channelId, values]) => {
                    if (values && (values.qtd !== undefined || values.vtotal !== undefined)) {
                       ws_data.push([SALES_CHANNELS[channelId as SalesChannelId] || channelId, formatNumber(values.qtd), formatCurrency(values.vtotal)]);
                    }
                });
            }
             if (pData.subTabs) {
                Object.entries(pData.subTabs).forEach(([subTabKey, subTabData]) => {
                    if (subTabData?.channels && Object.keys(subTabData.channels).length > 0) {
                        ws_data.push([{v: subTabKey.toUpperCase(), s: { font: { bold: true } }}]);
                         Object.entries(subTabData.channels).forEach(([channelId, values]) => {
                            if (values && (values.qtd !== undefined || values.vtotal !== undefined)) {
                                 ws_data.push([`  ${SALES_CHANNELS[channelId as SalesChannelId] || channelId}`, formatNumber(values.qtd), formatCurrency(values.vtotal)]);
                            }
                         });
                    }
                });
            }
        }
        ws_data.push([]); // Spacer after each period
    });

    if (entry.generalObservations) {
        ws_data.push(['Observações Gerais do Dia']);
        ws_data.push([entry.generalObservations]);
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Styling and Formatting
    const currencyFormat = 'R$ #,##0.00';
    const numberFormat = '#,##0';
    const cols = [{wch: 40}, {wch: 15}, {wch: 15}];
    ws['!cols'] = cols;

    // Apply formats (this requires iterating through cells)
    for (let R = 0; R < ws_data.length; ++R) {
        for (let C = 0; C < ws_data[R].length; ++C) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            if (ws[cell_ref] && typeof ws[cell_ref].v === 'number') {
                if (C === 2) { // Valor column
                    ws[cell_ref].z = currencyFormat;
                } else if (C === 1) { // Qtd column
                     ws[cell_ref].z = numberFormat;
                }
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
};

    