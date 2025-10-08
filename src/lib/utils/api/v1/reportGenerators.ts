

import type { DailyLogEntry, DashboardItemVisibilityConfig, GeneralReportViewData } from '@/lib/types';
import { getSetting as getSettingFromDataLayer } from '@/lib/data/settings';
import { format, parseISO } from 'date-fns';
import { processEntryForTotals } from '@/lib/utils/api/v1/calculations';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import type { ChannelUnitPricesConfig } from '@/lib/types';


export const generateGeneralReportForApi = async (entries: DailyLogEntry[]): Promise<GeneralReportViewData> => {
    
    const unitPrices = await getSettingFromDataLayer<ChannelUnitPricesConfig>('channelUnitPricesConfig') || {};
    const cafePrice = unitPrices?.cdmListaHospedes || 0;

    const summary: GeneralReportViewData['summary'] = { 
        periodTotals: {}, 
        grandTotalComCI: 0, 
        grandTotalQtd: 0,
        grandTotalSemCI: 0,
        grandTotalCIQtd: 0,
        grandTotalReajusteCI: 0,
    };
    
    const allPossiblePeriodIds = PERIOD_DEFINITIONS.map(p => p.id);
    allPossiblePeriodIds.push('roomService' as any); // Adicionando 'roomService' que é um cálculo especial

    allPossiblePeriodIds.forEach(pId => {
        if (!summary.periodTotals[pId]) {
             summary.periodTotals[pId] = { qtd: 0, valor: 0 };
        }
    });

    const dailyBreakdowns = entries.map(entry => {
        const totals = processEntryForTotals(entry, cafePrice);
        
        const periodTotalsForDay: any = {};
        
        // Populate totals for all defined periods
        allPossiblePeriodIds.forEach(periodId => {
             let value = { qtd: 0, valor: 0 };
             
             switch (periodId) {
                case 'almocoPrimeiroTurno': value = totals.turnos.almocoPT; break;
                case 'almocoSegundoTurno': value = totals.turnos.almocoST; break;
                case 'jantar': value = totals.turnos.jantar; break;
                case 'cafeDaManha': value = { qtd: totals.cafeHospedes.qtd + totals.cafeAvulsos.qtd, valor: totals.cafeHospedes.valor + totals.cafeAvulsos.valor }; break;
                case 'madrugada': value = { qtd: totals.rsMadrugada.qtdPedidos, valor: totals.rsMadrugada.valor }; break;
                case 'eventos': value = { qtd: totals.eventos.direto.qtd + totals.eventos.hotel.qtd, valor: totals.eventos.direto.valor + totals.eventos.hotel.valor }; break;
                case 'roomService': value = { qtd: totals.roomServiceTotal.qtd, valor: totals.roomServiceTotal.valor }; break;
                default:
                    if ((totals as any)[periodId]) {
                        value = { qtd: (totals as any)[periodId].qtd || 0, valor: (totals as any)[periodId].valor || 0 };
                    }
             }
             
             periodTotalsForDay[periodId] = value;
             summary.periodTotals[periodId]!.qtd += value.qtd;
             summary.periodTotals[periodId]!.valor += value.valor;
        });


        const dailyBreakdownItem = {
            date: format(parseISO(String(entry.id)), 'dd/MM/yyyy'),
            periodTotals: periodTotalsForDay,
            totalComCI: totals.grandTotal.comCI.valor,
            totalSemCI: totals.grandTotal.semCI.valor,
            totalReajusteCI: totals.totalReajusteCI,
            totalQtd: totals.grandTotal.comCI.qtd,
            totalCIQtd: totals.totalCI.qtd,
            totalCIValor: totals.totalCI.valor,
        };

        summary.grandTotalComCI += totals.grandTotal.comCI.valor;
        summary.grandTotalQtd += totals.grandTotal.comCI.qtd;
        summary.grandTotalSemCI += totals.grandTotal.semCI.valor;
        summary.grandTotalCIQtd += totals.totalCI.qtd;
        summary.grandTotalReajusteCI += totals.totalReajusteCI;
        
        return dailyBreakdownItem;
    });
    
    return {
        dailyBreakdowns,
        summary,
        reportTitle: 'GERAL (MÊS)',
    };
};
