
"use client";

import type { DailyLogEntry, PeriodData, EventosPeriodData } from '@/lib/types';
import { getSafeNumericValue } from '@/lib/utils';
import { processEntryForTotals } from './calculations';

export interface DashboardTotals {
  roomService: { qtdPedidos: number; qtdPratos: number; valor: number };
  cafeDaManha: { qtd: number; valor: number };
  breakfast: { qtd: number; valor: number };
  almoco: { qtd: number; valor: number };
  jantar: { qtd: number; valor: number };
  italianoAlmoco: { qtd: number; valor: number };
  italianoJantar: { qtd: number; valor: number };
  indianoAlmoco: { qtd: number; valor: number };
  indianoJantar: { qtd: number; valor: number };
  baliAlmoco: { qtd: number; valor: number };
  baliHappy: { qtd: number; valor: number };
  frigobar: { qtd: number; valor: number };
  eventosDireto: { qtd: number; valor: number };
  eventosHotel: { qtd: number; valor: number };
  totalCIAlmoco: { qtd: number; valor: number };
  totalCIJantar: { qtd: number; valor: number };
  totalReajusteCI: number;
  grandTotalComCI: { qtd: number; valor: number };
  grandTotalSemCI: { qtd: number; valor: number };
  totalConsumoInternoGeral: { qtd: number; valor: number };
}

const getRestaurantAndBilledTotal = (period: PeriodData | undefined, prefix: 'apt' | 'ast' | 'jnt'): { qtd: number; valor: number } => {
    let totalValor = 0;
    let totalQtd = 0;

    if (!period || typeof period === 'string' || !period.subTabs) {
        return { qtd: 0, valor: 0 };
    }

    const subTabsToSum = ['hospedes', 'clienteMesa', 'delivery', 'faturado'];
    
    for (const subTabKey of subTabsToSum) {
        const subTab = period.subTabs[subTabKey];
        if (subTab?.channels) {
            for (const channel of Object.values(subTab.channels)) {
                totalQtd += getSafeNumericValue(channel, 'qtd');
                totalValor += getSafeNumericValue(channel, 'vtotal');
            }
        }
        if (subTab?.faturadoItems) {
            const faturadoTotal = subTab.faturadoItems.reduce((acc, item) => {
                acc.qtd += item.quantity || 0;
                acc.valor += item.value || 0;
                return acc;
            }, { qtd: 0, valor: 0 });
            totalQtd += faturadoTotal.qtd;
            totalValor += faturadoTotal.valor;
        }
    }
    
    // Add old format faturado
    const oldCiEFaturados = period.subTabs.ciEFaturados?.channels;
    if(oldCiEFaturados) {
        totalQtd += getSafeNumericValue(oldCiEFaturados, `${prefix}CiEFaturadosFaturadosQtd.qtd`);
        totalValor += getSafeNumericValue(oldCiEFaturados, `${prefix}CiEFaturadosValorHotel.vtotal`);
        totalValor += getSafeNumericValue(oldCiEFaturados, `${prefix}CiEFaturadosValorFuncionario.vtotal`);
    }

    return { qtd: totalQtd, valor: totalValor };
}


export function processEntriesForDashboard(entries: DailyLogEntry[]): DashboardTotals {
  
  const totals: DashboardTotals = {
    roomService: { qtdPedidos: 0, qtdPratos: 0, valor: 0 },
    cafeDaManha: { qtd: 0, valor: 0 },
    breakfast: { qtd: 0, valor: 0 },
    almoco: { qtd: 0, valor: 0 },
    jantar: { qtd: 0, valor: 0 },
    italianoAlmoco: { qtd: 0, valor: 0 },
    italianoJantar: { qtd: 0, valor: 0 },
    indianoAlmoco: { qtd: 0, valor: 0 },
    indianoJantar: { qtd: 0, valor: 0 },
    baliAlmoco: { qtd: 0, valor: 0 },
    baliHappy: { qtd: 0, valor: 0 },
    frigobar: { qtd: 0, valor: 0 },
    eventosDireto: { qtd: 0, valor: 0 },
    eventosHotel: { qtd: 0, valor: 0 },
    totalCIAlmoco: { qtd: 0, valor: 0 },
    totalCIJantar: { qtd: 0, valor: 0 },
    totalReajusteCI: 0,
    grandTotalComCI: { qtd: 0, valor: 0 },
    grandTotalSemCI: { qtd: 0, valor: 0 },
    totalConsumoInternoGeral: { qtd: 0, valor: 0 },
  };

  for (const entry of entries) {
    const entryTotals = processEntryForTotals(entry);
    
    // --- Room Service ---
    totals.roomService.valor += entryTotals.roomServiceTotal.valor;
    totals.roomService.qtdPedidos += entryTotals.roomServiceTotal.qtd;
    totals.roomService.qtdPratos += entryTotals.rsMadrugada.qtdPratos;
    
    // --- Café da Manhã (Hóspedes + Avulsos) ---
    totals.cafeDaManha.valor += entryTotals.cafeHospedes.valor + entryTotals.cafeAvulsos.valor;
    totals.cafeDaManha.qtd += entryTotals.cafeHospedes.qtd + entryTotals.cafeAvulsos.qtd;

    // --- Frigobar ---
    totals.frigobar.valor += entryTotals.frigobar.valor;
    totals.frigobar.qtd += entryTotals.frigobar.qtd;
    
    // --- Eventos ---
    totals.eventosDireto.valor += entryTotals.eventos.direto.valor;
    totals.eventosDireto.qtd += entryTotals.eventos.direto.qtd;
    totals.eventosHotel.valor += entryTotals.eventos.hotel.valor;
    totals.eventosHotel.qtd += entryTotals.eventos.hotel.qtd;
    
    // --- C.I. & Reajuste ---
    totals.totalCIAlmoco.valor += entryTotals.almocoCI.valor;
    totals.totalCIAlmoco.qtd += entryTotals.almocoCI.qtd;
    totals.totalCIJantar.valor += entryTotals.jantarCI.valor;
    totals.totalCIJantar.qtd += entryTotals.jantarCI.qtd;
    totals.totalReajusteCI += entryTotals.totalReajusteCI;
    
    // --- Generic Periods ---
    totals.breakfast.valor += entryTotals.breakfast.valor;
    totals.breakfast.qtd += entryTotals.breakfast.qtd;
    totals.italianoAlmoco.valor += entryTotals.italianoAlmoco.valor;
    totals.italianoAlmoco.qtd += entryTotals.italianoAlmoco.qtd;
    totals.italianoJantar.valor += entryTotals.italianoJantar.valor;
    totals.italianoJantar.qtd += entryTotals.italianoJantar.qtd;
    totals.indianoAlmoco.valor += entryTotals.indianoAlmoco.valor;
    totals.indianoAlmoco.qtd += entryTotals.indianoAlmoco.qtd;
    totals.indianoJantar.valor += entryTotals.indianoJantar.valor;
    totals.indianoJantar.qtd += entryTotals.indianoJantar.qtd;
    totals.baliAlmoco.valor += entryTotals.baliAlmoco.valor;
    totals.baliAlmoco.qtd += entryTotals.baliAlmoco.qtd;
    totals.baliHappy.valor += entryTotals.baliHappy.valor;
    totals.baliHappy.qtd += entryTotals.baliHappy.qtd;

    // --- Almoço & Jantar (Restaurante + Faturado ONLY) ---
    const almocoPT = getRestaurantAndBilledTotal(entry.almocoPrimeiroTurno as PeriodData, 'apt');
    const almocoST = getRestaurantAndBilledTotal(entry.almocoSegundoTurno as PeriodData, 'ast');
    const jantar = getRestaurantAndBilledTotal(entry.jantar as PeriodData, 'jnt');
    
    totals.almoco.valor += almocoPT.valor + almocoST.valor;
    totals.almoco.qtd += almocoPT.qtd + almocoST.qtd;
    totals.jantar.valor += jantar.valor;
    totals.jantar.qtd += jantar.qtd;

    // --- Grand Totals ---
    totals.grandTotalComCI.valor += entryTotals.grandTotal.comCI.valor;
    totals.grandTotalComCI.qtd += entryTotals.grandTotal.comCI.qtd;
    totals.grandTotalSemCI.valor += entryTotals.grandTotal.semCI.valor;
    totals.grandTotalSemCI.qtd += entryTotals.grandTotal.semCI.qtd;
    totals.totalConsumoInternoGeral.valor += entryTotals.totalCI.valor;
    totals.totalConsumoInternoGeral.qtd += entryTotals.totalCI.qtd;
  }

  return totals;
}
