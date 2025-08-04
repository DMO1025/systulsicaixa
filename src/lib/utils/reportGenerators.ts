

import { getSafeNumericValue } from '@/lib/utils';
import { processEntryForTotals, calculateConsumoInternoFromItems } from './calculations';
import type { DailyLogEntry, PeriodData, EventosPeriodData, GeneralReportViewData, ReportData, PeriodId, PeriodReportViewData, DailyCategoryDataItem, FaturadoItem, ConsumoInternoItem } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';
import { TAB_DEFINITIONS } from '@/components/reports/tabDefinitions';
import { format, parseISO, isValid } from 'date-fns';


function extractDetailedCategoryDataForPeriod(entries: DailyLogEntry[], periodId: PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService'): PeriodReportViewData {
    const dailyBreakdowns: Record<string, DailyCategoryDataItem[]> = {};
    const summary: Record<string, { qtd: number; total: number, reajuste?: number, ticketMedio?: number }> = {};

    const addToBreakdown = (category: string, item: DailyCategoryDataItem) => {
        if (!dailyBreakdowns[category]) dailyBreakdowns[category] = [];
        dailyBreakdowns[category].push(item);
    };

    const addToSummary = (category: string, qtd: number, total: number, reajuste: number = 0) => {
        if (!summary[category]) summary[category] = { qtd: 0, total: 0, reajuste: 0, ticketMedio: 0 };
        summary[category].qtd += qtd;
        summary[category].total += total;
        summary[category].reajuste! += reajuste;
    };
    
    if (periodId === 'roomService') {
        entries.forEach(entry => {
            const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
            const totals = processEntryForTotals(entry);
            const { rsMadrugada } = totals;
            
            const rsApt = (entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService?.channels;
            const rsAst = (entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService?.channels;
            const rsJnt = (entry.jantar as PeriodData)?.subTabs?.roomService?.channels;
            
            const rsAptQtd = getSafeNumericValue(rsApt, `aptRoomServiceQtdPedidos.qtd`);
            const rsAptVal = getSafeNumericValue(rsApt, `aptRoomServicePagDireto.vtotal`) + getSafeNumericValue(rsApt, `aptRoomServiceValorServico.vtotal`);
            const rsAstQtd = getSafeNumericValue(rsAst, `astRoomServiceQtdPedidos.qtd`);
            const rsAstVal = getSafeNumericValue(rsAst, `astRoomServicePagDireto.vtotal`) + getSafeNumericValue(rsAst, `astRoomServiceValorServico.vtotal`);
            const rsJntQtd = getSafeNumericValue(rsJnt, `jntRoomServiceQtdPedidos.qtd`);
            const rsJntVal = getSafeNumericValue(rsJnt, `jntRoomServicePagDireto.vtotal`) + getSafeNumericValue(rsJnt, `jntRoomServiceValorServico.vtotal`);
            
            if (rsMadrugada.qtdPedidos || rsMadrugada.valor || rsMadrugada.qtdPratos) {
                addToBreakdown('rsMadrugada', { date, qtd: rsMadrugada.qtdPedidos, qtdPratos: rsMadrugada.qtdPratos, valor: rsMadrugada.valor });
                addToSummary('rsMadrugada', rsMadrugada.qtdPedidos, rsMadrugada.valor);
            }
            if (rsAptQtd || rsAptVal) {
                addToBreakdown('rsAlmocoPT', { date, qtd: rsAptQtd, valor: rsAptVal });
                addToSummary('rsAlmocoPT', rsAptQtd, rsAptVal);
            }
            if (rsAstQtd || rsAstVal) {
                addToBreakdown('rsAlmocoST', { date, qtd: rsAstQtd, valor: rsAstVal });
                addToSummary('rsAlmocoST', rsAstQtd, rsAstVal);
            }
            if (rsJntQtd || rsJntVal) {
                addToBreakdown('rsJantar', { date, qtd: rsJntQtd, valor: rsJntVal });
                addToSummary('rsJantar', rsJntQtd, rsJntVal);
            }
        });
    } else if (periodId === 'frigobar') {
        entries.forEach(entry => {
            const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');

            const ptData = entry.almocoPrimeiroTurno as PeriodData | undefined;
            const stData = entry.almocoSegundoTurno as PeriodData | undefined;
            const jntData = entry.jantar as PeriodData | undefined;
            
            const frgPTQtd = getSafeNumericValue(ptData, 'subTabs.frigobar.channels.frgPTTotalQuartos.qtd');
            const frgPTRest = getSafeNumericValue(ptData, 'subTabs.frigobar.channels.frgPTPagRestaurante.vtotal');
            const frgPTHotel = getSafeNumericValue(ptData, 'subTabs.frigobar.channels.frgPTPagHotel.vtotal');
            
            const frgSTQtd = getSafeNumericValue(stData, 'subTabs.frigobar.channels.frgSTTotalQuartos.qtd');
            const frgSTRest = getSafeNumericValue(stData, 'subTabs.frigobar.channels.frgSTPagRestaurante.vtotal');
            const frgSTHotel = getSafeNumericValue(stData, 'subTabs.frigobar.channels.frgSTPagHotel.vtotal');
            
            const frgJNTQtd = getSafeNumericValue(jntData, 'subTabs.frigobar.channels.frgJNTTotalQuartos.qtd');
            const frgJNTRest = getSafeNumericValue(jntData, 'subTabs.frigobar.channels.frgJNTPagRestaurante.vtotal');
            const frgJNTHotel = getSafeNumericValue(jntData, 'subTabs.frigobar.channels.frgJNTPagHotel.vtotal');

            if(frgPTQtd || frgPTRest || frgPTHotel) {
                addToBreakdown('frigobarPT', { date, qtd: frgPTQtd, restaurante: frgPTRest, hotel: frgPTHotel, total: frgPTRest + frgPTHotel });
                addToSummary('frigobarPT', frgPTQtd, frgPTRest + frgPTHotel);
            }
            if(frgSTQtd || frgSTRest || frgSTHotel) {
                addToBreakdown('frigobarST', { date, qtd: frgSTQtd, restaurante: frgSTRest, hotel: frgSTHotel, total: frgSTRest + frgSTHotel });
                addToSummary('frigobarST', frgSTQtd, frgSTRest + frgSTHotel);
            }
             if(frgJNTQtd || frgJNTRest || frgJNTHotel) {
                addToBreakdown('frigobarJNT', { date, qtd: frgJNTQtd, restaurante: frgJNTRest, hotel: frgJNTHotel, total: frgJNTRest + frgJNTHotel });
                addToSummary('frigobarJNT', frgJNTQtd, frgJNTRest + frgJNTHotel);
            }
        });
    } else if (periodId === 'consumoInterno') {
        const processItems = (items: ConsumoInternoItem[] | undefined, date: string, category: 'ci-almoco-pt' | 'ci-almoco-st' | 'ci-jantar') => {
            if (!items) return;
            items.forEach(item => {
                const qtd = item.quantity || 0;
                const valor = item.value || 0;
                addToBreakdown(category, { date, clientName: item.clientName, observation: item.observation || '-', qtd, valor });
                addToSummary(category, qtd, valor);
            });
        };

        const processOldFormat = (period: PeriodData | undefined, date: string, category: 'ci-almoco-pt' | 'ci-almoco-st' | 'ci-jantar', prefix: 'apt' | 'ast' | 'jnt') => {
            const oldCiEFaturados = period?.subTabs?.ciEFaturados?.channels;
            if (!oldCiEFaturados) return;
            const qtd = getSafeNumericValue(oldCiEFaturados, `${prefix}CiEFaturadosConsumoInternoQtd.qtd`);
            const valor = getSafeNumericValue(oldCiEFaturados, `${prefix}CiEFaturadosTotalCI.vtotal`) - getSafeNumericValue(oldCiEFaturados, `${prefix}CiEFaturadosReajusteCI.vtotal`);
            if (qtd > 0 || valor > 0) {
                addToBreakdown(category, { date, clientName: 'Consolidado (Formato Antigo)', observation: '-', qtd, valor });
                addToSummary(category, qtd, valor);
            }
        };

        entries.forEach(entry => {
            const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
            // Process new format
            processItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems, date, 'ci-almoco-pt');
            processItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems, date, 'ci-almoco-st');
            processItems((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems, date, 'ci-jantar');
            // Process old format
            processOldFormat(entry.almocoPrimeiroTurno as PeriodData, date, 'ci-almoco-pt', 'apt');
            processOldFormat(entry.almocoSegundoTurno as PeriodData, date, 'ci-almoco-st', 'ast');
            processOldFormat(entry.jantar as PeriodData, date, 'ci-jantar', 'jnt');
        });

    } else if (periodId === 'faturado') {
        const dailyConsolidated: Record<string, { hotel: number, funcionario: number, outros: number, hotelQtd: number, funcionarioQtd: number, outrosQtd: number }> = {};

        entries.forEach(entry => {
            const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
            if (!dailyConsolidated[date]) {
                dailyConsolidated[date] = { hotel: 0, funcionario: 0, outros: 0, hotelQtd: 0, funcionarioQtd: 0, outrosQtd: 0 };
            }
        
            const processPeriod = (period: PeriodData | undefined, prefix: 'apt' | 'ast' | 'jnt') => {
                const newItems = period?.subTabs?.faturado?.faturadoItems || [];
                newItems.forEach(item => {
                    const type = item.type || 'outros';
                    const itemQtd = item.quantity || 0;
                    const itemValue = item.value || 0;
        
                    if (type === 'hotel') {
                        dailyConsolidated[date].hotel += itemValue;
                        dailyConsolidated[date].hotelQtd += itemQtd;
                    } else if (type === 'funcionario') {
                        dailyConsolidated[date].funcionario += itemValue;
                        dailyConsolidated[date].funcionarioQtd += itemQtd;
                    } else {
                        dailyConsolidated[date].outros += itemValue;
                        dailyConsolidated[date].outrosQtd += itemQtd;
                    }
                });
        
                const oldCiEFaturadosChannels = period?.subTabs?.ciEFaturados?.channels;
                if (oldCiEFaturadosChannels) {
                    const hotelVal = getSafeNumericValue(oldCiEFaturadosChannels, `${prefix}CiEFaturadosValorHotel.vtotal`);
                    const funcVal = getSafeNumericValue(oldCiEFaturadosChannels, `${prefix}CiEFaturadosValorFuncionario.vtotal`);
                    const qtd = getSafeNumericValue(oldCiEFaturadosChannels, `${prefix}CiEFaturadosFaturadosQtd.qtd`);
        
                    dailyConsolidated[date].hotel += hotelVal;
                    dailyConsolidated[date].funcionario += funcVal;
                    dailyConsolidated[date].hotelQtd += qtd; 
                }
            };
        
            processPeriod(entry.almocoPrimeiroTurno as PeriodData, 'apt');
            processPeriod(entry.almocoSegundoTurno as PeriodData, 'ast');
            processPeriod(entry.jantar as PeriodData, 'jnt');
        });
        
        Object.entries(dailyConsolidated).forEach(([date, values]) => {
            if (values.hotel > 0 || values.hotelQtd > 0) {
                addToBreakdown('faturado-hotel', { date, qtd: values.hotelQtd, valor: values.hotel });
            }
            if (values.funcionario > 0 || values.funcionarioQtd > 0) {
                addToBreakdown('faturado-funcionario', { date, qtd: values.funcionarioQtd, valor: values.funcionario });
            }
            if (values.outros > 0 || values.outrosQtd > 0) {
                addToBreakdown('faturado-outros', { date, qtd: values.outrosQtd, valor: values.outros });
            }
        });

        Object.values(dailyConsolidated).forEach(values => {
             addToSummary('faturado-hotel', values.hotelQtd, values.hotel);
             addToSummary('faturado-funcionario', values.funcionarioQtd, values.funcionario);
             addToSummary('faturado-outros', values.outrosQtd, values.outros);
        });
        
    } else if (periodId === 'eventos') {
        entries.forEach(entry => {
            const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
            const eventosData = entry.eventos as EventosPeriodData | undefined;

            if (eventosData?.items?.length) {
                eventosData.items.forEach(item => {
                    (item.subEvents || []).forEach(subEvent => {
                        const serviceLabel = subEvent.serviceType === 'OUTRO' 
                            ? subEvent.customServiceDescription || 'Outro' 
                            : EVENT_SERVICE_TYPE_OPTIONS.find(opt => opt.value === subEvent.serviceType)?.label || subEvent.serviceType;
                        
                        const locationLabel = EVENT_LOCATION_OPTIONS.find(l => l.value === subEvent.location)?.label || 'N/A';
                        const breakdownCategory = subEvent.location === 'HOTEL' ? 'eventosHotel' : 'eventosDireto';
                        
                        addToBreakdown(breakdownCategory, {
                            date: date,
                            eventName: item.eventName,
                            serviceType: serviceLabel,
                            location: locationLabel,
                            quantity: subEvent.quantity || 0,
                            totalValue: subEvent.totalValue || 0,
                        });
                    });
                });
                 const totals = processEntryForTotals(entry);
                 addToSummary('eventosDireto', totals.eventos.direto.qtd, totals.eventos.direto.valor);
                 addToSummary('eventosHotel', totals.eventos.hotel.qtd, totals.eventos.hotel.valor);
            }
        });
    } else if (periodId === 'cafeDaManha') {
        entries.forEach(entry => {
            const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
            const channels = (entry.cafeDaManha as PeriodData)?.channels;
            if (!channels) return;
            
            const cdmListaQtd = getSafeNumericValue(channels, 'cdmListaHospedes.qtd');
            const cdmListaVlr = getSafeNumericValue(channels, 'cdmListaHospedes.vtotal');
            if(cdmListaQtd || cdmListaVlr) {
                addToBreakdown('cdmLista', {date, qtd: cdmListaQtd, valor: cdmListaVlr});
                addToSummary('cdmLista', cdmListaQtd, cdmListaVlr);
            }

            const cdmNoShowQtd = getSafeNumericValue(channels, 'cdmNoShow.qtd');
            const cdmNoShowVlr = getSafeNumericValue(channels, 'cdmNoShow.vtotal');
            if(cdmNoShowQtd || cdmNoShowVlr) {
                addToBreakdown('cdmNoShow', {date, qtd: cdmNoShowQtd, valor: cdmNoShowVlr});
                addToSummary('cdmNoShow', cdmNoShowQtd, cdmNoShowVlr);
            }

            const cdmSemCheckInQtd = getSafeNumericValue(channels, 'cdmSemCheckIn.qtd');
            const cdmSemCheckInVlr = getSafeNumericValue(channels, 'cdmSemCheckIn.vtotal');
            if(cdmSemCheckInQtd || cdmSemCheckInVlr) {
                addToBreakdown('cdmSemCheckIn', {date, qtd: cdmSemCheckInQtd, valor: cdmSemCheckInVlr});
                addToSummary('cdmSemCheckIn', cdmSemCheckInQtd, cdmSemCheckInVlr);
            }

            const cdmAssinadoQtd = getSafeNumericValue(channels, 'cdmCafeAssinado.qtd');
            const cdmAssinadoVlr = getSafeNumericValue(channels, 'cdmCafeAssinado.vtotal');
            const cdmDiretoQtd = getSafeNumericValue(channels, 'cdmDiretoCartao.qtd');
            const cdmDiretoVlr = getSafeNumericValue(channels, 'cdmDiretoCartao.vtotal');
            if (cdmAssinadoQtd || cdmAssinadoVlr || cdmDiretoQtd || cdmDiretoVlr) {
              const totalAvulsosQtd = cdmAssinadoQtd + cdmDiretoQtd;
              const totalAvulsosVlr = cdmAssinadoVlr + cdmDiretoVlr;
              addToBreakdown('cdmAvulsos', {date, qtd: totalAvulsosQtd, valor: totalAvulsosVlr});
              addToSummary('cdmAvulsos', totalAvulsosQtd, totalAvulsosVlr);
            }
        });
    } else { // Fallback for standard periods like almoco, jantar
        entries.forEach(entry => {
            const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
            const periodData = entry[periodId as PeriodId] as PeriodData | undefined;
            if (!periodData) return;

            const prefix = periodId.startsWith('almocoP') ? 'apt' : periodId.startsWith('almocoS') ? 'ast' : 'jnt';

            // --- Hóspedes ---
            const hospedesCh = (periodData.subTabs?.hospedes?.channels || {});
            const hospQtd = getSafeNumericValue(hospedesCh, `${prefix}HospedesQtdHospedes.qtd`);
            const hospValor = getSafeNumericValue(hospedesCh, `${prefix}HospedesPagamentoHospedes.vtotal`);
            if (hospQtd || hospValor) {
                addToBreakdown('hospedes', { date, qtd: hospQtd, valor: hospValor });
                addToSummary('hospedes', hospQtd, hospValor);
            }

            // --- Cliente Mesa ---
            const mesaCh = (periodData.subTabs?.clienteMesa?.channels || {});
            const mesaQtd = getSafeNumericValue(mesaCh, `${prefix}ClienteMesaTotaisQtd.qtd`);
            const mesaDinheiro = getSafeNumericValue(mesaCh, `${prefix}ClienteMesaDinheiro.vtotal`);
            const mesaCredito = getSafeNumericValue(mesaCh, `${prefix}ClienteMesaCredito.vtotal`);
            const mesaDebito = getSafeNumericValue(mesaCh, `${prefix}ClienteMesaDebito.vtotal`);
            const mesaPix = getSafeNumericValue(mesaCh, `${prefix}ClienteMesaPix.vtotal`);
            const mesaTicket = getSafeNumericValue(mesaCh, `${prefix}ClienteMesaTicketRefeicao.vtotal`);
            const mesaTotal = mesaDinheiro + mesaCredito + mesaDebito + mesaPix + mesaTicket;
            if (mesaQtd || mesaTotal > 0) {
                addToBreakdown('mesa', { date, qtd: mesaQtd, dinheiro: mesaDinheiro, credito: mesaCredito, debito: mesaDebito, pix: mesaPix, ticket: mesaTicket, total: mesaTotal });
                addToSummary('mesa', mesaQtd, mesaTotal);
            }
            
            // --- Delivery & Retirada ---
            const deliveryCh = (periodData.subTabs?.delivery?.channels || {});
            const retiradaCh = (periodData.subTabs?.clienteMesa?.channels || {}); // Retirada está em clienteMesa
            const ifoodQtd = getSafeNumericValue(deliveryCh, `${prefix}DeliveryIfoodQtd.qtd`);
            const ifoodValor = getSafeNumericValue(deliveryCh, `${prefix}DeliveryIfoodValor.vtotal`);
            const rappiQtd = getSafeNumericValue(deliveryCh, `${prefix}DeliveryRappiQtd.qtd`);
            const rappiValor = getSafeNumericValue(deliveryCh, `${prefix}DeliveryRappiValor.vtotal`);
            const retiradaQtd = getSafeNumericValue(retiradaCh, `${prefix}ClienteMesaRetiradaQtd.qtd`);
            const retiradaValor = getSafeNumericValue(retiradaCh, `${prefix}ClienteMesaRetiradaValor.vtotal`);
            if (ifoodQtd || ifoodValor) {
                addToBreakdown('ifood', { date, qtd: ifoodQtd, valor: ifoodValor });
                addToSummary('ifood', ifoodQtd, ifoodValor);
            }
            if (rappiQtd || rappiValor) {
                addToBreakdown('rappi', { date, qtd: rappiQtd, valor: rappiValor });
                addToSummary('rappi', rappiQtd, rappiValor);
            }
            if (retiradaQtd || retiradaValor) {
                addToBreakdown('retirada', { date, qtd: retiradaQtd, valor: retiradaValor });
                addToSummary('retirada', retiradaQtd, retiradaValor);
            }
        });
    }

    let subtotalGeralComCI = { qtd: 0, total: 0 };
    let subtotalGeralSemCI = { qtd: 0, total: 0 };
    let totalReajuste = 0;

    Object.values(summary).forEach(s => {
        subtotalGeralComCI.qtd += s.qtd;
        subtotalGeralComCI.total += s.total;
        totalReajuste += s.reajuste || 0;
    });

    const totalCIValor = summary['ci'] ? summary['ci'].total : 0;
    const totalCIQtd = summary['ci'] ? summary['ci'].qtd : 0;
    
    // Calculate ticket medio for faturado
    const totalFaturadoQtd = (summary['faturado-hotel']?.qtd || 0) + (summary['faturado-funcionario']?.qtd || 0) + (summary['faturado-outros']?.qtd || 0);
    const totalFaturadoValor = (summary['faturado-hotel']?.total || 0) + (summary['faturado-funcionario']?.total || 0) + (summary['faturado-outros']?.total || 0);
    
    const ticketMedio = totalFaturadoQtd > 0 ? totalFaturadoValor / totalFaturadoQtd : 0;
    
    if(summary['faturado-hotel'] || summary['faturado-funcionario'] || summary['faturado-outros']) {
        summary['faturado'] = {
            qtd: totalFaturadoQtd,
            total: totalFaturadoValor,
            reajuste: 0,
            ticketMedio: ticketMedio
        };
    }
    
    subtotalGeralSemCI = {
        qtd: subtotalGeralComCI.qtd - totalCIQtd,
        total: subtotalGeralComCI.total - totalCIValor - totalReajuste,
    }

    const reportTitleMap = {
        'roomService': 'Room Service',
        'consumoInterno': 'Consumo Interno',
        'faturado': 'Faturado',
        'frigobar': 'Frigobar',
    };
    
    const dynamicTitle = reportTitleMap[periodId as keyof typeof reportTitleMap] || PERIOD_DEFINITIONS.find(p => p.id === periodId)?.label || periodId.charAt(0).toUpperCase() + periodId.slice(1);

    return {
        dailyBreakdowns,
        summary,
        subtotalGeralComCI,
        subtotalGeralSemCI,
        reportTitle: dynamicTitle
    };
}

export function generateReportData(
  entries: DailyLogEntry[],
  periodId: PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService'
): ReportData | null {
  if (entries.length === 0) return null;

  if (periodId === 'all') {
    const dailyBreakdowns: GeneralReportDailyItem[] = entries.map(entry => {
        const totals = processEntryForTotals(entry);
        
        const dateString = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
        
        const almocoPTValor = (totals.turnos.almocoPT?.valor || 0);
        const almocoSTValor = (totals.turnos.almocoST?.valor || 0);
        const jantarValor = (totals.turnos.jantar?.valor || 0);

        return {
            date: dateString,
            createdAt: entry.createdAt,
            lastModifiedAt: entry.lastModifiedAt,
            periodTotals: {
                roomService: totals.roomServiceTotal,
                cafeDaManha: { 
                    qtd: totals.cafeHospedes.qtd + totals.cafeAvulsos.qtd,
                    valor: totals.cafeHospedes.valor + totals.cafeAvulsos.valor
                },
                almocoPrimeiroTurno: { qtd: totals.turnos.almocoPT?.qtd || 0, valor: almocoPTValor },
                almocoSegundoTurno: { qtd: totals.turnos.almocoST?.qtd || 0, valor: almocoSTValor },
                jantar: { qtd: totals.turnos.jantar?.qtd || 0, valor: jantarValor },
                breakfast: totals.breakfast,
                italianoAlmoco: totals.italianoAlmoco,
                italianoJantar: totals.italianoJantar,
                indianoAlmoco: totals.indianoAlmoco,
                indianoJantar: totals.indianoJantar,
                baliAlmoco: totals.baliAlmoco,
                baliHappy: totals.baliHappy,
                frigobar: totals.frigobar,
                eventos: {
                    qtd: totals.eventos.direto.qtd + totals.eventos.hotel.qtd,
                    valor: totals.eventos.direto.valor + totals.eventos.hotel.valor
                }
            },
            totalComCI: totals.grandTotal.comCI.valor,
            totalSemCI: totals.grandTotal.semCI.valor,
            totalReajusteCI: totals.totalReajusteCI,
            totalQtd: totals.grandTotal.comCI.qtd,
            totalCIQtd: totals.totalCI.qtd
        };
    });

    const summary = dailyBreakdowns.reduce((acc, curr) => {
        acc.grandTotalComCI += curr.totalComCI;
        acc.grandTotalSemCI += curr.totalSemCI;
        acc.grandTotalReajusteCI += curr.totalReajusteCI;
        acc.grandTotalQtd += curr.totalQtd;
        acc.grandTotalCIQtd += curr.totalCIQtd;

        for (const pId in curr.periodTotals) {
            const validPeriodId = pId as keyof typeof acc.periodTotals;
            if (!acc.periodTotals[validPeriodId]) {
                acc.periodTotals[validPeriodId] = { qtd: 0, valor: 0 };
            }
            const periodData = curr.periodTotals[validPeriodId];
            if (periodData) {
                acc.periodTotals[validPeriodId]!.qtd += periodData.qtd;
                acc.periodTotals[validPeriodId]!.valor += periodData.valor;
            }
        }
        return acc;
    }, { 
        periodTotals: {} as Partial<Record<PeriodId | 'roomService' | 'eventos', { qtd: number; valor: number }>>,
        grandTotalComCI: 0, grandTotalSemCI: 0, grandTotalReajusteCI: 0, grandTotalQtd: 0, grandTotalCIQtd: 0
    });

    return {
        type: 'general',
        data: {
            dailyBreakdowns,
            summary,
            reportTitle: 'GERAL (MÊS)'
        }
    };
  } else {
      const data = extractDetailedCategoryDataForPeriod(entries, periodId);
      return { type: 'period', data };
  }
}
