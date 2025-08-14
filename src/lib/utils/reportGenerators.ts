

import type { ReportData, GeneralReportViewData, PeriodReportViewData, PeriodId, DailyLogEntry } from '@/lib/types';
import { generateGeneralReport } from '@/lib/reports/general/generator';
import { generatePeriodReportData } from '@/lib/reports/period/generator';

export function generateReportData(
    entries: DailyLogEntry[], 
    periodId: PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService'
): ReportData {
    if (periodId === 'all') {
        const data = generateGeneralReport(entries);
        return { type: 'general', data };
    } else {
        const data = generatePeriodReportData(entries, periodId);
        return { type: 'period', data };
    }
}
