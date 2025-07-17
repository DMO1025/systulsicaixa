
import type { PeriodId as PeriodIdFromConfig } from './config/periods';
import type { SalesChannelId as SalesChannelIdFromConfig, PaymentMethodId as PaymentMethodIdFromConfig, EventLocationKey as EventLocationKeyFromConfig, EventServiceTypeKey as EventServiceTypeKeyFromConfig } from './config/forms';
import type { SummaryCardItemId as SummaryCardItemIdFromConfig } from './config/dashboard';
import type { ChartConfig as ShadCNChartConfig } from "@/components/ui/chart";
import type { DateRange } from 'react-day-picker';

export type OperatorShift = 'first' | 'second';
export type UserRole = 'administrator' | 'operator';

// Re-export from constants to have a single source of truth for types
export type PeriodId = PeriodIdFromConfig;
export type SalesChannelId = SalesChannelIdFromConfig;
export type PaymentMethodId = PaymentMethodIdFromConfig;
export type EventLocationKey = EventLocationKeyFromConfig;
export type EventServiceTypeKey = EventServiceTypeKeyFromConfig;
export type SummaryCardItemId = SummaryCardItemIdFromConfig;

export type PageId = 'dashboard' | 'entry' | 'reports';
export type ChartConfig = ShadCNChartConfig;

export interface SalesItem {
  qtd?: number; 
  vtotal?: number;
}

export type PaymentBreakdown = Partial<Record<PaymentMethodId, number>>;

export interface SubTabData {
  channels?: Partial<Record<SalesChannelId, SalesItem>>;
}

// --- Event Structure for Daily Entry ---
export interface SubEventItem {
  id: string; 
  location?: EventLocationKey;
  serviceType?: EventServiceTypeKey;
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
  channels?: Partial<Record<SalesChannelId, SalesItem>>; 
  subTabs?: Partial<Record<string, SubTabData>>; 
  payments?: PaymentBreakdown; 
  periodObservations?: string; 
};

export type DailyEntryFormData = {
  date: Date;
  generalObservations?: string;
} & Omit<Partial<Record<PeriodId, PeriodData>>, 'eventos'> & { 
  eventos?: EventosPeriodData; 
};


export interface DailyLogEntry extends Omit<DailyEntryFormData, 'date'> {
  id: string; 
  date: Date | string; 
  madrugada?: PeriodData | string;
  cafeDaManha?: PeriodData | string;
  breakfast?: PeriodData | string;
  almocoPrimeiroTurno?: PeriodData | string;
  almocoSegundoTurno?: PeriodData | string;
  italianoAlmoco?: PeriodData | string;
  italianoJantar?: PeriodData | string;
  indianoAlmoco?: PeriodData | string;
  indianoJantar?: PeriodData | string;
  jantar?: PeriodData | string;
  baliAlmoco?: PeriodData | string;
  baliHappy?: PeriodData | string;
  eventos?: EventosPeriodData | string;
  frigobar?: PeriodData | string; // Keep this for backward compatibility if needed, but new data is nested
  calculatedTotals?: {
    byPeriod: Partial<Record<PeriodId, number>>;
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
  createdAt?: string | Date;
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
export type SummaryCardItemsConfig = Partial<Record<SummaryCardItemId, boolean>>;

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
  periodId?: PeriodId; // To identify the period for filtering reports
}

export interface MonthlyEvolutionDataItem {
  month: string; // e.g., "Jul/24"
  valorComCI: number;
  valorSemCI: number;
  reajusteCIValor: number;
  valorCI: number;
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
    periodTotals: Partial<Record<PeriodId, { qtd: number; valor: number }>>;
    totalComCI: number;
    totalSemCI: number;
    totalReajusteCI: number;
    totalQtd: number;
    totalCIQtd: number;
}
export interface GeneralReportSummary {
    periodTotals: Partial<Record<PeriodId, { qtd: number; valor: number }>>;
    grandTotalComCI: number;
    grandTotalSemCI: number;
    grandTotalReajusteCI: number;
    grandTotalQtd: number;
    grandTotalCIQtd: number;
}
export interface GeneralReportViewData {
    dailyBreakdowns: GeneralReportDailyItem[];
    summary: GeneralReportSummary;
    reportTitle: string;
}

export type ReportData = { type: 'period'; data: PeriodReportViewData } | { type: 'general'; data: GeneralReportViewData };

export type { DateRange };

// AI Related Types
export interface DashboardAnalysisInput {
  month: string;
  totalRevenue: number;
  totalTransactions: number;
  totalCIRecords: {
    almoco: { qtd: number; valor: number };
    jantar: { qtd: number; valor: number };
    total: { qtd: number; valor: number };
  };
  accumulatedItems: { name: string; quantity: string; totalValue: number }[];
  generalTotals: {
    withCI: { quantity: number; value: number };
    withoutCI: { quantity: number; value: number };
    ciAdjustment: number;
  };
}
