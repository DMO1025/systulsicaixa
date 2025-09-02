

import type { jsPDF as jsPDFType } from 'jspdf';
import { format } from 'date-fns';
import { getFilename } from '../exportUtils';
import type { ExportParams } from '../types';

import { generateGeneralReportPdf } from './generalReportPdf';
import { generatePeriodReportPdf } from './periodReportPdf';
import { generateSingleDayReportPdf } from './singleDayPdf';
import { generatePersonExtractPdf } from './personExtractPdf';
import { generatePersonSummaryPdf } from './personSummaryPdf';
import { generateControleCafePdf } from './controleCafePdf';
import { generateNoShowPdf } from './noShowPdf';


export const generatePdf = async (params: Omit<ExportParams, 'formatType'> & { formatType: 'pdf' }) => {
    const { default: jsPDF } = await import('jspdf');
    const { filterType, date, month, range } = params;

    const isSalesReport = filterType === 'month' || filterType === 'range' || filterType === 'period';
    const orientation = isSalesReport ? 'landscape' : 'portrait';

    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    let filename = "";

    const consumptionLabel = params.consumptionType ? params.consumptionType.replace('faturado-', '').replace('ci', 'consumo-interno') : '';
    let dateRangeFilenameStr = '';
    
    if (filterType.startsWith('controle-cafe')) {
        dateRangeFilenameStr = range?.from 
            ? `${format(range.from, 'yyyy-MM-dd')}_a_${range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd')}`
            : 'periodo_indefinido';
    } else if (filterType === 'date' && date) {
        dateRangeFilenameStr = format(date, 'yyyy-MM-dd');
    } else if (filterType === 'range' && range?.from) {
        dateRangeFilenameStr = `${format(range.from, 'yyyy-MM-dd')}_a_${range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd')}`;
    } else if (month) {
        dateRangeFilenameStr = format(month, 'yyyy-MM');
    }
    

    switch (filterType) {
        case 'date':
            filename = getFilename(['Relatorio_Dia', dateRangeFilenameStr], 'pdf');
            generateSingleDayReportPdf(doc, params, dateRangeFilenameStr);
            break;
        case 'range':
        case 'month':
        case 'period':
             const periodTitle = params.reportData?.data.reportTitle || 'Relatorio';
             filename = getFilename(['Relatorio', periodTitle, dateRangeFilenameStr], 'pdf');
             if (params.reportData?.type === 'general') generateGeneralReportPdf(doc, params, dateRangeFilenameStr);
             else if (params.reportData?.type === 'period') generatePeriodReportPdf(doc, params, dateRangeFilenameStr);
            break;
        case 'client-extract':
            const personName = params.selectedClient && params.selectedClient !== 'all' ? params.selectedClient : 'Todas_Pessoas';
            filename = getFilename(['Extrato', personName, consumptionLabel, dateRangeFilenameStr], 'pdf');
            generatePersonExtractPdf(doc, params);
            break;
        case 'client-summary':
            filename = getFilename(['Resumo', consumptionLabel, dateRangeFilenameStr], 'pdf');
            generatePersonSummaryPdf(doc, params);
            break;
        case 'controle-cafe':
            const dezenaLabelCafe = params.selectedDezena && params.selectedDezena !== 'all' ? `${params.selectedDezena}a_Dezena` : null;
            filename = getFilename(['Controle_Cafe', dateRangeFilenameStr, dezenaLabelCafe], 'pdf');
            await generateControleCafePdf(doc, params);
            break;
        case 'controle-cafe-no-show':
            const dezenaLabelNoShow = params.selectedDezena && params.selectedDezena !== 'all' ? `${params.selectedDezena}a_Dezena` : null;
            filename = getFilename(['No_Show', dateRangeFilenameStr, dezenaLabelNoShow], 'pdf');
            await generateNoShowPdf(doc, params);
            break;
        default:
            console.warn(`Tipo de relatório PDF não implementado: ${filterType}`);
            if(params.toast) params.toast({ title: 'Exportação Falhou', description: `Tipo de relatório PDF não implementado: ${filterType}`, variant: 'destructive'});
            return;
    }
    
    if (doc.internal.pages.length > 1 && doc.internal.pages[doc.internal.pages.length-1].length === 0) {
        doc.deletePage(doc.internal.pages.length-1);
    }
    
    // Verifica se alguma página foi adicionada antes de salvar
    if (doc.getNumberOfPages() > 0 && doc.internal.pages[1].length > 0) {
        doc.save(filename);
    } else {
        if(params.toast) params.toast({ title: 'Nada para Exportar', description: 'Nenhum dado foi encontrado para gerar o PDF com os filtros atuais.', variant: 'default'});
    }
};
