
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
} from 'lucide-react';

export const PATHS = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  ENTRY_BASE: '/entry',
  CONTROLS_BASE: '/controls',
  REPORTS_BASE: '/reports',
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
  NOSHOW_CLIENTS: `${PATHS.ADMIN_SETTINGS_BASE}/noshow-clients`,
  UNIT_PRICES: `${PATHS.ADMIN_SETTINGS_BASE}/unit-prices`,
  DATA_TEMPLATES: `${PATHS.ADMIN_SETTINGS_BASE}/data-templates`,
  DATA_IMPORT: `${PATHS.ADMIN_SETTINGS_BASE}/data-import`,
  MIGRATION: `${PATHS.ADMIN_SETTINGS_BASE}/migration`,
  DATABASE: `${PATHS.ADMIN_SETTINGS_BASE}/database`,
  API_ACCESS: `${PATHS.ADMIN_SETTINGS_BASE}/api-access`,
  HISTORY: `${PATHS.ADMIN_SETTINGS_BASE}/history`,
} as const;

export const REPORTS_PATHS = {
  CLIENT_EXTRACT: `${PATHS.REPORTS_BASE}/client-extract`,
  CLIENT_SUMMARY: `${PATHS.REPORTS_BASE}/client-summary`,
  CONTROLE_CAFE: `${PATHS.REPORTS_BASE}/controle-cafe`,
  CONTROLE_CAFE_NOSHOW: `${PATHS.REPORTS_BASE}/controle-cafe-no-show`,
  HISTORY: `${PATHS.REPORTS_BASE}/history`,
} as const;

export const PATH_TO_PAGE_ID: Record<string, PageId | 'help' | 'admin'> = {
  [PATHS.HOME]: 'dashboard',
  [PATHS.ENTRY_BASE]: 'entry',
  [PATHS.CONTROLS_BASE]: 'controls',
  [PATHS.REPORTS_BASE]: 'reports',
  [PATHS.HELP]: 'help',
  [PATHS.ADMIN_SETTINGS_BASE]: 'admin',
};

export const PAGE_ID_TO_PATH: Record<PageId, string> = {
    dashboard: PATHS.DASHBOARD,
    entry: PATHS.ENTRY_BASE,
    reports: REPORTS_PATHS.CLIENT_EXTRACT, // Default to client extract now
    controls: PATHS.CONTROLS_BASE,
};

export const BASE_NAV_ITEMS = [
  { id: 'dashboard', href: PATHS.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entry', href: PATHS.ENTRY_BASE, label: 'Lançamento Diário', icon: CalendarPlus },
  { id: 'controls', href: PATHS.CONTROLS_BASE, label: 'Controles Diários', icon: ClipboardCheck },
  { id: 'reports', href: PATHS.REPORTS_BASE, label: 'Relatórios', icon: FileText },
  { id: 'help', href: PATHS.HELP, label: 'Ajuda', icon: HelpCircle },
];

export const ADMIN_SETTINGS_GROUPS = [
    {
      title: 'Interface e Acesso',
      items: [
        { id: 'users', title: 'Perfil & Operadores', href: ADMIN_SETTINGS_PATHS.USERS, icon: Users },
        { id: 'visibility', title: 'Visibilidade dos Cards', href: ADMIN_SETTINGS_PATHS.VISIBILITY, icon: Eye },
        { id: 'dashboard-visibility', title: 'Visibilidade do Dashboard', href: ADMIN_SETTINGS_PATHS.DASHBOARD_VISIBILITY, icon: LayoutList },
        { id: 'summary-card', title: 'Itens do Resumo', href: ADMIN_SETTINGS_PATHS.SUMMARY_CARD, icon: ListChecks },
      ]
    },
    {
      title: 'Dados e Configuração',
      items: [
        { id: 'billed-clients', title: 'Pessoas/Setores Faturados', href: ADMIN_SETTINGS_PATHS.BILLED_CLIENTS, icon: Briefcase },
        { id: 'noshow-clients', title: 'Clientes No-Show', href: ADMIN_SETTINGS_PATHS.NOSHOW_CLIENTS, icon: UserMinus },
        { id: 'unit-prices', title: 'Preços Unitários', href: ADMIN_SETTINGS_PATHS.UNIT_PRICES, icon: DollarSign },
        { id: 'data-templates', title: 'Modelos de Dados', href: ADMIN_SETTINGS_PATHS.DATA_TEMPLATES, icon: FileSpreadsheet },
        { id: 'data-import', title: 'Importação de Dados', href: ADMIN_SETTINGS_PATHS.DATA_IMPORT, icon: Upload },
        { id: 'migration', title: 'Migração de Dados', href: ADMIN_SETTINGS_PATHS.MIGRATION, icon: ArrowRightLeft },
        { id: 'database', title: 'Banco de Dados', href: ADMIN_SETTINGS_PATHS.DATABASE, icon: Database },
        { id: 'api-access', title: 'Acesso API', href: ADMIN_SETTINGS_PATHS.API_ACCESS, icon: KeyRound },
        { id: 'history', title: 'Histórico de Modificações', href: ADMIN_SETTINGS_PATHS.HISTORY, icon: History },
      ]
    }
];

export const REPORTS_GROUPS = [
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
      { id: 'controle-cafe', title: 'Controle de Café', href: REPORTS_PATHS.CONTROLE_CAFE, icon: ClipboardCheck },
      { id: 'controle-cafe-no-show', title: 'Controle de No-Show', href: REPORTS_PATHS.CONTROLE_CAFE_NOSHOW, icon: ClipboardCheck },
      { id: 'history', title: 'Histórico de Modificações', href: REPORTS_PATHS.HISTORY, icon: History },
    ]
  },
];
