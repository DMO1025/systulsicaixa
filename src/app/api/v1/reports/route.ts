
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAllEntries } from '@/lib/data/entries';
import type { DailyLogEntry, FilterType, PeriodId, PeriodData, GeneralReportViewData, PeriodReportViewData, DailyCategoryDataItem, FaturadoItem, ConsumoInternoItem, UnifiedPersonTransaction, EventosPeriodData } from '@/lib/types';
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
    let grandTotalComCI = 0;
    let grandTotalQtd = 0;
    let totalCI = 0;
    let totalCIQtd = 0;
    let reajusteCI = 0;

    const periodTotals: Record<string, { qtd: number, valor: number }> = {};
    PERIOD_DEFINITIONS.forEach(pDef => periodTotals[pDef.id] = { qtd: 0, valor: 0 });

    // 1. Madrugada
    const rsMadrugada = {
        valor: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServicePagDireto.vtotal') + getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceValorServico.vtotal'),
        qtd: getSafeNumericValue(entry, 'madrugada.channels.madrugadaRoomServiceQtdPedidos.qtd'),
    };
    periodTotals['madrugada'] = rsMadrugada;
    grandTotalComCI += rsMadrugada.valor;
    grandTotalQtd += rsMadrugada.qtd;

    // 2. Eventos
    const eventosData = entry.eventos as EventosPeriodData | undefined;
    if (eventosData?.items) {
        eventosData.items.forEach(item => {
            (item.subEvents || []).forEach(subEvent => {
                periodTotals['eventos'].qtd += subEvent.quantity || 0;
                periodTotals['eventos'].valor += subEvent.totalValue || 0;
            });
        });
    }
    grandTotalComCI += periodTotals['eventos'].valor;
    grandTotalQtd += periodTotals['eventos'].qtd;
    
    // 3. Frigobar
    const frigobarPT = getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTPagRestaurante.vtotal') + getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTPagHotel.vtotal');
    const frigobarST = getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTPagRestaurante.vtotal') + getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTPagHotel.vtotal');
    const frigobarJantar = getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTPagRestaurante.vtotal') + getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTPagHotel.vtotal');
    const frigobarQtd = getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData), 'subTabs.frigobar.channels.frgPTTotalQuartos.qtd') + getSafeNumericValue((entry.almocoSegundoTurno as PeriodData), 'subTabs.frigobar.channels.frgSTTotalQuartos.qtd') + getSafeNumericValue((entry.jantar as PeriodData), 'subTabs.frigobar.channels.frgJNTTotalQuartos.qtd');
    
    periodTotals['frigobar'] = { qtd: frigobarQtd, valor: frigobarPT + frigobarST + frigobarJantar };
    grandTotalComCI += periodTotals['frigobar'].valor;
    grandTotalQtd += periodTotals['frigobar'].qtd;


    // 4. Outros períodos (Almoço, Jantar, etc.)
    PERIOD_DEFINITIONS.forEach(pDef => {
        if (pDef.id === 'madrugada' || pDef.id === 'eventos' || pDef.id === 'frigobar') return;
        
        const periodData = entry[pDef.id as keyof DailyLogEntry] as PeriodData | undefined;
        if (!periodData) return;

        let periodValor = 0;
        let periodQtd = 0;

        if (periodData.channels) {
            Object.values(periodData.channels).forEach(channel => {
                periodQtd += getSafeNumericValue(channel, 'qtd');
                periodValor += getSafeNumericValue(channel, 'vtotal');
            });
        }
        if (periodData.subTabs) {
            Object.values(periodData.subTabs).forEach(subTab => {
                // Exclude room service, frigobar as they are handled separately or part of turn total
                if (subTab.channels && subTab !== (periodData.subTabs as any)?.roomService && subTab !== (periodData.subTabs as any)?.frigobar) {
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
                        const ciQtd = item.quantity || 0;
                        const ciValor = item.value || 0;
                        periodQtd += ciQtd;
                        periodValor += ciValor;
                        totalCI += ciValor;
                        totalCIQtd += ciQtd;
                    });
                }
            });
        }

        const reajuste = getSafeNumericValue(periodData, 'subTabs.consumoInterno.channels.reajusteCI.vtotal');
        reajusteCI += reajuste;
        periodValor += reajuste;

        periodTotals[pDef.id] = { qtd: periodQtd, valor: periodValor };
        grandTotalComCI += periodValor;
        grandTotalQtd += periodQtd;
    });

    // 5. Room Service Diurno (Almoço + Jantar)
    const rsAlmocoPT = { valor: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService?.channels, 'aptRoomServicePagDireto.vtotal') + getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService?.channels, 'aptRoomServiceValorServico.vtotal'), qtd: getSafeNumericValue((entry.almocoPrimeiroTurno as PeriodData)?.subTabs?.roomService?.channels, 'aptRoomServiceQtdPedidos.qtd') };
    const rsAlmocoST = { valor: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService?.channels, 'astRoomServicePagDireto.vtotal') + getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService?.channels, 'astRoomServiceValorServico.vtotal'), qtd: getSafeNumericValue((entry.almocoSegundoTurno as PeriodData)?.subTabs?.roomService?.channels, 'astRoomServiceQtdPedidos.qtd') };
    const rsJantar = { valor: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.roomService?.channels, 'jntRoomServicePagDireto.vtotal') + getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.roomService?.channels, 'jntRoomServiceValorServico.vtotal'), qtd: getSafeNumericValue((entry.jantar as PeriodData)?.subTabs?.roomService?.channels, 'jntRoomServiceQtdPedidos.qtd') };

    periodTotals['roomService'] = {
        valor: rsAlmocoPT.valor + rsAlmocoST.valor + rsJantar.valor,
        qtd: rsAlmocoPT.qtd + rsAlmocoST.qtd + rsJantar.qtd,
    };
    grandTotalComCI += periodTotals['roomService'].valor;
    grandTotalQtd += periodTotals['roomService'].qtd;
    
    return { periodTotals, grandTotalComCI, grandTotalQtd, totalCI, totalCIQtd, reajusteCI };
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
    
    const allPossiblePeriodKeys = [...PERIOD_DEFINITIONS.map(p => p.id), 'roomService', 'frigobar'];
    
    allPossiblePeriodKeys.forEach(key => {
        summary.periodTotals[key as PeriodId] = { qtd: 0, valor: 0 };
    });

    entries.forEach(entry => {
        const { periodTotals, grandTotalComCI, grandTotalQtd, totalCI, totalCIQtd, reajusteCI } = processEntryForApiTotals(entry);
        
        dailyBreakdowns.push({
            date: format(parseISO(String(entry.id)), 'dd/MM/yyyy'),
            periodTotals: periodTotals,
            totalComCI: grandTotalComCI,
            totalSemCI: grandTotalComCI - totalCI - reajusteCI,
            totalReajusteCI: reajusteCI,
            totalQtd: grandTotalQtd,
            totalCIQtd: totalCIQtd,
        });

        summary.grandTotalComCI += grandTotalComCI;
        summary.grandTotalQtd += grandTotalQtd;
        summary.grandTotalReajusteCI += reajusteCI;
        summary.grandTotalCIQtd += totalCIQtd;
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
                        id: item.id,
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
                    id: item.id,
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
        } else if (filterType === 'range' || filterType.startsWith('client-')) {
            startDateStr = searchParams.get('startDate') || undefined;
            endDateStr = searchParams.get('endDate') || undefined;
            
            // Fallback to month if range is not provided for client filters
            if (filterType.startsWith('client-') && (!startDateStr || !endDateStr)) {
                 const monthStr = searchParams.get('month'); // YYYY-MM
                 if (monthStr && isValid(parse(monthStr, 'yyyy-MM', new Date()))) {
                    const monthDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
                    startDateStr = format(monthDate, 'yyyy-MM-dd');
                    const endOfMonthDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                    endDateStr = `${monthStr}-${String(endOfMonthDay).padStart(2, '0')}`;
                 } else {
                     return NextResponse.json({ message: `Parâmetros 'startDate'/'endDate' ou 'month' são necessários. Use AAAA-MM-DD ou AAAA-MM.` }, { status: 400, headers: CORS_HEADERS });
                 }
            } else if (!startDateStr || !isValid(parse(startDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'startDate' inválido ou ausente. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            } else if (endDateStr && !isValid(parse(endDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'endDate' inválido. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
        } else { // month, period
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
            const personName = searchParams.get('personName') || undefined;
            let allTransactions = extractPersonTransactions(entries, consumptionType);
            if(personName) {
                allTransactions = allTransactions.filter(t => t.personName === personName);
            }
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
