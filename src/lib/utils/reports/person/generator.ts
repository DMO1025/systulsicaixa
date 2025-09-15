

import type { DailyLogEntry, UnifiedPersonTransaction, PeriodData, FaturadoItem, ConsumoInternoItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export const extractPersonTransactions = (entries: DailyLogEntry[], consumptionType: string): { personList: string[], allTransactions: UnifiedPersonTransaction[] } => {
    const persons = new Set<string>();
    const transactions: UnifiedPersonTransaction[] = [];

    const addTransaction = (personName: string, transaction: Omit<UnifiedPersonTransaction, 'personName' | 'id'>, id: string) => {
        const cleanPersonName = personName.trim();
        if (!cleanPersonName) return;

        persons.add(cleanPersonName);
        transactions.push({ id, personName: cleanPersonName, ...transaction });
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
                    }, item.id);
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
                }, item.id);
            });
        }
      };

      processPeriod(entry.almocoPrimeiroTurno as PeriodData, 'Almoço PT');
      processPeriod(entry.almocoSegundoTurno as PeriodData, 'Almoço ST');
      processPeriod(entry.jantar as PeriodData, 'Jantar');
    });
    
    const sortedPersonList = Array.from(persons).sort((a, b) => a.localeCompare(b));
    const sortedTransactions = transactions.sort((a, b) => {
        const dateA = parseISO(a.date.split('/').reverse().join('-'));
        const dateB = parseISO(b.date.split('/').reverse().join('-'));
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        return a.personName.localeCompare(b.personName);
    });

    return { personList: sortedPersonList, allTransactions: sortedTransactions };
};
