

import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData } from '@/lib/types';
import { calculateFaturadoFromItems } from './faturado';
import { calculateConsumoInternoFromItems } from './consumoInterno';

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
    const aptCI = {
        new: calculateConsumoInternoFromItems(aptData?.subTabs?.consumoInterno?.consumoInternoItems),
        old: {
            qtd: getSafeNumericValue(aptData?.subTabs?.ciEFaturados?.channels, 'aptCiEFaturadosConsumoInternoQtd.qtd'),
            valor: getSafeNumericValue(aptData?.subTabs?.ciEFaturados?.channels, 'aptCiEFaturadosTotalCI.vtotal') - getSafeNumericValue(aptData?.subTabs?.ciEFaturados?.channels, 'aptCiEFaturadosReajusteCI.vtotal')
        }
    };
    const reajusteCIPT = getSafeNumericValue(aptData?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal') + getSafeNumericValue(aptData?.subTabs?.ciEFaturados?.channels, `aptCiEFaturadosReajusteCI.vtotal`);
    const frigobarPT = {
        valor: getSafeNumericValue(aptData, 'subTabs.frigobar.channels.frgPTPagRestaurante.vtotal') + getSafeNumericValue(aptData, 'subTabs.frigobar.channels.frgPTPagHotel.vtotal'),
        qtd: getSafeNumericValue(aptData, 'subTabs.frigobar.channels.frgPTTotalQuartos.qtd'),
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
    const astCI = {
        new: calculateConsumoInternoFromItems(astData?.subTabs?.consumoInterno?.consumoInternoItems),
        old: {
            qtd: getSafeNumericValue(astData?.subTabs?.ciEFaturados?.channels, 'astCiEFaturadosConsumoInternoQtd.qtd'),
            valor: getSafeNumericValue(astData?.subTabs?.ciEFaturados?.channels, 'astCiEFaturadosTotalCI.vtotal') - getSafeNumericValue(astData?.subTabs?.ciEFaturados?.channels, 'astCiEFaturadosReajusteCI.vtotal')
        }
    };
    const reajusteCIST = getSafeNumericValue(astData?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal') + getSafeNumericValue(astData?.subTabs?.ciEFaturados?.channels, `astCiEFaturadosReajusteCI.vtotal`);
    const frigobarST = {
        valor: getSafeNumericValue(astData, 'subTabs.frigobar.channels.frgSTPagRestaurante.vtotal') + getSafeNumericValue(astData, 'subTabs.frigobar.channels.frgSTPagHotel.vtotal'),
        qtd: getSafeNumericValue(astData, 'subTabs.frigobar.channels.frgSTTotalQuartos.qtd'),
    };
    
    // --- COMBINED TOTALS ---
    const almocoPTTotal = {
        valor: restaurantePT.valor + rsAlmocoPT.valor + aptFaturado.new.valor + aptFaturado.old.valor + aptCI.new.valor + aptCI.old.valor + frigobarPT.valor + reajusteCIPT,
        qtd: restaurantePT.qtd + rsAlmocoPT.qtd + aptFaturado.new.qtd + aptFaturado.old.qtd + aptCI.new.qtd + aptCI.old.qtd + frigobarPT.qtd,
        rs: rsAlmocoPT,
    };
     const almocoSTTotal = {
        valor: restauranteST.valor + rsAlmocoST.valor + astFaturado.new.valor + astFaturado.old.valor + astCI.new.valor + astCI.old.valor + frigobarST.valor + reajusteCIST,
        qtd: restauranteST.qtd + rsAlmocoST.qtd + astFaturado.new.qtd + astFaturado.old.qtd + astCI.new.qtd + astCI.old.qtd + frigobarST.qtd,
        rs: rsAlmocoST,
    };

    return {
        almocoPT: almocoPTTotal,
        almocoST: almocoSTTotal,
    };
}
