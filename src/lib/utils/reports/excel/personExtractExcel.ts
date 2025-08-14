import * as XLSX from 'xlsx';
import type { DailyLogEntry } from '../types';
import { extractPersonTransactions } from '@/lib/reports/person/generator';

export const generatePersonExtractExcel = (wb: XLSX.WorkBook, entries: DailyLogEntry[], consumptionType: string, selectedPerson?: string, companyName?: string) => {
    let { allTransactions } = extractPersonTransactions(entries, consumptionType);
    if(selectedPerson && selectedPerson !== 'all') {
      allTransactions = allTransactions.filter(t => t.personName === selectedPerson);
    }
     const dataForSheet = allTransactions.map(t => ({
        'Empresa': companyName,
        'Pessoa': t.personName,
        'Data': t.date,
        'Origem': t.origin,
        'Observação': t.observation,
        'Quantidade': t.quantity,
        'Valor': t.value
     }));

     const totals = allTransactions.reduce((acc, t) => {
        acc.qtd += t.quantity;
        acc.valor += t.value;
        return acc;
    }, { qtd: 0, valor: 0 });

    const totalRow = {
        'Empresa': '',
        'Pessoa': 'TOTAL',
        'Data': '',
        'Origem': '',
        'Observação': '',
        'Quantidade': totals.qtd,
        'Valor': totals.valor
    };
    dataForSheet.push(totalRow);

     const ws = XLSX.utils.json_to_sheet(dataForSheet);
     XLSX.utils.book_append_sheet(wb, ws, 'Extrato_Pessoas');
};
