

import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData, EventosPeriodData, FaturadoItem, ConsumoInternoItem, ControleCafeItem, CafeManhaNoShowPeriodData, CafeManhaNoShowItem, ChannelUnitPricesConfig } from '@/lib/types';

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
    
    const valorBaseCI = totalCI - reajuste;
    return { qtd, valor: valorBaseCI, reajuste };
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

const calculateControleCafeTotal = (entry: DailyLogEntry, cafePrice: number) => {
    const controleData = entry.controleCafeDaManha as ControleCafeItem | undefined;
    if (!controleData) return { qtd: 0, valor: 0 };

    const totalPessoas = (controleData.adultoQtd || 0) +
                         (controleData.crianca01Qtd || 0) +
                         (controleData.crianca02Qtd || 0) +
                         (controleData.contagemManual || 0) +
                         (controleData.semCheckIn || 0);

    return {
        qtd: totalPessoas,
        valor: totalPessoas * cafePrice
    };
};

const calculateNoShowTotal = (entry: DailyLogEntry, unitPrices: ChannelUnitPricesConfig = {}) => {
    const noShowData = entry.cafeManhaNoShow as CafeManhaNoShowPeriodData | undefined;
    if (!noShowData?.items) return { qtd: 0, valor: 0 };
    const noShowPrice = unitPrices.cdmNoShow || 0;

    return noShowData.items.reduce((acc, item) => {
        acc.qtd += 1; // Each item is one no-show event
        acc.valor += noShowPrice; // Use the configured price
        return acc;
    }, { qtd: 0, valor: 0 });
};



export const processEntryForTotalsV2 = (entry: DailyLogEntry, unitPrices: ChannelUnitPricesConfig) => {
    // --- 1. DECOMPOSITION: Calculate all individual, non-overlapping components from the raw data ---
    const cafePrice = unitPrices?.cdmListaHospedes || 0;
    const controleCafe = calculateControleCafeTotal(entry, cafePrice);
    const cafeManhaNoShow = calculateNoShowTotal(entry, unitPrices);

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

    // -- FATURADO & C.I. (New + Old formats) --
    const aptFaturado = {
        new: calculateFaturadoFromItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.faturado?.faturadoItems),
        old: calculateOldFormatFaturado(entry.almocoPrimeiroTurno as PeriodData, 'apt'),
    };
    const aptCI = {
        new: calculateConsumoInternoFromItems((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        old: calculateOldFormatConsumoInterno(entry.almocoPrimeiroTurno as PeriodData, 'apt'),
        reajusteNew: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };

    const astFaturado = {
        new: calculateFaturadoFromItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.faturado?.faturadoItems),
        old: calculateOldFormatFaturado(entry.almocoSegundoTurno as PeriodData, 'ast'),
    };
    const astCI = {
        new: calculateConsumoInternoFromItems((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        old: calculateOldFormatConsumoInterno(entry.almocoSegundoTurno as PeriodData, 'ast'),
        reajusteNew: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
    };
    
    const jntFaturado = {
        new: calculateFaturadoFromItems((entry.jantar as PeriodData)?.subTabs?.faturado?.faturadoItems),
        old: calculateOldFormatFaturado(entry.jantar as PeriodData, 'jnt'),
    };
    const jntCI = {
        new: calculateConsumoInternoFromItems((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.consumoInternoItems),
        old: calculateOldFormatConsumoInterno(entry.jantar as PeriodData, 'jnt'),
        reajusteNew: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.consumoInterno?.channels, 'reajusteCI.vtotal'),
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
    
   const totalReajusteCI = aptCI.old.reajuste + aptCI.reajusteNew + astCI.old.reajuste + astCI.reajusteNew + jntCI.old.reajuste + jntCI.reajusteNew;
    
    const turnoAlmocoPT = {
        qtd: getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).qtd + rsAlmocoPT.qtd + aptFaturado.new.qtd + aptFaturado.old.qtd + frigobarPT.qtd,
        valor: getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).valor + rsAlmocoPT.valor + aptFaturado.new.valor + aptFaturado.old.valor + aptCI.old.reajuste + aptCI.reajusteNew + frigobarPT.valor,
    };
    const turnoAlmocoST = {
        qtd: getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).qtd + rsAlmocoST.qtd + astFaturado.new.qtd + astFaturado.old.qtd + frigobarST.qtd,
        valor: getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).valor + rsAlmocoST.valor + astFaturado.new.valor + astFaturado.old.valor + astCI.old.reajuste + astCI.reajusteNew + frigobarST.valor,
    };
    const turnoJantar = {
        qtd: getPeriodRestaurantTotal(entry.jantar as PeriodData).qtd + rsJantar.qtd + jntFaturado.new.qtd + jntFaturado.old.qtd + frigobarJantar.qtd,
        valor: getPeriodRestaurantTotal(entry.jantar as PeriodData).valor + rsJantar.valor + jntFaturado.new.valor + jntFaturado.old.valor + jntCI.old.reajuste + jntCI.reajusteNew + frigobarJantar.valor,
    };

    // -- TOTALS PER SERVICE TYPE --
    const almocoCITotal = { qtd: aptCI.new.qtd + aptCI.old.qtd + astCI.new.qtd + astCI.old.qtd, valor: aptCI.new.valor + aptCI.old.valor + astCI.new.valor + astCI.old.valor };
    const jantarCITotal = { qtd: jntCI.new.qtd + jntCI.old.qtd, valor: jntCI.new.valor + jntCI.old.valor };
    const totalCI = { qtd: almocoCITotal.qtd + jantarCITotal.qtd, valor: almocoCITotal.valor + jantarCITotal.valor };
    const roomServiceTotal = { valor: rsMadrugada.valor + rsAlmocoPT.valor + rsAlmocoST.valor + rsJantar.valor, qtd: rsMadrugada.qtdPedidos + rsAlmocoPT.qtd + rsAlmocoST.qtd + rsJantar.qtd };
    
    // Summary Card specific totals (without Frigobar)
    const almocoTotal = {
        qtd: (getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).qtd + rsAlmocoPT.qtd + aptFaturado.new.qtd + aptFaturado.old.qtd) + (getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).qtd + rsAlmocoST.qtd + astFaturado.new.qtd + astFaturado.old.qtd),
        valor: (getPeriodRestaurantTotal(entry.almocoPrimeiroTurno as PeriodData).valor + aptCI.old.reajuste + aptCI.reajusteNew + rsAlmocoPT.valor + aptFaturado.new.valor + aptFaturado.old.valor) + (getPeriodRestaurantTotal(entry.almocoSegundoTurno as PeriodData).valor + astCI.old.reajuste + astCI.reajusteNew + rsAlmocoST.valor + astFaturado.new.valor + astFaturado.old.valor),
    };

    const jantarTotal = {
        qtd: getPeriodRestaurantTotal(entry.jantar as PeriodData).qtd + rsJantar.qtd + jntFaturado.new.qtd + jntFaturado.old.qtd,
        valor: getPeriodRestaurantTotal(entry.jantar as PeriodData).valor + jntCI.old.reajuste + jntCI.reajusteNew + rsJantar.valor + jntFaturado.new.valor + jntFaturado.old.valor
    };


    // -- GRAND TOTALS --
    const grandTotalComCI = {
        valor: cafeHospedes.valor + cafeAvulsos.valor + breakfast.valor + italianoAlmoco.valor + italianoJantar.valor + indianoAlmoco.valor + indianoJantar.valor + baliAlmoco.valor + baliHappy.valor + eventosDireto.valor + eventosHotel.valor + rsMadrugada.valor + turnoAlmocoPT.valor + turnoAlmocoST.valor + turnoJantar.valor + totalCI.valor,
        qtd: cafeHospedes.qtd + cafeAvulsos.qtd + breakfast.qtd + italianoAlmoco.qtd + italianoJantar.qtd + indianoAlmoco.qtd + indianoJantar.qtd + baliAlmoco.qtd + baliHappy.qtd + eventosDireto.qtd + eventosHotel.qtd + rsMadrugada.qtdPedidos + turnoAlmocoPT.qtd + turnoAlmocoST.qtd + turnoJantar.qtd + totalCI.qtd,
    };
    const grandTotalSemCI = {
        valor: grandTotalComCI.valor - totalCI.valor - totalReajusteCI,
        qtd: grandTotalComCI.qtd - totalCI.qtd,
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
        controleCafe,
        cafeManhaNoShow,
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
        turnos: { 
            almocoPT: turnoAlmocoPT,
            almocoST: turnoAlmocoST,
            jantar: turnoJantar,
        },
        roomServiceTotal,
        totalCI,
        totalReajusteCI,
        grandTotal: { comCI: grandTotalComCI, semCI: grandTotalSemCI },
    };
};
