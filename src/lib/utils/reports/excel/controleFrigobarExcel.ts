
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyLogEntry, FrigobarConsumptionLog, ChannelUnitPricesConfig, FrigobarItem, ReportExportData } from '../types';
import { getSetting } from '@/services/settingsService';

export const generateControleFrigobarExcel = async (wb: XLSX.WorkBook, params: {
    reportData: ReportExportData,
    companyName?: string,
    includeItems?: boolean,
    view?: 'descritivo' | 'consolidado'
}) => {
    const { reportData, companyName, includeItems, view = 'descritivo' } = params;

    if (!reportData || !reportData.summary || !reportData.details) {
        return;
    }
    
    const allLogs = (reportData.details.allLogs as any[]) || [];
    const dailyAggregates = (reportData.details.dailyAggregates as any[]) || [];
    const summary = reportData.summary as any;
    const totals = summary.financeiro;
    const itemsSummary = summary.itemsSummary || [];
    const frigobarItemsList: FrigobarItem[] = (await getSetting('frigobarItems')) || [];

    if (view === 'consolidado') {
        // --- CONSOLIDATED VIEW ---
        const dataForSheet = dailyAggregates.map((day: any) => ({
            'Empresa': companyName,
            'Data': day.date,
            'Valor Consumo': day.consumo,
            'Valor Recebido': day.recebido,
            'Valor Abatido': day.abatimento,
            'Diferença': day.diferenca,
        }));
        dataForSheet.push({
            'Empresa': '',
            'Data': 'TOTAL GERAL',
            'Valor Consumo': totals.consumo,
            'Valor Recebido': totals.recebido - totals.abatimento,
            'Valor Abatido': totals.abatimento,
            'Diferença': totals.diferenca,
        });
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        XLSX.utils.book_append_sheet(wb, ws, 'Controle_Frigobar_Consolidado');

    } else {
        // --- DESCRIPTIVE VIEW ---
        const dataForSheet = allLogs.map((log: any) => {
            const itemsDetail = includeItems ? Object.entries(log.items).map(([itemId, quantity]) => {
                const item = frigobarItemsList.find(i => i.id === itemId);
                return `${item?.name || 'Desconhecido'}: ${quantity}`;
            }).join('; ') : `(${Object.values(log.items).reduce((s: number, q: any) => s + q, 0)} itens)`;
            
            return {
                'Empresa': companyName,
                'Data': log.entryDate,
                'UH': log.isAntecipado ? `*${log.uh}` : log.uh,
                'Itens': itemsDetail,
                'Valor Consumo': log.totalValue,
                'Valor Recebido': log.valorRecebido,
                'Diferença': (log.valorRecebido || 0) - log.totalValue,
                'Registrado Por': log.registeredBy,
                'Observação': log.observation,
            };
        });

        dataForSheet.push({
            'Empresa': '', 'Data': 'TOTAIS', 'UH': '', 'Itens': '',
            'Valor Consumo': totals.consumo,
            'Valor Recebido': totals.recebido - totals.abatimento,
            'Diferença': totals.diferenca,
            'Registrado Por': '', 'Observação': '',
        });
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        XLSX.utils.book_append_sheet(wb, ws, 'Controle_Frigobar_Descritivo');
    }

    if (includeItems) {
        const totalItemsQtd = itemsSummary.reduce((acc: number, item: any) => acc + item.qtd, 0);
        const itemsSheetData = itemsSummary.map((item: any) => ({
            'Item': item.name, 'Quantidade': item.qtd, 'Valor Total': item.valor
        }));
        itemsSheetData.push({
            'Item': 'TOTAL', 'Quantidade': totalItemsQtd, 'Valor Total': totals.consumo
        });
        const itemsWs = XLSX.utils.json_to_sheet(itemsSheetData);
        XLSX.utils.book_append_sheet(wb, itemsWs, 'Resumo_Itens_Frigobar');
    }
};
