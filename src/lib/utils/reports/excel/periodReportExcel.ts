import * as XLSX from 'xlsx';
import type { PeriodReportViewData } from '../types';

export const generatePeriodReportExcel = (wb: XLSX.WorkBook, data: PeriodReportViewData, companyName?: string) => {
    Object.entries(data.dailyBreakdowns).forEach(([category, items]) => {
        if (items.length > 0) {
            const dataForSheet = items.map(item => ({ 'Empresa': companyName, ...item }));
            const summary = data.summary[category];
            if (summary) {
                const totalRow: any = { 'Empresa': '', date: 'TOTAL' };
                if (summary.total !== undefined) totalRow.total = summary.total;
                if (summary.qtd !== undefined) totalRow.qtd = summary.qtd;
                dataForSheet.push(totalRow);
            }
            const ws = XLSX.utils.json_to_sheet(dataForSheet);
            XLSX.utils.book_append_sheet(wb, ws, category.substring(0, 31));
        }
    });
};
