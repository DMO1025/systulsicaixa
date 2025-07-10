
import {
  Moon, Coffee, Utensils, Wine, Sun, Martini, Package, CalendarDays, Refrigerator, PlusCircle, HelpCircle, type LucideIcon, Building, ClipboardList, Truck, FileCheck2, ListChecks, Sunrise, Sunset, UtensilsCrossed, Star
} from 'lucide-react';

export const PERIOD_DEFINITIONS = [
  { id: "madrugada", label: "Madrugada", icon: Moon },
  { id: "cafeDaManha", label: "Café da Manhã", icon: Coffee },
  { id: "breakfast", label: "Breakfast", icon: Coffee },
  { id: "almocoPrimeiroTurno", label: "Almoço Primeiro Turno", icon: Utensils },
  { id: "almocoSegundoTurno", label: "Almoço Segundo Turno", icon: UtensilsCrossed },
  { id: "italianoAlmoco", label: "RW Italiano Almoço", icon: Utensils },
  { id: "italianoJantar", label: "RW Italiano Jantar", icon: Wine },
  { id: "indianoAlmoco", label: "RW Indiano Almoço", icon: Utensils },
  { id: "indianoJantar", label: "RW Indiano Jantar", icon: Wine },
  { id: "jantar", label: "Jantar", icon: Wine },
  { id: "baliAlmoco", label: "Bali Almoço", icon: Sun },
  { id: "baliHappy", label: "Bali Happy Hour", icon: Martini },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
] as const;

export type PeriodId = typeof PERIOD_DEFINITIONS[number]['id'];
export type PeriodDefinition = typeof PERIOD_DEFINITIONS[number];


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

  // Frigobar Specific - Per Shift
  frgPTTotalQuartos: "TOTAL DE QUARTOS (1º Turno)",
  frgPTPagRestaurante: "PAGAMENTO RESTAURANTE (1º Turno)",
  frgPTPagHotel: "PAGAMENTO HOTÉL (1º Turno)",
  frgSTTotalQuartos: "TOTAL DE QUARTOS (2º Turno)",
  frgSTPagRestaurante: "PAGAMENTO RESTAURANTE (2º Turno)",
  frgSTPagHotel: "PAGAMENTO HOTÉL (2º Turno)",
  frgJNTTotalQuartos: "TOTAL DE QUARTOS (Jantar)",
  frgJNTPagRestaurante: "PAGAMENTO RESTAURANTE (Jantar)",
  frgJNTPagHotel: "PAGAMENTO HOTÉL (Jantar)",

  // Default/Generic for other periods if they don't have specific structures
  genericTotalValue: "Valor Total (R$)",
  genericQtdItems: "Quantidade Itens",

  // Channels for Almoço Primeiro Turno (APT)
  aptRoomServiceQtdPedidos: "QUANTIDADE PEDIDOS (Almoço PT)",
  aptRoomServicePagDireto: "PAGAMENTO DIRETO (DINHEIRO / CARTÃO) (Almoço PT)",
  aptRoomServiceValorServico: "ROOM SERVICE (Almoço PT)",
  aptHospedes: "HÓSPEDES (Almoço PT)",
  aptClienteMesaTotaisQtd: "TOTAIS CLIENTE MESA (Almoço PT)",
  aptClienteMesaDinheiro: "DINHEIRO (Almoço PT)",
  aptClienteMesaCredito: "CRÉDITO (Almoço PT)",
  aptClienteMesaDebito: "DÉBITO (Almoço PT)",
  aptClienteMesaPix: "PIX (Almoço PT)",
  aptClienteMesaTicketRefeicao: "TICKET REFEIÇÃO (Almoço PT)",
  aptClienteMesaRetirada: "RETIRADA (Almoço PT)",
  aptDeliveryIfood: "IFOOD (Almoço PT)",
  aptDeliveryRappi: "RAPPI (Almoço PT)",
  aptCiEFaturadosFaturadosQtd: "FATURADOS QUANTIDADE (Almoço PT)",
  aptCiEFaturadosValorHotel: "VALOR HOTEL (FATURADO) (Almoço PT)",
  aptCiEFaturadosValorFuncionario: "VALOR FUNCIONÁRIO (FATURADO) (Almoço PT)",
  aptCiEFaturadosConsumoInternoQtd: "* CONSUMO INTERNO - CI QUANTIDADE (Almoço PT)",
  aptCiEFaturadosReajusteCI: "REAJUSTE DE C.I (Almoço PT)",
  aptCiEFaturadosTotalCI: "TOTAL C.I (Almoço PT)",

  // Channels for Almoço Segundo Turno (AST)
  astRoomServiceQtdPedidos: "QUANTIDADE PEDIDOS (Almoço ST)",
  astRoomServicePagDireto: "PAGAMENTO DIRETO (DINHEIRO / CARTÃO) (Almoço ST)",
  astRoomServiceValorServico: "ROOM SERVICE (Almoço ST)",
  astHospedes: "HÓSPEDES (Almoço ST)",
  astClienteMesaTotaisQtd: "TOTAIS CLIENTE MESA (Almoço ST)",
  astClienteMesaDinheiro: "DINHEIRO (Almoço ST)",
  astClienteMesaCredito: "CRÉDITO (Almoço ST)",
  astClienteMesaDebito: "DÉBITO (Almoço ST)",
  astClienteMesaPix: "PIX (Almoço ST)",
  astClienteMesaTicketRefeicao: "TICKET REFEIÇÃO (Almoço ST)",
  astClienteMesaRetirada: "RETIRADA (Almoço ST)",
  astDeliveryIfood: "IFOOD (Almoço ST)",
  astDeliveryRappi: "RAPPI (Almoço ST)",
  astCiEFaturadosFaturadosQtd: "FATURADOS QUANTIDADE (Almoço ST)",
  astCiEFaturadosValorHotel: "VALOR HOTEL (FATURADO) (Almoço ST)",
  astCiEFaturadosValorFuncionario: "VALOR FUNCIONÁRIO (FATURADO) (Almoço ST)",
  astCiEFaturadosConsumoInternoQtd: "* CONSUMO INTERNO - CI QUANTIDADE (Almoço ST)",
  astCiEFaturadosReajusteCI: "REAJUSTE DE C.I (Almoço ST)",
  astCiEFaturadosTotalCI: "TOTAL C.I (Almoço ST)",

  // Channels for Jantar (JNT)
  jntRoomServiceQtdPedidos: "QUANTIDADE PEDIDOS (Jantar)",
  jntRoomServicePagDireto: "PAGAMENTO DIRETO (DINHEIRO / CARTÃO) (Jantar)",
  jntRoomServiceValorServico: "ROOM SERVICE (Jantar)",
  jntHospedes: "HÓSPEDES (Jantar)",
  jntClienteMesaTotaisQtd: "TOTAIS CLIENTE MESA (Jantar)",
  jntClienteMesaDinheiro: "DINHEIRO (Jantar)",
  jntClienteMesaCredito: "CRÉDITO (Jantar)",
  jntClienteMesaDebito: "DÉBITO (Jantar)",
  jntClienteMesaPix: "PIX (Jantar)",
  jntClienteMesaTicketRefeicao: "TICKET REFEIÇÃO (Jantar)",
  jntClienteMesaRetirada: "RETIRADA (Jantar)",
  jntDeliveryIfood: "IFOOD (Jantar)",
  jntDeliveryRappi: "RAPPI (Jantar)",
  jntCiEFaturadosFaturadosQtd: "FATURADOS QUANTIDADE (Jantar)",
  jntCiEFaturadosValorHotel: "VALOR HOTEL (FATURADO) (Jantar)",
  jntCiEFaturadosValorFuncionario: "VALOR FUNCIONÁRIO (FATURADO) (Jantar)",
  jntCiEFaturadosConsumoInternoQtd: "* CONSUMO INTERNO - CI QUANTIDADE (Jantar)",
  jntCiEFaturadosReajusteCI: "REAJUSTE DE C.I (Jantar)",
  jntCiEFaturadosTotalCI: "TOTAL C.I (Jantar)",

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

export interface SubTabConfig {
  label: string;
  icon: LucideIcon;
  channels: Partial<Record<SalesChannelId, { qtd?: boolean; vtotal?: boolean; text?: boolean }>>;
}
export interface PeriodConfig {
  channels?: Partial<Record<SalesChannelId, { qtd?: boolean; vtotal?: boolean; text?: boolean }>>;
  subTabs?: Record<string, SubTabConfig>;
  payments?: boolean;
  observations?: boolean;
  description?: string;
  customForm?: boolean; 
}

export type IndividualPeriodConfig = PeriodConfig;
export type IndividualSubTabConfig = SubTabConfig;


const commonAlmocoJantarStructure = (
  periodPrefix: 'apt' | 'ast' | 'jnt'
): Record<string, SubTabConfig> => {
  const CH_IDS = {
    ROOM_SERVICE_QTD_PEDIDOS: `${periodPrefix}RoomServiceQtdPedidos`,
    ROOM_SERVICE_PAG_DIRETO: `${periodPrefix}RoomServicePagDireto`,
    ROOM_SERVICE_VALOR_SERVICO: `${periodPrefix}RoomServiceValorServico`,
    HOSPEDES: `${periodPrefix}Hospedes`,
    CLIENTE_MESA_TOTAIS_QTD: `${periodPrefix}ClienteMesaTotaisQtd`,
    CLIENTE_MESA_DINHEIRO: `${periodPrefix}ClienteMesaDinheiro`,
    CLIENTE_MESA_CREDITO: `${periodPrefix}ClienteMesaCredito`,
    CLIENTE_MESA_DEBITO: `${periodPrefix}ClienteMesaDebito`,
    CLIENTE_MESA_PIX: `${periodPrefix}ClienteMesaPix`,
    CLIENTE_MESA_TICKET_REFEICAO: `${periodPrefix}ClienteMesaTicketRefeicao`,
    CLIENTE_MESA_RETIRADA: `${periodPrefix}ClienteMesaRetirada`,
    DELIVERY_IFOOD: `${periodPrefix}DeliveryIfood`,
    DELIVERY_RAPPI: `${periodPrefix}DeliveryRappi`,
    CI_FATURADOS_FATURADOS_QTD: `${periodPrefix}CiEFaturadosFaturadosQtd`,
    CI_FATURADOS_VALOR_HOTEL: `${periodPrefix}CiEFaturadosValorHotel`,
    CI_FATURADOS_VALOR_FUNCIONARIO: `${periodPrefix}CiEFaturadosValorFuncionario`,
    CI_FATURADOS_CONSUMO_INTERNO_QTD: `${periodPrefix}CiEFaturadosConsumoInternoQtd`,
    CI_FATURADOS_REAJUSTE_CI: `${periodPrefix}CiEFaturadosReajusteCI`,
    CI_FATURADOS_TOTAL_CI: `${periodPrefix}CiEFaturadosTotalCI`,
  } as Record<string, SalesChannelId>;

  return {
      roomService: {
        label: "ROOM SERVICE", icon: Utensils,
        channels: {
          [CH_IDS.ROOM_SERVICE_QTD_PEDIDOS]: { qtd: true },
          [CH_IDS.ROOM_SERVICE_PAG_DIRETO]: { vtotal: true },
          [CH_IDS.ROOM_SERVICE_VALOR_SERVICO]: { vtotal: true },
        }
      },
      hospedes: {
        label: "HÓSPEDES", icon: Building,
        channels: {
          [CH_IDS.HOSPEDES]: { qtd: true, vtotal: true },
        }
      },
      clienteMesa: {
        label: "CLIENTE MESA", icon: ClipboardList,
        channels: {
          [CH_IDS.CLIENTE_MESA_TOTAIS_QTD]: { qtd: true },
          [CH_IDS.CLIENTE_MESA_DINHEIRO]: { vtotal: true },
          [CH_IDS.CLIENTE_MESA_CREDITO]: { vtotal: true },
          [CH_IDS.CLIENTE_MESA_DEBITO]: { vtotal: true },
          [CH_IDS.CLIENTE_MESA_PIX]: { vtotal: true },
          [CH_IDS.CLIENTE_MESA_TICKET_REFEICAO]: { vtotal: true },
          [CH_IDS.CLIENTE_MESA_RETIRADA]: { qtd: true, vtotal: true },
        }
      },
      delivery: {
        label: "DELIVERY", icon: Truck,
        channels: {
          [CH_IDS.DELIVERY_IFOOD]: { qtd: true, vtotal: true },
          [CH_IDS.DELIVERY_RAPPI]: { qtd: true, vtotal: true },
        }
      },
      ciEFaturados: {
        label: "C.I. & Faturados", icon: FileCheck2,
        channels: {
          [CH_IDS.CI_FATURADOS_FATURADOS_QTD]: { qtd: true },
          [CH_IDS.CI_FATURADOS_VALOR_HOTEL]: { vtotal: true },
          [CH_IDS.CI_FATURADOS_VALOR_FUNCIONARIO]: { vtotal: true },
          [CH_IDS.CI_FATURADOS_CONSUMO_INTERNO_QTD]: { qtd: true },
          [CH_IDS.CI_FATURADOS_REAJUSTE_CI]: { vtotal: true },
          [CH_IDS.CI_FATURADOS_TOTAL_CI]: { vtotal: true },
        }
      }
    };
};

const _DEFAULT_DIRECT_CHANNELS_CONFIG: PeriodConfig = {
  channels: {
    genericTotalValue: { vtotal: true },
    genericQtdItems: { qtd: true },
  },
  payments: false,
  observations: true,
};


export const PERIOD_FORM_CONFIG: Record<PeriodId, PeriodConfig> = {
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
    subTabs: {
      ...commonAlmocoJantarStructure('apt'),
      frigobar: {
        label: "FRIGOBAR", icon: Refrigerator,
        channels: {
          frgPTTotalQuartos: { qtd: true },
          frgPTPagRestaurante: { vtotal: true },
          frgPTPagHotel: { vtotal: true },
        }
      }
    },
    payments: false, observations: true
  },
  almocoSegundoTurno: {
    subTabs: {
      ...commonAlmocoJantarStructure('ast'),
      frigobar: {
        label: "FRIGOBAR", icon: Refrigerator,
        channels: {
          frgSTTotalQuartos: { qtd: true },
          frgSTPagRestaurante: { vtotal: true },
          frgSTPagHotel: { vtotal: true },
        }
      }
    },
    payments: false, observations: true
  },
  jantar: {
    subTabs: {
      ...commonAlmocoJantarStructure('jnt'),
      frigobar: {
        label: "FRIGOBAR", icon: Refrigerator,
        channels: {
          frgJNTTotalQuartos: { qtd: true },
          frgJNTPagRestaurante: { vtotal: true },
          frgJNTPagHotel: { vtotal: true },
        }
      }
    },
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

export function getPeriodIcon(periodId: PeriodId): LucideIcon {
  const period = PERIOD_DEFINITIONS.find(p => p.id === periodId);
  return period ? period.icon : HelpCircle;
}

export function getSubTabIcon(periodId: PeriodId, subTabKey: string): LucideIcon {
  const periodConfig = PERIOD_FORM_CONFIG[periodId];
  if (periodConfig?.subTabs && periodConfig.subTabs[subTabKey]) {
    return periodConfig.subTabs[subTabKey].icon || HelpCircle;
  }
  return HelpCircle;
}


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


// --- Dashboard Constants ---
export const DASHBOARD_ACCUMULATED_ITEMS_CONFIG = [
  { item: "ROOM SERVICE", periodId: "madrugada" },
  { item: "CAFÉ DA MANHÃ", periodId: "cafeDaManha" },
  { item: "BREAKFAST", periodId: "breakfast" },
  { item: "ALMOÇO", periodId: "almocoPrimeiroTurno" },
  { item: "JANTAR", periodId: "jantar" },
  { item: "RW ITALIANO ALMOÇO", periodId: "italianoAlmoco" },
  { item: "RW ITALIANO JANTAR", periodId: "italianoJantar" },
  { item: "RW INDIANO ALMOÇO", periodId: "indianoAlmoco" },
  { item: "RW INDIANO JANTAR", periodId: "indianoJantar" },
  { item: "BALI ALMOÇO", periodId: "baliAlmoco" },
  { item: "BALI HAPPY HOUR", periodId: "baliHappy" },
  { item: "FRIGOBAR" },
  { item: "EVENTOS DIRETO", periodId: "eventos" },
  { item: "EVENTOS HOTEL", periodId: "eventos" },
] as const;

// --- Summary Card Constants ---
export const SUMMARY_CARD_CONFIGURABLE_ITEMS = [
  { id: 'rsMadrugada', label: 'RS Madrugada' },
  { id: 'avulsoAssinado', label: 'Avulsos Café da Manhã' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'almoco', label: 'Almoço' },
  { id: 'jantar', label: 'Jantar' },
  { id: 'rwItalianoAlmoco', label: 'RW Italiano Almoço' },
  { id: 'rwItalianoJantar', label: 'RW Italiano Jantar' },
  { id: 'rwIndianoAlmoco', label: 'RW Indiano Almoço' },
  { id: 'rwIndianoJantar', label: 'RW Indiano Jantar' },
  { id: 'baliAlmoco', label: 'Bali Almoço' },
  { id: 'baliHappy', label: 'Bali Happy Hour' },
  { id: 'frigobar', label: 'Frigobar' },
  { id: 'cafeHospedes', label: 'Café Hóspedes' },
  { id: 'almocoCI', label: 'Almoço C.I.' },
  { id: 'jantarCI', label: 'Jantar C.I.' },
  { id: 'eventosDireto', label: 'Eventos Direto' },
  { id: 'eventosHotel', label: 'Eventos Hotel' },
] as const;

export type SummaryCardItemId = typeof SUMMARY_CARD_CONFIGURABLE_ITEMS[number]['id'];
