
import type { DailyLogEntry, PeriodData, ReportData, PeriodId, GeneralReportViewData, PeriodReportViewData, DailyCategoryDataItem, FaturadoItem, ConsumoInternoItem } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { format, parseISO } from 'date-fns';

const getSafeNumericValue = (obj: any, key: string): number => {
    const value = obj?.[key];
    if (value === undefined || value === null) return 0;
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : num;
};

const processApiEntryForTotals = (entry: DailyLogEntry) => {
    const totals: Record<string, { qtd: number; valor: number }> = {};
    PERIOD_DEFINITIONS.forEach(pDef => {
        totals[pDef.id] = { qtd: 0, valor: 0 };
    });

    const safeParsePeriod = (periodData: any): PeriodData | null => {
        if (!periodData) return null;
        if (typeof periodData === 'string') {
            try { return JSON.parse(periodData); } catch { return null; }
        }
        return periodData;
    };

    // Process each period
    for (const periodDef of PERIOD_DEFINITIONS) {
        const periodId = periodDef.id;
        const period = safeParsePeriod(entry[periodId as keyof DailyLogEntry]);
        if (!period) continue;
        
        let periodTotalQtd = 0;
        let periodTotalValor = 0;

        if (period.channels) {
            for (const channel of Object.values(period.channels)) {
                periodTotalQtd += getSafeNumericValue(channel, 'qtd');
                periodTotalValor += getSafeNumericValue(channel, 'vtotal');
            }
        }

        if (period.subTabs) {
            for (const subTab of Object.values(period.subTabs)) {
                if (subTab?.channels) {
                    for (const channel of Object.values(subTab.channels)) {
                        periodTotalQtd += getSafeNumericValue(channel, 'qtd');
                        periodTotalValor += getSafeNumericValue(channel, 'vtotal');
                    }
                }
                (subTab?.faturadoItems || []).forEach((item: FaturadoItem) => {
                    periodTotalQtd += getSafeNumericValue(item, 'quantity');
                    periodTotalValor += getSafeNumericValue(item, 'value');
                });
                 (subTab?.consumoInternoItems || []).forEach((item: ConsumoInternoItem) => {
                    periodTotalQtd += getSafeNumericValue(item, 'quantity');
                    periodTotalValor += getSafeNumericValue(item, 'value');
                });
            }
        }
        totals[periodId] = { qtd: periodTotalQtd, valor: periodTotalValor };
    }
    
    // Consolidate lunch
    const almocoQtd = (totals.almocoPrimeiroTurno?.qtd ?? 0) + (totals.almocoSegundoTurno?.qtd ?? 0);
    const almocoValor = (totals.almocoPrimeiroTurno?.valor ?? 0) + (totals.almocoSegundoTurno?.valor ?? 0);
    totals.almoco = { qtd: almocoQtd, valor: almocoValor };

    const grandTotalQtd = Object.values(totals).reduce((sum, t) => sum + t.qtd, 0) - almocoQtd;
    const grandTotalValor = Object.values(totals).reduce((sum, t) => sum + t.valor, 0) - almocoValor;

    totals.grandTotal = { qtd: grandTotalQtd + totals.almoco.qtd, valor: grandTotalValor + totals.almoco.valor };

    return totals;
};


const generateGeneralReport = (entries: DailyLogEntry[]): GeneralReportViewData => {
    const dailyBreakdowns: any[] = [];
    const summary: any = { periodTotals: {}, grandTotalComCI: 0, grandTotalQtd: 0 };
    PERIOD_DEFINITIONS.forEach(p => summary.periodTotals[p.id] = {qtd: 0, valor: 0});
    summary.periodTotals.almoco = {qtd: 0, valor: 0};


    entries.forEach(entry => {
        const entryTotals = processApiEntryForTotals(entry);
        const breakdownRow: any = { date: format(parseISO(String(entry.id)), 'dd/MM/yyyy') };
        
        let dailyTotalValor = 0;
        let dailyTotalQtd = 0;

        PERIOD_DEFINITIONS.forEach(pDef => {
            const periodId = pDef.id;
            const periodTotal = entryTotals[periodId];
            if (periodId.startsWith('almoco')) {
                // Skip individual lunch periods, they are consolidated
            } else {
                breakdownRow[periodId] = periodTotal;
                summary.periodTotals[periodId].qtd += periodTotal.qtd;
                summary.periodTotals[periodId].valor += periodTotal.valor;
                dailyTotalQtd += periodTotal.qtd;
                dailyTotalValor += periodTotal.valor;
            }
        });
        
        const almocoConsolidado = entryTotals.almoco;
        breakdownRow.almoco = almocoConsolidado;
        summary.periodTotals.almoco.qtd += almocoConsolidado.qtd;
        summary.periodTotals.almoco.valor += almocoConsolidado.valor;
        dailyTotalQtd += almocoConsolidado.qtd;
        dailyTotalValor += almocoConsolidado.valor;
        
        breakdownRow.totalComCI = dailyTotalValor;
        breakdownRow.totalQtd = dailyTotalQtd;
        
        summary.grandTotalComCI += dailyTotalValor;
        summary.grandTotalQtd += dailyTotalQtd;

        dailyBreakdowns.push(breakdownRow);
    });
    
    return {
        dailyBreakdowns,
        summary,
        reportTitle: 'GERAL (MÊS)',
    } as GeneralReportViewData;
};

const generatePeriodReport = (entries: DailyLogEntry[], periodId: PeriodId): PeriodReportViewData => {
    const dailyBreakdowns: any = { main: [] };
    const summary: any = { main: {qtd: 0, total: 0} };

    let periodsToProcess: PeriodId[] = [periodId];
    let reportTitle = PERIOD_DEFINITIONS.find(p => p.id === periodId)?.label || 'Relatório';

    if (periodId === 'almocoPrimeiroTurno' || periodId === 'almocoSegundoTurno') {
        periodsToProcess = ['almocoPrimeiroTurno', 'almocoSegundoTurno'];
        reportTitle = 'Almoço (Consolidado)';
    }

    entries.forEach(entry => {
        const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
        let dailyQtd = 0;
        let dailyValor = 0;
        
        periodsToProcess.forEach(pId => {
            const periodTotals = processApiEntryForTotals(entry)[pId];
            dailyQtd += periodTotals.qtd;
            dailyValor += periodTotals.valor;
        });

        if (dailyQtd > 0 || dailyValor > 0) {
            dailyBreakdowns.main.push({ date, qtd: dailyQtd, valor: dailyValor });
            summary.main.qtd += dailyQtd;
            summary.main.total += dailyValor;
        }
    });
    
    return {
        dailyBreakdowns,
        summary,
        reportTitle: reportTitle,
    } as PeriodReportViewData;
};


export function generateApiReportData(entries: DailyLogEntry[], periodId: PeriodId | 'all'): ReportData {
    if (periodId === 'all') {
        const data = generateGeneralReport(entries);
        return { type: 'general', data };
    } else {
        const data = generatePeriodReport(entries, periodId);
        return { type: 'period', data };
    }
}
