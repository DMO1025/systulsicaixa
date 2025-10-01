

import * as XLSX from 'xlsx';
import type { ExportParams } from '../types';
import { generateGeneralReportExcel } from './generalReportExcel';
import { generatePeriodReportExcel } from './periodReportExcel';
import { generatePersonExtractExcel } from './personExtractExcel';
import { generatePersonSummaryExcel } from './personSummaryExcel';
import { generateControleCafeExcel } from './controleCafeExcel';
import { generateSingleDayReportExcel } from './singleDayReportExcel';
import { generateEstornosExcel } from './estornosExcel';
import { generateControleFrigobarExcel } from './controleFrigobarExcel';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const generateExcelWorkbook = async (params: ExportParams): Promise<XLSX.WorkBook | null> => {
    const { filterType, entries, reportData, toast, unitPrices, personTransactions } = params;
    const wb = XLSX.utils.book_new();

    if (entries.length === 0 && filterType !== 'history' && params.estornos?.length === 0 && personTransactions?.length === 0) {
        if (toast) toast({ title: "Nenhum dado para exportar", description: "Filtre por um período com dados antes de exportar.", variant: "destructive" });
        return null;
    }

    let sheetsAdded = false;

    switch (filterType) {
        case 'month':
        case 'range':
            if (reportData?.type === 'general') {
                generateGeneralReportExcel(wb, reportData.data, params.visiblePeriods, params.companyName);
                sheetsAdded = true;
            }
            break;
        case 'period':
            if (reportData?.type === 'period') {
                generatePeriodReportExcel(wb, reportData.data, params.companyName);
                sheetsAdded = true;
            }
            break;
        case 'date':
            if (entries.length > 0) {
                generateSingleDayReportExcel(wb, entries[0], params.companyName);
                sheetsAdded = true;
            }
            break;
        case 'client-extract':
            if (personTransactions) {
                generatePersonExtractExcel(wb, personTransactions, params.selectedClient, params.companyName);
                sheetsAdded = true;
            }
            break;
        case 'client-summary':
            generatePersonSummaryExcel(wb, entries, params.consumptionType || 'all', params.companyName);
            sheetsAdded = true;
            break;
        case 'controle-cafe':
            generateControleCafeExcel(wb, entries, 'controle', params.companyName);
            sheetsAdded = true;
            break;
        case 'controle-cafe-no-show':
            generateControleCafeExcel(wb, entries, 'no-show', params.companyName);
            sheetsAdded = true;
            break;
        case 'estornos':
            if(params.estornos) {
                generateEstornosExcel(wb, params.estornos, params.companyName);
                sheetsAdded = true;
            }
            break;
        case 'controle-frigobar':
            await generateControleFrigobarExcel(wb, entries, unitPrices, params.companyName);
            sheetsAdded = true;
            break;
        default:
            console.warn(`Excel export for filterType "${filterType}" not implemented.`);
            if (toast) toast({ title: "Exportação não disponível", description: `A exportação para Excel para o tipo de relatório "${filterType}" não está implementada.`, variant: "destructive" });
            return null;
    }

    if (!sheetsAdded) {
      return null;
    }

    return wb;
};
