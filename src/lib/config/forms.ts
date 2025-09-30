

import type { PeriodId } from './periods';
import {
  type LucideIcon, HelpCircle, Building, ClipboardList, Truck, FileCheck2, Utensils, Wallet, Package, Sun, Moon
} from 'lucide-react';

// --- Sales Channels Definitions ---
export const SALES_CHANNELS = {
  // Madrugada Specific
  madrugadaRoomServiceQtdPedidos: "QUANTIDADE PEDIDOS",
  madrugadaRoomServiceQtdPratos: "QUANTIDADE PRATOS PRINCIPAIS",
  madrugadaRoomServicePagDireto: "PAGAMENTO DIRETO (DINHEIRO / CARTÃO)",
  madrugadaRoomServiceValorServico: "ROOM SERVICE (VALOR COBRADO)",

  // Café da Manhã Specific
  cdmListaHospedes: "LISTA DE HÓSPEDES",
  cdmNoShow: "NO SHOW",
  cdmSemCheckIn: "SEM CHECK-IN",
  cdmCafeAssinado: "* CAFÉ ASSINADO",
  cdmDiretoCartao: "* DIRETO (CARTÃO)",
  
  // Frigobar Channels (Standardized by turn)
  frgPTTotalQuartos: "Total de Quartos (1º Turno)",
  frgPTPagRestaurante: "Pagamento Restaurante (1º Turno)",
  frgPTPagHotel: "Pagamento Hotel (1º Turno)",
  frgSTTotalQuartos: "Total de Quartos (2º Turno)",
  frgSTPagRestaurante: "Pagamento Restaurante (2º Turno)",
  frgSTPagHotel: "Pagamento Hotel (2º Turno)",
  frgJNTTotalQuartos: "Total de Quartos (Jantar)",
  frgJNTPagRestaurante: "Pagamento Restaurante (Jantar)",
  frgJNTPagHotel: "Pagamento Hotel (Jantar)",

  // Default/Generic for other periods if they don't have specific structures
  genericTotalValue: "Valor Total (R$)",
  genericQtdItems: "Quantidade Itens",

  // Channels for Almoço Primeiro Turno (APT)
  aptRoomServiceQtdPedidos: "QUANTIDADE PEDIDOS (Almoço PT)",
  aptRoomServicePagDireto: "PAGAMENTO DIRETO (DINHEIRO / CARTÃO) (Almoço PT)",
  aptRoomServiceValorServico: "ROOM SERVICE (Almoço PT)",
  aptHospedesQtdHospedes: "HÓSPEDES (Qtd)",
  aptHospedesPagamentoHospedes: "HÓSPEDES (Pagamento)",
  aptClienteMesaTotaisQtd: "TOTAIS CLIENTE MESA (Almoço PT)",
  aptClienteMesaDinheiro: "DINHEIRO (Almoço PT)",
  aptClienteMesaCredito: "CRÉDITO (Almoço PT)",
  aptClienteMesaDebito: "DÉBITO (Almoço PT)",
  aptClienteMesaPix: "PIX (Almoço PT)",
  aptClienteMesaTicketRefeicao: "TICKET REFEIÇÃO (Almoço PT)",
  aptClienteMesaRetiradaQtd: "RETIRADA (Qtd)",
  aptClienteMesaRetiradaValor: "RETIRADA (Valor)",
  aptDeliveryIfoodQtd: "IFOOD (Qtd)",
  aptDeliveryIfoodValor: "IFOOD (Valor)",
  aptDeliveryRappiQtd: "RAPPI (Qtd)",
  aptDeliveryRappiValor: "RAPPI (Valor)",
  reajusteCI: "REAJUSTE DE C.I",
  
  // Channels for Almoço Segundo Turno (AST)
  astRoomServiceQtdPedidos: "QUANTIDADE PEDIDOS (Almoço ST)",
  astRoomServicePagDireto: "PAGAMENTO DIRETO (DINHEIRO / CARTÃO) (Almoço ST)",
  astRoomServiceValorServico: "ROOM SERVICE (Almoço ST)",
  astHospedesQtdHospedes: "HÓSPEDES (Qtd)",
  astHospedesPagamentoHospedes: "HÓSPEDES (Pagamento)",
  astClienteMesaTotaisQtd: "TOTAIS CLIENTE MESA (Almoço ST)",
  astClienteMesaDinheiro: "DINHEIRO (Almoço ST)",
  astClienteMesaCredito: "CRÉDITO (Almoço ST)",
  astClienteMesaDebito: "DÉBITO (Almoço ST)",
  astClienteMesaPix: "PIX (Almoço ST)",
  astClienteMesaTicketRefeicao: "TICKET REFEIÇÃO (Almoço ST)",
  astClienteMesaRetiradaQtd: "RETIRADA (Qtd)",
  astClienteMesaRetiradaValor: "RETIRADA (Valor)",
  astDeliveryIfoodQtd: "IFOOD (Qtd)",
  astDeliveryIfoodValor: "IFOOD (Valor)",
  astDeliveryRappiQtd: "RAPPI (Qtd)",
  astDeliveryRappiValor: "RAPPI (Valor)",

  // Channels for Jantar (JNT)
  jntRoomServiceQtdPedidos: "QUANTIDADE PEDIDOS (Jantar)",
  jntRoomServicePagDireto: "PAGAMENTO DIRETO (DINHEIRO / CARTÃO) (Jantar)",
  jntRoomServiceValorServico: "ROOM SERVICE (Jantar)",
  jntHospedesQtdHospedes: "HÓSPEDES (Qtd)",
  jntHospedesPagamentoHospedes: "HÓSPEDES (Pagamento)",
  jntClienteMesaTotaisQtd: "TOTAIS CLIENTE MESA (Jantar)",
  jntClienteMesaDinheiro: "DINHEIRO (Jantar)",
  jntClienteMesaCredito: "CRÉDITO (Jantar)",
  jntClienteMesaDebito: "DÉBITO (Jantar)",
  jntClienteMesaPix: "PIX (Jantar)",
  jntClienteMesaTicketRefeicao: "TICKET REFEIÇÃO (Jantar)",
  jntClienteMesaRetiradaQtd: "RETIRADA (Qtd)",
  jntClienteMesaRetiradaValor: "RETIRADA (Valor)",
  jntDeliveryIfoodQtd: "IFOOD (Qtd)",
  jntDeliveryIfoodValor: "IFOOD (Valor)",
  jntDeliveryRappiQtd: "RAPPI (Qtd)",
  jntDeliveryRappiValor: "RAPPI (Valor)",

  // Channels for Unit Price Configurable Items
  breakfastEntry: "Breakfast",
  rwItalianoAlmocoEntry: "RW Italiano Almoço",
  rwItalianoJantarEntry: "RW Italiano Jantar",
  rwIndianoAlmocoEntry: "RW Indiano Almoço",
  rwIndianoJantarEntry: "RW Indiano Jantar",
} as const;

export type SalesChannelId = keyof typeof SALES_CHANNELS;

export const PAYMENT_METHODS = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartaoCredito: "Cartão de Crédito",
  cartaoDebito: "Cartão de Débito",
  faturadoHospede: "Faturado Hóspede",
  cortesia: "Cortesia",
  outros: "Outros",
} as const;

export type PaymentMethodId = keyof typeof PAYMENT_METHODS;


// --- Event Specific Constants ---
export const EVENT_LOCATION_OPTIONS = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'DIRETO', label: 'Direto (Restaurante)' },
] as const;

export type EventLocationKey = typeof EVENT_LOCATION_OPTIONS[number]['value'];


export const EVENT_SERVICE_TYPES = {
  ALMOCO: "Almoço",
  JANTAR: "Jantar",
  COFFEE_BREAK: "Coffee Break",
  SERVICO_SALA: "Serviço de Sala",
  COQUETEL: "Coquetel",
  CAFE_AVULSO: "Café Avulso",
  BRINDE_TAXA_ROLHA: "Brinde / Taxa de Rolha",
  CAFE_MANHA: "Café da Manhã",
  OUTRO: "Outro (Especificar)", // Added an "Other" option for flexibility
} as const;

export type EventServiceTypeKey = keyof typeof EVENT_SERVICE_TYPES;

// Array of options for Select component
export const EVENT_SERVICE_TYPE_OPTIONS = Object.entries(EVENT_SERVICE_TYPES).map(([value, label]) => ({
  value: value as EventServiceTypeKey,
  label
}));


// --- Form Configurations ---

export interface GroupedChannelConfig {
    label: string;
    qtd?: SalesChannelId;
    vtotal?: SalesChannelId;
}

export interface IndividualSubTabConfig {
  label: string;
  groupedChannels: GroupedChannelConfig[];
}
export interface IndividualPeriodConfig {
  channels?: Partial<Record<SalesChannelId, { qtd?: boolean; vtotal?: boolean; text?: boolean }>>;
  subTabs?: Record<string, IndividualSubTabConfig>;
  payments?: boolean;
  observations?: boolean;
  description?: string;
  customForm?: boolean; 
}


const commonAlmocoJantarStructure = (
  periodPrefix: 'apt' | 'ast' | 'jnt'
): Record<string, IndividualSubTabConfig> => {
    
  const deliverySubTab: IndividualSubTabConfig = {
    label: "DELIVERY & RETIRADA",
    groupedChannels: [
      { label: "IFOOD", qtd: `${periodPrefix}DeliveryIfoodQtd`, vtotal: `${periodPrefix}DeliveryIfoodValor` },
      { label: "RAPPI", qtd: `${periodPrefix}DeliveryRappiQtd`, vtotal: `${periodPrefix}DeliveryRappiValor` },
      { label: "RETIRADA", qtd: `${periodPrefix}ClienteMesaRetiradaQtd`, vtotal: `${periodPrefix}ClienteMesaRetiradaValor` },
    ]
  };

  const roomServiceSubTab: IndividualSubTabConfig = {
    label: "ROOM SERVICE",
    groupedChannels: [
      { label: "QUANTIDADE PEDIDOS", qtd: `${periodPrefix}RoomServiceQtdPedidos` },
      { label: "PAGAMENTO DIRETO (DINHEIRO/CARTÃO)", vtotal: `${periodPrefix}RoomServicePagDireto` },
      { label: "ROOM SERVICE", vtotal: `${periodPrefix}RoomServiceValorServico` },
    ]
  };

  const hospedesSubTab: IndividualSubTabConfig = {
    label: "HÓSPEDES",
    groupedChannels: [
        { label: "HÓSPEDES", qtd: `${periodPrefix}HospedesQtdHospedes`, vtotal: `${periodPrefix}HospedesPagamentoHospedes` },
    ]
  };

  const clienteMesaSubTab: IndividualSubTabConfig = {
    label: "CLIENTE MESA",
    groupedChannels: [
      { label: "TOTAIS CLIENTE MESA", qtd: `${periodPrefix}ClienteMesaTotaisQtd` },
      { label: "DINHEIRO", vtotal: `${periodPrefix}ClienteMesaDinheiro` },
      { label: "CRÉDITO", vtotal: `${periodPrefix}ClienteMesaCredito` },
      { label: "DÉBITO", vtotal: `${periodPrefix}ClienteMesaDebito` },
      { label: "PIX", vtotal: `${periodPrefix}ClienteMesaPix` },
      { label: "TICKET REFEIÇÃO", vtotal: `${periodPrefix}ClienteMesaTicketRefeicao` },
    ]
  };

  const faturadoSubTab: IndividualSubTabConfig = {
    label: "Faturado",
    groupedChannels: [] // This is now handled by FaturadoForm
  };
  
  const consumoInternoSubTab: IndividualSubTabConfig = {
    label: "Consumo Interno",
    groupedChannels: [
      { label: "REAJUSTE DE C.I", vtotal: `reajusteCI` },
    ]
  };
  
  const getFrigobarSubTab = (shiftPrefix: 'PT' | 'ST' | 'JNT'): IndividualSubTabConfig => ({
    label: "FRIGOBAR",
    groupedChannels: [
      { label: "TOTAL DE QUARTOS", qtd: `frg${shiftPrefix}TotalQuartos`},
      { label: "PAGAMENTO RESTAURANTE", vtotal: `frg${shiftPrefix}PagRestaurante`},
      { label: "PAGAMENTO HOTEL", vtotal: `frg${shiftPrefix}PagHotel`},
    ]
  });

  if (periodPrefix === 'apt') {
    return {
      roomService: roomServiceSubTab,
      hospedes: hospedesSubTab,
      clienteMesa: clienteMesaSubTab,
      delivery: deliverySubTab,
      faturado: faturadoSubTab,
      consumoInterno: consumoInternoSubTab,
      frigobar: getFrigobarSubTab('PT'),
    };
  }
  if (periodPrefix === 'ast') {
    return {
      roomService: roomServiceSubTab,
      hospedes: hospedesSubTab,
      clienteMesa: clienteMesaSubTab,
      delivery: deliverySubTab,
      faturado: faturadoSubTab,
      consumoInterno: consumoInternoSubTab,
      frigobar: getFrigobarSubTab('ST'),
    };
  }
   if (periodPrefix === 'jnt') {
    return {
      roomService: roomServiceSubTab,
      hospedes: hospedesSubTab,
      clienteMesa: clienteMesaSubTab,
      delivery: deliverySubTab,
      faturado: faturadoSubTab,
      consumoInterno: consumoInternoSubTab,
      frigobar: getFrigobarSubTab('JNT'),
    };
  }
  return {};
};

const _DEFAULT_DIRECT_CHANNELS_CONFIG: IndividualPeriodConfig = {
  channels: {
    genericTotalValue: { vtotal: true },
    genericQtdItems: { qtd: true },
  },
  payments: false,
  observations: true,
};


export const PERIOD_FORM_CONFIG: Record<PeriodId, IndividualPeriodConfig> = {
  madrugada: {
    description: "Lançamentos do serviço de quarto da madrugada.",
    channels: {
      madrugadaRoomServiceQtdPedidos: { qtd: true },
      madrugadaRoomServiceQtdPratos: { qtd: true },
      madrugadaRoomServicePagDireto: { vtotal: true },
      madrugadaRoomServiceValorServico: { vtotal: true },
    },
    payments: false,
    observations: true
  },
  cafeDaManha: {
    description: "Controle de café da manhã detalhado.",
    channels: {
      cdmListaHospedes: { qtd: true, vtotal: true },
      cdmNoShow: { qtd: true, vtotal: true },
      cdmSemCheckIn: { qtd: true, vtotal: true },
      cdmCafeAssinado: { qtd: true, vtotal: true },
      cdmDiretoCartao: { qtd: true, vtotal: true },
    },
    payments: false,
    observations: true,
  },
  cafeManhaNoShow: {
    description: "Registre ocorrências de no-show, cortesias ou outras observações para controle interno.",
    customForm: true,
    observations: true,
  },
  controleCafeDaManha: {
    description: "Registre os controles diários do café da manhã.",
    customForm: true,
    observations: true,
  },
  almocoPrimeiroTurno: {
    subTabs: commonAlmocoJantarStructure('apt'),
    payments: false, observations: true
  },
  almocoSegundoTurno: {
    subTabs: commonAlmocoJantarStructure('ast'),
    payments: false, observations: true
  },
  jantar: {
    subTabs: commonAlmocoJantarStructure('jnt'),
    payments: false, observations: true
  },
  frigobar: {
    subTabs: {
      primeiroTurno: {
        label: "1º TURNO",
        groupedChannels: [
          { label: "TOTAL DE QUARTOS", qtd: "frgPTTotalQuartos" },
          { label: "PAGAMENTO RESTAURANTE", vtotal: "frgPTPagRestaurante" },
          { label: "PAGAMENTO HOTEL", vtotal: "frgPTPagHotel" },
        ]
      },
      segundoTurno: {
        label: "2º TURNO",
        groupedChannels: [
          { label: "TOTAL DE QUARTOS", qtd: "frgSTTotalQuartos" },
          { label: "PAGAMENTO RESTAURANTE", vtotal: "frgSTPagRestaurante" },
          { label: "PAGAMENTO HOTEL", vtotal: "frgSTPagHotel" },
        ]
      },
      jantar: {
        label: "JANTAR",
        groupedChannels: [
          { label: "TOTAL DE QUARTOS", qtd: "frgJNTTotalQuartos" },
          { label: "PAGAMENTO RESTAURANTE", vtotal: "frgJNTPagRestaurante" },
          { label: "PAGAMENTO HOTEL", vtotal: "frgJNTPagHotel" },
        ]
      },
    },
    description: "Lançamento de vendas de frigobar nos turnos.",
    payments: false,
    observations: true,
  },
  
  baliAlmoco: { ..._DEFAULT_DIRECT_CHANNELS_CONFIG, description: "Movimentação do Bali Bar durante o almoço." },
  baliHappy: { ..._DEFAULT_DIRECT_CHANNELS_CONFIG, description: "Movimentação do Bali Bar durante o happy hour." },
  
  eventos: {
    description: "Registre múltiplos eventos, cada um com seus serviços detalhados.",
    customForm: true, 
    observations: true, 
  },
  
  // New Period Configs with specific channels
  breakfast: {
    description: "Lançamentos do Breakfast.",
    channels: {
      breakfastEntry: { qtd: true, vtotal: true },
    },
    payments: false,
    observations: true,
  },
  italianoAlmoco: {
    description: "Lançamentos do RW Italiano Almoço.",
    channels: {
      rwItalianoAlmocoEntry: { qtd: true, vtotal: true },
    },
    payments: false,
    observations: true,
  },
  italianoJantar: {
    description: "Lançamentos do RW Italiano Jantar.",
    channels: {
      rwItalianoJantarEntry: { qtd: true, vtotal: true },
    },
    payments: false,
    observations: true,
  },
  indianoAlmoco: {
    description: "Lançamentos do RW Indiano Almoço.",
    channels: {
      rwIndianoAlmocoEntry: { qtd: true, vtotal: true },
    },
    payments: false,
    observations: true,
  },
  indianoJantar: {
    description: "Lançamentos do RW Indiano Jantar.",
    channels: {
      rwIndianoJantarEntry: { qtd: true, vtotal: true },
    },
    payments: false,
    observations: true,
  },
  controleFrigobar: {
    customForm: true,
    description: "Controle de consumo e perdas do frigobar.",
  },
  estornoFrigobar: {
    customForm: true,
    description: "Controle de estornos do frigobar.",
  }
};


// --- Sub-Tab Definitions with Colors for Consistency ---
export const SUB_TAB_DEFINITIONS: Record<string, { icon: LucideIcon }> = {
  roomService:  { icon: Utensils },
  hospedes:     { icon: Building },
  clienteMesa:  { icon: ClipboardList },
  delivery:     { icon: Truck },
  faturado:     { icon: Wallet },
  consumoInterno: { icon: FileCheck2 },
  frigobar:     { icon: Package },
  // Frigobar shifts
  primeiroTurno: { icon: Sun },
  segundoTurno: { icon: Sun },
  jantar: { icon: Moon },
  default:      { icon: HelpCircle },
} as const;

export function getSubTabDefinition(subTabKey: string) {
    return SUB_TAB_DEFINITIONS[subTabKey as keyof typeof SUB_TAB_DEFINITIONS] || SUB_TAB_DEFINITIONS.default;
}
