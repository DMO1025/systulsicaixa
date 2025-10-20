
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportParams } from '../types';
import { TAB_DEFINITIONS } from '@/components/reports/tabDefinitions';
import { drawHeaderAndFooter } from './pdfUtils';
import { HelpCircle } from 'lucide-react';

const formatCurrency = (value: number) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const formatNumber = (value: number) => (value || 0).toLocaleString('pt-BR');

export const generatePeriodReportPdf = (doc: jsPDF, params: ExportParams) => {
    const { reportData, month, range } = params;
    if (reportData?.type !== 'period') return;
    const data = reportData.data;
    
    const dateRangeStr = range?.from 
      ? `${format(range.from, 'dd/MM/yyyy')} a ${range.to ? format(range.to, 'dd/MM/yyyy') : format(range.from, 'dd/MM/yyyy')}`
      : month ? format(month, 'MMMM \'de\' yyyy', { locale: ptBR }) : '';
    
    const availableCategories = Object.keys(data.dailyBreakdowns).filter(
      key => data.dailyBreakdowns[key] && data.dailyBreakdowns[key].length > 0
    );

    availableCategories.forEach((categoryKey, catIndex) => {
        const items = data.dailyBreakdowns[categoryKey];
        if (items.length === 0) return;
        
        const tabDef = TAB_DEFINITIONS.find(t => t.id === categoryKey);
        if (!tabDef) return;
        
        if (catIndex > 0) {
            doc.addPage();
        }
        
        const title = `Relatório Por Período: ${data.reportTitle}`;
        const finalFilterText = `${dateRangeStr} | Categoria: ${tabDef.label}`;
        
        const totalPages = availableCategories.length;
        let startY = drawHeaderAndFooter(doc, title, finalFilterText, params, catIndex + 1, totalPages);
        startY += 60; // Extra margin

        const headers = [tabDef.cols.map(c => c.label)];
        const body = items.map(item => tabDef.cols.map(c => {
            const val = (item as any)[c.key];
            if (c.isCurrency) return formatCurrency(val);
            if (c.isNum) return formatNumber(val);
            return val || '-';
        }));
        
        const summary = data.summary[categoryKey];
        const footer = [];
        if (summary) {
            const footerRow: any[] = [{ content: 'TOTAL', colSpan: 1, styles: { fontStyle: 'bold' } }];
            tabDef.cols.slice(1).forEach(col => {
                let footerContent = '';
                if (col.key === 'qtd' || col.key === 'quantity') footerContent = formatNumber(summary.qtd);
                else if (col.key === 'valor' || col.key === 'totalValue' || col.key === 'total') footerContent = formatCurrency(summary.total);
                
                footerRow.push({ content: footerContent, styles: { fontStyle: 'bold', halign: 'left' } });
            });
            footer.push(footerRow);
        }
        
        autoTable(doc, {
            head: headers,
            body: body,
            foot: footer,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, halign: 'left' },
            headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'left' },
            footStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', halign: 'left' },
            showFoot: 'lastPage',
            margin: { top: startY },
             didDrawPage: (hookData) => {
                if (hookData.pageNumber > 1) { // Only draw header again if it's a new page for the same table
                    drawHeaderAndFooter(doc, title, finalFilterText, params, catIndex + 1, totalPages);
                }
            }
        });
    });
};
