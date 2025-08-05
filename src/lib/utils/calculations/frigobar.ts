import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData } from '@/lib/types';

export function calculateFrigobarTotals(entry: DailyLogEntry) {
    const frigobarPT = {
        valor: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTPagRestaurante.vtotal') + getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTPagHotel.vtotal'),
        qtd: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTTotalQuartos.qtd'),
    };
    const frigobarST = {
        valor: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTPagRestaurante.vtotal') + getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTPagHotel.vtotal'),
        qtd: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTTotalQuartos.qtd'),
    };
    const frigobarJantar = {
        valor: getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTPagRestaurante.vtotal') + getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTPagHotel.vtotal'),
        qtd: getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTTotalQuartos.qtd'),
    };

    return {
        valor: frigobarPT.valor + frigobarST.valor + frigobarJantar.valor,
        qtd: frigobarPT.qtd + frigobarST.qtd + frigobarJantar.qtd,
    };
}
