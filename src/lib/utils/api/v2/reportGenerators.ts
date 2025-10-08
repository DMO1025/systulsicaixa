

import type { DailyLogEntry, GeneralReportViewData, PeriodId, ChannelUnitPricesConfig, EstornoItem, DashboardItemVisibilityConfig } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { format, parseISO } from 'date-fns';
import { processEntryForTotalsV2 } from './calculations';
import { getSetting as getSettingFromDataLayer } from '@/lib/data/settings';


export const generateGeneralReportForApiV2 = async (
    entries: DailyLogEntry[], 
    estornos: EstornoItem[],
    visibilityConfig: DashboardItemVisibilityConfig | null,
    unitPricesConfig: ChannelUnitPricesConfig | null
): Promise<GeneralReportViewData> => {
    
    const cafePrice = unitPricesConfig?.cdmListaHospedes || 0;

    const summary: GeneralReportViewData['summary'] = { 
        periodTotals: {}, 
        grandTotalComCI: 0, 
        grandTotalQtd: 0,
        grandTotalSemCI: 0,
        grandTotalCIQtd: 0,
        grandTotalReajusteCI: 0,
    };
    
    const allPossiblePeriodIds: (PeriodId | 'roomService' | 'estornos')[] = [
        ...PERIOD_DEFINITIONS.map(p => p.id), 
        'roomService',
        'estornos',
    ];

    allPossiblePeriodIds.forEach(pId => {
        if (!summary.periodTotals[pId]) {
             summary.periodTotals[pId] = { qtd: 0, valor: 0 };
        }
    });

    const dailyBreakdowns = entries.map(entry => {
        const totals = processEntryForTotalsV2(entry, unitPricesConfig || {});
        
        const periodTotalsForDay: any = {};
        
        // Populate totals for all defined periods, respecting visibility
        allPossiblePeriodIds.forEach(periodId => {
             let value = { qtd: 0, valor: 0 };
             
             // This logic determines if the period should be included based on visibility config
             const isVisible = visibilityConfig ? visibilityConfig[periodId as string] !== false : true;
             
             if (isVisible) {
                 switch (periodId) {
                    case 'almocoPrimeiroTurno': value = totals.turnos.almocoPT; break;
                    case 'almocoSegundoTurno': value = totals.turnos.almocoST; break;
                    case 'jantar': value = totals.turnos.jantar; break;
                    case 'cafeDaManha': value = { qtd: totals.cafeHospedes.qtd + totals.cafeAvulsos.qtd, valor: totals.cafeHospedes.valor + totals.cafeAvulsos.valor }; break;
                    case 'controleCafeDaManha': value = totals.controleCafe; break;
                    case 'cafeManhaNoShow': value = totals.cafeManhaNoShow; break;
                    case 'madrugada': value = { qtd: totals.rsMadrugada.qtdPedidos, valor: totals.rsMadrugada.valor }; break;
                    case 'eventos': value = { qtd: totals.eventos.direto.qtd + totals.eventos.hotel.qtd, valor: totals.eventos.direto.valor + totals.eventos.hotel.valor }; break;
                    case 'roomService': value = { qtd: totals.roomServiceTotal.qtd, valor: totals.roomServiceTotal.valor }; break;
                    case 'controleFrigobar':
                    case 'frigobar': 
                         value = totals.frigobar; break;
                    default:
                        if ((totals as any)[periodId]) {
                            value = { qtd: (totals as any)[periodId].qtd || 0, valor: (totals as any)[periodId].valor || 0 };
                        }
                 }
             }
             
             periodTotalsForDay[periodId] = value;
             summary.periodTotals[periodId]!.qtd += value.qtd;
             summary.periodTotals[periodId]!.valor += value.valor;
        });

        const estornosDoDia = estornos.filter(e => e.date === entry.id);
        const totalEstornoDoDia = estornosDoDia.reduce((sum, item) => sum + item.valorEstorno, 0);

        periodTotalsForDay.estornos = { qtd: estornosDoDia.length, valor: totalEstornoDoDia };
        summary.periodTotals.estornos.qtd += estornosDoDia.length;
        summary.periodTotals.estornos.valor += totalEstornoDoDia;


        const dailyBreakdownItem = {
            date: format(parseISO(String(entry.id)), 'dd/MM/yyyy'),
            periodTotals: periodTotalsForDay,
            totalComCI: totals.grandTotal.comCI.valor + totalEstornoDoDia,
            totalSemCI: totals.grandTotal.semCI.valor + totalEstornoDoDia,
            totalReajusteCI: totals.totalReajusteCI,
            totalQtd: totals.grandTotal.comCI.qtd,
            totalCIQtd: totals.totalCI.qtd,
            totalCIValor: totals.totalCI.valor,
        };

        summary.grandTotalComCI += dailyBreakdownItem.totalComCI;
        summary.grandTotalQtd += dailyBreakdownItem.totalQtd;
        summary.grandTotalSemCI += dailyBreakdownItem.totalSemCI;
        summary.grandTotalCIQtd += dailyBreakdownItem.totalCIQtd;
        summary.grandTotalReajusteCI += dailyBreakdownItem.totalReajusteCI;
        
        return dailyBreakdownItem;
    });
    
    return {
        dailyBreakdowns,
        summary,
        reportTitle: 'GERAL (MÊS)',
    };
};
