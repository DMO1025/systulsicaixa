
import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData, EventosPeriodData, FaturadoItem, ConsumoInternoItem } from '@/lib/types';

export const calculateFaturadoFromItems = (items: FaturadoItem[] | undefined): { qtd: number; valor: number } => {
    if (!items || !Array.isArray(items)) return { qtd: 0, valor: 0 };
    return items.reduce((acc, item) => {
        acc.qtd += getSafeNumericValue(item, 'quantity');
        acc.valor += getSafeNumericValue(item, 'value');
        return acc;
    }, { qtd: 0, valor: 0 });
};

export const calculateConsumoInternoFromItems = (items: ConsumoInternoItem[] | undefined): { qtd: number; valor: number } => {
    if (!items || !Array.isArray(items)) return { qtd: 0, valor: 0 };
    return items.reduce((acc, item) => {
        acc.qtd += getSafeNumericValue(item, 'quantity');
        acc.valor += getSafeNumericValue(item, 'value');
        return acc;
    }, { qtd: 0, valor: 0 });
};

const calculateOldFormatFaturado = (period: PeriodData | undefined, prefix: 'apt' | 'ast' | 'jnt'): { qtd: number; valor: number } => {
    if (!period?.subTabs?.ciEFaturados?.channels) return { qtd: 0, valor: 0 };
    const channels = period.subTabs.ciEFaturados.channels;
    const qtd = getSafeNumericValue(channels, `${prefix}CiEFaturadosFaturadosQtd.qtd`);
    const valorHotel = getSafeNumericValue(channels, `${prefix}CiEFaturadosValorHotel.vtotal`);
    const valorFunc = getSafeNumericValue(channels, `${prefix}CiEFaturadosValorFuncionario.vtotal`);
    return { qtd, valor: valorHotel + valorFunc };
};

const calculateOldFormatConsumoInterno = (period: PeriodData | undefined, prefix: 'apt' | 'ast' | 'jnt'): { qtd: number; valor: number, reajuste: number } => {
    if (!period?.subTabs?.ciEFaturados?.channels) return { qtd: 0, valor: 0, reajuste: 0 };
    const channels = period.subTabs.ciEFaturados.channels;
    const qtd = getSafeNumericValue(channels, `${prefix}CiEFaturadosConsumoInternoQtd.qtd`);
    const reajuste = getSafeNumericValue(channels, `${prefix}CiEFaturadosReajusteCI.vtotal`);
    const totalCI = getSafeNumericValue(channels, `${prefix}CiEFaturadosTotalCI.vtotal`);
    
    // O valor do CI é o total (que já inclui o reajuste no formato antigo).
    return { qtd, valor: totalCI, reajuste };
};


const getPeriodRestaurantTotal = (period: PeriodData | undefined) => {
    let totalValor = 0;
    let totalQtd = 0;
    if (!period || typeof period === 'string' || !period.subTabs) {
        return { qtd: 0, valor: 0 };
    }
    const subTabsToSum = ['hospedes', 'clienteMesa', 'delivery'];
    
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

export const processEntryForTotals = (entry: DailyLogEntry) => {
    // --- 1. DECOMPOSITION: Calculate all individual, non-overlapping components ---
    const rsMadrugada = {
        valor: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServicePagDireto.vtotal') + getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceValorServico.vtotal'),
        qtdPedidos: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPedidos.qtd'),
        qtdPratos: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPratos.qtd'),
    };
    const rsAlmocoPT = {
        valor: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService?.channels, 'aptRoomServicePagDireto.vtotal') + getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService?.channels, 'aptRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService?.channels, 'aptRoomServiceQtdPedidos.qtd'),
    };
    const rsAlmocoST = {
        valor: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService?.channels, 'astRoomServicePagDireto.vtotal') + getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService?.channels, 'astRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService?.channels, 'astRoomServiceQtdPedidos.qtd'),
    };
    const rsJantar = {
        valor: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.roomService?.channels, 'jntRoomServicePagDireto.vtotal') + getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.roomService?.channels, 'jntRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.roomService?.channels, 'jntRoomServiceQtdPedidos.qtd'),
    };
    const breakfast = {
        valor: getSafeNumericValue(entry, 'breakfast.channels.breakfastEntry.vtotal'),
        qtd: getSafeNumericValue(entry, 'breakfast.channels.breakfastEntry.qtd')
    };
    
    const italianoAlmoco = {
        valor: getSafeNumericValue(entry, 'italianoAlmoco.channels.rwItalianoAlmocoEntry.vtotal'),
        qtd: getSafeNumericValue(entry, 'italianoAlmoco.channels.rwItalianoAlmocoEntry.qtd')
    };
    const italianoJantar = {
        valor: getSafeNumericValue(entry, 'italianoJantar.channels.rwItalianoJantarEntry.vtotal'),
        qtd: getSafeNumericValue(entry, 'italianoJantar.channels.rwItalianoJantarEntry.qtd')
    };
    const indianoAlmoco = {
        valor: getSafeNumericValue(entry, 'indianoAlmoco.channels.rwIndianoAlmocoEntry.vtotal'),
        qtd: getSafeNumericValue(entry, 'indianoAlmoco.channels.rwIndianoAlmocoEntry.qtd')
    };
    const indianoJantar = {
        valor: getSafeNumericValue(entry, 'indianoJantar.channels.rwIndianoJantarEntry.vtotal'),
        qtd: getSafeNumericValue(entry, 'indianoJantar.channels.rwIndianoJantarEntry.qtd')
    };

    const baliAlmoco = {
        valor: getSafeNumericValue(entry, 'baliAlmoco.channels.genericTotalValue.vtotal'),
        qtd: getSafeNumericValue(entry, 'baliAlmoco.channels.genericQtdItems.qtd')
    };
    const baliHappy = {
        valor: getSafeNumericValue(entry, 'baliHappy.channels.genericTotalValue.vtotal'),
        qtd: getSafeNumericValue(entry, 'baliHappy.channels.genericQtdItems.qtd')
    };
    
    const cafeHospedes = {
        valor: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.vtotal'),
        qtd: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.qtd')
    };
    const cafeAvulsos = {
        valor: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.vtotal'),
        qtd: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.qtd')
    };

    const frigobar = {
        valor: getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.frigobar.channels.frgPTPagRestaurante.vtotal') + getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.frigobar.channels.frgPTPagHotel.vtotal') +
               getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.frigobar.channels.frgSTPagRestaurante.vtotal') + getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.frigobar.channels.frgSTPagHotel.vtotal') +
               getSafeNumericValue(entry, 'jantar.subTabs.frigobar.channels.frgJNTPagRestaurante.vtotal') + getSafeNumericValue(entry, 'jantar.subTabs.frigobar.channels.frgJNTPagHotel.vtotal'),
        qtd: getSafeNumericValue(entry, 'almocoPrimeiroTurno.subTabs.frigobar.channels.frgPTTotalQuartos.qtd') +
             getSafeNumericValue(entry, 'almocoSegundoTurno.subTabs.frigobar.channels.frgSTTotalQuartos.qtd') +
             getSafeNumericValue(entry, 'jantar.subTabs.frigobar.channels.frgJNTTotalQuartos.qtd')
    };

    const eventosDireto = { qtd: 0, valor: 0 };
    const eventosHotel = { qtd: 0, valor: 0 };
    (entry.eventos as EventosPeriodData)?.items?.forEach(item => { (item.subEvents || []).forEach(subEvent => {
        const qty = subEvent.quantity || 0; const val = subEvent.totalValue || 0;
        if (subEvent.location === 'DIRETO') { eventosDireto.qtd += qty; eventosDireto.valor += val; } 
        else if (subEvent.location === 'HOTEL') { eventosHotel.qtd += qty; eventosHotel.valor += val; }
    }); });

    // --- ALMOÇO PT ---
    const aptRestaurantTotal = getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData);
    const aptFaturadoNew = calculateFaturadoFromItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.faturado?.faturadoItems);
    const aptFaturadoOld = calculateOldFormatFaturado(entry.almocoPrimeiroTurno as PeriodData, 'apt');
    const aptFaturado = { qtd: aptFaturadoNew.qtd + aptFaturadoOld.qtd, valor: aptFaturadoNew.valor + aptFaturadoOld.valor };
    
    const aptCINew = calculateConsumoInternoFromItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems);
    const aptCIOld = calculateOldFormatConsumoInterno(entry.almocoPrimeiroTurno as PeriodData, 'apt');
    const almocoPTCI = {
        qtd: aptCINew.qtd + aptCIOld.qtd,
        valor: aptCINew.valor + aptCIOld.valor,
        reajuste: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal') + aptCIOld.reajuste,
    };
    const almocoPrimeiroTurnoTotal = {
        qtd: aptRestaurantTotal.qtd + aptFaturado.qtd + rsAlmocoPT.qtd,
        valor: aptRestaurantTotal.valor + aptFaturado.valor + rsAlmocoPT.valor
    };

    // --- ALMOÇO ST ---
    const astRestaurantTotal = getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData);
    const astFaturadoNew = calculateFaturadoFromItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.faturado?.faturadoItems);
    const astFaturadoOld = calculateOldFormatFaturado(entry.almocoSegundoTurno as PeriodData, 'ast');
    const astFaturado = { qtd: astFaturadoNew.qtd + astFaturadoOld.qtd, valor: astFaturadoNew.valor + astFaturadoOld.valor };

    const astCINew = calculateConsumoInternoFromItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems);
    const astCIOld = calculateOldFormatConsumoInterno(entry.almocoSegundoTurno as PeriodData, 'ast');
    const almocoSTCI = {
        qtd: astCINew.qtd + astCIOld.qtd,
        valor: astCINew.valor + astCIOld.valor,
        reajuste: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal') + astCIOld.reajuste
    };
    const almocoSegundoTurnoTotal = {
        qtd: astRestaurantTotal.qtd + astFaturado.qtd + rsAlmocoST.qtd,
        valor: astRestaurantTotal.valor + astFaturado.valor + rsAlmocoST.valor
    };

    // --- JANTAR ---
    const jntRestaurantTotal = getPeriodRestaurantTotal(entry.jantar as PeriodData);
    const jntFaturadoNew = calculateFaturadoFromItems((entry.jantar as PeriodData)?.subTabs?.faturado?.faturadoItems);
    const jntFaturadoOld = calculateOldFormatFaturado(entry.jantar as PeriodData, 'jnt');
    const jntFaturado = { qtd: jntFaturadoNew.qtd + jntFaturadoOld.qtd, valor: jntFaturadoNew.valor + jntFaturadoOld.valor };

    const jntCINew = calculateConsumoInternoFromItems((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems);
    const jntCIOld = calculateOldFormatConsumoInterno(entry.jantar as PeriodData, 'jnt');
    const jantarCI = {
        qtd: jntCINew.qtd + jntCIOld.qtd,
        valor: jntCINew.valor + jntCIOld.valor,
        reajuste: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal') + jntCIOld.reajuste
    };
    const jantarTotal = {
        qtd: jntRestaurantTotal.qtd + jntFaturado.qtd + rsJantar.qtd,
        valor: jntRestaurantTotal.valor + jntFaturado.valor + rsJantar.valor,
    };
    
    // --- 2. ASSEMBLY ---
    const almocoTotal = {
        qtd: almocoPrimeiroTurnoTotal.qtd + almocoSegundoTurnoTotal.qtd,
        valor: almocoPrimeiroTurnoTotal.valor + almocoSegundoTurnoTotal.valor
    };
    const almocoCITotal = {
        qtd: almocoPTCI.qtd + almocoSTCI.qtd,
        valor: almocoPTCI.valor + almocoSTCI.valor
    };
    const roomServiceTotal = {
        qtd: rsMadrugada.qtdPedidos + rsAlmocoPT.qtd + rsAlmocoST.qtd + rsJantar.qtd,
        valor: rsMadrugada.valor + rsAlmocoPT.valor + rsAlmocoST.valor + rsJantar.valor,
    };
    
    const totalCI = {
        qtd: almocoCITotal.qtd + jantarCI.qtd,
        valor: almocoCITotal.valor + jantarCI.valor,
    };
    
    const totalReajusteCI = almocoPTCI.reajuste + almocoSTCI.reajuste + jantarCI.reajuste;

    const almocoDisplayTotal = {
        qtd: almocoTotal.qtd,
        valor: almocoTotal.valor + almocoPTCI.reajuste + almocoSTCI.reajuste,
    };

    const jantarDisplayTotal = {
        qtd: jantarTotal.qtd,
        valor: jantarTotal.valor + jantarCI.reajuste
    };
    
    const grandTotalComCI = {
        qtd: cafeHospedes.qtd + cafeAvulsos.qtd + breakfast.qtd +
             almocoTotal.qtd + totalCI.qtd + 
             jantarTotal.qtd + 
             italianoAlmoco.qtd + italianoJantar.qtd + indianoAlmoco.qtd + indianoJantar.qtd +
             baliAlmoco.qtd + baliHappy.qtd + frigobar.qtd +
             eventosDireto.qtd + eventosHotel.qtd +
             rsMadrugada.qtdPedidos,
        valor: cafeHospedes.valor + cafeAvulsos.valor + breakfast.valor +
               almocoTotal.valor + totalCI.valor + totalReajusteCI +
               jantarTotal.valor + 
               italianoAlmoco.valor + italianoJantar.valor + indianoAlmoco.valor + indianoJantar.valor +
               baliAlmoco.valor + baliHappy.valor + frigobar.valor +
               eventosDireto.valor + eventosHotel.valor +
               rsMadrugada.valor,
    };

    const grandTotalSemCI = {
        qtd: grandTotalComCI.qtd - totalCI.qtd,
        valor: grandTotalComCI.valor - totalCI.valor - totalReajusteCI,
    };

    // --- 3. RETURN: Provide all the calculated parts for consumers ---
    return {
        madrugada: rsMadrugada,
        cafeDaManha: { qtd: cafeHospedes.qtd + cafeAvulsos.qtd, valor: cafeHospedes.valor + cafeAvulsos.valor },
        almocoPrimeiroTurno: {
            qtd: almocoPrimeiroTurnoTotal.qtd,
            valor: almocoPrimeiroTurnoTotal.valor + almocoPTCI.valor + almocoPTCI.reajuste,
        },
        almocoSegundoTurno: {
            qtd: almocoSegundoTurnoTotal.qtd,
            valor: almocoSegundoTurnoTotal.valor + almocoSTCI.valor + almocoSTCI.reajuste,
        },
        jantar: {
            qtd: jantarTotal.qtd,
            valor: jantarTotal.valor + jantarCI.valor + jantarCI.reajuste,
        },
        
        rsMadrugada,
        roomServiceTotal,
        cafeHospedes,
        cafeAvulsos,
        breakfast,
        almoco: almocoDisplayTotal,
        almocoCI: almocoCITotal,
        jantarCI,
        jantar: jantarDisplayTotal,
        italianoAlmoco,
        italianoJantar,
        indianoAlmoco,
        indianoJantar,
        baliAlmoco,
        baliHappy,
        frigobar,
        eventos: { direto: eventosDireto, hotel: eventosHotel },
        grandTotal: { comCI: grandTotalComCI, semCI: grandTotalSemCI },
        totalCI,
        reajusteCI: { total: totalReajusteCI, almoco: almocoPTCI.reajuste + almocoSTCI.reajuste, almocoPT: almocoPTCI.reajuste, almocoST: almocoSTCI.reajuste, jantar: jantarCI.reajuste },
    };
};
