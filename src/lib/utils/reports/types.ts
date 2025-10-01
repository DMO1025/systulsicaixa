

import type { DailyLogEntry, ReportData, FilterType, PeriodDefinition, ChannelUnitPricesConfig, CafeManhaNoShowItem, ControleCafeItem, EstornoItem, Company, UnifiedPersonTransaction } from '@/lib/types';

export interface ReportExportData {
  summary?: any;
  details?: any;
}

export interface ExportParams {
    formatType: 'pdf' | 'excel';
    filterType: FilterType;
    entries: DailyLogEntry[];
    estornos?: EstornoItem[];
    personTransactions?: UnifiedPersonTransaction[];
    reportData: ReportData | ReportExportData | null;
    date?: Date;
    month?: Date;
    range?: { from?: Date; to?: Date };
    visiblePeriods: PeriodDefinition[];
    selectedClient?: string;
    consumptionType?: string;
    companyName?: string;
    companies: Company[];
    selectedDezena?: string;
    unitPrices: ChannelUnitPricesConfig;
    toast?: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
    includeCompanyData: boolean;
    includeItemsInPdf?: boolean;
    estornoCategory?: string;
}

// Re-export types needed by generators to avoid circular dependencies
export type { DailyLogEntry, ReportData, FilterType, PeriodDefinition, GeneralReportViewData, PeriodReportViewData, DailyCategoryDataItem, FaturadoItem, ConsumoInternoItem, PeriodData, CafeManhaNoShowItem, ControleCafeItem, ChannelUnitPricesConfig, EstornoItem, Company, UnifiedPersonTransaction };
