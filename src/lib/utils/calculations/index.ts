

"use client";

import type { DailyLogEntry, PeriodData } from '@/lib/types';
import { getSafeNumericValue } from '@/lib/utils';
import { calculateAlmocoTotals } from './almoco';
import { calculateBaliAlmocoTotals, calculateBaliHappyTotals } from './bali';
import { calculateBreakfastTotals } from './breakfast';
import { calculateCafeDaManhaTotals } from './cafeDaManha';
import { calculateEventosTotals } from './eventos';
import { calculateFrigobarTotals } from './frigobar';
import { calculateIndianoTotals } from './indiano';
import { calculateItalianoTotals } from './italiano';
import { calculateJantarTotals } from './jantar';
import { calculateMadrugadaTotals } from './madrugada';
import { calculateCITotals } from './consumoInterno';


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
    
    // --- 1. DECOMPOSITION: Calculate all individual, non-overlapping components from the raw data ---
    const madrugada = calculateMadrugadaTotals(entry);
    const cafeDaManha = calculateCafeDaManhaTotals(entry);
    const breakfast = calculateBreakfastTotals(entry);
    const { almocoPT, almocoST } = calculateAlmocoTotals(entry);
    const { jantar, rsJantar } = calculateJantarTotals(entry);
    const italiano = calculateItalianoTotals(entry);
    const indiano = calculateIndianoTotals(entry);
    const bali = calculateBaliAlmocoTotals(entry);
    const baliHappy = calculateBaliHappyTotals(entry);
    const frigobar = calculateFrigobarTotals(entry);
    const eventos = calculateEventosTotals(entry);
    const { almocoCI, jantarCI, totalCI, totalReajusteCI } = calculateCITotals(entry);
    const { rsAlmocoPT, rsAlmocoST } = almocoPT.rs && almocoST.rs ? { rsAlmocoPT: almocoPT.rs, rsAlmocoST: almocoST.rs } : { rsAlmocoPT: { valor: 0, qtd: 0 }, rsAlmocoST: { valor: 0, qtd: 0 }};


    // --- 2. ASSEMBLY: Combine decomposed parts into meaningful totals ---
    
    // -- Totals for Summary Card & Reports --
    const roomServiceTotal = {
        valor: rsAlmocoPT.valor + rsAlmocoST.valor + rsJantar.valor,
        qtd: rsAlmocoPT.qtd + rsAlmocoST.qtd + rsJantar.qtd,
    };
    
    const almocoTotal = {
        qtd: almocoPT.qtd + almocoST.qtd,
        valor: almocoPT.valor + almocoST.valor,
    };
    
    // -- GRAND TOTALS --
    const grandTotalComCI = {
        valor: (
            madrugada.rsMadrugada.valor + // Madrugada is separate
            roomServiceTotal.valor + // RS is now only Almoço+Jantar
            cafeDaManha.cafeHospedes.valor + cafeDaManha.cafeAvulsos.valor +
            breakfast.valor +
            almocoTotal.valor +
            jantar.valor +
            italiano.almoco.valor + italiano.jantar.valor +
            indiano.almoco.valor + indiano.jantar.valor +
            bali.valor + baliHappy.valor +
            eventos.direto.valor + eventos.hotel.valor +
            frigobar.valor +
            totalCI.valor +
            totalReajusteCI
        ),
        qtd: (
            madrugada.rsMadrugada.qtdPedidos +
            roomServiceTotal.qtd + // RS is now only Almoço+Jantar
            cafeDaManha.cafeHospedes.qtd + cafeDaManha.cafeAvulsos.qtd +
            breakfast.qtd +
            almocoTotal.qtd +
            jantar.qtd +
            italiano.almoco.qtd + italiano.jantar.qtd +
            indiano.almoco.qtd + indiano.jantar.qtd +
            bali.qtd + baliHappy.qtd +
            eventos.direto.qtd + eventos.hotel.qtd +
            frigobar.qtd +
            totalCI.qtd
        ),
    };
    

    const grandTotalSemCI = {
        valor: grandTotalComCI.valor - totalCI.valor - totalReajusteCI,
        qtd: grandTotalComCI.qtd - totalCI.qtd,
    };
    
    // --- 3. RETURN: Provide all the calculated parts for consumers ---
    return {
        // Individual components
        rsMadrugada: madrugada.rsMadrugada,
        rsAlmocoPT,
        rsAlmocoST,
        rsJantar,
        frigobar: frigobar,
        cafeHospedes: cafeDaManha.cafeHospedes,
        cafeAvulsos: cafeDaManha.cafeAvulsos,
        eventos: {
            direto: eventos.direto,
            hotel: eventos.hotel,
        },
        almocoCI,
        jantarCI,
        breakfast,
        italianoAlmoco: italiano.almoco,
        italianoJantar: italiano.jantar,
        indianoAlmoco: indiano.almoco,
        indianoJantar: indiano.jantar,
        baliAlmoco: bali,
        baliHappy,

        // Combined totals for display
        almoco: almocoTotal,
        jantar,
        turnos: { 
            almocoPT: {
                qtd: almocoPT.qtd,
                valor: almocoPT.valor
            },
            almocoST: {
                qtd: almocoST.qtd,
                valor: almocoST.valor
            },
            jantar: {
                qtd: jantar.qtd,
                valor: jantar.valor
            }
        },
        roomServiceTotal,
        totalCI,
        totalReajusteCI,
        grandTotal: { comCI: grandTotalComCI, semCI: grandTotalSemCI },
    };
};
