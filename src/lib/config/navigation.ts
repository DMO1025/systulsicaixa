

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
  Settings,
  ClipboardList as ClipboardListIcon,
  Newspaper,
  Archive,
} from 'lucide-react';

export const PATHS = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  ENTRY_BASE: '/entries',
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
  SUMMARY_CARD_VERSION: `${PATHS.ADMIN_SETTINGS_BASE}/summary-card-version`,
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
  RANGE: `${PATHS.REPORTS_BASE}/range`,
  PERIOD: `${PATHS.REPORTS_BASE}/period`,
  CLIENT_EXTRACT: `${PATHS.REPORTS_BASE}/client-extract`,
  CLIENT_SUMMARY: `${PATHS.REPORTS_BASE}/client-summary`,
  CONTROLE_CAFE: `${PATHS.REPORTS_BASE}/controle-cafe`,
  CONTROLE_CAFE_NOSHOW: `${PATHS.REPORTS_BASE}/controle-cafe-no-show`,
  HISTORY: `${PATHS.REPORTS_BASE}/history`,
  ESTORNOS: `${PATHS.REPORTS_BASE}/estornos`,
  CONTROLE_FRIGOBAR: `${PATHS.REPORTS_BASE}/controle-frigobar`,
  CONTROLE_FRIGOBAR_DESCRITIVO: `${PATHS.REPORTS_BASE}/controle-frigobar?view=descritivo`,
  CONTROLE_FRIGOBAR_CONSOLIDADO: `${PATHS.REPORTS_BASE}/controle-frigobar?view=consolidado`,
};

export const PATH_TO_PAGE_ID: Record<string, PageId | 'help' | 'admin'> = {
  [PATHS.HOME]: 'dashboard',
  [PATHS.DASHBOARD]: 'dashboard',
  [PATHS.ENTRY_BASE]: 'entry',
  [PATHS.CONTROLS_BASE]: 'controls',
  [PATHS.ESTORNOS_BASE]: 'estornos',
  [PATHS.REPORTS_BASE]: 'reports',
  [PATHS.HELP]: 'help',
  [PATHS.ADMIN_SETTINGS_BASE]: 'admin',
};

export const PAGE_ID_TO_PATH: Record<PageId, string> = {
    dashboard: PATHS.DASHBOARD,
    entry: PATHS.ENTRY_BASE,
    reports: PATHS.REPORTS_BASE,
    controls: PATHS.CONTROLS_BASE,
    estornos: PATHS.ESTORNOS_BASE,
};

export const BASE_NAV_ITEMS = [
  { id: 'dashboard', href: PATHS.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entry', href: PATHS.ENTRY_BASE, label: 'Lançamento Diário', icon: CalendarPlus },
  { id: 'controls', href: PATHS.CONTROLS_BASE, label: 'Controles Diários', icon: ClipboardCheck },
  { id: 'estornos', href: PATHS.ESTORNOS_BASE, label: 'Estornos', icon: Undo2 },
  { id: 'reports', href: PATHS.REPORTS_BASE, label: 'Relatórios', icon: FileText },
  { id: 'help', href: PATHS.HELP, label: 'Ajuda', icon: HelpCircle },
];

export const ADMIN_SETTINGS_GROUPS = [
    {
      title: 'Aparência e Acesso',
      items: [
        { id: 'users', title: 'Perfil & Operadores', href: ADMIN_SETTINGS_PATHS.USERS, icon: Users },
        { id: 'app-name', title: 'Nome do Aplicativo', href: ADMIN_SETTINGS_PATHS.APP_NAME, icon: Type },
        { id: 'visibility', title: 'Visibilidade de Cards', href: ADMIN_SETTINGS_PATHS.VISIBILITY, icon: Eye },
        { id: 'dashboard-visibility', title: 'Visibilidade do Dashboard', href: ADMIN_SETTINGS_PATHS.DASHBOARD_VISIBILITY, icon: LayoutList },
        { id: 'summary-card', title: 'Itens do Resumo Lateral', href: ADMIN_SETTINGS_PATHS.SUMMARY_CARD, icon: ListChecks },
        { id: 'summary-card-version', title: 'Versão do Resumo Lateral', href: ADMIN_SETTINGS_PATHS.SUMMARY_CARD_VERSION, icon: ClipboardListIcon },
      ]
    },
    {
      title: 'Cadastros Gerais',
      items: [
        { id: 'companies', title: 'Empresas', href: ADMIN_SETTINGS_PATHS.COMPANIES, icon: Building },
        { id: 'billed-clients', title: 'Pessoas/Setores Faturados', href: ADMIN_SETTINGS_PATHS.BILLED_CLIENTS, icon: Briefcase },
        { id: 'noshow-clients', title: 'Clientes (No-Show)', href: ADMIN_SETTINGS_PATHS.NOSHOW_CLIENTS, icon: UserMinus },
        { id: 'frigobar-items', title: 'Itens de Frigobar', href: ADMIN_SETTINGS_PATHS.FRIGOBAR_ITEMS, icon: Refrigerator },
        { id: 'unit-prices', title: 'Preços Unitários', href: ADMIN_SETTINGS_PATHS.UNIT_PRICES, icon: DollarSign },
      ]
    },
    {
      title: 'Importação e Exportação',
      items: [
        { id: 'data-templates', title: 'Modelos de Dados', href: ADMIN_SETTINGS_PATHS.DATA_TEMPLATES, icon: FileSpreadsheet },
        { id: 'data-import', title: 'Importação de Dados', href: ADMIN_SETTINGS_PATHS.DATA_IMPORT, icon: Upload },
      ]
    },
    {
      title: 'Sistema e Conexões',
      items: [
        { id: 'database', title: 'Banco de Dados', href: ADMIN_SETTINGS_PATHS.DATABASE, icon: Database },
        { id: 'api-access', title: 'Acesso API', href: ADMIN_SETTINGS_PATHS.API_ACCESS, icon: KeyRound },
        { id: 'migration', title: 'Migração e Ferramentas', href: ADMIN_SETTINGS_PATHS.MIGRATION, icon: ArrowRightLeft },
      ]
    }
];

export const REPORTS_GROUPS = [
  {
    title: 'Relatórios Financeiros',
    items: [
      { id: 'range', title: 'Resumo Mensal (Financeiro)', href: REPORTS_PATHS.RANGE, icon: BarChartBig },
      { id: 'period', title: 'Relatório Detalhado (Financeiro)', href: REPORTS_PATHS.PERIOD, icon: ListFilter },
    ]
  },
  {
    title: 'Relatórios de Pessoas',
    items: [
      { id: 'client-summary', title: 'Resumo Mensal (Pessoas)', href: REPORTS_PATHS.CLIENT_SUMMARY, icon: Users },
      { id: 'client-extract', title: 'Relatório Detalhado (Pessoas)', href: REPORTS_PATHS.CLIENT_EXTRACT, icon: UserSquare },
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
      { 
        id: 'controle-frigobar', 
        title: 'Controle de Frigobar', 
        href: REPORTS_PATHS.CONTROLE_FRIGOBAR, 
        icon: Refrigerator,
        subItems: [
          { id: 'controle-frigobar-descritivo', title: 'Descritivo', href: REPORTS_PATHS.CONTROLE_FRIGOBAR_DESCRITIVO, icon: Newspaper },
          { id: 'controle-frigobar-consolidado', title: 'Consolidado', href: REPORTS_PATHS.CONTROLE_FRIGOBAR_CONSOLIDADO, icon: Archive },
        ]
      },
      { 
        id: 'estornos', 
        title: 'Relatório de Estornos', 
        href: `${REPORTS_PATHS.ESTORNOS}?view=geral`,
        icon: Undo2,
        subItems: [
          { id: 'estornos-geral', title: 'Geral (Detalhado)', href: `${REPORTS_PATHS.ESTORNOS}?view=geral`, icon: ListFilter },
          { id: 'estornos-consolidado', title: 'Consolidado por Data', href: `${REPORTS_PATHS.ESTORNOS}?view=consolidado`, icon: CalendarDays },
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
