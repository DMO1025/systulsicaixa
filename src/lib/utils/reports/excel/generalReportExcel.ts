import * as XLSX from 'xlsx';
import type { GeneralReportViewData, PeriodDefinition } from '../types';

export const generateGeneralReportExcel = (wb: XLSX.WorkBook, data: GeneralReportViewData, visiblePeriods: PeriodDefinition[], companyName?: string) => {
    
    const reportablePeriods = visiblePeriods.reduce((acc, p) => {
        if (p.type !== 'entry' || p.id === 'madrugada') return acc;
        acc.push(p);
        return acc;
    }, [] as PeriodDefinition[]);

    const roomServiceDef = { id: 'roomService', label: 'Room Service' };

    const dataForSheet = data.dailyBreakdowns.map(row => {
        const rowData: { [key: string]: any } = { 'Empresa': companyName, Data: row.date };
        
        rowData[`${roomServiceDef.label} (Qtd)`] = row.periodTotals['roomService']?.qtd || 0;
        rowData[`${roomServiceDef.label} (R$)`] = row.periodTotals['roomService']?.valor || 0;
        
        reportablePeriods.forEach(p => {
            const qtd = row.periodTotals[p.id as keyof typeof row.periodTotals]?.qtd || 0;
            const valor = row.periodTotals[p.id as keyof typeof row.periodTotals]?.valor || 0;

            rowData[`${p.label} (Qtd)`] = qtd;
            rowData[`${p.label} (R$)`] = valor;
        });

        rowData['Total GERAL (Qtd)'] = row.totalQtd;
        rowData['Total GERAL (R$)'] = row.totalComCI;
        rowData['Total Reajuste CI (R$)'] = row.totalReajusteCI;
        rowData['Total LÍQUIDO (R$)'] = row.totalSemCI;
        return rowData;
    });
    
    const totalsRow: { [key: string]: any } = { 'Empresa': '', Data: 'TOTAL' };
    
    totalsRow[`${roomServiceDef.label} (Qtd)`] = data.summary.periodTotals['roomService']?.qtd || 0;
    totalsRow[`${roomServiceDef.label} (R$)`] = data.summary.periodTotals['roomService']?.valor || 0;

    reportablePeriods.forEach(p => {
        const qtd = data.summary.periodTotals[p.id as keyof typeof data.summary.periodTotals]?.qtd || 0;
        const valor = data.summary.periodTotals[p.id as keyof typeof data.summary.periodTotals]?.valor || 0;

        totalsRow[`${p.label} (Qtd)`] = qtd;
        totalsRow[`${p.label} (R$)`] = valor;
    });

    totalsRow['Total GERAL (Qtd)'] = data.summary.grandTotalQtd;
    totalsRow['Total GERAL (R$)'] = data.summary.grandTotalComCI;
    totalsRow['Total Reajuste CI (R$)'] = data.summary.grandTotalReajusteCI;
    totalsRow['Total LÍQUIDO (R$)'] = data.summary.grandTotalSemCI;
    dataForSheet.push(totalsRow);

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Geral');
};
