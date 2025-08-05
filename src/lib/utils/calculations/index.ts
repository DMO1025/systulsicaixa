

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


export const processEntryForTotals = (entry: DailyLogEntry) => {
    
    // --- 1. DECOMPOSITION: Calculate all individual, non-overlapping components ---
    const madrugada = calculateMadrugadaTotals(entry);
    const cafeDaManha = calculateCafeDaManhaTotals(entry);
    const breakfast = calculateBreakfastTotals(entry);
    const { almocoPT, almocoST } = calculateAlmocoTotals(entry);
    const { jantar: turnoJantar } = calculateJantarTotals(entry);
    const italiano = calculateItalianoTotals(entry);
    const indiano = calculateIndianoTotals(entry);
    const bali = calculateBaliAlmocoTotals(entry);
    const baliHappy = calculateBaliHappyTotals(entry);
    const frigobar = calculateFrigobarTotals(entry);
    const eventos = calculateEventosTotals(entry);
    const { almocoCI, jantarCI, totalCI, totalReajusteCI, reajusteCIAlmoco, reajusteCIJantar } = calculateCITotals(entry);

    // --- 2. ASSEMBLY: Combine decomposed parts into meaningful totals for the UI ---

    // Summary Card specific totals
    const almocoTotal = {
        qtd: almocoPT.qtd + almocoST.qtd,
        valor: almocoPT.valor + almocoST.valor,
    };
    const jantarTotal = {
        qtd: turnoJantar.qtd,
        valor: turnoJantar.valor,
    };
    
    // GRAND TOTALS
    const grandTotalComCI = {
        valor: madrugada.rsMadrugada.valor + cafeDaManha.cafeHospedes.valor + cafeDaManha.cafeAvulsos.valor + breakfast.valor + italiano.almoco.valor + italiano.jantar.valor + indiano.almoco.valor + indiano.jantar.valor + bali.valor + baliHappy.valor + eventos.direto.valor + eventos.hotel.valor + frigobar.valor + almocoTotal.valor + jantarTotal.valor,
        qtd: madrugada.rsMadrugada.qtdPedidos + cafeDaManha.cafeHospedes.qtd + cafeDaManha.cafeAvulsos.qtd + breakfast.qtd + italiano.almoco.qtd + italiano.jantar.qtd + indiano.almoco.qtd + indiano.jantar.qtd + bali.qtd + baliHappy.qtd + eventos.direto.qtd + eventos.hotel.qtd + frigobar.qtd + (almocoTotal.qtd - almocoCI.qtd) + (jantarTotal.qtd - jantarCI.qtd),
    };
    
    const grandTotalSemCI = {
        valor: grandTotalComCI.valor - totalCI.valor - totalReajusteCI,
        qtd: grandTotalComCI.qtd - totalCI.qtd,
    };

    return {
        // Individual components for summary card rows
        rsMadrugada: madrugada.rsMadrugada,
        cafeHospedes: cafeDaManha.cafeHospedes,
        cafeAvulsos: cafeDaManha.cafeAvulsos,
        breakfast,
        almoco: {
            qtd: almocoTotal.qtd - almocoCI.qtd,
            valor: almocoTotal.valor,
        },
        jantar: {
            qtd: jantarTotal.qtd - jantarCI.qtd,
            valor: jantarTotal.valor,
        },
        italianoAlmoco: italiano.almoco,
        italianoJantar: italiano.jantar,
        indianoAlmoco: indiano.almoco,
        indianoJantar: indiano.jantar,
        baliAlmoco: bali,
        baliHappy,
        frigobar,
        eventos,
        almocoCI,
        jantarCI,
        
        // Granular totals for other calculations
        rsAlmocoPT: almocoPT.rs,
        rsAlmocoST: almocoST.rs,
        rsJantar: turnoJantar.rs,
        roomServiceTotal: {
            valor: madrugada.rsMadrugada.valor + almocoPT.rs.valor + almocoST.rs.valor + turnoJantar.rs.valor,
            qtd: madrugada.rsMadrugada.qtdPedidos + almocoPT.rs.qtd + almocoST.rs.qtd + turnoJantar.rs.qtd,
        },
        totalCI,
        totalReajusteCI,
        reajusteCIAlmoco,
        reajusteCIJantar,
        grandTotal: { comCI: grandTotalComCI, semCI: grandTotalSemCI },
        
        // Form-specific totals (for headers)
        turnos: {
            almocoPT: almocoPT,
            almocoST: almocoST,
            jantar: turnoJantar,
        }
    };
};
