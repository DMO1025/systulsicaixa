
import type { OperatorShift, UserRole } from './constants';
import type { ChartConfig as ShadCNChartConfig } from "@/components/ui/chart";
import type { DateRange } from 'react-day-picker';

// Re-export from constants to have a single source of truth for types
export type { PeriodId, SalesChannelId, PaymentMethodId, EventLocationKey, EventServiceTypeKey, SummaryCardItemId, OperatorShift, UserRole } from './constants';
export type PageId = 'dashboard' | 'entry' | 'reports';

export interface SalesItem {
  qtd?: number; 
  vtotal?: number;
}

export type PaymentBreakdown = Partial<Record<import('./constants').PaymentMethodId, number>>;

export interface SubTabData {
  channels?: Partial<Record<import('./constants').SalesChannelId, SalesItem>>;
}

// --- Event Structure for Daily Entry ---
export interface SubEventItem {
  id: string; 
  location?: import('./constants').EventLocationKey;
  serviceType?: import('./constants').EventServiceTypeKey;
  customServiceDescription?: string; // For "Outro" service type
  quantity?: number;
  totalValue?: number;
}

export interface EventItemData {
  id: string; 
  eventName?: string;
  subEvents: SubEventItem[];
}

export type EventosPeriodData = {
  items: EventItemData[];
  periodObservations?: string;
};
// --- End Event Structure ---


export type PeriodData = {
  channels?: Partial<Record<import('./constants').SalesChannelId, SalesItem>>; 
  subTabs?: Partial<Record<string, SubTabData>>; 
  payments?: PaymentBreakdown; 
  periodObservations?: string; 
};

export type DailyEntryFormData = {
  date: Date;
  generalObservations?: string;
} & Omit<Partial<Record<import('./constants').PeriodId, PeriodData>>, 'eventos'> & { 
  eventos?: EventosPeriodData; 
};


export interface DailyLogEntry extends Omit<DailyEntryFormData, 'date'> {
  id: string; 
  date: Date | string; 
  madrugada?: PeriodData | string;
  cafeDaManha?: PeriodData | string;
  almocoPrimeiroTurno?: PeriodData | string;
  almocoSegundoTurno?: PeriodData | string;
  jantar?: PeriodData | string;
  baliAlmoco?: PeriodData | string;
  baliHappy?: PeriodData | string;
  eventos?: EventosPeriodData | string;
  frigobar?: PeriodData | string;
  italianoAlmoco?: PeriodData | string;
  italianoJantar?: PeriodData | string;
  indianoAlmoco?: PeriodData | string;
  indianoJantar?: PeriodData | string;
  breakfast?: PeriodData | string;
  calculatedTotals?: {
    byPeriod: Partial<Record<import('./constants').PeriodId, number>>;
    byPaymentMethod: PaymentBreakdown;
    grandTotal: number;
  };
  createdBy?: string;
  createdAt?: string | Date; 
  lastModifiedBy?: string;
  lastModifiedAt?: string | Date; 
}


export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  shifts: OperatorShift[];
  allowedPages?: PageId[];
}

export interface ChannelUnitPricesConfig {
  [channelId: string]: number | undefined;
}

export interface CardVisibilityConfig {
  [cardId: string]: boolean;
}

export interface MysqlConnectionConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export type DashboardItemVisibilityConfig = Record<string, boolean>;
export type SummaryCardItemsConfig = Partial<Record<import('./constants').SummaryCardItemId, boolean>>;

export interface Settings {
  cardVisibilityConfig?: CardVisibilityConfig;
  channelUnitPricesConfig?: ChannelUnitPricesConfig;
  mysqlConnectionConfig?: MysqlConnectionConfig;
  dashboardItemVisibilityConfig?: DashboardItemVisibilityConfig;
  summaryCardItemsConfig?: SummaryCardItemsConfig;
}

// Dashboard Page Specific Types
export interface ProcessedDailyTotal {
  id: string;
  date: string;
  totalQtd: number;
  totalValor: number;
}

export interface AcumulativoMensalItem {
  item: string;
  qtdDisplay: string;
  valorTotal: number;
  reportLink?: string; // For navigation to reports page
  periodId?: import('./constants').PeriodId; // To identify the period for filtering reports
}

export interface MonthlyEvolutionDataItem {
  month: string; // e.g., "Jul/24"
  valorComCI: number;
  valorSemCI: number;
  reajusteCIValor: number;
  qtdComCI: number;
  qtdSemCI: number;
}

export type EvolutionChartConfig = ShadCNChartConfig;

// Reports Page Specific Types
export type FilterType = 'date' | 'period' | 'month' | 'range';

export interface DailyCategoryDataItem { date: string; [key: string]: any; }
export interface PeriodReportViewData {
  dailyBreakdowns: Record<string, DailyCategoryDataItem[]>;
  summary: Record<string, { qtd: number; total: number; reajuste?: number }>;
  subtotalGeralComCI: { qtd: number; total: number };
  subtotalGeralSemCI: { qtd: number; total: number };
  reportTitle: string;
}

export interface GeneralReportDailyItem {
    date: string;
    periodTotals: Partial<Record<import('./constants').PeriodId, { qtd: number; valor: number }>>;
    totalComCI: number;
    totalSemCI: number;
    totalReajusteCI: number;
    totalQtd: number;
}
export interface GeneralReportSummary {
    periodTotals: Partial<Record<import('./constants').PeriodId, { qtd: number; valor: number }>>;
    grandTotalComCI: number;
    grandTotalSemCI: number;
    grandTotalReajusteCI: number;
    grandTotalQtd: number;
}
export interface GeneralReportViewData {
    dailyBreakdowns: GeneralReportDailyItem[];
    summary: GeneralReportSummary;
    reportTitle: string;
}

export type ReportData = { type: 'period'; data: PeriodReportViewData } | { type: 'general'; data: GeneralReportViewData };

export type { DateRange };
