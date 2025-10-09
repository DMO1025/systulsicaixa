

"use client";

import type { DailyLogEntry, EstornoItem } from '@/lib/types';
import { processEntryForTotals } from './calculations/index';

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
  totalEstornos: { 
    detalhes: Record<string, { qtd: number; valor: number }>;
    total: { qtd: number; valor: number };
  };
  debitosReaisEstorno: {
    detalhes: Record<string, { qtd: number; valor: number }>;
    total: { qtd: number; valor: number };
  };
  totalCIAlmoco: { qtd: number; valor: number };
  totalCIJantar: { qtd: number; valor: number };
  totalReajusteCI: number;
  grandTotalComCI: { qtd: number; valor: number };
  grandTotalSemCI: { qtd: number; valor: number };
  totalConsumoInternoGeral: { qtd: number; valor: number };
}

export function processEntriesForDashboard(entries: DailyLogEntry[], estornos: EstornoItem[]): DashboardTotals {
  
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
    totalEstornos: { detalhes: {}, total: { qtd: 0, valor: 0 } },
    debitosReaisEstorno: { detalhes: {}, total: { qtd: 0, valor: 0 } },
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

    // --- Almoço (Restaurante + Faturado + CI + Reajuste, mas SEM RS e Frigobar) ---
    const almocoSemRSF = entryTotals.almoco.valor - entryTotals.rsAlmocoPT.valor - entryTotals.rsAlmocoST.valor;
    const almocoQtdSemRSF = entryTotals.almoco.qtd - entryTotals.rsAlmocoPT.qtd - entryTotals.rsAlmocoST.qtd;
    totals.almoco.valor += almocoSemRSF;
    totals.almoco.qtd += almocoQtdSemRSF;
    
    // --- Jantar (Restaurante + Faturado + CI + Reajuste, mas SEM RS e Frigobar) ---
    const jantarSemRSF = entryTotals.jantar.valor - entryTotals.rsJantar.valor;
    const jantarQtdSemRSF = entryTotals.jantar.qtd - entryTotals.rsJantar.qtd;
    totals.jantar.valor += jantarSemRSF;
    totals.jantar.qtd += jantarQtdSemRSF;
    
    // --- Frigobar ---
    totals.frigobar.valor += entryTotals.frigobar.valor;
    totals.frigobar.qtd += entryTotals.frigobar.qtd;
    
    // --- Eventos (Direto vs Hotel) ---
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

    // --- Grand Totals ---
    totals.grandTotalComCI.valor += entryTotals.grandTotal.comCI.valor;
    totals.grandTotalComCI.qtd += entryTotals.grandTotal.comCI.qtd;
    totals.grandTotalSemCI.valor += entryTotals.grandTotal.semCI.valor;
    totals.grandTotalSemCI.qtd += entryTotals.grandTotal.semCI.qtd;
    totals.totalConsumoInternoGeral.valor += entryTotals.totalCI.valor;
    totals.totalConsumoInternoGeral.qtd += entryTotals.totalCI.qtd;
  }
  
  // Process Estornos
  estornos.forEach(item => {
    const category = item.category || 'outros';
    
    // Total Estornos (para controle)
    if (!totals.totalEstornos.detalhes[category]) {
      totals.totalEstornos.detalhes[category] = { qtd: 0, valor: 0 };
    }
    totals.totalEstornos.detalhes[category].qtd += item.quantity || 0;
    totals.totalEstornos.detalhes[category].valor += item.valorEstorno || 0;
    totals.totalEstornos.total.qtd += item.quantity || 0;
    totals.totalEstornos.total.valor += item.valorEstorno || 0;

    // Débitos Reais (para dashboard)
    if (item.reason === 'erro_de_lancamento' || item.reason === 'nao_consumido' || item.reason === 'erro de lancamento' || item.reason === 'nao consumido') {
      if (!totals.debitosReaisEstorno.detalhes[category]) {
        totals.debitosReaisEstorno.detalhes[category] = { qtd: 0, valor: 0 };
      }
      totals.debitosReaisEstorno.detalhes[category].qtd += item.quantity || 0;
      totals.debitosReaisEstorno.detalhes[category].valor += item.valorEstorno || 0;
      totals.debitosReaisEstorno.total.qtd += item.quantity || 0;
      totals.debitosReaisEstorno.total.valor += item.valorEstorno || 0;
    }
  });

  const debitosReaisValor = totals.debitosReaisEstorno.total.valor;
  const creditosRelancamento = estornos.filter(e => e.reason === 'relancamento' || e.reason === 'relancamento').reduce((sum, item) => sum + (item.valorEstorno || 0), 0);
  
  const valorAjusteDashboard = debitosReaisValor + creditosRelancamento;
  
  totals.grandTotalComCI.valor += valorAjusteDashboard;
  totals.grandTotalSemCI.valor += valorAjusteDashboard;

  return totals;
}
