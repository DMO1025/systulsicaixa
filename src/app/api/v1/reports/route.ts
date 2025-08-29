

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAllEntries } from '@/lib/data/entries';
import type { DailyLogEntry, FilterType, PeriodId, PeriodData, GeneralReportViewData, PeriodReportViewData, DailyCategoryDataItem, FaturadoItem, ConsumoInternoItem, UnifiedPersonTransaction } from '@/lib/types';
import { isValid, parse, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { SALES_CHANNELS, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';


const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Access-Control-Allow-Credentials': 'true',
};

// --- Self-Contained Calculation Logic for API ---

const getSafeNumericValue = (data: any, path: string, defaultValue: number = 0): number => {
  if (data === undefined || data === null) return defaultValue;
  const parts = path.split('.');
  let current = data;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }
  const numValue = current !== undefined && current !== null ? parseFloat(String(current)) : defaultValue;
  return isNaN(numValue) ? defaultValue : numValue;
};

const processEntryForApiTotals = (entry: DailyLogEntry) => {
    const rsMadrugada = {
        valor: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServicePagDireto.vtotal') + getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPedidos.qtd'),
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

    const roomServiceTotal = { valor: rsMadrugada.valor + rsAlmocoPT.valor + rsAlmocoST.valor + rsJantar.valor, qtd: rsMadrugada.qtd + rsAlmocoPT.qtd + rsAlmocoST.qtd + rsJantar.qtd };
    
    let grandTotalComCI = roomServiceTotal.valor;
    let grandTotalQtd = roomServiceTotal.qtd;
    let totalCI = 0;
    let reajusteCI = 0;

    const periodTotals: Record<string, { qtd: number, valor: number }> = { roomService: roomServiceTotal };

    PERIOD_DEFINITIONS.forEach(pDef => {
        if (pDef.id === 'madrugada') return;
        const periodData = entry[pDef.id as keyof DailyLogEntry] as PeriodData;
        if (!periodData) return;

        let periodQtd = 0;
        let periodValor = 0;

        if (periodData.channels) {
            Object.values(periodData.channels).forEach(channel => {
                periodQtd += getSafeNumericValue(channel, 'qtd');
                periodValor += getSafeNumericValue(channel, 'vtotal');
            });
        }
        if (periodData.subTabs) {
            Object.values(periodData.subTabs).forEach(subTab => {
                if(subTab.channels) {
                    Object.values(subTab.channels).forEach(channel => {
                        periodQtd += getSafeNumericValue(channel, 'qtd');
                        periodValor += getSafeNumericValue(channel, 'vtotal');
                    });
                }
                if(subTab.faturadoItems) {
                    subTab.faturadoItems.forEach(item => {
                        periodQtd += item.quantity || 0;
                        periodValor += item.value || 0;
                    });
                }
                if(subTab.consumoInternoItems) {
                    subTab.consumoInternoItems.forEach(item => {
                        periodQtd += item.quantity || 0;
                        periodValor += item.value || 0;
                        totalCI += item.value || 0;
                    });
                }
            });
        }
        
        reajusteCI += getSafeNumericValue(periodData, 'subTabs.consumoInterno.channels.reajusteCI.vtotal');
        
        grandTotalComCI += periodValor;
        grandTotalQtd += periodQtd;
        periodTotals[pDef.id] = { qtd: periodQtd, valor: periodValor };
    });
    
    return { periodTotals, grandTotalComCI, grandTotalQtd, totalCI, reajusteCI };
};

const generateGeneralReportForApi = (entries: DailyLogEntry[]): GeneralReportViewData => {
    const dailyBreakdowns: any[] = [];
    const summary: GeneralReportViewData['summary'] = { 
        periodTotals: {}, 
        grandTotalComCI: 0, 
        grandTotalQtd: 0,
        grandTotalSemCI: 0,
        grandTotalCIQtd: 0,
        grandTotalReajusteCI: 0,
    };
    
    PERIOD_DEFINITIONS.forEach(p => summary.periodTotals[p.id] = {qtd: 0, valor: 0});
    summary.periodTotals.roomService = { qtd: 0, valor: 0 };

    entries.forEach(entry => {
        const { periodTotals, grandTotalComCI, grandTotalQtd, totalCI, reajusteCI } = processEntryForApiTotals(entry);
        
        const ciQtd = 0; // Simplified for now, as detailed CI quantity isn't needed for this total.

        dailyBreakdowns.push({
            date: format(parseISO(String(entry.id)), 'dd/MM/yyyy'),
            periodTotals: periodTotals,
            totalComCI: grandTotalComCI,
            totalSemCI: grandTotalComCI - totalCI - reajusteCI,
            totalReajusteCI: reajusteCI,
            totalQtd: grandTotalQtd,
            totalCIQtd: ciQtd,
        });

        summary.grandTotalComCI += grandTotalComCI;
        summary.grandTotalQtd += grandTotalQtd;
        summary.grandTotalReajusteCI += reajusteCI;
        summary.grandTotalCIQtd += ciQtd;
        summary.grandTotalSemCI += (grandTotalComCI - totalCI - reajusteCI);
        
        Object.entries(periodTotals).forEach(([key, value]) => {
            if(!summary.periodTotals[key as PeriodId]) summary.periodTotals[key as PeriodId] = {qtd: 0, valor: 0};
            summary.periodTotals[key as PeriodId]!.qtd += value.qtd;
            summary.periodTotals[key as PeriodId]!.valor += value.valor;
        });
    });
    
    return {
        dailyBreakdowns,
        summary,
        reportTitle: 'GERAL (MÊS)',
    };
};

const extractDetailedCategoryDataForPeriod = (entry: DailyLogEntry) => {
    const data: Record<string, { qtd: number; valor: number; details?: any }> = {};

    const add = (category: string, qtd: number, valor: number, details?: any) => {
        if (!data[category]) data[category] = { qtd: 0, valor: 0, details: {} };
        data[category].qtd += qtd;
        data[category].valor += valor;
        if (details) {
            Object.keys(details).forEach(key => {
                data[category].details[key] = (data[category].details[key] || 0) + details[key];
            });
        }
    };
    
    PERIOD_DEFINITIONS.forEach(pDef => {
        const period = entry[pDef.id as keyof DailyLogEntry] as PeriodData | undefined;
        if (!period) return;
        
        // Faturado e CI (New and Old)
        const processSubTabs = (subTabs: PeriodData['subTabs']) => {
            if (!subTabs) return;

            (subTabs.faturado?.faturadoItems || []).forEach(item => {
                add(`faturado-${item.type}`, item.quantity || 0, item.value || 0);
            });

            (subTabs.consumoInterno?.consumoInternoItems || []).forEach(item => {
                add(`ci-${pDef.id}`, item.quantity || 0, item.value || 0);
            });
            
            const reajuste = getSafeNumericValue(subTabs.consumoInterno?.channels, 'reajusteCI.vtotal');
            if (reajuste !== 0) {
                 add(`ci-${pDef.id}`, 0, reajuste);
            }
        };

        if (period.subTabs) processSubTabs(period.subTabs);

        // Room Service, Mesa, Delivery, Hospedes
        const prefix = pDef.id.startsWith('almocoP') ? 'apt' : pDef.id.startsWith('almocoS') ? 'ast' : 'jnt';
        const rsQtd = getSafeNumericValue(period, `subTabs.roomService.channels.${prefix}RoomServiceQtdPedidos.qtd`);
        const rsValor = getSafeNumericValue(period, `subTabs.roomService.channels.${prefix}RoomServicePagDireto.vtotal`) + getSafeNumericValue(period, `subTabs.roomService.channels.${prefix}RoomServiceValorServico.vtotal`);
        if (rsQtd || rsValor) add('roomService', rsQtd, rsValor);

        // ... and so on for all other categories like mesa, delivery etc.
    });
    
    // Add logic for 'eventos', 'cafeDaManha', etc.
    // ...

    return data;
};

const generatePeriodReportDataForApi = (entries: DailyLogEntry[], periodId: PeriodId | 'all' | 'consumoInterno' | 'faturado' | 'frigobar' | 'roomService'): PeriodReportViewData => {
    const dailyBreakdowns: Record<string, DailyCategoryDataItem[]> = {};
    const summary: Record<string, { qtd: number; total: number }> = {};

    const addToBreakdown = (category: string, item: DailyCategoryDataItem) => {
        if (!dailyBreakdowns[category]) dailyBreakdowns[category] = [];
        dailyBreakdowns[category].push(item);
    };

    const addToSummary = (category: string, qtd: number, total: number) => {
        if (!summary[category]) summary[category] = { qtd: 0, total: 0 };
        summary[category].qtd += qtd;
        summary[category].total += total;
    };
    
    entries.forEach(entry => {
        const dateStr = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
        const categories = extractDetailedCategoryDataForPeriod(entry);
        
        Object.entries(categories).forEach(([category, data]) => {
            addToBreakdown(category, { date: dateStr, qtd: data.qtd, valor: data.valor, ...data.details });
            addToSummary(category, data.qtd, data.valor);
        });
    });

    return {
        dailyBreakdowns,
        summary,
        subtotalGeralComCI: { qtd: 0, total: 0 },
        subtotalGeralSemCI: { qtd: 0, total: 0 },
        reportTitle: PERIOD_DEFINITIONS.find(p => p.id === periodId)?.label.toUpperCase() || 'Relatório de Período',
    };
};


const extractPersonTransactions = (entries: DailyLogEntry[], consumptionType: string): UnifiedPersonTransaction[] => {
    const transactions: UnifiedPersonTransaction[] = [];

    const addTransaction = (personName: string, transaction: Omit<UnifiedPersonTransaction, 'personName'>) => {
        const cleanPersonName = personName.trim();
        if (!cleanPersonName) return;
        transactions.push({ personName: cleanPersonName, ...transaction });
    };

    const showFaturado = consumptionType === 'all' || consumptionType.startsWith('faturado');
    const showConsumoInterno = consumptionType === 'all' || consumptionType === 'ci';

    entries.forEach(entry => {
      const date = format(parseISO(String(entry.id)), 'dd/MM/yyyy');
      
      const processPeriod = (period: PeriodData | undefined, periodName: 'Almoço PT' | 'Almoço ST' | 'Jantar') => {
        if (!period) return;
        
        if (showFaturado) {
            (period.subTabs?.faturado?.faturadoItems || []).forEach((item: FaturadoItem) => {
                if (consumptionType === 'all' || consumptionType === 'faturado-all' || consumptionType === `faturado-${item.type}`) {
                    addTransaction(item.clientName, {
                        date,
                        origin: `Faturado - ${item.type === 'hotel' ? 'Hotel' : item.type === 'funcionario' ? 'Funcionário' : 'Outros'}`,
                        observation: item.observation || '-',
                        quantity: item.quantity || 0,
                        value: item.value || 0,
                    });
                }
            });
        }
        
        if (showConsumoInterno) {
            (period.subTabs?.consumoInterno?.consumoInternoItems || []).forEach((item: ConsumoInternoItem) => {
                 addTransaction(item.clientName, {
                    date,
                    origin: `Consumo Interno - ${periodName}`,
                    observation: item.observation || '-',
                    quantity: item.quantity || 0,
                    value: item.value || 0,
                });
            });
        }
      };

      processPeriod(entry.almocoPrimeiroTurno as PeriodData, 'Almoço PT');
      processPeriod(entry.almocoSegundoTurno as PeriodData, 'Almoço ST');
      processPeriod(entry.jantar as PeriodData, 'Jantar');
    });

    return transactions.sort((a, b) => {
        const dateA = parseISO(a.date.split('/').reverse().join('-'));
        const dateB = parseISO(b.date.split('/').reverse().join('-'));
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        return a.personName.localeCompare(b.personName);
    });
};
// --- End of Self-Contained Logic ---

export async function OPTIONS(request: NextRequest) {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        
        // V1 API is public, no auth check needed here.

        const filterType: FilterType = searchParams.get('filterType') as FilterType || 'month';
        
        let startDateStr: string | undefined;
        let endDateStr: string | undefined;

        if (filterType === 'date') {
            const date = searchParams.get('date');
            if (date && isValid(parse(date, 'yyyy-MM-dd', new Date()))) {
                startDateStr = endDateStr = date;
            } else {
                return NextResponse.json({ message: `Parâmetro 'date' inválido ou ausente. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
        } else if (filterType === 'range') {
            startDateStr = searchParams.get('startDate') || undefined;
            endDateStr = searchParams.get('endDate') || undefined;
            if (!startDateStr || !isValid(parse(startDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'startDate' inválido ou ausente. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
             if (endDateStr && !isValid(parse(endDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'endDate' inválido. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
        } else { // month, period, client-extract, client-summary
            const monthStr = searchParams.get('month'); // YYYY-MM
            if (monthStr && isValid(parse(monthStr, 'yyyy-MM', new Date()))) {
                const monthDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
                startDateStr = format(monthDate, 'yyyy-MM-dd');
                const endOfMonthDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                endDateStr = `${monthStr}-${String(endOfMonthDay).padStart(2, '0')}`;
            } else {
                 return NextResponse.json({ message: `Parâmetro 'month' inválido ou ausente para este tipo de filtro. Use AAAA-MM.` }, { status: 400, headers: CORS_HEADERS });
            }
        }
        
        const entries = await getAllEntries({ startDate: startDateStr, endDate: endDateStr }) as DailyLogEntry[];
        
        if (filterType === 'date') {
            return NextResponse.json(entries.length > 0 ? entries[0] : {}, { headers: CORS_HEADERS });
        }

        if (filterType === 'client-extract') {
            const consumptionType = searchParams.get('consumptionType') || 'all';
            const allTransactions = extractPersonTransactions(entries, consumptionType);
            return NextResponse.json(allTransactions, { headers: CORS_HEADERS });
        }

        if (filterType === 'client-summary') {
            const consumptionType = searchParams.get('consumptionType') || 'all';
            const allTransactions = extractPersonTransactions(entries, consumptionType);
            
            const summary: Record<string, { qtd: number; valor: number }> = {};
            allTransactions.forEach(t => {
                if (!summary[t.personName]) {
                    summary[t.personName] = { qtd: 0, valor: 0 };
                }
                summary[t.personName].qtd += t.quantity;
                summary[t.personName].valor += t.value;
            });
            
            return NextResponse.json(summary, { headers: CORS_HEADERS });
        }
        
        const periodId = searchParams.get('periodId') as any;
        
        if (filterType === 'month' || filterType === 'range') {
            const reportData = generateGeneralReportForApi(entries);
            return NextResponse.json({ type: 'general', data: reportData }, { headers: CORS_HEADERS });
        } else {
            const reportData = generatePeriodReportDataForApi(entries, periodId || 'all');
            return NextResponse.json({ type: 'period', data: reportData }, { headers: CORS_HEADERS });
        }

    } catch (error: any) {
        console.error("API v1/reports Error:", error);
        return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500, headers: CORS_HEADERS });
    }
}
