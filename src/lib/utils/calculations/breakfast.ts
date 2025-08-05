import type { DailyLogEntry } from '@/lib/types';
import { getGenericPeriodTotals } from './helpers';

export function calculateBreakfastTotals(entry: DailyLogEntry) {
    return getGenericPeriodTotals(entry, 'breakfast');
}
