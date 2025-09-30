
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyLogEntry, FrigobarConsumptionLog, ChannelUnitPricesConfig, FrigobarItem } from '../types';
import { getSetting } from '@/services/settingsService';

export const generateControleFrigobarExcel = async (wb: XLSX.WorkBook, entries: DailyLogEntry[], unitPrices: ChannelUnitPricesConfig, companyName?: string) => {
    const allLogs: (FrigobarConsumptionLog & { entryDate: string })[] = [];
    const frigobarItemsList: FrigobarItem[] = (await getSetting('frigobarItems')) || [];

    entries.forEach(entry => {
        const frigobarData = entry.controleFrigobar as any;
        if (frigobarData?.logs && Array.isArray(frigobarData.logs)) {
            frigobarData.logs.forEach((log: FrigobarConsumptionLog) => {
                allLogs.push({ ...log, entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy', { locale: ptBR }) });
            });
        }
    });

    const dataForSheet = allLogs.map(log => {
        const itemsDetail = Object.entries(log.items).map(([itemId, quantity]) => {
            const item = frigobarItemsList.find(i => i.id === itemId);
            return `${item?.name || 'Desconhecido'}: ${quantity}`;
        }).join(', ');
        
        return {
            'Empresa': companyName,
            'Data': log.entryDate,
            'UH': log.uh,
            'Itens': itemsDetail,
            'Valor Consumo': log.totalValue,
            'Valor Recebido': log.valorRecebido,
            'Diferença': (log.valorRecebido || 0) - log.totalValue,
            'Registrado Por': log.registeredBy,
            'Observação': log.observation,
        };
    });

    const totals = allLogs.reduce((acc, log) => {
        acc.consumo += log.totalValue || 0;
        acc.recebido += log.valorRecebido || 0;
        return acc;
    }, { consumo: 0, recebido: 0 });

    dataForSheet.push({
        'Empresa': '',
        'Data': 'TOTAL',
        'UH': '',
        'Itens': '',
        'Valor Consumo': totals.consumo,
        'Valor Recebido': totals.recebido,
        'Diferença': totals.recebido - totals.consumo,
        'Registrado Por': '',
        'Observação': '',
    });

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Controle_Frigobar');
};

    