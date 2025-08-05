import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData } from '@/lib/types';

export const getGenericPeriodTotals = (entry: DailyLogEntry, periodId: keyof DailyLogEntry) => {
    const period = entry[periodId] as PeriodData | undefined;
    if (!period?.channels) return { qtd: 0, valor: 0 };

    return Object.values(period.channels).reduce((acc, channel) => {
        acc.qtd += getSafeNumericValue(channel, 'qtd');
        acc.valor += getSafeNumericValue(channel, 'vtotal');
        return acc;
    }, { qtd: 0, valor: 0 });
};
