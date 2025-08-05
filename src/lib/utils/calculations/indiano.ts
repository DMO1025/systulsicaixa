import type { DailyLogEntry } from '@/lib/types';
import { getGenericPeriodTotals } from './helpers';

export function calculateIndianoTotals(entry: DailyLogEntry) {
    const almoco = getGenericPeriodTotals(entry, 'indianoAlmoco');
    const jantar = getGenericPeriodTotals(entry, 'indianoJantar');
    
    return { almoco, jantar };
}
