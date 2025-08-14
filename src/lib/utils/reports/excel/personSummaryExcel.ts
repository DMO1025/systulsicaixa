import * as XLSX from 'xlsx';
import type { DailyLogEntry } from '../types';
import { extractPersonTransactions } from '@/lib/reports/person/generator';

export const generatePersonSummaryExcel = (wb: XLSX.WorkBook, entries: DailyLogEntry[], consumptionType: string, companyName?: string) => {
    const { allTransactions } = extractPersonTransactions(entries, consumptionType);
    const summary: Record<string, { qtd: number; valor: number }> = {};
    allTransactions.forEach(t => {
        if (!summary[t.personName]) summary[t.personName] = { qtd: 0, valor: 0 };
        summary[t.personName].qtd += t.quantity;
        summary[t.personName].valor += t.value;
    });

    const dataForSheet = Object.entries(summary).map(([name, totals]) => ({
        'Empresa': companyName,
        'Pessoa': name,
        'Total de Itens': totals.qtd,
        'Valor Total': totals.valor
    }));

    const grandTotals = Object.values(summary).reduce((acc, t) => {
        acc.qtd += t.qtd;
        acc.valor += t.value;
        return acc;
    }, { qtd: 0, valor: 0 });

    const totalRow = {
        'Empresa': '',
        'Pessoa': 'TOTAL GERAL',
        'Total de Itens': grandTotals.qtd,
        'Valor Total': grandTotals.valor
    };
    dataForSheet.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo_Pessoas');
};
