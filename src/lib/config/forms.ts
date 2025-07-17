
import type { PeriodId } from './periods';
import {
  type LucideIcon, HelpCircle, Building, ClipboardList, Truck, FileCheck2, Utensils, Refrigerator, Wallet
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
  aptFaturadosQtd: "FATURADOS QUANTIDADE (Almoço PT)",
  aptFaturadosValorHotel: "VALOR HOTEL (FATURADO) (Almoço PT)",
  aptFaturadosValorFuncionario: "VALOR FUNCIONÁRIO (FATURADO) (Almoço PT)",
  aptConsumoInternoQtd: "* CONSUMO INTERNO - CI QUANTIDADE (Almoço PT)",
  aptReajusteCI: "REAJUSTE DE C.I (Almoço PT)",
  aptTotalCI: "TOTAL C.I (Almoço PT)",

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
  astFaturadosQtd: "FATURADOS QUANTIDADE (Almoço ST)",
  astFaturadosValorHotel: "VALOR HOTEL (FATURADO) (Almoço ST)",
  astFaturadosValorFuncionario: "VALOR FUNCIONÁRIO (FATURADO) (Almoço ST)",
  astConsumoInternoQtd: "* CONSUMO INTERNO - CI QUANTIDADE (Almoço ST)",
  astReajusteCI: "REAJUSTE DE C.I (Almoço ST)",
  astTotalCI: "TOTAL C.I (Almoço ST)",

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
  jntFaturadosQtd: "FATURADOS QUANTIDADE (Jantar)",
  jntFaturadosValorHotel: "VALOR HOTEL (FATURADO) (Jantar)",
  jntFaturadosValorFuncionario: "VALOR FUNCIONÁRIO (FATURADO) (Jantar)",
  jntConsumoInternoQtd: "* CONSUMO INTERNO - CI QUANTIDADE (Jantar)",
  jntReajusteCI: "REAJUSTE DE C.I (Jantar)",
  jntTotalCI: "TOTAL C.I (Jantar)",

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

export interface IndividualSubTabConfig {
  label: string;
  icon: LucideIcon;
  channels: Partial<Record<SalesChannelId, { qtd?: boolean; vtotal?: boolean; text?: boolean }>>;
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
    
  const deliverySubTab = {
    label: "DELIVERY & RETIRADA", icon: Truck,
    channels: {
      [`${periodPrefix}DeliveryIfoodQtd`]: { qtd: true },
      [`${periodPrefix}DeliveryIfoodValor`]: { vtotal: true },
      [`${periodPrefix}DeliveryRappiQtd`]: { qtd: true },
      [`${periodPrefix}DeliveryRappiValor`]: { vtotal: true },
      [`${periodPrefix}ClienteMesaRetiradaQtd`]: { qtd: true },
      [`${periodPrefix}ClienteMesaRetiradaValor`]: { vtotal: true },
    }
  };

  const roomServiceSubTab = {
    label: "ROOM SERVICE", icon: Utensils,
    channels: {
      [`${periodPrefix}RoomServiceQtdPedidos`]: { qtd: true },
      [`${periodPrefix}RoomServicePagDireto`]: { vtotal: true },
      [`${periodPrefix}RoomServiceValorServico`]: { vtotal: true },
    }
  };

  const hospedesSubTab = {
    label: "HÓSPEDES", icon: Building,
    channels: {
      [`${periodPrefix}HospedesQtdHospedes`]: { qtd: true },
      [`${periodPrefix}HospedesPagamentoHospedes`]: { vtotal: true },
    }
  };

  const clienteMesaSubTab = {
    label: "CLIENTE MESA", icon: ClipboardList,
    channels: {
      [`${periodPrefix}ClienteMesaTotaisQtd`]: { qtd: true },
      [`${periodPrefix}ClienteMesaDinheiro`]: { vtotal: true },
      [`${periodPrefix}ClienteMesaCredito`]: { vtotal: true },
      [`${periodPrefix}ClienteMesaDebito`]: { vtotal: true },
      [`${periodPrefix}ClienteMesaPix`]: { vtotal: true },
      [`${periodPrefix}ClienteMesaTicketRefeicao`]: { vtotal: true },
    }
  };

  const faturadoSubTab = {
    label: "Faturado", icon: Wallet,
    channels: {
        [`${periodPrefix}FaturadosQtd`]: { qtd: true },
        [`${periodPrefix}FaturadosValorHotel`]: { vtotal: true },
        [`${periodPrefix}FaturadosValorFuncionario`]: { vtotal: true },
    }
  };
  
  const consumoInternoSubTab = {
    label: "Consumo Interno", icon: FileCheck2,
    channels: {
        [`${periodPrefix}ConsumoInternoQtd`]: { qtd: true },
        [`${periodPrefix}ReajusteCI`]: { vtotal: true },
        [`${periodPrefix}TotalCI`]: { vtotal: true },
    }
  };
  
  const getFrigobarSubTab = (shiftPrefix: 'PT' | 'ST' | 'JNT'): IndividualSubTabConfig => ({
    label: "FRIGOBAR", icon: Refrigerator,
    channels: {
      [`frg${shiftPrefix}TotalQuartos`]: { qtd: true },
      [`frg${shiftPrefix}PagRestaurante`]: { vtotal: true },
      [`frg${shiftPrefix}PagHotel`]: { vtotal: true },
    }
  });

  if (periodPrefix === 'apt') {
    return {
      roomService: roomServiceSubTab,
      hospedes: hospedesSubTab,
      clienteMesa: clienteMesaSubTab,
      delivery: deliverySubTab,
      faturado: faturadoSubTab,
      consumoInterno: consumoInternoSubTab,
      frigobar: getFrigobarSubTab('PT')
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
      frigobar: getFrigobarSubTab('ST')
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
      frigobar: getFrigobarSubTab('JNT')
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
};


export function getSubTabIcon(periodId: PeriodId, subTabKey: string): LucideIcon {
  const periodConfig = PERIOD_FORM_CONFIG[periodId];
  if (periodConfig?.subTabs && periodConfig.subTabs[subTabKey]) {
    return periodConfig.subTabs[subTabKey].icon || HelpCircle;
  }
  return HelpCircle;
}
