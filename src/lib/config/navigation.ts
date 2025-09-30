

import type { PageId } from '@/lib/types';
import {
  LayoutDashboard,
  FileText,
  CalendarPlus,
  HelpCircle,
  ClipboardCheck,
  Users,
  Eye,
  LayoutList,
  ListChecks,
  Briefcase,
  UserMinus,
  DollarSign,
  FileSpreadsheet,
  Upload,
  ArrowRightLeft,
  Database,
  KeyRound,
  History,
  BarChartBig,
  CalendarDays,
  CalendarRange,
  ListFilter,
  UserSquare,
  Undo2,
  Refrigerator,
  Utensils,
  BedDouble,
  UserCheck,
  UserX,
  Building,
  Type,
} from 'lucide-react';

export const PATHS = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  ENTRIES_BASE: '/entries',
  CONTROLS_BASE: '/controls',
  REPORTS_BASE: '/reports',
  ESTORNOS_BASE: '/estornos',
  HELP: '/help',
  LOGIN: '/login',
  ADMIN_SETTINGS_BASE: '/admin/settings',
} as const;

export const ADMIN_SETTINGS_PATHS = {
  USERS: `${PATHS.ADMIN_SETTINGS_BASE}/users`,
  VISIBILITY: `${PATHS.ADMIN_SETTINGS_BASE}/visibility`,
  DASHBOARD_VISIBILITY: `${PATHS.ADMIN_SETTINGS_BASE}/dashboard-visibility`,
  SUMMARY_CARD: `${PATHS.ADMIN_SETTINGS_BASE}/summary-card`,
  BILLED_CLIENTS: `${PATHS.ADMIN_SETTINGS_BASE}/billed-clients`,
  COMPANIES: `${PATHS.ADMIN_SETTINGS_BASE}/companies`,
  FRIGOBAR_ITEMS: `${PATHS.ADMIN_SETTINGS_BASE}/frigobar-items`,
  NOSHOW_CLIENTS: `${PATHS.ADMIN_SETTINGS_BASE}/noshow-clients`,
  UNIT_PRICES: `${PATHS.ADMIN_SETTINGS_BASE}/unit-prices`,
  DATA_TEMPLATES: `${PATHS.ADMIN_SETTINGS_BASE}/data-templates`,
  DATA_IMPORT: `${PATHS.ADMIN_SETTINGS_BASE}/data-import`,
  MIGRATION: `${PATHS.ADMIN_SETTINGS_BASE}/migration`,
  DATABASE: `${PATHS.ADMIN_SETTINGS_BASE}/database`,
  API_ACCESS: `${PATHS.ADMIN_SETTINGS_BASE}/api-access`,
  HISTORY: `${PATHS.REPORTS_BASE}/history`,
  APP_NAME: `${PATHS.ADMIN_SETTINGS_BASE}/app-name`,
} as const;

export const REPORTS_PATHS = {
  // Main report types
  MONTH: `${PATHS.REPORTS_BASE}/month`,
  RANGE: `${PATHS.REPORTS_BASE}/range`,
  DATE: `${PATHS.REPORTS_BASE}/date`,
  PERIOD: `${PATHS.REPORTS_BASE}/period`,
  // Detailed/specialized reports
  CLIENT_EXTRACT: `${PATHS.REPORTS_BASE}/client-extract`,
  CLIENT_SUMMARY: `${PATHS.REPORTS_BASE}/client-summary`,
  CONTROLE_CAFE: `${PATHS.REPORTS_BASE}/controle-cafe`,
  CONTROLE_CAFE_NOSHOW: `${PATHS.REPORTS_BASE}/controle-cafe-no-show`,
  HISTORY: `${PATHS.REPORTS_BASE}/history`,
  ESTORNOS: `${PATHS.REPORTS_BASE}/estornos`,
  CONTROLE_FRIGOBAR: `${PATHS.REPORTS_BASE}/controle-frigobar`,
};

export const PATH_TO_PAGE_ID: Record<string, PageId | 'help' | 'admin'> = {
  [PATHS.HOME]: 'dashboard',
  [PATHS.DASHBOARD]: 'dashboard',
  [PATHS.ENTRIES_BASE]: 'entry',
  [PATHS.CONTROLS_BASE]: 'controls',
  [PATHS.ESTORNOS_BASE]: 'estornos',
  [PATHS.REPORTS_BASE]: 'reports',
  [PATHS.HELP]: 'help',
  [PATHS.ADMIN_SETTINGS_BASE]: 'admin',
};

export const PAGE_ID_TO_PATH: Record<PageId, string> = {
    dashboard: PATHS.DASHBOARD,
    entry: PATHS.ENTRIES_BASE,
    reports: PATHS.REPORTS_BASE,
    controls: PATHS.CONTROLS_BASE,
    estornos: PATHS.ESTORNOS_BASE,
};

export const BASE_NAV_ITEMS = [
  { id: 'dashboard', href: PATHS.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entry', href: PATHS.ENTRIES_BASE, label: 'Lançamento Diário', icon: CalendarPlus },
  { id: 'controls', href: PATHS.CONTROLS_BASE, label: 'Controles Diários', icon: ClipboardCheck },
  { id: 'estornos', href: PATHS.ESTORNOS_BASE, label: 'Estornos', icon: Undo2 },
  { id: 'reports', href: PATHS.REPORTS_BASE, label: 'Relatórios', icon: FileText },
  { id: 'help', href: PATHS.HELP, label: 'Ajuda', icon: HelpCircle },
];

export const ADMIN_SETTINGS_GROUPS = [
    {
      title: 'Interface e Acesso',
      items: [
        { id: 'appName', title: 'Nome do Aplicativo', href: ADMIN_SETTINGS_PATHS.APP_NAME, icon: Type },
        { id: 'users', title: 'Perfil & Operadores', href: ADMIN_SETTINGS_PATHS.USERS, icon: Users },
        { id: 'visibility', title: 'Visibilidade dos Cards', href: ADMIN_SETTINGS_PATHS.VISIBILITY, icon: Eye },
        { id: 'dashboard-visibility', title: 'Visibilidade do Dashboard', href: ADMIN_SETTINGS_PATHS.DASHBOARD_VISIBILITY, icon: LayoutList },
        { id: 'summary-card', title: 'Itens do Resumo', href: ADMIN_SETTINGS_PATHS.SUMMARY_CARD, icon: ListChecks },
      ]
    },
    {
      title: 'Dados e Configuração',
      items: [
        { id: 'companies', title: 'Empresas', href: ADMIN_SETTINGS_PATHS.COMPANIES, icon: Building },
        { id: 'billed-clients', title: 'Pessoas/Setores Faturados', href: ADMIN_SETTINGS_PATHS.BILLED_CLIENTS, icon: Briefcase },
        { id: 'noshow-clients', title: 'Clientes No-Show', href: ADMIN_SETTINGS_PATHS.NOSHOW_CLIENTS, icon: UserMinus },
        { id: 'frigobar-items', title: 'Itens de Frigobar', href: ADMIN_SETTINGS_PATHS.FRIGOBAR_ITEMS, icon: Refrigerator },
        { id: 'unit-prices', title: 'Preços Unitários', href: ADMIN_SETTINGS_PATHS.UNIT_PRICES, icon: DollarSign },
        { id: 'data-templates', title: 'Modelos de Dados', href: ADMIN_SETTINGS_PATHS.DATA_TEMPLATES, icon: FileSpreadsheet },
        { id: 'data-import', title: 'Importação de Dados', href: ADMIN_SETTINGS_PATHS.DATA_IMPORT, icon: Upload },
        { id: 'migration', title: 'Migração de Dados', href: ADMIN_SETTINGS_PATHS.MIGRATION, icon: ArrowRightLeft },
        { id: 'database', title: 'Banco de Dados', href: ADMIN_SETTINGS_PATHS.DATABASE, icon: Database },
        { id: 'api-access', title: 'Acesso API', href: ADMIN_SETTINGS_PATHS.API_ACCESS, icon: KeyRound },
      ]
    }
];

export const REPORTS_GROUPS = [
  {
    title: 'Relatórios Financeiros',
    items: [
      { id: 'month', title: 'Geral (Mês Inteiro)', href: REPORTS_PATHS.MONTH, icon: BarChartBig },
      { id: 'range', title: 'Por Intervalo de Datas', href: REPORTS_PATHS.RANGE, icon: CalendarRange },
      { id: 'date', title: 'Por Data Específica', href: REPORTS_PATHS.DATE, icon: CalendarDays },
      { id: 'period', title: 'Por Período', href: REPORTS_PATHS.PERIOD, icon: ListFilter },
    ]
  },
  {
    title: 'Relatórios de Pessoas',
    items: [
      { id: 'client-extract', title: 'Extrato Detalhado', href: REPORTS_PATHS.CLIENT_EXTRACT, icon: UserSquare },
      { id: 'client-summary', title: 'Resumo Mensal', href: REPORTS_PATHS.CLIENT_SUMMARY, icon: Users },
    ]
  },
  {
    title: 'Controles e Auditoria',
    items: [
      { 
        id: 'controle-cafe', 
        title: 'Controle de Café', 
        href: REPORTS_PATHS.CONTROLE_CAFE, 
        icon: ClipboardCheck,
        subItems: [
          { id: 'controle-cafe-presenca', title: 'Presença', href: REPORTS_PATHS.CONTROLE_CAFE, icon: UserCheck },
          { id: 'controle-cafe-no-show', title: 'No-Show', href: REPORTS_PATHS.CONTROLE_CAFE_NOSHOW, icon: UserX },
        ]
      },
      { id: 'controle-frigobar', title: 'Controle de Frigobar', href: REPORTS_PATHS.CONTROLE_FRIGOBAR, icon: Refrigerator },
      { 
        id: 'estornos', 
        title: 'Relatório de Estornos', 
        href: REPORTS_PATHS.ESTORNOS, 
        icon: Undo2,
        subItems: [
          { id: 'estornos-restaurante', title: 'Restaurante', href: `${REPORTS_PATHS.ESTORNOS}?category=restaurante`, icon: Utensils },
          { id: 'estornos-frigobar', title: 'Frigobar', href: `${REPORTS_PATHS.ESTORNOS}?category=frigobar`, icon: Refrigerator },
          { id: 'estornos-room-service', title: 'Room Service', href: `${REPORTS_PATHS.ESTORNOS}?category=room-service`, icon: BedDouble },
        ]
      },
    ]
  },
   {
    title: 'Sistema',
    items: [
        { id: 'history', title: 'Histórico de Modificações', href: REPORTS_PATHS.HISTORY, icon: History },
    ]
  }
];
