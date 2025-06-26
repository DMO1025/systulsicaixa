
"use client";

import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodId, PeriodData, EventosPeriodData, ReportData, GeneralReportViewData, PeriodReportViewData, GeneralReportDailyItem, GeneralReportSummary, DailyCategoryDataItem } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/constants';

const getReportTitleLabel = (periodId: PeriodId | "all"): string => {
  if (periodId === "all") return "GERAL (MÊS)";
  const periodDef = PERIOD_DEFINITIONS.find(p => p.id === periodId);
  return periodDef ? periodDef.label.toUpperCase() : "DESCONHECIDO";
};

export const calculatePeriodGrandTotal = (periodEntryData: PeriodData | EventosPeriodData | undefined | string): { qtd: number; valor: number } => {
  if (!periodEntryData || typeof periodEntryData === 'string') return { qtd: 0, valor: 0 };

  let totalQtd = 0;
  let totalValor = 0;

  if ('items' in periodEntryData) { // EventosPeriodData
    const evData = periodEntryData as EventosPeriodData;
    (evData.items || []).forEach(item => {
      (item.subEvents || []).forEach(subEvent => {
        totalQtd += subEvent.quantity || 0;
        totalValor += subEvent.totalValue || 0;
      });
    });
  } else { // PeriodData
    const pData = periodEntryData as PeriodData;
    if (pData.channels) {
      Object.values(pData.channels).forEach(channel => {
        totalQtd += getSafeNumericValue(channel, 'qtd');
        totalValor += getSafeNumericValue(channel, 'vtotal');
      });
    }
    if (pData.subTabs) {
      Object.values(pData.subTabs).forEach(subTab => {
        if (subTab?.channels) {
          Object.values(subTab.channels).forEach(channel => {
            totalQtd += getSafeNumericValue(channel, 'qtd');
            totalValor += getSafeNumericValue(channel, 'vtotal');
          });
        }
      });
    }
  }
  return { qtd: totalQtd, valor: totalValor };
};

export const processEntryForTotals = (entry: DailyLogEntry) => {
    // Helper to get totals from a period's restaurant service sub-tabs.
    const getPeriodRestaurantTotal = (period: PeriodData | undefined) => {
        let totalValor = 0;
        let totalQtd = 0;
        if (!period || typeof period === 'string' || !period.subTabs) {
            return { qtd: 0, valor: 0 };
        }
        const subTabsToSum = ['roomService', 'hospedes', 'clienteMesa', 'delivery'];
        for (const subTabKey of subTabsToSum) {
            const subTab = period.subTabs[subTabKey];
            if (subTab?.channels) {
                for (const channel of Object.values(subTab.channels)) {
                    totalQtd += getSafeNumericValue(channel, 'qtd');
                    totalValor += getSafeNumericValue(channel, 'vtotal');
                }
            }
        }
        return { qtd: totalQtd, valor: totalValor };
    };

    // ALMOÇO (restaurant services + reajuste)
    const almocoPTTotals = getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData);
    const almocoSTTotals = getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData);
    const reajusteCIAlmoco = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosReajusteCI.vtotal') +
                           getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosReajusteCI.vtotal');
    const almocoValor = almocoPTTotals.valor + almocoSTTotals.valor + reajusteCIAlmoco;
    const almocoQtd = almocoPTTotals.qtd + almocoSTTotals.qtd;

    // JANTAR (restaurant services + reajuste)
    const jantarTotals = getPeriodRestaurantTotal(entry.jantar as PeriodData);
    const reajusteCIJantar = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosReajusteCI.vtotal');
    const jantarValor = jantarTotals.valor + reajusteCIJantar;
    const jantarQtd = jantarTotals.qtd;
    
    // FRIGOBAR (all frigobar values from all periods, including old structure)
    const frigobarValor = 
        (calculatePeriodGrandTotal((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.frigobar as any)).valor +
        (calculatePeriodGrandTotal((entry.almocoSegundoTurno as PeriodData)?.subTabs?.frigobar as any)).valor +
        (calculatePeriodGrandTotal((entry.jantar as PeriodData)?.subTabs?.frigobar as any)).valor +
        (calculatePeriodGrandTotal((entry as any).frigobar)).valor;
    const frigobarQtd = 
        (calculatePeriodGrandTotal((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.frigobar as any)).qtd +
        (calculatePeriodGrandTotal((entry.almocoSegundoTurno as PeriodData)?.subTabs?.frigobar as any)).qtd +
        (calculatePeriodGrandTotal((entry.jantar as PeriodData)?.subTabs?.frigobar as any)).qtd +
        (calculatePeriodGrandTotal((entry as any).frigobar)).qtd;
        
    // C.I. (actual consumption, not reajuste)
    const almocoCIValor = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosTotalCI.vtotal') +
                        getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosTotalCI.vtotal');
    const almocoCIQtd = getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.ciEFaturados.channels.aptCiEFaturadosConsumoInternoQtd.qtd') +
                      getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.ciEFaturados.channels.astCiEFaturadosConsumoInternoQtd.qtd');
    const jantarCIValor = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosTotalCI.vtotal');
    const jantarCIQtd = getSafeNumericValue(entry, 'jantar.subTabs.ciEFaturados.channels.jntCiEFaturadosConsumoInternoQtd.qtd');

    // CAFÉ DA MANHÃ (broken down)
    const cafeHospedesValor = getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.vtotal') +
                              getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.vtotal') +
                              getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.vtotal');
    const cafeHospedesQtd = getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.qtd') +
                            getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.qtd') +
                            getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.qtd');

    const cafeAvulsosValor = getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.vtotal') +
                             getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.vtotal');
    const cafeAvulsosQtd = getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.qtd') +
                           getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.qtd');

    // OTHER PERIODS (simple grand total)
    const rsMadrugada = calculatePeriodGrandTotal(entry.madrugada);
    const breakfast = calculatePeriodGrandTotal(entry.breakfast);
    const italianoAlmoco = calculatePeriodGrandTotal(entry.italianoAlmoco);
    const italianoJantar = calculatePeriodGrandTotal(entry.italianoJantar);
    const indianoAlmoco = calculatePeriodGrandTotal(entry.indianoAlmoco);
    const indianoJantar = calculatePeriodGrandTotal(entry.indianoJantar);
    const baliAlmoco = calculatePeriodGrandTotal(entry.baliAlmoco);
    const baliHappy = calculatePeriodGrandTotal(entry.baliHappy);
    
    // EVENTOS (split by location)
    let eventosDiretoValor = 0, eventosDiretoQtd = 0, eventosHotelValor = 0, eventosHotelQtd = 0;
    const eventosData = entry.eventos as EventosPeriodData | undefined;
    (eventosData?.items || []).forEach(item => {
      (item.subEvents || []).forEach(subEvent => {
        const qty = subEvent.quantity || 0;
        const val = subEvent.totalValue || 0;
        if (subEvent.location === 'DIRETO') {
          eventosDiretoQtd += qty; eventosDiretoValor += val;
        } else if (subEvent.location === 'HOTEL') {
          eventosHotelQtd += qty; eventosHotelValor += val;
        }
      });
    });

    // GRAND TOTALS (based on summing all periods)
    let grandTotalComCI = 0;
    let grandTotalQtd = 0;
    const allPeriodsForTotal = [...PERIOD_DEFINITIONS, { id: "frigobar" } as any]; 
    allPeriodsForTotal.forEach(pDef => {
        const periodData = entry[pDef.id as keyof DailyLogEntry];
        if (pDef.id === 'frigobar' && (entry as any).frigobar) { // Handle old frigobar structure
             const { qtd, valor } = calculatePeriodGrandTotal((entry as any).frigobar);
             grandTotalQtd += qtd;
             grandTotalComCI += valor;
        } else if (pDef.id !== 'frigobar') { // Handle new structure
            const { qtd, valor } = calculatePeriodGrandTotal(periodData as any);
            grandTotalQtd += qtd;
            grandTotalComCI += valor;
        }
    });

    // FINAL AGGREGATES
    const totalCIValor = almocoCIValor + jantarCIValor;
    const totalCIQtd = almocoCIQtd + jantarCIQtd;
    const totalReajusteCI = reajusteCIAlmoco + reajusteCIJantar;
    const grandTotalSemCI = grandTotalComCI - totalCIValor;
    const grandTotalQtdSemCI = grandTotalQtd - totalCIQtd;

    return {
        rsMadrugada, 
        cafeHospedes: { qtd: cafeHospedesQtd, valor: cafeHospedesValor },
        cafeAvulsos: { qtd: cafeAvulsosQtd, valor: cafeAvulsosValor },
        breakfast, italianoAlmoco, italianoJantar, indianoAlmoco, indianoJantar, baliAlmoco, baliHappy,
        almoco: { qtd: almocoQtd, valor: almocoValor },
        jantar: { qtd: jantarQtd, valor: jantarValor },
        frigobar: { qtd: frigobarQtd, valor: frigobarValor },
        almocoCI: { qtd: almocoCIQtd, valor: almocoCIValor },
        jantarCI: { qtd: jantarCIQtd, valor: jantarCIValor },
        reajusteCI: { almoco: reajusteCIAlmoco, jantar: reajusteCIJantar, total: totalReajusteCI },
        eventos: { direto: { qtd: eventosDiretoQtd, valor: eventosDiretoValor }, hotel: { qtd: eventosHotelQtd, valor: eventosHotelValor } },
        grandTotal: {
            comCI: { qtd: grandTotalQtd, valor: grandTotalComCI },
            semCI: { qtd: grandTotalQtdSemCI, valor: grandTotalSemCI },
        },
        totalCI: { qtd: totalCIQtd, valor: totalCIValor },
    };
};


const extractDetailedCategoryDataForPeriod = (entry: DailyLogEntry, periodId: PeriodId): Record<string, number> => {
  const data: Record<string, number> = {
    faturadosQtd: 0, faturadosHotelValor: 0, faturadosFuncionarioValor: 0, faturadosTotalValor: 0,
    ifoodQtd: 0, ifoodValor: 0,
    rappiQtd: 0, rappiValor: 0,
    mesaQtd: 0, mesaDinheiroValor: 0, mesaCreditoValor: 0, mesaDebitoValor: 0, mesaPixValor: 0, mesaTicketValor: 0, mesaTotalValor: 0,
    hospedesQtd: 0, hospedesValor: 0,
    retiradaQtd: 0, retiradaValor: 0,
    ciQtd: 0, ciReajusteValor: 0, ciTotalValor: 0,
    roomServiceQtd: 0, roomServiceValor: 0,
    genericPeriodQtd: 0, genericPeriodValor: 0,
    cdmListaHospedesQtd: 0, cdmListaHospedesValor: 0,
    cdmNoShowQtd: 0, cdmNoShowValor: 0,
    cdmSemCheckInQtd: 0, cdmSemCheckInValor: 0,
    cdmCafeAssinadoQtd: 0, cdmCafeAssinadoValor: 0,
    cdmDiretoCartaoQtd: 0, cdmDiretoCartaoValor: 0,
  };

  const periodEntryData = entry[periodId] as PeriodData | EventosPeriodData | undefined;
  if (!periodEntryData || typeof periodEntryData === 'string') return data;

  const prefixes: ('apt' | 'ast' | 'jnt')[] = [];
  if (periodId === 'almocoPrimeiroTurno') prefixes.push('apt');
  else if (periodId === 'almocoSegundoTurno') prefixes.push('ast');
  else if (periodId === 'jantar') prefixes.push('jnt');

  if (prefixes.length > 0) {
    prefixes.forEach(prefix => {
      const pData = periodEntryData as PeriodData;
      const cifKey = `${prefix}CiEFaturados`;
      
      const hotelValor = getSafeNumericValue(pData, `subTabs.ciEFaturados.channels.${cifKey}ValorHotel.vtotal`);
      const funcionarioValor = getSafeNumericValue(pData, `subTabs.ciEFaturados.channels.${cifKey}ValorFuncionario.vtotal`);
      data.faturadosQtd += getSafeNumericValue(pData, `subTabs.ciEFaturados.channels.${cifKey}FaturadosQtd.qtd`);
      data.faturadosHotelValor += hotelValor;
      data.faturadosFuncionarioValor += funcionarioValor;
      data.faturadosTotalValor += hotelValor + funcionarioValor;

      data.ifoodQtd += getSafeNumericValue(pData, `subTabs.delivery.channels.${prefix}DeliveryIfoodQtd.qtd`);
      data.ifoodValor += getSafeNumericValue(pData, `subTabs.delivery.channels.${prefix}DeliveryIfoodValor.vtotal`);
      data.rappiQtd += getSafeNumericValue(pData, `subTabs.delivery.channels.${prefix}DeliveryRappiQtd.qtd`);
      data.rappiValor += getSafeNumericValue(pData, `subTabs.delivery.channels.${prefix}DeliveryRappiValor.vtotal`);
      
      const mesaDinheiro = getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaDinheiro.vtotal`);
      const mesaCredito = getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaCredito.vtotal`);
      const mesaDebito = getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaDebito.vtotal`);
      const mesaPix = getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaPix.vtotal`);
      const mesaTicket = getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaTicketRefeicao.vtotal`);
      data.mesaQtd += getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaTotaisQtd.qtd`);
      data.mesaDinheiroValor += mesaDinheiro;
      data.mesaCreditoValor += mesaCredito;
      data.mesaDebitoValor += mesaDebito;
      data.mesaPixValor += mesaPix;
      data.mesaTicketValor += mesaTicket;
      data.mesaTotalValor += mesaDinheiro + mesaCredito + mesaDebito + mesaPix + mesaTicket;

      data.hospedesQtd += getSafeNumericValue(pData, `subTabs.hospedes.channels.${prefix}HospedesQtdHospedes.qtd`);
      data.hospedesValor += getSafeNumericValue(pData, `subTabs.hospedes.channels.${prefix}HospedesPagamentoHospedes.vtotal`);

      data.retiradaQtd += getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaRetiradaQtd.qtd`);
      data.retiradaValor += getSafeNumericValue(pData, `subTabs.clienteMesa.channels.${prefix}ClienteMesaRetiradaValor.vtotal`);

      data.ciQtd += getSafeNumericValue(pData, `subTabs.ciEFaturados.channels.${cifKey}ConsumoInternoQtd.qtd`);
      data.ciReajusteValor += getSafeNumericValue(pData, `subTabs.ciEFaturados.channels.${cifKey}ReajusteCI.vtotal`);
      data.ciTotalValor += getSafeNumericValue(pData, `subTabs.ciEFaturados.channels.${cifKey}TotalCI.vtotal`);

      data.roomServiceQtd += getSafeNumericValue(pData, `subTabs.roomService.channels.${prefix}RoomServiceQtdPedidos.qtd`);
      data.roomServiceValor += getSafeNumericValue(pData, `subTabs.roomService.channels.${prefix}RoomServicePagDireto.vtotal`) + getSafeNumericValue(pData, `subTabs.roomService.channels.${prefix}RoomServiceValorServico.vtotal`);
    });
  } else if (periodId === 'madrugada') {
    const pData = periodEntryData as PeriodData;
    data.roomServiceQtd += getSafeNumericValue(pData, 'channels.madrugadaRoomServiceQtdPedidos.qtd');
    data.roomServiceValor += getSafeNumericValue(pData, 'channels.madrugadaRoomServicePagDireto.vtotal') + getSafeNumericValue(pData, 'channels.madrugadaRoomServiceValorServico.vtotal');
  } else if (periodId === 'cafeDaManha') {
    const pData = periodEntryData as PeriodData;
    data.cdmListaHospedesQtd += getSafeNumericValue(pData, 'channels.cdmListaHospedes.qtd');
    data.cdmListaHospedesValor += getSafeNumericValue(pData, 'channels.cdmListaHospedes.vtotal');
    data.cdmNoShowQtd += getSafeNumericValue(pData, 'channels.cdmNoShow.qtd');
    data.cdmNoShowValor += getSafeNumericValue(pData, 'channels.cdmNoShow.vtotal');
    data.cdmSemCheckInQtd += getSafeNumericValue(pData, 'channels.cdmSemCheckIn.qtd');
    data.cdmSemCheckInValor += getSafeNumericValue(pData, 'channels.cdmSemCheckIn.vtotal');
    data.cdmCafeAssinadoQtd += getSafeNumericValue(pData, 'channels.cdmCafeAssinado.qtd');
    data.cdmCafeAssinadoValor += getSafeNumericValue(pData, 'channels.cdmCafeAssinado.vtotal');
    data.cdmDiretoCartaoQtd += getSafeNumericValue(pData, 'channels.cdmDiretoCartao.qtd');
    data.cdmDiretoCartaoValor += getSafeNumericValue(pData, 'channels.cdmDiretoCartao.vtotal');
  } else if (periodId === 'frigobar') {
    const pData = periodEntryData as PeriodData;
    data.genericPeriodQtd += getSafeNumericValue(pData, 'subTabs.primeiroTurno.channels.frgPTTotalQuartos.qtd') + getSafeNumericValue(pData, 'subTabs.segundoTurno.channels.frgSTTotalQuartos.qtd');
    data.genericPeriodValor += getSafeNumericValue(pData, 'subTabs.primeiroTurno.channels.frgPTPagRestaurante.vtotal') + getSafeNumericValue(pData, 'subTabs.primeiroTurno.channels.frgPTPagHotel.vtotal') + getSafeNumericValue(pData, 'subTabs.segundoTurno.channels.frgSTPagRestaurante.vtotal') + getSafeNumericValue(pData, 'subTabs.segundoTurno.channels.frgSTPagHotel.vtotal');
  } else if (['baliAlmoco', 'baliHappy', 'deliverysEventos', 'extras', 'cafeJasmin', 'italianoAlmoco', 'italianoJantar', 'indianoAlmoco', 'indianoJantar', 'breakfast'].includes(periodId)) {
    const pData = periodEntryData as PeriodData;
    if (pData.channels) {
      if (periodId === 'breakfast' && pData.channels['breakfastEntry']) {
        data.genericPeriodQtd += getSafeNumericValue(pData, 'channels.breakfastEntry.qtd');
        data.genericPeriodValor += getSafeNumericValue(pData, 'channels.breakfastEntry.vtotal');
      } else if (periodId === 'italianoAlmoco' && pData.channels['rwItalianoAlmocoEntry']) {
          data.genericPeriodQtd += getSafeNumericValue(pData, 'channels.rwItalianoAlmocoEntry.qtd');
          data.genericPeriodValor += getSafeNumericValue(pData, 'channels.rwItalianoAlmocoEntry.vtotal');
      } else if (periodId === 'italianoJantar' && pData.channels['rwItalianoJantarEntry']) {
          data.genericPeriodQtd += getSafeNumericValue(pData, 'channels.rwItalianoJantarEntry.qtd');
          data.genericPeriodValor += getSafeNumericValue(pData, 'channels.rwItalianoJantarEntry.vtotal');
      } else if (periodId === 'indianoAlmoco' && pData.channels['rwIndianoAlmocoEntry']) {
          data.genericPeriodQtd += getSafeNumericValue(pData, 'channels.rwIndianoAlmocoEntry.qtd');
          data.genericPeriodValor += getSafeNumericValue(pData, 'channels.rwIndianoAlmocoEntry.vtotal');
      } else if (periodId === 'indianoJantar' && pData.channels['rwIndianoJantarEntry']) {
          data.genericPeriodQtd += getSafeNumericValue(pData, 'channels.rwIndianoJantarEntry.qtd');
          data.genericPeriodValor += getSafeNumericValue(pData, 'channels.rwIndianoJantarEntry.vtotal');
      } else {
        data.genericPeriodQtd += getSafeNumericValue(pData, 'channels.genericQtdItems.qtd');
        data.genericPeriodValor += getSafeNumericValue(pData, 'channels.genericTotalValue.vtotal');
      }
    }
  }
  return data;
};

export const generateReportData = (filteredEntries: DailyLogEntry[], selectedPeriod: PeriodId | 'all'): ReportData | null => {
    if (filteredEntries.length === 0) return null;

    if (selectedPeriod === 'all') {
      const dailyBreakdowns: GeneralReportDailyItem[] = [];
      const summary: GeneralReportSummary = {
          periodTotals: {},
          grandTotalComCI: 0,
          grandTotalSemCI: 0,
          grandTotalReajusteCI: 0,
          grandTotalQtd: 0,
          grandTotalCIQtd: 0,
      };

      PERIOD_DEFINITIONS.forEach(pDef => {
          summary.periodTotals[pDef.id] = { qtd: 0, valor: 0 };
      });

      filteredEntries.forEach(entry => {
          const entryDateStr = entry.id ? `${entry.id.substring(8, 10)}/${entry.id.substring(5, 7)}/${entry.id.substring(0, 4)}` : "Inválida";
          
          const entryTotals = processEntryForTotals(entry);
          
          const periodTotals: Partial<Record<PeriodId, { qtd: number; valor: number }>> = {};

          PERIOD_DEFINITIONS.forEach(pDef => {
              const periodId = pDef.id as PeriodId;
              const totalsForPeriod = (entryTotals as any)[periodId];
              periodTotals[periodId] = { qtd: totalsForPeriod.qtd, valor: totalsForPeriod.valor };
              
              if (summary.periodTotals[periodId]) {
                  summary.periodTotals[periodId]!.qtd += totalsForPeriod.qtd;
                  summary.periodTotals[periodId]!.valor += totalsForPeriod.valor;
              }
          });
          
          const dailyItem: GeneralReportDailyItem = {
              date: entryDateStr,
              periodTotals: periodTotals,
              totalComCI: entryTotals.grandTotal.comCI.valor,
              totalSemCI: entryTotals.grandTotal.semCI.valor,
              totalReajusteCI: entryTotals.reajusteCI.total,
              totalQtd: entryTotals.grandTotal.comCI.qtd,
              totalCIQtd: entryTotals.totalCI.qtd,
          };
          
          dailyBreakdowns.push(dailyItem);
          
          summary.grandTotalQtd += entryTotals.grandTotal.comCI.qtd;
          summary.grandTotalCIQtd += entryTotals.totalCI.qtd;
          summary.grandTotalComCI += entryTotals.grandTotal.comCI.valor;
          summary.grandTotalSemCI += entryTotals.grandTotal.semCI.valor;
          summary.grandTotalReajusteCI += entryTotals.reajusteCI.total;
      });

      const data: GeneralReportViewData = {
          dailyBreakdowns,
          summary,
          reportTitle: getReportTitleLabel('all')
      };
      return { type: 'general', data };

    } else {
      const reportTitle = `TOTAL ${getReportTitleLabel(selectedPeriod)}`;
      
      const dailyResults: Record<string, DailyCategoryDataItem[]> = {
        faturados: [], ifood: [], rappi: [], mesa: [], hospedes: [], retirada: [], ci: [], roomService: [], generic: [],
        cdmHospedes: [], cdmAvulsos: [],
      };
      const summaryAcc: Record<string, { qtd: number; total: number; reajuste?: number }> = {
        faturados: { qtd: 0, total: 0 }, ifood: { qtd: 0, total: 0 }, rappi: { qtd: 0, total: 0 },
        mesa: { qtd: 0, total: 0 }, hospedes: { qtd: 0, total: 0 }, retirada: { qtd: 0, total: 0 },
        consumoInterno: { qtd: 0, total: 0, reajuste: 0 }, roomService: { qtd: 0, total: 0 }, generic: {qtd: 0, total: 0},
        cdmHospedes: { qtd: 0, total: 0 }, cdmAvulsos: { qtd: 0, total: 0 },
      };

      filteredEntries.forEach(entry => {
        const entryDateStr = entry.id ? `${entry.id.substring(8, 10)}/${entry.id.substring(5, 7)}/${entry.id.substring(0, 4)}` : "Inválida";
        const dailyData = extractDetailedCategoryDataForPeriod(entry, selectedPeriod);
        
        if (selectedPeriod === 'cafeDaManha') {
            const hospedesTotalValor = dailyData.cdmListaHospedesValor + dailyData.cdmNoShowValor + dailyData.cdmSemCheckInValor;
            const hospedesTotalQtd = dailyData.cdmListaHospedesQtd + dailyData.cdmNoShowQtd + dailyData.cdmSemCheckInQtd;
            if (hospedesTotalValor > 0 || hospedesTotalQtd > 0) {
                dailyResults.cdmHospedes.push({
                    date: entryDateStr,
                    listaQtd: dailyData.cdmListaHospedesQtd, listaValor: dailyData.cdmListaHospedesValor,
                    noShowQtd: dailyData.cdmNoShowQtd, noShowValor: dailyData.cdmNoShowValor,
                    semCheckInQtd: dailyData.cdmSemCheckInQtd, semCheckInValor: dailyData.cdmSemCheckInValor,
                    total: hospedesTotalValor
                });
            }
            summaryAcc.cdmHospedes.qtd += hospedesTotalQtd;
            summaryAcc.cdmHospedes.total += hospedesTotalValor;

            const avulsosTotalValor = dailyData.cdmCafeAssinadoValor + dailyData.cdmDiretoCartaoValor;
            const avulsosTotalQtd = dailyData.cdmCafeAssinadoQtd + dailyData.cdmDiretoCartaoQtd;
            if (avulsosTotalValor > 0 || avulsosTotalQtd > 0) {
                dailyResults.cdmAvulsos.push({
                    date: entryDateStr,
                    assinadoQtd: dailyData.cdmCafeAssinadoQtd, assinadoValor: dailyData.cdmCafeAssinadoValor,
                    diretoQtd: dailyData.cdmDiretoCartaoQtd, diretoValor: dailyData.cdmDiretoCartaoValor,
                    total: avulsosTotalValor
                });
            }
            summaryAcc.cdmAvulsos.qtd += avulsosTotalQtd;
            summaryAcc.cdmAvulsos.total += avulsosTotalValor;
        } else {
            if (dailyData.faturadosTotalValor > 0 || dailyData.faturadosQtd > 0) { dailyResults.faturados.push({ date: entryDateStr, qtd: dailyData.faturadosQtd, hotel: dailyData.faturadosHotelValor, funcionario: dailyData.faturadosFuncionarioValor, total: dailyData.faturadosTotalValor }); }
            if (dailyData.ifoodValor > 0 || dailyData.ifoodQtd > 0) { dailyResults.ifood.push({ date: entryDateStr, qtd: dailyData.ifoodQtd, valor: dailyData.ifoodValor }); }
            if (dailyData.rappiValor > 0 || dailyData.rappiQtd > 0) { dailyResults.rappi.push({ date: entryDateStr, qtd: dailyData.rappiQtd, valor: dailyData.rappiValor }); }
            if (dailyData.mesaTotalValor > 0 || dailyData.mesaQtd > 0) { dailyResults.mesa.push({ date: entryDateStr, qtd: dailyData.mesaQtd, dinheiro: dailyData.mesaDinheiroValor, credito: dailyData.mesaCreditoValor, debito: dailyData.mesaDebitoValor, pix: dailyData.mesaPixValor, ticket: dailyData.mesaTicketValor, total: dailyData.mesaTotalValor }); }
            if (dailyData.hospedesValor > 0 || dailyData.hospedesQtd > 0) { dailyResults.hospedes.push({ date: entryDateStr, qtd: dailyData.hospedesQtd, valor: dailyData.hospedesValor }); }
            if (dailyData.retiradaValor > 0 || dailyData.retiradaQtd > 0) { dailyResults.retirada.push({ date: entryDateStr, qtd: dailyData.retiradaQtd, valor: dailyData.retiradaValor }); }
            if (dailyData.ciTotalValor > 0 || dailyData.ciQtd > 0 || dailyData.ciReajusteValor !== 0) { dailyResults.ci.push({ date: entryDateStr, qtd: dailyData.ciQtd, reajuste: dailyData.ciReajusteValor, total: dailyData.ciTotalValor }); }
            if (dailyData.roomServiceValor > 0 || dailyData.roomServiceQtd > 0) { dailyResults.roomService.push({ date: entryDateStr, qtd: dailyData.roomServiceQtd, valor: dailyData.roomServiceValor }); }
            if (dailyData.genericPeriodValor > 0 || dailyData.genericPeriodQtd > 0) { dailyResults.generic.push({ date: entryDateStr, qtd: dailyData.genericPeriodQtd, valor: dailyData.genericPeriodValor }); }

            summaryAcc.faturados.qtd += dailyData.faturadosQtd || 0; summaryAcc.faturados.total += dailyData.faturadosTotalValor || 0;
            summaryAcc.ifood.qtd += dailyData.ifoodQtd || 0; summaryAcc.ifood.total += dailyData.ifoodValor || 0;
            summaryAcc.rappi.qtd += dailyData.rappiQtd || 0; summaryAcc.rappi.total += dailyData.rappiValor || 0;
            summaryAcc.mesa.qtd += dailyData.mesaQtd || 0; summaryAcc.mesa.total += dailyData.mesaTotalValor || 0;
            summaryAcc.hospedes.qtd += dailyData.hospedesQtd || 0; summaryAcc.hospedes.total += dailyData.hospedesValor || 0;
            summaryAcc.retirada.qtd += dailyData.retiradaQtd || 0; summaryAcc.retirada.total += dailyData.retiradaValor || 0;
            summaryAcc.consumoInterno.qtd += dailyData.ciQtd || 0; summaryAcc.consumoInterno.total += dailyData.ciTotalValor || 0; (summaryAcc.consumoInterno.reajuste as number) += dailyData.ciReajusteValor || 0;
            summaryAcc.roomService.qtd += dailyData.roomServiceQtd || 0; summaryAcc.roomService.total += dailyData.roomServiceValor || 0;
            summaryAcc.generic.qtd += dailyData.genericPeriodQtd || 0; summaryAcc.generic.total += dailyData.genericPeriodValor || 0;
        }
      });
      
      const subtotalGeralComCI_TOTAL = Object.values(summaryAcc).reduce((sum, cat) => sum + cat.total, 0);
      const subtotalGeralComCI_QTD = Object.values(summaryAcc).reduce((sum, cat) => sum + cat.qtd, 0);
      
      const subtotalGeralSemCI_TOTAL = subtotalGeralComCI_TOTAL - summaryAcc.consumoInterno.total;
      const subtotalGeralSemCI_QTD = subtotalGeralComCI_QTD - summaryAcc.consumoInterno.qtd;

      const data: PeriodReportViewData = {
        dailyBreakdowns: dailyResults,
        summary: summaryAcc,
        subtotalGeralComCI: { qtd: subtotalGeralComCI_QTD, total: subtotalGeralComCI_TOTAL },
        subtotalGeralSemCI: { qtd: subtotalGeralSemCI_QTD, total: subtotalGeralSemCI_TOTAL },
        reportTitle,
      };
      return { type: 'period', data };
    }
};
