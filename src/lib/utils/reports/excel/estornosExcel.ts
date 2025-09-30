
import * as XLSX from 'xlsx';
import type { EstornoItem } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const generateEstornosExcel = (wb: XLSX.WorkBook, estornos: EstornoItem[], companyName?: string) => {
    const dataForSheet = estornos.map(item => ({
        'Empresa': companyName,
        'Data': format(parseISO(item.date), 'dd/MM/yyyy', { locale: ptBR }),
        'Registrado Por': item.registeredBy,
        'UH': item.uh,
        'NF': item.nf,
        'Motivo': item.reason,
        'Quantidade': item.quantity,
        'Valor Total Nota': item.valorTotalNota,
        'Valor Estorno': item.valorEstorno,
        'Observação': item.observation,
        'Categoria': item.category,
    }));

    const totals = estornos.reduce((acc, item) => {
        acc.qtd += item.quantity || 0;
        acc.valorTotalNota += item.valorTotalNota || 0;
        acc.valorEstorno += item.valorEstorno || 0;
        return acc;
    }, { qtd: 0, valorTotalNota: 0, valorEstorno: 0 });

    dataForSheet.push({
        'Empresa': '',
        'Data': 'TOTAL',
        'Registrado Por': '',
        'UH': '',
        'NF': '',
        'Motivo': '',
        'Quantidade': totals.qtd,
        'Valor Total Nota': totals.valorTotalNota,
        'Valor Estorno': totals.valorEstorno,
        'Observação': '',
        'Categoria': '',
    });

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio_Estornos');
};

    