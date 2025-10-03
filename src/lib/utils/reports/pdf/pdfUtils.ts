
import type jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportParams } from '../types';
import { format } from 'date-fns';

export const drawHeaderAndFooter = (doc: jsPDF, title: string, dateStr: string, params: ExportParams, pageNumber: number, totalPages: number) => {
    const { companyName, companies, includeCompanyData } = params;
    let headerHeight = 30; // Starting Y position

    const addText = (text: string, size: number, y: number, fontStyle: 'normal' | 'bold' = 'normal', isCentered = false) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', fontStyle);
        const x = isCentered ? doc.internal.pageSize.width / 2 : 40;
        const align = isCentered ? 'center' : 'left';
        doc.text(text, x, y, { align });
        return y + size * 1.2;
    };
    
    // Header - Only draw on the first page of a "section" (or every page if simple report)
    if (pageNumber === 1 || totalPages === 1) {
        if (companyName) {
            headerHeight = addText(companyName, 14, headerHeight, 'bold');
            headerHeight += 2; 

            if (includeCompanyData) {
                const companyDetails = companies?.find(c => c.name === companyName);
                if (companyDetails) {
                    const companyInfoLines: string[] = [];
                    if (companyDetails.cnpj) companyInfoLines.push(`CNPJ: ${companyDetails.cnpj}`);
                    if (companyDetails.bankName) companyInfoLines.push(`BANCO: ${companyDetails.bankName}`);
                    if (companyDetails.agency) companyInfoLines.push(`AGÊNCIA: ${companyDetails.agency} | CONTA CORRENTE: ${companyDetails.account || ''}`);
                    
                    if (companyInfoLines.length > 0) {
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        companyInfoLines.forEach(line => {
                             doc.text(line, 40, headerHeight);
                             headerHeight += 10;
                        });
                    }
                }
            }
        }
        
        headerHeight += 10;
        headerHeight = addText(title, 10, headerHeight);
        headerHeight = addText(dateStr, 9, headerHeight);
    } else {
        // For subsequent pages of the same table, just reserve a minimal top margin
        headerHeight = 30;
    }


    // Footer - Draw on every page
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (totalPages > 1) {
        doc.text(`Página ${pageNumber} de ${totalPages}`, doc.internal.pageSize.width - 70, doc.internal.pageSize.height - 20);
    }
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, doc.internal.pageSize.height - 20);

    return headerHeight + 10; // Return the startY for the table
};
