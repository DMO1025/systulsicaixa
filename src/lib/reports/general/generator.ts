import type { DailyLogEntry, GeneralReportViewData, PeriodId } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { format, parseISO } from 'date-fns';
import { processEntryForTotals } from '@/lib/utils/calculations';


export function generateGeneralReport(entries: DailyLogEntry[]): GeneralReportViewData {
    const dailyBreakdowns: any[] = [];
    
    // Use a Set to track all unique period IDs that appear in the data
    const occurringPeriods = new Set<PeriodId>();
    entries.forEach(entry => {
        PERIOD_DEFINITIONS.forEach(pDef => {
            if (entry[pDef.id as keyof DailyLogEntry]) {
                occurringPeriods.add(pDef.id);
            }
        });
    });

    const summary: any = { 
        periodTotals: {}, 
        grandTotalComCI: 0, 
        grandTotalQtd: 0,
        grandTotalSemCI: 0,
        grandTotalCIQtd: 0,
        grandTotalReajusteCI: 0,
    };
    
    PERIOD_DEFINITIONS.forEach(p => summary.periodTotals[p.id] = {qtd: 0, valor: 0});
    summary.periodTotals.roomService = { qtd: 0, valor: 0 };


    entries.forEach(entry => {
        const totals = processEntryForTotals(entry);
        const dateString = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
        
        const periodTotalsForDay: any = {};
        PERIOD_DEFINITIONS.forEach(pDef => {
            let valor = 0;
            let qtd = 0;
            if (pDef.id === 'almocoPrimeiroTurno') {
                valor = totals.turnos.almocoPT.valor;
                qtd = totals.turnos.almocoPT.qtd;
            } else if (pDef.id === 'almocoSegundoTurno') {
                valor = totals.turnos.almocoST.valor;
                qtd = totals.turnos.almocoST.qtd;
            } else if (pDef.id === 'jantar') {
                valor = totals.turnos.jantar.valor;
                qtd = totals.turnos.jantar.qtd;
            } else if (pDef.id === 'cafeDaManha') {
                 valor = totals.cafeHospedes.valor + totals.cafeAvulsos.valor;
                 qtd = totals.cafeHospedes.qtd + totals.cafeAvulsos.qtd;
            } else if (pDef.id === 'madrugada') {
                valor = totals.rsMadrugada.valor;
                qtd = totals.rsMadrugada.qtdPedidos;
            } else if ((totals as any)[pDef.id]) {
                valor = (totals as any)[pDef.id].valor || 0;
                qtd = (totals as any)[pDef.id].qtd || 0;
            }
            periodTotalsForDay[pDef.id] = { valor, qtd };
            summary.periodTotals[pDef.id].valor += valor;
            summary.periodTotals[pDef.id].qtd += qtd;
        });

        // Add room service totals for this day
        periodTotalsForDay.roomService = totals.roomServiceTotal;
        summary.periodTotals.roomService.valor += totals.roomServiceTotal.valor;
        summary.periodTotals.roomService.qtd += totals.roomServiceTotal.qtd;
        
        dailyBreakdowns.push({
            date: dateString,
            periodTotals: periodTotalsForDay,
            totalComCI: totals.grandTotal.comCI.valor,
            totalSemCI: totals.grandTotal.semCI.valor,
            totalReajusteCI: totals.totalReajusteCI,
            totalQtd: totals.grandTotal.comCI.qtd,
            totalCIQtd: totals.totalCI.qtd,
            createdAt: entry.createdAt,
            lastModifiedAt: entry.lastModifiedAt,
        });

        summary.grandTotalComCI += totals.grandTotal.comCI.valor;
        summary.grandTotalQtd += totals.grandTotal.comCI.qtd;
        summary.grandTotalSemCI += totals.grandTotal.semCI.valor;
        summary.grandTotalCIQtd += totals.totalCI.qtd;
        summary.grandTotalReajusteCI += totals.totalReajusteCI;
    });
    
    return {
        dailyBreakdowns,
        summary,
        reportTitle: 'GERAL (MÊS)',
    } as GeneralReportViewData;
};
