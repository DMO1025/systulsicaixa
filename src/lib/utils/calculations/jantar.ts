

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
    
    const ciJantar = {
      new: calculateConsumoInternoFromItems(jantarData?.subTabs?.consumoInterno?.consumoInternoItems),
      old: {
        qtd: getSafeNumericValue(jantarData?.subTabs?.ciEFaturados?.channels, `jntCiEFaturadosConsumoInternoQtd.qtd`),
        valor: getSafeNumericValue(jantarData?.subTabs?.ciEFaturados?.channels, `jntCiEFaturadosTotalCI.vtotal`) - getSafeNumericValue(jantarData?.subTabs?.ciEFaturados?.channels, `jntCiEFaturadosReajusteCI.vtotal`)
      }
    };
    
    const reajusteCIJantar = getSafeNumericValue(jantarData?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal') + getSafeNumericValue(jantarData?.subTabs?.ciEFaturados?.channels, `jntCiEFaturadosReajusteCI.vtotal`);

    const frigobarJantar = {
        valor: getSafeNumericValue(jantarData, 'subTabs.frigobar.channels.frgJNTPagRestaurante.vtotal') + getSafeNumericValue(jantarData, 'subTabs.frigobar.channels.frgJNTPagHotel.vtotal'),
        qtd: getSafeNumericValue(jantarData, 'subTabs.frigobar.channels.frgJNTTotalQuartos.qtd'),
    };

    const turnoJantarTotal = {
        valor: restauranteJantar.valor + rsJantar.valor + faturadoJantar.new.valor + faturadoJantar.old.valor + frigobarJantar.valor + (ciJantar.new.valor + ciJantar.old.valor) + reajusteCIJantar,
        qtd: restauranteJantar.qtd + rsJantar.qtd + faturadoJantar.new.qtd + faturadoJantar.old.qtd + ciJantar.new.qtd + ciJantar.old.qtd + frigobarJantar.qtd,
    };

    return {
        rsJantar,
        jantar: turnoJantarTotal,
    };
}
