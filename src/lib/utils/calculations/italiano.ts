import type { DailyLogEntry } from '@/lib/types';
import { getGenericPeriodTotals } from './helpers';

export function calculateItalianoTotals(entry: DailyLogEntry) {
    const almoco = getGenericPeriodTotals(entry, 'italianoAlmoco');
    const jantar = getGenericPeriodTotals(entry, 'italianoJantar');
    
    return { almoco, jantar };
}
