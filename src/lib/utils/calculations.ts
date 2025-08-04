

"use client";

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

const getGenericPeriodTotals = (entry: DailyLogEntry, periodId: keyof DailyLogEntry) => {
    const period = entry[periodId] as PeriodData | undefined;
    if (!period?.channels) return { qtd: 0, valor: 0 };

    return Object.values(period.channels).reduce((acc, channel) => {
        acc.qtd += getSafeNumericValue(channel, 'qtd');
        acc.valor += getSafeNumericValue(channel, 'vtotal');
        return acc;
    }, { qtd: 0, valor: 0 });
};

export const processEntryForTotals = (entry: DailyLogEntry) => {
    // --- 1. DECOMPOSITION: Calculate all individual, non-overlapping components from the raw data ---

    // -- ROOM SERVICE --
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

    // -- FRIGOBAR (from inside the turn forms) --
    const frigobarPT = {
        valor: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTPagRestaurante.vtotal') + getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTPagHotel.vtotal'),
        qtd: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTTotalQuartos.qtd'),
    };
    const frigobarST = {
        valor: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTPagRestaurante.vtotal') + getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTPagHotel.vtotal'),
        qtd: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTTotalQuartos.qtd'),
    };
    const frigobarJantar = {
        valor: getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTPagRestaurante.vtotal') + getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTPagHotel.vtotal'),
        qtd: getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTTotalQuartos.qtd'),
    };
    const frigobarTotal = {
        valor: frigobarPT.valor + frigobarST.valor + frigobarJantar.valor,
        qtd: frigobarPT.qtd + frigobarST.qtd + frigobarJantar.qtd,
    };

    // -- FATURADO & C.I. (New format only) --
    const aptFaturado = calculateFaturadoFromItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.faturado?.faturadoItems);
    const aptCI = {
        ...calculateConsumoInternoFromItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        reajuste: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };

    const astFaturado = calculateFaturadoFromItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.faturado?.faturadoItems);
    const astCI = {
        ...calculateConsumoInternoFromItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        reajuste: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };
    
    const jntFaturado = calculateFaturadoFromItems((entry.jantar as PeriodData)?.subTabs?.faturado?.faturadoItems);
    const jntCI = {
        ...calculateConsumoInternoFromItems((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        reajuste: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };

    // -- OTHER PERIODS --
    const cafeHospedes = {
        valor: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.vtotal'),
        qtd: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmListaHospedes.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmNoShow.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmSemCheckIn.qtd')
    };
    const cafeAvulsos = {
        valor: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.vtotal') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.vtotal'),
        qtd: getSafeNumericValue(entry, 'cafeDaManha.channels.cdmCafeAssinado.qtd') + getSafeNumericValue(entry, 'cafeDaManha.channels.cdmDiretoCartao.qtd')
    };

    const eventosDireto = { qtd: 0, valor: 0 };
    const eventosHotel = { qtd: 0, valor: 0 };
    (entry.eventos as EventosPeriodData)?.items?.forEach(item => { (item.subEvents || []).forEach(subEvent => {
        const qty = subEvent.quantity || 0; const val = subEvent.totalValue || 0;
        if (subEvent.location === 'DIRETO') { eventosDireto.qtd += qty; eventosDireto.valor += val; } 
        else if (subEvent.location === 'HOTEL') { eventosHotel.qtd += qty; eventosHotel.valor += val; }
    }); });

    // -- GENERIC PERIODS (NEW) --
    const breakfast = getGenericPeriodTotals(entry, 'breakfast');
    const italianoAlmoco = getGenericPeriodTotals(entry, 'italianoAlmoco');
    const italianoJantar = getGenericPeriodTotals(entry, 'italianoJantar');
    const indianoAlmoco = getGenericPeriodTotals(entry, 'indianoAlmoco');
    const indianoJantar = getGenericPeriodTotals(entry, 'indianoJantar');
    const baliAlmoco = getGenericPeriodTotals(entry, 'baliAlmoco');
    const baliHappy = getGenericPeriodTotals(entry, 'baliHappy');
    
    // --- 2. ASSEMBLY: Combine decomposed parts into meaningful totals ---
    
    const totalReajusteCI = aptCI.reajuste + astCI.reajuste + jntCI.reajuste;
    
    // -- TOTALS PER SERVICE TYPE --
    const almocoCITotal = { qtd: aptCI.qtd + astCI.qtd, valor: aptCI.valor + astCI.valor };
    const jantarCITotal = { qtd: jntCI.qtd, valor: jntCI.valor };
    const totalCI = { qtd: almocoCITotal.qtd + jantarCITotal.qtd, valor: almocoCITotal.valor + jantarCITotal.valor };
    const roomServiceTotal = { valor: rsMadrugada.valor + rsAlmocoPT.valor + rsAlmocoST.valor + rsJantar.valor, qtd: rsMadrugada.qtdPedidos + rsAlmocoPT.qtd + rsAlmocoST.qtd + rsJantar.qtd };
    
    const almocoTotal = {
        qtd: getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).qtd + aptFaturado.qtd + getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).qtd + astFaturado.qtd,
        valor: getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).valor + aptFaturado.valor + getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).valor + astFaturado.valor,
    };
    const jantarTotal = {
        qtd: getPeriodRestaurantTotal(entry.jantar as PeriodData).qtd + jntFaturado.qtd,
        valor: getPeriodRestaurantTotal(entry.jantar as PeriodData).valor + jntFaturado.valor
    };

    // -- GRAND TOTALS --
    const allRevenueComponentsValor = [
        getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).valor,
        getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).valor,
        getPeriodRestaurantTotal(entry.jantar as PeriodData).valor,
        roomServiceTotal.valor,
        frigobarTotal.valor,
        aptFaturado.valor, astFaturado.valor, jntFaturado.valor,
        cafeHospedes.valor, cafeAvulsos.valor, breakfast.valor,
        italianoAlmoco.valor, italianoJantar.valor, indianoAlmoco.valor, indianoJantar.valor,
        baliAlmoco.valor, baliHappy.valor,
        eventosDireto.valor, eventosHotel.valor
    ];
    const allRevenueComponentsQtd = [
        getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).qtd,
        getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).qtd,
        getPeriodRestaurantTotal(entry.jantar as PeriodData).qtd,
        roomServiceTotal.qtd, frigobarTotal.qtd,
        aptFaturado.qtd, astFaturado.qtd, jntFaturado.qtd,
        cafeHospedes.qtd, cafeAvulsos.qtd, breakfast.qtd,
        italianoAlmoco.qtd, italianoJantar.qtd, indianoAlmoco.qtd, indianoJantar.qtd,
        baliAlmoco.qtd, baliHappy.qtd,
        eventosDireto.qtd, eventosHotel.qtd
    ];

    const totalRevenueSemCI = allRevenueComponentsValor.reduce((sum, current) => sum + current, 0);
    const totalQtdSemCI = allRevenueComponentsQtd.reduce((sum, current) => sum + current, 0);

    const grandTotalComCI = {
        valor: totalRevenueSemCI + totalCI.valor + totalReajusteCI,
        qtd: totalQtdSemCI + totalCI.qtd,
    };
    const grandTotalSemCI = {
        valor: totalRevenueSemCI,
        qtd: totalQtdSemCI,
    };
    
    // --- 3. RETURN: Provide all the calculated parts for consumers ---
    return {
        // Individual components
        rsMadrugada,
        rsAlmocoPT,
        rsAlmocoST,
        rsJantar,
        frigobar: frigobarTotal,
        cafeHospedes,
        cafeAvulsos,
        eventos: { direto: eventosDireto, hotel: eventosHotel },
        almocoCI: almocoCITotal,
        jantarCI: jantarCITotal,
        breakfast,
        italianoAlmoco,
        italianoJantar,
        indianoAlmoco,
        indianoJantar,
        baliAlmoco,
        baliHappy,

        // Combined totals for display
        almoco: almocoTotal,
        jantar: jantarTotal,
        roomServiceTotal,
        totalCI,
        totalReajusteCI,
        grandTotal: { comCI: grandTotalComCI, semCI: grandTotalSemCI },
    };
};
