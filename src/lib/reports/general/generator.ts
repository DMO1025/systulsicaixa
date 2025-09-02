

import type { DailyLogEntry, GeneralReportViewData, PeriodId } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { format, parseISO } from 'date-fns';
import { processEntryForTotals } from '@/lib/utils/calculations';


export function generateGeneralReport(entries: DailyLogEntry[]): GeneralReportViewData {
    const dailyBreakdowns: any[] = [];
    
    const summary: any = { 
        periodTotals: {}, 
        grandTotalComCI: 0, 
        grandTotalQtd: 0,
        grandTotalSemCI: 0,
        grandTotalCIQtd: 0,
        grandTotalReajusteCI: 0,
        totalCIValor: 0, // Added for tracking total CI value in summary
    };
    
    const allPeriodIds: (PeriodId | 'roomService' | 'consumoInterno-almocoPrimeiroTurno' | 'consumoInterno-almocoSegundoTurno' | 'consumoInterno-jantar')[] = [
        ...PERIOD_DEFINITIONS.map(p => p.id), 
        'roomService',
        'consumoInterno-almocoPrimeiroTurno',
        'consumoInterno-almocoSegundoTurno',
        'consumoInterno-jantar'
    ];

    allPeriodIds.forEach(pId => {
        summary.periodTotals[pId] = { qtd: 0, valor: 0 };
    });


    entries.forEach(entry => {
        const totals = processEntryForTotals(entry);
        const dateString = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
        
        const periodTotalsForDay: any = {};
        
        // Populate totals for all defined periods
        PERIOD_DEFINITIONS.forEach(pDef => {
            const periodId = pDef.id;
            let valor = 0;
            let qtd = 0;

            switch (periodId) {
                case 'almocoPrimeiroTurno':
                    valor = totals.turnos.almocoPT.valor;
                    qtd = totals.turnos.almocoPT.qtd;
                    break;
                case 'almocoSegundoTurno':
                    valor = totals.turnos.almocoST.valor;
                    qtd = totals.turnos.almocoST.qtd;
                    break;
                case 'jantar':
                    valor = totals.turnos.jantar.valor;
                    qtd = totals.turnos.jantar.qtd;
                    break;
                case 'cafeDaManha':
                     valor = totals.cafeHospedes.valor + totals.cafeAvulsos.valor;
                     qtd = totals.cafeHospedes.qtd + totals.cafeAvulsos.qtd;
                    break;
                case 'madrugada':
                    valor = totals.rsMadrugada.valor;
                    qtd = totals.rsMadrugada.qtdPedidos;
                    break;
                case 'eventos':
                    valor = totals.eventos.direto.valor + totals.eventos.hotel.valor;
                    qtd = totals.eventos.direto.qtd + totals.eventos.hotel.qtd;
                    break;
                 case 'frigobar':
                    valor = totals.frigobar.valor;
                    qtd = totals.frigobar.qtd;
                    break;
                default:
                    if ((totals as any)[periodId]) {
                        valor = (totals as any)[periodId].valor || 0;
                        qtd = (totals as any)[periodId].qtd || 0;
                    }
            }
            periodTotalsForDay[periodId] = { valor, qtd };
            summary.periodTotals[periodId].valor += valor;
            summary.periodTotals[periodId].qtd += qtd;
        });

        // Consolidate CI for summary
        summary.periodTotals['consumoInterno-almocoPrimeiroTurno'].qtd += totals.almocoCI.qtd;
        summary.periodTotals['consumoInterno-almocoPrimeiroTurno'].valor += totals.almocoCI.valor;
        summary.periodTotals['consumoInterno-jantar'].qtd += totals.jantarCI.qtd;
        summary.periodTotals['consumoInterno-jantar'].valor += totals.jantarCI.valor;


        // Add room service totals for this day
        periodTotalsForDay.roomService = {
            valor: totals.rsAlmocoPT.valor + totals.rsAlmocoST.valor + totals.rsJantar.valor,
            qtd: totals.rsAlmocoPT.qtd + totals.rsAlmocoST.qtd + totals.rsJantar.qtd,
        };
        summary.periodTotals.roomService.valor += periodTotalsForDay.roomService.valor;
        summary.periodTotals.roomService.qtd += periodTotalsForDay.roomService.qtd;
        
        dailyBreakdowns.push({
            date: dateString,
            periodTotals: periodTotalsForDay,
            totalComCI: totals.grandTotal.comCI.valor,
            totalSemCI: totals.grandTotal.semCI.valor,
            totalReajusteCI: totals.totalReajusteCI,
            totalQtd: totals.grandTotal.comCI.qtd,
            totalCIQtd: totals.totalCI.qtd,
            totalCIValor: totals.totalCI.valor,
            createdAt: entry.createdAt,
            lastModifiedAt: entry.lastModifiedAt,
        });

        summary.grandTotalComCI += totals.grandTotal.comCI.valor;
        summary.grandTotalQtd += totals.grandTotal.comCI.qtd;
        summary.grandTotalSemCI += totals.grandTotal.semCI.valor;
        summary.grandTotalCIQtd += totals.totalCI.qtd;
        summary.totalCIValor += totals.totalCI.valor;
        summary.grandTotalReajusteCI += totals.totalReajusteCI;
    });
    
    return {
        dailyBreakdowns,
        summary,
        reportTitle: 'GERAL (MÊS)',
    } as GeneralReportViewData;
};
