

import type { PeriodId as PeriodIdFromConfig, PeriodType as PeriodTypeFromConfig } from './config/periods';
import type { SalesChannelId as SalesChannelIdFromConfig, PaymentMethodId as PaymentMethodIdFromConfig, EventLocationKey as EventLocationKeyFromConfig, EventServiceTypeKey as EventServiceTypeKeyFromConfig, GroupedChannelConfig as GroupedChannelConfigFromConfig } from './config/forms';
import type { SummaryCardItemId as SummaryCardItemIdFromConfig } from './config/dashboard';
import type { ChartConfig as ShadCNChartConfig } from "@/components/ui/chart";
import type { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

export type OperatorShift = 'first' | 'second';
export type UserRole = 'administrator' | 'operator';

// Re-export from constants to have a single source of truth for types
export type PeriodId = PeriodIdFromConfig;
export type PeriodType = PeriodTypeFromConfig;
export type SalesChannelId = SalesChannelIdFromConfig;
export type PaymentMethodId = PaymentMethodIdFromConfig;
export type EventLocationKey = EventLocationKeyFromConfig;
export type EventServiceTypeKey = EventServiceTypeKeyFromConfig;
export type SummaryCardItemId = SummaryCardItemIdFromConfig;
export type GroupedChannelConfig = GroupedChannelConfigFromConfig;


export type PageId = 'dashboard' | 'entry' | 'reports' | 'controls';
export type ChartConfig = ShadCNChartConfig;

export interface SalesItem {
  qtd?: number; 
  vtotal?: number;
}

export type PaymentBreakdown = Partial<Record<PaymentMethodId, number>>;

// --- Billed Client Structure ---
export interface BilledClient {
  id: string;
  name: string;
}

// --- Faturado Structure ---
export interface FaturadoItem {
  id: string;
  clientName: string;
  type: 'hotel' | 'funcionario' | 'outros';
  quantity?: number;
  value?: number;
  observation?: string;
}
export interface ConsumoInternoItem {
    id: string;
    clientName: string;
    quantity?: number;
    value?: number;
    observation?: string;
}

export interface CafeManhaNoShowItem {
  id: string;
  data?: Date; // Added date field
  horario?: string;
  hospede?: string;
  uh?: string;
  reserva?: string;
  valor?: number;
  observation?: string;
}

export interface ControleCafeItem {
  id: string;
  adultoQtd?: number;
  crianca01Qtd?: number;
  crianca02Qtd?: number;
  contagemManual?: number;
  semCheckIn?: number;
}

export interface SubTabData {
  channels?: Partial<Record<SalesChannelId, SalesItem>>;
  faturadoItems?: FaturadoItem[];
  consumoInternoItems?: ConsumoInternoItem[];
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
export type CafeManhaNoShowPeriodData = {
  items: CafeManhaNoShowItem[];
  periodObservations?: string;
  newItem?: CafeManhaNoShowItem;
};
export type ControleCafePeriodData = {
  adultoQtd?: number;
  crianca01Qtd?: number;
  crianca02Qtd?: number;
  contagemManual?: number;
  semCheckIn?: number;
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
} & Omit<Partial<Record<PeriodId, PeriodData>>, 'eventos' | 'cafeManhaNoShow' | 'controleCafeDaManha'> & { 
  eventos?: EventosPeriodData; 
  cafeManhaNoShow?: CafeManhaNoShowPeriodData;
  controleCafeDaManha?: ControleCafePeriodData;
};


export interface DailyLogEntry extends Omit<DailyEntryFormData, 'date'> {
  id: string; 
  date: Date | string; 
  madrugada?: PeriodData | string;
  cafeDaManha?: PeriodData | string;
  cafeManhaNoShow?: CafeManhaNoShowPeriodData | string;
  controleCafeDaManha?: ControleCafePeriodData | string;
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

export interface ApiAccessConfig {
    apiKey: string;
}

export interface AuditLog {
    id: number;
    timestamp: string | Date;
    username: string;
    action: string;
    details: string;
}

// Dashboard Page Specific Types
export interface ProcessedDailyTotal {
  id: string;
  date: string;
  totalQtd: number;
  totalValor: number;
  createdAt?: string | Date;
  lastModifiedAt?: string | Date;
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
export type FilterType = 'date' | 'period' | 'month' | 'range' | 'client-extract' | 'client-summary' | 'controle-cafe-no-show' | 'controle-cafe' | 'history';

export interface DailyCategoryDataItem { date: string; [key: string]: any; }
export interface PeriodReportViewData {
  dailyBreakdowns: Record<string, DailyCategoryDataItem[]>;
  summary: Record<string, { qtd: number; total: number; reajuste?: number, ticketMedio?: number }>;
  subtotalGeralComCI: { qtd: number; total: number };
  subtotalGeralSemCI: { qtd: number; total: number };
  reportTitle: string;
}

export interface GeneralReportDailyItem {
    date: string;
    createdAt?: string | Date;
    lastModifiedAt?: string | Date;
    periodTotals: Partial<Record<PeriodId | 'roomService', { qtd: number; valor: number }>>;
    totalComCI: number;
    totalSemCI: number;
    totalReajusteCI: number;
    totalQtd: number;
    totalCIQtd: number;
    totalCIValor: number;
}
export interface GeneralReportSummary {
    periodTotals: Partial<Record<PeriodId | 'roomService', { qtd: number; valor: number }>>;
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

// Re-export DateRange but ensure it's the one from react-day-picker
export type DateRange = ReactDayPickerDateRange;

export interface UnifiedPersonTransaction {
  id: string; // Unique ID for the transaction item (faturadoItem.id or consumoInternoItem.id)
  personName: string;
  date: string;
  origin: string;
  observation: string;
  quantity: number;
  value: number;
}


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
