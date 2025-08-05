import type { DailyLogEntry } from '@/lib/types';
import { getGenericPeriodTotals } from './helpers';

export function calculateBaliAlmocoTotals(entry: DailyLogEntry) {
    return getGenericPeriodTotals(entry, 'baliAlmoco');
}

export function calculateBaliHappyTotals(entry: DailyLogEntry) {
    return getGenericPeriodTotals(entry, 'baliHappy');
}
