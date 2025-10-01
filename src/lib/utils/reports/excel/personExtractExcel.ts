

import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyLogEntry, UnifiedPersonTransaction } from '../types';
import { extractPersonTransactions } from '@/lib/reports/person/generator';

export const generatePersonExtractExcel = (wb: XLSX.WorkBook, transactions: UnifiedPersonTransaction[], selectedPerson?: string, companyName?: string) => {
    let transactionsToExport = transactions;
    if(selectedPerson && selectedPerson !== 'all') {
      transactionsToExport = transactions.filter(t => t.personName === selectedPerson);
    }

     const dataForSheet = transactionsToExport.map(t => ({
        'Empresa': companyName,
        'Pessoa': t.personName,
        'Data': format(parseISO(t.date.split('/').reverse().join('-')), 'dd/MM/yyyy', { locale: ptBR }),
        'Origem': t.origin,
        'Observação': t.observation,
        'Quantidade': t.quantity,
        'Valor': t.value
     }));

     const totals = transactionsToExport.reduce((acc, t) => {
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
