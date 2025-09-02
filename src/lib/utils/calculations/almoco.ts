

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
}

export function calculateAlmocoTotals(entry: DailyLogEntry) {
    const aptData = entry.almocoPrimeiroTurno as PeriodData | undefined;
    const astData = entry.almocoSegundoTurno as PeriodData | undefined;

    // --- PRIMEIRO TURNO (APT) ---
    const rsAlmocoPT = {
        valor: getSafeNumericValue(aptData?.subTabs?.roomService?.channels, 'aptRoomServicePagDireto.vtotal') + getSafeNumericValue(aptData?.subTabs?.roomService?.channels, 'aptRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue(aptData?.subTabs?.roomService?.channels, 'aptRoomServiceQtdPedidos.qtd'),
    };
    const restaurantePT = getRestaurantTotal(aptData);
    const aptFaturado = {
        new: calculateFaturadoFromItems(aptData?.subTabs?.faturado?.faturadoItems),
        old: {
            qtd: getSafeNumericValue(aptData?.subTabs?.ciEFaturados?.channels, 'aptCiEFaturadosFaturadosQtd.qtd'),
            valor: getSafeNumericValue(aptData?.subTabs?.ciEFaturados?.channels, 'aptCiEFaturadosValorHotel.vtotal') + getSafeNumericValue(aptData?.subTabs?.ciEFaturados?.channels, 'aptCiEFaturadosValorFuncionario.vtotal')
        }
    };
    
    // --- SEGUNDO TURNO (AST) ---
     const rsAlmocoST = {
        valor: getSafeNumericValue(astData?.subTabs?.roomService?.channels, 'astRoomServicePagDireto.vtotal') + getSafeNumericValue(astData?.subTabs?.roomService?.channels, 'astRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue(astData?.subTabs?.roomService?.channels, 'astRoomServiceQtdPedidos.qtd'),
    };
    const restauranteST = getRestaurantTotal(astData);
    const astFaturado = {
        new: calculateFaturadoFromItems(astData?.subTabs?.faturado?.faturadoItems),
        old: {
            qtd: getSafeNumericValue(astData?.subTabs?.ciEFaturados?.channels, 'astCiEFaturadosFaturadosQtd.qtd'),
            valor: getSafeNumericValue(astData?.subTabs?.ciEFaturados?.channels, 'astCiEFaturadosValorHotel.vtotal') + getSafeNumericValue(astData?.subTabs?.ciEFaturados?.channels, 'astCiEFaturadosValorFuncionario.vtotal')
        }
    };
    
    // --- COMBINED TOTALS (Excluding Room Service, CI, and Frigobar from this level) ---
    const almocoPTTotal = {
        valor: restaurantePT.valor + aptFaturado.new.valor + aptFaturado.old.valor,
        qtd: restaurantePT.qtd + aptFaturado.new.qtd + aptFaturado.old.qtd,
        rs: rsAlmocoPT,
    };
     const almocoSTTotal = {
        valor: restauranteST.valor + astFaturado.new.valor + astFaturado.old.valor,
        qtd: restauranteST.qtd + astFaturado.new.qtd + astFaturado.old.qtd,
        rs: rsAlmocoST,
    };

    return {
        almocoPT: almocoPTTotal,
        almocoST: almocoSTTotal,
    };
}
