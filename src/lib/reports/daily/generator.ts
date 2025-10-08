import type { DailyLogEntry, PeriodData, EventosPeriodData, FaturadoItem, ConsumoInternoItem } from '@/lib/types';
import { processEntryForTotals as calculateTotals } from '@/lib/utils/api/v1/calculations';

// This file is dedicated to generating the data structure for a single-day report.
// Currently, the single day report view component handles its own data processing directly.
// This file is created to establish the modular structure.
// If more complex data processing for the single day report is needed in the future, it can be added here.

export function processEntryForTotals(entry: DailyLogEntry) {
    // The main data is the entry itself, but we can add processed totals here if needed.
    const totals = calculateTotals(entry);
    return {
        entry,
        totals,
    };
}
