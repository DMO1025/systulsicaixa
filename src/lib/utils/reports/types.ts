import type { DailyLogEntry, ReportData, FilterType, PeriodDefinition, ChannelUnitPricesConfig, CafeManhaNoShowItem, ControleCafeItem } from '@/lib/types';

export interface ExportParams {
    formatType: 'pdf' | 'excel';
    filterType: FilterType;
    entries: DailyLogEntry[];
    reportData: ReportData | null;
    date?: Date;
    month?: Date;
    range?: { from?: Date; to?: Date };
    visiblePeriods: PeriodDefinition[];
    selectedClient?: string;
    consumptionType?: string;
    companyName?: string;
    selectedDezena?: string;
    unitPrices: ChannelUnitPricesConfig;
    toast?: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

// Re-export types needed by generators to avoid circular dependencies
export type { DailyLogEntry, ReportData, FilterType, PeriodDefinition, GeneralReportViewData, PeriodReportViewData, DailyCategoryDataItem, FaturadoItem, ConsumoInternoItem, PeriodData, CafeManhaNoShowItem, ControleCafeItem, ChannelUnitPricesConfig };
