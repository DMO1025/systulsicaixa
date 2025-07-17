

"use client";

import { getSafeNumericValue } from '@/lib/utils';
import type { DailyLogEntry, PeriodData, EventosPeriodData } from '@/lib/types';


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
    const breakfast = getSafeNumericValue(entry, 'breakfast.channels.breakfastEntry.vtotal');
    const breakfastQtd = getSafeNumericValue(entry, 'breakfast.channels.breakfastEntry.qtd');
    
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
        qtd: rsMadrugada.qtdPedidos + cafeHospedes.qtd + cafeAvulsos.qtd + breakfastQtd +
             almocoPrimeiroTurnoTotal.qtd + almocoPTCI.qtd +
             almocoSegundoTurnoTotal.qtd + almocoSTCI.qtd +
             jantarTotal.qtd + jantarCI.qtd +
             italianoAlmoco.qtd + italianoJantar.qtd + indianoAlmoco.qtd + indianoJantar.qtd +
             baliAlmoco.qtd + baliHappy.qtd + frigobar.qtd +
             eventosDireto.qtd + eventosHotel.qtd,
        valor: rsMadrugada.valor + cafeHospedes.valor + cafeAvulsos.valor + breakfast +
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
        madrugada: { qtd: rsMadrugada.qtdPedidos, valor: rsMadrugada.valor },
        cafeDaManha: { qtd: cafeHospedes.qtd + cafeAvulsos.qtd, valor: cafeHospedes.valor + cafeAvulsos.valor },
        almocoPrimeiroTurno: almocoPrimeiroTurnoTotal,
        almocoSegundoTurno: almocoSegundoTurnoTotal,
        jantar: jantarTotal,
        
        rsMadrugada,
        cafeHospedes,
        cafeAvulsos,
        breakfast: { valor: breakfast, qtd: breakfastQtd },
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
