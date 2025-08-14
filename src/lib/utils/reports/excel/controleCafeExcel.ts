import * as XLSX from 'xlsx';
import type { DailyLogEntry, CafeManhaNoShowItem, ControleCafeItem } from '../types';
import { getControleCafeItems } from '../exportUtils';


export const generateControleCafeExcel = (wb: XLSX.WorkBook, entries: DailyLogEntry[], type: 'no-show' | 'controle', companyName?: string) => {
    if (type === 'no-show') {
      const allItems = getControleCafeItems(entries, 'no-show') as (CafeManhaNoShowItem & { entryDate: string })[];
      const dataForSheet = allItems.map(item => ({
          'Empresa': companyName,
          'Data': item.entryDate,
          'Horário': item.horario,
          'Hóspede': item.hospede,
          'UH': item.uh,
          'Reserva': item.reserva,
          'Valor': item.valor,
          'Observação': item.observation,
      }));
      const totalValor = allItems.reduce((sum, item) => sum + (item.valor || 0), 0);
      dataForSheet.push({
        'Empresa': '',
        'Data': 'TOTAL',
        'Horário': '',
        'Hóspede': '',
        'UH': '',
        'Reserva': '',
        'Valor': totalValor,
        'Observação': '',
      });
      const ws = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Controle_Cafe_NoShow');
    } else {
      const allItems = getControleCafeItems(entries, 'controle') as (Partial<ControleCafeItem> & { entryDate: string })[];
      const dataForSheet = allItems.map(item => ({
          'Empresa': companyName,
          'Data': item.entryDate,
          'Adultos': item.adultoQtd,
          'Criança 01': item.crianca01Qtd,
          'Criança 02': item.crianca02Qtd,
          'Contagem Manual': item.contagemManual,
          'Sem Check-in': item.semCheckIn,
      }));
      const totals = allItems.reduce((acc, item) => {
            acc.adultoQtd += item.adultoQtd || 0;
            acc.crianca01Qtd += item.crianca01Qtd || 0;
            acc.crianca02Qtd += item.crianca02Qtd || 0;
            acc.contagemManual += item.contagemManual || 0;
            acc.semCheckIn += item.semCheckIn || 0;
            return acc;
        }, { adultoQtd: 0, crianca01Qtd: 0, crianca02Qtd: 0, contagemManual: 0, semCheckIn: 0 });

      dataForSheet.push({
        'Empresa': '',
        'Data': 'TOTAL',
        'Adultos': totals.adultoQtd,
        'Criança 01': totals.crianca01Qtd,
        'Criança 02': totals.crianca02Qtd,
        'Contagem Manual': totals.contagemManual,
        'Sem Check-in': totals.semCheckIn,
      });
      const ws = XLSX.utils.json_to_sheet(dataForSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Controle_Cafe');
    }
};
