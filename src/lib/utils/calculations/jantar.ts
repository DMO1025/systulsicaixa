

"use client";

import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData } from '@/lib/types';
import { calculateFaturadoFromItems } from './faturado';

const getRestaurantTotal = (period: PeriodData | undefined): { qtd: number; valor: number } => {
    let totalValor = 0;
    let totalQtd = 0;

    if (!period || typeof period === 'string' || !period.subTabs) {
        return { qtd: 0, valor: 0 };
    }
    const subTabsToSum = ['hospedes', 'clienteMesa', 'delivery'];
    
    for (const subTabKey of subTabsToSum) {
        const subTab = period.subTabs[subTabKey];
        if (subTab?.channels) {
            for (const channel of Object.values(subTab.channels)) {
                totalQtd += getSafeNumericValue(channel, 'qtd');
                totalValor += getSafeNumericValue(channel, 'vtotal');
            }
        }
    }
    return { qtd: totalQtd, valor: totalValor };
};

export function calculateJantarTotals(entry: DailyLogEntry) {
    const jantarData = entry.jantar as PeriodData | undefined;

    const rsJantar = {
        valor: getSafeNumericValue(jantarData?.subTabs?.roomService?.channels, 'jntRoomServicePagDireto.vtotal') + getSafeNumericValue(jantarData?.subTabs?.roomService?.channels, 'jntRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue(jantarData?.subTabs?.roomService?.channels, 'jntRoomServiceQtdPedidos.qtd'),
    };
    
    const restauranteJantar = getRestaurantTotal(jantarData);

    const faturadoJantar = {
        new: calculateFaturadoFromItems(jantarData?.subTabs?.faturado?.faturadoItems),
        old: {
            qtd: getSafeNumericValue(jantarData?.subTabs?.ciEFaturados?.channels, 'jntCiEFaturadosFaturadosQtd.qtd'),
            valor: getSafeNumericValue(jantarData?.subTabs?.ciEFaturados?.channels, 'jntCiEFaturadosValorHotel.vtotal') + getSafeNumericValue(jantarData?.subTabs?.ciEFaturados?.channels, 'jntCiEFaturadosValorFuncionario.vtotal')
        }
    };

    // Total now excludes Room Service, Frigobar, and Consumo Interno
    const turnoJantarTotal = {
        valor: restauranteJantar.valor + faturadoJantar.new.valor + faturadoJantar.old.valor,
        qtd: restauranteJantar.qtd + faturadoJantar.new.qtd + faturadoJantar.old.qtd,
    };

    return {
        rsJantar,
        jantar: turnoJantarTotal,
    };
}
