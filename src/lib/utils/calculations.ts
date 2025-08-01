
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
    
    // O valor do CI é o total menos o reajuste.
    return { qtd, valor: totalCI, reajuste }; // Corrigido para retornar o valor total, o reajuste é separado.
};


export const processEntryForTotals = (entry: DailyLogEntry) => {
    const getSubTabTotal = (subTab: any, excludeRS: boolean = false) => {
        let totalValor = 0;
        let totalQtd = 0;
        if (!subTab) return { qtd: 0, valor: 0 };

        if (subTab.channels) {
            for (const [key, channel] of Object.entries(subTab.channels)) {
                if (excludeRS && key.toLowerCase().includes('roomservice')) continue;
                totalQtd += getSafeNumericValue(channel, 'qtd');
                totalValor += getSafeNumericValue(channel, 'vtotal');
            }
        }
        
        // Incluir novos formatos no cálculo do subtotal
        if (subTab.faturadoItems) {
            const faturadoTotals = calculateFaturadoFromItems(subTab.faturadoItems);
            totalQtd += faturadoTotals.qtd;
            totalValor += faturadoTotals.valor;
        }
        if (subTab.consumoInternoItems) {
            const consumoTotals = calculateConsumoInternoFromItems(subTab.consumoInternoItems);
            totalQtd += consumoTotals.qtd;
            totalValor += consumoTotals.valor;
        }

        return { qtd: totalQtd, valor: totalValor };
    };

    const getPeriodRestaurantTotal = (period: PeriodData | undefined, excludeRS: boolean = false) => {
        let totalValor = 0;
        let totalQtd = 0;
        if (!period || typeof period === 'string' || !period.subTabs) {
            return { qtd: 0, valor: 0 };
        }
        const subTabsToSum = ['hospedes', 'clienteMesa', 'delivery'];
        if (!excludeRS) {
            subTabsToSum.push('roomService');
        }
        
        for (const subTabKey of subTabsToSum) {
            const { qtd, valor } = getSubTabTotal(period.subTabs[subTabKey]);
            totalQtd += qtd;
            totalValor += valor;
        }
        return { qtd: totalQtd, valor: totalValor };
    };

    // --- 1. DECOMPOSITION: Calculate all individual, non-overlapping components ---
    const rsMadrugada = {
        valor: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServicePagDireto.vtotal') + getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceValorServico.vtotal'),
        qtdPedidos: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPedidos.qtd'),
        qtdPratos: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPratos.qtd'),
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
    const almocoPTServicos = getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData, true); // Exclude RS
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
        qtd: almocoPTServicos.qtd + aptFaturado.qtd,
        valor: almocoPTServicos.valor + aptFaturado.valor
    };
    const almocoPTRoomService = getSubTabTotal((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService);

    // --- ALMOÇO ST ---
    const almocoSTServicos = getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData, true); // Exclude RS
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
        qtd: almocoSTServicos.qtd + astFaturado.qtd,
        valor: almocoSTServicos.valor + astFaturado.valor
    };
    const almocoSTRoomService = getSubTabTotal((entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService);


    // --- JANTAR ---
    const jantarServicos = getPeriodRestaurantTotal(entry.jantar as PeriodData, true); // Exclude RS
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
        qtd: jantarServicos.qtd + jntFaturado.qtd,
        valor: jantarServicos.valor + jntFaturado.valor,
    };
    const jantarRoomService = getSubTabTotal((entry.jantar as PeriodData)?.subTabs?.roomService);

    
    // --- 2. ASSEMBLY ---
    // Consolidated Room Service
    const roomServiceTotal = {
        qtd: rsMadrugada.qtdPedidos + almocoPTRoomService.qtd + almocoSTRoomService.qtd + jantarRoomService.qtd,
        valor: rsMadrugada.valor + almocoPTRoomService.valor + almocoSTRoomService.valor + jantarRoomService.valor
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
        qtd: roomServiceTotal.qtd + cafeHospedes.qtd + cafeAvulsos.qtd + breakfast.qtd +
             almocoTotal.qtd + almocoCITotal.qtd +
             jantarTotal.qtd + jantarCI.qtd +
             italianoAlmoco.qtd + italianoJantar.qtd + indianoAlmoco.qtd + indianoJantar.qtd +
             baliAlmoco.qtd + baliHappy.qtd + frigobar.qtd +
             eventosDireto.qtd + eventosHotel.qtd,
        valor: roomServiceTotal.valor + cafeHospedes.valor + cafeAvulsos.valor + breakfast.valor +
               almocoTotal.valor + almocoCITotal.valor + almocoPTCI.reajuste + almocoSTCI.reajuste +
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
        madrugada: { qtd: rsMadrugada.qtdPedidos, valor: rsMadrugada.valor },
        cafeDaManha: { qtd: cafeHospedes.qtd + cafeAvulsos.qtd, valor: cafeHospedes.valor + cafeAvulsos.valor },
        almocoPrimeiroTurno: almocoPrimeiroTurnoTotal,
        almocoSegundoTurno: almocoSegundoTurnoTotal,
        jantar: jantarTotal,
        
        rsMadrugada,
        roomServiceTotal,
        cafeHospedes,
        cafeAvulsos,
        breakfast,
        almoco: almocoTotal,
        almocoCI: almocoCITotal,
        jantarCI,
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
        reajusteCI: { total: totalReajusteCI, almoco: almocoPTCI.reajuste + almocoSTCI.reajuste, jantar: jantarCI.reajuste },
    };
};
