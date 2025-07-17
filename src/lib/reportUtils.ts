

"use client";

import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodId, PeriodData, EventosPeriodData, ReportData, GeneralReportViewData, PeriodReportViewData, GeneralReportDailyItem, GeneralReportSummary, DailyCategoryDataItem } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { SALES_CHANNELS } from './config/forms';

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

    // --- 1. DECOMPOSITION: Calculate all individual, non-overlapping components ---
    const rsMadrugada = {
        valor: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServicePagDireto.vtotal') + getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceValorServico.vtotal'),
        qtdPedidos: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPedidos.qtd'),
        qtdPratos: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPratos.qtd'),
    };
    const breakfast = calculatePeriodGrandTotal(entry.breakfast);
    const italianoAlmoco = calculatePeriodGrandTotal(entry.italianoAlmoco);
    const italianoJantar = calculatePeriodGrandTotal(entry.italianoJantar);
    const indianoAlmoco = calculatePeriodGrandTotal(entry.indianoAlmoco);
    const indianoJantar = calculatePeriodGrandTotal(entry.indianoJantar);
    const baliAlmoco = calculatePeriodGrandTotal(entry.baliAlmoco);
    const baliHappy = calculatePeriodGrandTotal(entry.baliHappy);
    
    const cafeHospedes = {
        valor: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.vtotal'),
        qtd: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.qtd')
    };
    const cafeAvulsos = {
        valor: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.vtotal'),
        qtd: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.qtd')
    };

    const frigobar = {
        valor: (calculatePeriodGrandTotal((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.frigobar as any)).valor + (calculatePeriodGrandTotal((entry.almocoSegundoTurno as PeriodData)?.subTabs?.frigobar as any)).valor + (calculatePeriodGrandTotal((entry.jantar as PeriodData)?.subTabs?.frigobar as any)).valor,
        qtd: (calculatePeriodGrandTotal((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.frigobar as any)).qtd + (calculatePeriodGrandTotal((entry.almocoSegundoTurno as PeriodData)?.subTabs?.frigobar as any)).qtd + (calculatePeriodGrandTotal((entry.jantar as PeriodData)?.subTabs?.frigobar as any)).qtd
    };

    const eventosDireto = { qtd: 0, valor: 0 };
    const eventosHotel = { qtd: 0, valor: 0 };
    (entry.eventos as EventosPeriodData)?.items?.forEach(item => { (item.subEvents || []).forEach(subEvent => {
        const qty = subEvent.quantity || 0; const val = subEvent.totalValue || 0;
        if (subEvent.location === 'DIRETO') { eventosDireto.qtd += qty; eventosDireto.valor += val; } 
        else if (subEvent.location === 'HOTEL') { eventosHotel.qtd += qty; eventosHotel.valor += val; }
    }); });

    // --- ALMOÇO PT ---
    const almocoPTServicos = getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData);
    const almocoPTFaturado = {
        qtd: getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.faturado.channels.aptFaturadosQtd.qtd'),
        valor: getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.faturado.channels.aptFaturadosValorHotel.vtotal') + getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.faturado.channels.aptFaturadosValorFuncionario.vtotal')
    };
    const almocoPTCI = {
        qtd: getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.consumoInterno.channels.aptConsumoInternoQtd.qtd'),
        valor: getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.consumoInterno.channels.aptTotalCI.vtotal'),
        reajuste: getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.consumoInterno.channels.aptReajusteCI.vtotal')
    };
    const almocoPrimeiroTurnoTotal = {
        qtd: almocoPTServicos.qtd + almocoPTFaturado.qtd,
        valor: almocoPTServicos.valor + almocoPTFaturado.valor
    };

    // --- ALMOÇO ST ---
    const almocoSTServicos = getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData);
    const almocoSTFaturado = {
        qtd: getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.faturado.channels.astFaturadosQtd.qtd'),
        valor: getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.faturado.channels.astFaturadosValorHotel.vtotal') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.faturado.channels.astFaturadosValorFuncionario.vtotal')
    };
    const almocoSTCI = {
        qtd: getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.consumoInterno.channels.astConsumoInternoQtd.qtd'),
        valor: getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.consumoInterno.channels.astTotalCI.vtotal'),
        reajuste: getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.consumoInterno.channels.astReajusteCI.vtotal')
    };
    const almocoSegundoTurnoTotal = {
        qtd: almocoSTServicos.qtd + almocoSTFaturado.qtd,
        valor: almocoSTServicos.valor + almocoSTFaturado.valor
    };

    // --- JANTAR ---
    const jantarServicos = getPeriodRestaurantTotal(entry.jantar as PeriodData);
    const jantarFaturado = {
        qtd: getSafeNumericValue(entry, 'jantar.subTabs.faturado.channels.jntFaturadosQtd.qtd'),
        valor: getSafeNumericValue(entry, 'jantar.subTabs.faturado.channels.jntFaturadosValorHotel.vtotal') + getSafeNumericValue(entry, 'jantar.subTabs.faturado.channels.jntFaturadosValorFuncionario.vtotal')
    };
    const jantarCI = {
        qtd: getSafeNumericValue(entry, 'jantar.subTabs.consumoInterno.channels.jntConsumoInternoQtd.qtd'),
        valor: getSafeNumericValue(entry, 'jantar.subTabs.consumoInterno.channels.jntTotalCI.vtotal'),
        reajuste: getSafeNumericValue(entry, 'jantar.subTabs.consumoInterno.channels.jntReajusteCI.vtotal')
    };
    const jantarTotal = {
        qtd: jantarServicos.qtd + jantarFaturado.qtd,
        valor: jantarServicos.valor + jantarFaturado.valor,
    };
    
    // --- 2. ASSEMBLY ---
    const madrugadaTotal = {
        qtd: rsMadrugada.qtdPedidos,
        valor: rsMadrugada.valor,
    };

    const cafeDaManhaTotal = {
        qtd: cafeHospedes.qtd + cafeAvulsos.qtd,
        valor: cafeHospedes.valor + cafeAvulsos.valor
    };

    // Combined "Almoço" for summary cards
    const almocoTotal = {
        qtd: almocoPrimeiroTurnoTotal.qtd + almocoSegundoTurnoTotal.qtd,
        valor: almocoPrimeiroTurnoTotal.valor + almocoSegundoTurnoTotal.valor
    };
    // Combined "Almoço CI" for summary cards
    const almocoCITotal = {
        qtd: almocoPTCI.qtd + almocoSTCI.qtd,
        valor: almocoPTCI.valor + almocoSTCI.valor
    };

    const grandTotalComCI = {
        qtd: rsMadrugada.qtdPedidos + cafeHospedes.qtd + cafeAvulsos.qtd + breakfast.qtd +
             almocoPrimeiroTurnoTotal.qtd + almocoPTCI.qtd +
             almocoSegundoTurnoTotal.qtd + almocoSTCI.qtd +
             jantarTotal.qtd + jantarCI.qtd +
             italianoAlmoco.qtd + italianoJantar.qtd + indianoAlmoco.qtd + indianoJantar.qtd +
             baliAlmoco.qtd + baliHappy.qtd + frigobar.qtd +
             eventosDireto.qtd + eventosHotel.qtd,
        valor: rsMadrugada.valor + cafeHospedes.valor + cafeAvulsos.valor + breakfast.valor +
               almocoPrimeiroTurnoTotal.valor + almocoPTCI.valor + almocoPTCI.reajuste +
               almocoSegundoTurnoTotal.valor + almocoSTCI.valor + almocoSTCI.reajuste +
               jantarTotal.valor + jantarCI.valor + jantarCI.reajuste +
               italianoAlmoco.valor + italianoJantar.valor + indianoAlmoco.valor + indianoJantar.valor +
               baliAlmoco.valor + baliHappy.valor + frigobar.valor +
               eventosDireto.valor + eventosHotel.valor,
    };

    const totalCI = {
        qtd: almocoPTCI.qtd + almocoSTCI.qtd + jantarCI.qtd,
        valor: almocoPTCI.valor + almocoSTCI.valor + jantarCI.valor,
    };
    
    const totalReajusteCI = almocoPTCI.reajuste + almocoSTCI.reajuste + jantarCI.reajuste;

    const grandTotalSemCI = {
        qtd: grandTotalComCI.qtd - totalCI.qtd,
        valor: grandTotalComCI.valor - totalCI.valor - totalReajusteCI,
    };

    // --- 3. RETURN: Provide all the calculated parts for consumers ---
    return {
        madrugada: madrugadaTotal,
        cafeDaManha: cafeDaManhaTotal,
        rsMadrugada,
        cafeHospedes,
        cafeAvulsos,
        breakfast,
        almoco: almocoTotal, // Combined for summary card
        almocoPrimeiroTurno: almocoPrimeiroTurnoTotal, // Individual for detailed report
        almocoSegundoTurno: almocoSegundoTurnoTotal, // Individual for detailed report
        jantar: jantarTotal,
        italianoAlmoco,
        italianoJantar,
        indianoAlmoco,
        indianoJantar,
        baliAlmoco,
        baliHappy,
        frigobar,
        eventos: { direto: eventosDireto, hotel: eventosHotel },
        almocoCI: almocoCITotal, // Combined CI for summary card
        jantarCI,
        grandTotal: { comCI: grandTotalComCI, semCI: grandTotalSemCI },
        totalCI,
        reajusteCI: { total: totalReajusteCI, almoco: almocoPTCI.reajuste + almocoSTCI.reajuste, jantar: jantarCI.reajuste },
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
    madrugadaPagDiretoValor: 0,
    madrugadaValorServicoValor: 0,
    madrugadaQtdPedidos: 0,
    madrugadaQtdPratos: 0,
    eventosDiretoQtd: 0, eventosDiretoValor: 0,
    eventosHotelQtd: 0, eventosHotelValor: 0,
    frigobarPTQtd: 0, frigobarPTRestauranteValor: 0, frigobarPTHotelValor: 0, frigobarPTTotalValor: 0,
    frigobarSTQtd: 0, frigobarSTRestauranteValor: 0, frigobarSTHotelValor: 0, frigobarSTTotalValor: 0,
    frigobarJNTQtd: 0, frigobarJNTRestauranteValor: 0, frigobarJNTHotelValor: 0, frigobarJNTTotalValor: 0,
  };

  const periodEntryData = entry[periodId] as PeriodData | EventosPeriodData | undefined;
  
  if (periodId === 'frigobar') {
    const frigobarAlmocoPT = (entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.frigobar;
    data.frigobarPTQtd = getSafeNumericValue(frigobarAlmocoPT, 'channels.frigobarTotalQuartos.qtd');
    data.frigobarPTRestauranteValor = getSafeNumericValue(frigobarAlmocoPT, 'channels.frigobarPagRestaurante.vtotal');
    data.frigobarPTHotelValor = getSafeNumericValue(frigobarAlmocoPT, 'channels.frigobarPagHotel.vtotal');
    data.frigobarPTTotalValor = data.frigobarPTRestauranteValor + data.frigobarPTHotelValor;

    const frigobarAlmocoST = (entry.almocoSegundoTurno as PeriodData)?.subTabs?.frigobar;
    data.frigobarSTQtd = getSafeNumericValue(frigobarAlmocoST, 'channels.frigobarTotalQuartos.qtd');
    data.frigobarSTRestauranteValor = getSafeNumericValue(frigobarAlmocoST, 'channels.frigobarPagRestaurante.vtotal');
    data.frigobarSTHotelValor = getSafeNumericValue(frigobarAlmocoST, 'channels.frigobarPagHotel.vtotal');
    data.frigobarSTTotalValor = data.frigobarSTRestauranteValor + data.frigobarSTHotelValor;

    const frigobarJantar = (entry.jantar as PeriodData)?.subTabs?.frigobar;
    data.frigobarJNTQtd = getSafeNumericValue(frigobarJantar, 'channels.frigobarTotalQuartos.qtd');
    data.frigobarJNTRestauranteValor = getSafeNumericValue(frigobarJantar, 'channels.frigobarPagRestaurante.vtotal');
    data.frigobarJNTHotelValor = getSafeNumericValue(frigobarJantar, 'channels.frigobarPagHotel.vtotal');
    data.frigobarJNTTotalValor = data.frigobarJNTRestauranteValor + data.frigobarJNTHotelValor;

    return data;
  }
  
  if (!periodEntryData || typeof periodEntryData === 'string') {
    return data;
  }

  const prefixes: ('apt' | 'ast' | 'jnt')[] = [];
  if (periodId === 'almocoPrimeiroTurno') prefixes.push('apt');
  else if (periodId === 'almocoSegundoTurno') prefixes.push('ast');
  else if (periodId === 'jantar') prefixes.push('jnt');

  if (prefixes.length > 0) {
    prefixes.forEach(prefix => {
      const pData = periodEntryData as PeriodData;
      
      const hotelValor = getSafeNumericValue(pData, `subTabs.faturado.channels.${prefix}FaturadosValorHotel.vtotal`);
      const funcionarioValor = getSafeNumericValue(pData, `subTabs.faturado.channels.${prefix}FaturadosValorFuncionario.vtotal`);
      data.faturadosQtd += getSafeNumericValue(pData, `subTabs.faturado.channels.${prefix}FaturadosQtd.qtd`);
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

      data.retiradaQtd += getSafeNumericValue(pData, `subTabs.delivery.channels.${prefix}ClienteMesaRetiradaQtd.qtd`);
      data.retiradaValor += getSafeNumericValue(pData, `subTabs.delivery.channels.${prefix}ClienteMesaRetiradaValor.vtotal`);

      data.ciQtd += getSafeNumericValue(pData, `subTabs.consumoInterno.channels.${prefix}ConsumoInternoQtd.qtd`);
      data.ciReajusteValor += getSafeNumericValue(pData, `subTabs.consumoInterno.channels.${prefix}ReajusteCI.vtotal`);
      data.ciTotalValor += getSafeNumericValue(pData, `subTabs.consumoInterno.channels.${prefix}TotalCI.vtotal`);

      data.roomServiceQtd += getSafeNumericValue(pData, `subTabs.roomService.channels.${prefix}RoomServiceQtdPedidos.qtd`);
      data.roomServiceValor += getSafeNumericValue(pData, `subTabs.roomService.channels.${prefix}RoomServicePagDireto.vtotal`) + getSafeNumericValue(pData, `subTabs.roomService.channels.${prefix}RoomServiceValorServico.vtotal`);
    });
  } else if (periodId === 'madrugada') {
    const pData = periodEntryData as PeriodData;
    data.madrugadaPagDiretoValor = getSafeNumericValue(pData, 'channels.madrugadaRoomServicePagDireto.vtotal');
    data.madrugadaValorServicoValor = getSafeNumericValue(pData, 'channels.madrugadaRoomServiceValorServico.vtotal');
    data.madrugadaQtdPedidos = getSafeNumericValue(pData, 'channels.madrugadaRoomServiceQtdPedidos.qtd');
    data.madrugadaQtdPratos = getSafeNumericValue(pData, 'channels.madrugadaRoomServiceQtdPratos.qtd');
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
  } else if (periodId === 'eventos') {
      const evData = periodEntryData as EventosPeriodData;
      (evData.items || []).forEach(item => { (item.subEvents || []).forEach(subEvent => {
          const qty = subEvent.quantity || 0; const val = subEvent.totalValue || 0;
          if (subEvent.location === 'DIRETO') { data.eventosDiretoQtd += qty; data.eventosDiretoValor += val; }
          else if (subEvent.location === 'HOTEL') { data.eventosHotelQtd += qty; data.eventosHotelValor += val; }
      }); });
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
              if (totalsForPeriod) {
                periodTotals[periodId] = { qtd: totalsForPeriod.qtd || 0, valor: totalsForPeriod.valor || 0 };
              } else {
                periodTotals[periodId] = { qtd: 0, valor: 0 };
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

      // Accumulate all period totals for the summary footer
      dailyBreakdowns.forEach(daily => {
          Object.keys(daily.periodTotals).forEach(pId => {
              const periodId = pId as PeriodId;
              if (summary.periodTotals[periodId]) {
                  summary.periodTotals[periodId]!.qtd += daily.periodTotals[periodId]!.qtd;
                  summary.periodTotals[periodId]!.valor += daily.periodTotals[periodId]!.valor;
              }
          })
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
        madrugadaResumo: [],
        eventos: [],
        frigobarPT: [], frigobarST: [], frigobarJNT: [],
      };
      const summaryAcc: Record<string, { qtd: number; total: number; reajuste?: number; qtdPedidos?: number, qtdPratos?: number, totalPagDireto?: number, totalValorServico?: number }> = {
        faturados: { qtd: 0, total: 0 }, ifood: { qtd: 0, total: 0 }, rappi: { qtd: 0, total: 0 },
        mesa: { qtd: 0, total: 0 }, hospedes: { qtd: 0, total: 0 }, retirada: { qtd: 0, total: 0 },
        consumoInterno: { qtd: 0, total: 0, reajuste: 0 }, roomService: { qtd: 0, total: 0 }, generic: {qtd: 0, total: 0},
        cdmHospedes: { qtd: 0, total: 0 }, cdmAvulsos: { qtd: 0, total: 0 },
        madrugadaResumo: { qtd: 0, total: 0, qtdPedidos: 0, qtdPratos: 0, totalPagDireto: 0, totalValorServico: 0 },
        eventos: { qtd: 0, total: 0 },
        frigobarPT: { qtd: 0, total: 0 }, frigobarST: { qtd: 0, total: 0 }, frigobarJNT: { qtd: 0, total: 0 },
      };

      filteredEntries.forEach(entry => {
        const entryDateStr = entry.id ? `${entry.id.substring(8, 10)}/${entry.id.substring(5, 7)}/${entry.id.substring(0, 4)}` : "Inválida";
        const dailyData = extractDetailedCategoryDataForPeriod(entry, selectedPeriod);
        
        if (selectedPeriod === 'madrugada') {
            const pagDireto = dailyData.madrugadaPagDiretoValor || 0;
            const valorServico = dailyData.madrugadaValorServicoValor || 0;
            const qtdPedidos = dailyData.madrugadaQtdPedidos || 0;
            const qtdPratos = dailyData.madrugadaQtdPratos || 0;

            if (pagDireto > 0 || valorServico > 0 || qtdPedidos > 0 || qtdPratos > 0) {
                dailyResults.madrugadaResumo.push({ date: entryDateStr, qtdPedidos, qtdPratos, pagDireto, valorServico, total: pagDireto + valorServico });
            }
            
            (summaryAcc.madrugadaResumo.qtdPedidos as number) += qtdPedidos;
            (summaryAcc.madrugadaResumo.qtdPratos as number) += qtdPratos;
            (summaryAcc.madrugadaResumo.totalPagDireto as number) += pagDireto;
            (summaryAcc.madrugadaResumo.totalValorServico as number) += valorServico;

        } else if (selectedPeriod === 'cafeDaManha') {
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
        } else if (selectedPeriod === 'frigobar') {
            const { frigobarPTQtd, frigobarPTRestauranteValor, frigobarPTHotelValor, frigobarPTTotalValor } = dailyData;
            if(frigobarPTQtd > 0 || frigobarPTTotalValor > 0) { dailyResults.frigobarPT.push({ date: entryDateStr, qtd: frigobarPTQtd, restaurante: frigobarPTRestauranteValor, hotel: frigobarPTHotelValor, total: frigobarPTTotalValor }); }
            summaryAcc.frigobarPT.qtd += frigobarPTQtd; summaryAcc.frigobarPT.total += frigobarPTTotalValor;
            
            const { frigobarSTQtd, frigobarSTRestauranteValor, frigobarSTHotelValor, frigobarSTTotalValor } = dailyData;
            if(frigobarSTQtd > 0 || frigobarSTTotalValor > 0) { dailyResults.frigobarST.push({ date: entryDateStr, qtd: frigobarSTQtd, restaurante: frigobarSTRestauranteValor, hotel: frigobarSTHotelValor, total: frigobarSTTotalValor }); }
            summaryAcc.frigobarST.qtd += frigobarSTQtd; summaryAcc.frigobarST.total += frigobarSTTotalValor;

            const { frigobarJNTQtd, frigobarJNTRestauranteValor, frigobarJNTHotelValor, frigobarJNTTotalValor } = dailyData;
            if(frigobarJNTQtd > 0 || frigobarJNTTotalValor > 0) { dailyResults.frigobarJNT.push({ date: entryDateStr, qtd: frigobarJNTQtd, restaurante: frigobarJNTRestauranteValor, hotel: frigobarJNTHotelValor, total: frigobarJNTTotalValor }); }
            summaryAcc.frigobarJNT.qtd += frigobarJNTQtd; summaryAcc.frigobarJNT.total += frigobarJNTTotalValor;
        } else if (selectedPeriod === 'eventos') {
            const { eventosDiretoQtd, eventosDiretoValor, eventosHotelQtd, eventosHotelValor } = dailyData;
            const totalQtd = eventosDiretoQtd + eventosHotelQtd;
            const totalValor = eventosDiretoValor + eventosHotelValor;
            if (totalQtd > 0 || totalValor > 0) {
                dailyResults.eventos.push({ date: entryDateStr, diretoQtd: eventosDiretoQtd, diretoValor: eventosDiretoValor, hotelQtd: eventosHotelQtd, hotelValor: eventosHotelValor, totalQtd, totalValor });
            }
            summaryAcc.eventos.qtd += totalQtd;
            summaryAcc.eventos.total += totalValor;
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
      
      const subtotalGeralComCI_TOTAL = (selectedPeriod === 'madrugada')
            ? (summaryAcc.madrugadaResumo.totalPagDireto || 0) + (summaryAcc.madrugadaResumo.totalValorServico || 0)
            : Object.values(summaryAcc).reduce((sum, cat) => sum + cat.total, 0);

      const subtotalGeralComCI_QTD = (selectedPeriod === 'madrugada')
            ? (summaryAcc.madrugadaResumo.qtdPedidos || 0)
            : Object.values(summaryAcc).reduce((sum, cat) => sum + cat.qtd, 0);
      
      const subtotalGeralSemCI_TOTAL = subtotalGeralComCI_TOTAL - (summaryAcc.consumoInterno?.total || 0) - (summaryAcc.consumoInterno?.reajuste || 0);
      const subtotalGeralSemCI_QTD = subtotalGeralComCI_QTD - (summaryAcc.consumoInterno?.qtd || 0);

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

    

    