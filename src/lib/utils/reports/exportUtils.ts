
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { generatePdf } from './pdf/pdfGenerator';
import { generateExcelWorkbook } from './excel/excelGenerator';
import type { DailyLogEntry, CafeManhaNoShowItem, ControleCafeItem, ExportParams, EstornoItem } from './types';
import { parseISO } from 'date-fns';


export const getConsumptionTypeLabel = (consumptionType?: string): string | null => {
    if (!consumptionType) return null;
    switch (consumptionType) {
        case 'all': return 'Todos';
        case 'ci': return 'Consumo Interno';
        case 'faturado-all': return 'Faturado (Todos)';
        case 'faturado-hotel': return 'Faturado (Hotel)';
        case 'faturado-funcionario': return 'Faturado (Funcionário)';
        default: return null;
    }
};

export const getFilename = (parts: (string | undefined | null)[], ext: string): string => {
    return parts
        .filter(Boolean)
        .join('_')
        .replace(/[\s/\\?%*:|"<>]/g, '_') + `.${ext}`;
};

export const getControleCafeItems = (entries: DailyLogEntry[], type: 'no-show' | 'controle'): (CafeManhaNoShowItem & { entryDate: string })[] | (Partial<ControleCafeItem> & { entryDate: string })[] => {
    if (type === 'no-show') {
      const items: (CafeManhaNoShowItem & { entryDate: string })[] = [];
      entries.forEach(entry => {
          const noShowData = entry.cafeManhaNoShow as any;
          if (noShowData?.items && Array.isArray(noShowData.items)) {
              noShowData.items.forEach((item: CafeManhaNoShowItem) => {
                  items.push({
                      ...item,
                      entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                  });
              });
          }
      });
      return items.sort((a, b) => {
        const dateA = a.data ? parseISO(String(a.data)) : new Date(0);
        const dateB = b.data ? parseISO(String(b.data)) : new Date(0);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        return (a.horario || "").localeCompare(b.horario || "");
      });
    } else {
        const items: (Partial<ControleCafeItem> & { entryDate: string })[] = [];
        entries.forEach(entry => {
            const controleData = entry.controleCafeDaManha as any;
            if (controleData) {
                items.push({
                    ...controleData,
                    entryDate: format(parseISO(String(entry.id)), 'dd/MM/yyyy')
                });
            }
        });
        return items.sort((a,b) => parseISO(a.entryDate.split('/').reverse().join('-')).getTime() - parseISO(b.entryDate.split('/').reverse().join('-')).getTime());
    }
};

const exportToExcel = async (params: ExportParams) => {
    const { filterType, date, month, range, reportData, toast } = params;
    
    const wb = await generateExcelWorkbook(params);
    if (!wb) return; 

    let dateRangeFilenameStr = '';
    
    if (filterType.startsWith('controle') || filterType === 'estornos' || filterType.startsWith('client-') || filterType === 'controle-frigobar') {
        dateRangeFilenameStr = range?.from 
            ? `${format(range.from, 'yyyy-MM-dd')}_a_${range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd')}`
            : month ? format(month, 'yyyy-MM') : 'periodo_indefinido';
    } else if (filterType === 'date' && date) {
        dateRangeFilenameStr = format(date, 'yyyy-MM-dd');
    } else if (filterType === 'range' && range?.from) {
        dateRangeFilenameStr = `${format(range.from, 'yyyy-MM-dd')}_a_${range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd')}`;
    } else if (month) {
        dateRangeFilenameStr = format(month, 'yyyy-MM');
    }
    

    const consumptionLabel = getConsumptionTypeLabel(params.consumptionType) || '';
    const personName = params.selectedClient && params.selectedClient !== 'all' ? params.selectedClient : 'Todas_Pessoas';
    const categoryTitles: Record<string, string> = {
        'restaurante': 'Restaurante',
        'frigobar': 'Frigobar',
        'room-service': 'Room_Service',
        'all': '',
    };
    const estornoCategoryLabel = params.estornoCategory && params.estornoCategory !== 'all' ? categoryTitles[params.estornoCategory] : '';

    const filenameMap: Record<string, string[]> = {
        'range': ['Relatorio_Geral', dateRangeFilenameStr],
        'month': ['Relatorio_Geral', dateRangeFilenameStr],
        'period': ['Relatorio_Por_Periodo', reportData?.data.reportTitle || 'Periodo', dateRangeFilenameStr],
        'client-extract': ['Extrato_Pessoa', personName, consumptionLabel, dateRangeFilenameStr],
        'client-summary': ['Resumo_Pessoas', consumptionLabel, dateRangeFilenameStr],
        'controle-cafe': ['Controle_Cafe', dateRangeFilenameStr, params.selectedDezena && params.selectedDezena !== 'all' ? `${params.selectedDezena}a_Dezena` : ''],
        'controle-cafe-no-show': ['Controle_No_Show', dateRangeFilenameStr, params.selectedDezena && params.selectedDezena !== 'all' ? `${params.selectedDezena}a_Dezena` : ''],
        'estornos': ['Relatorio_Estornos', estornoCategoryLabel, dateRangeFilenameStr],
        'controle-frigobar': ['Controle_Frigobar', dateRangeFilenameStr],
        'date': ['Relatorio_Dia', dateRangeFilenameStr],
    };

    const filename = getFilename(filenameMap[filterType] || ['Relatorio'], 'xlsx');
    XLSX.writeFile(wb, filename);
};


export const exportReport = async (params: ExportParams) => {
    const { toast, filterType, entries, estornos, personTransactions, reportData } = params;

    const noData = entries.length === 0 && (!estornos || estornos.length === 0) && (!personTransactions || personTransactions.length === 0);

    // Special check for 'controle-frigobar' as it doesn't use the standard data props
    const noFrigobarData = filterType === 'controle-frigobar' && (!reportData || !reportData.details || !(reportData.details as any).allLogs || (reportData.details as any).allLogs.length === 0);

    if (noData && !noFrigobarData) {
        if(toast) toast({ title: "Nenhum dado para exportar", description: "Filtre por um período com dados antes de exportar.", variant: "destructive" });
        return;
    }

    if (params.formatType === 'pdf') {
        await generatePdf(params);
    } else if (params.formatType === 'excel') {
        await exportToExcel(params);
    }
};
