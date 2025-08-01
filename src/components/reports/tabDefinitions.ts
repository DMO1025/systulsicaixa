

import { 
    ListChecks, Truck, Utensils, Building, Package, FileCheck2, Wallet, Refrigerator, CalendarDays, Sun, Moon, Coffee, Wine, HelpCircle, BedDouble
} from "lucide-react";
import type { LucideIcon } from 'lucide-react';

interface TabDefinition {
    id: string;
    label: string;
    IconComp: LucideIcon;
    cols: { key: string, label: string, isCurrency?: boolean, isNum?: boolean }[];
}

export const TAB_DEFINITIONS: TabDefinition[] = [
    { id: 'faturado-hotel', label: 'HOTEL', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'faturado-funcionario', label: 'FUNCIONÁRIO', IconComp: Wallet,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'faturado-outros', label: 'OUTROS', IconComp: Wallet,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'ifood', label: 'IFOOD', IconComp: Truck,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'rappi', label: 'RAPPI', IconComp: Truck,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'mesa', label: 'MESA', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'TOTAIS', isNum: true}, {key: 'dinheiro', label: 'R$ DINHEIRO', isCurrency: true}, {key: 'credito', label: 'R$ CRÉDITO', isCurrency: true}, {key: 'debito', label: 'R$ DÉBITO', isCurrency: true}, {key: 'pix', label: 'R$ PIX', isCurrency: true}, {key: 'ticket', label: 'R$ TICKET', isCurrency: true}, {key: 'total', label: 'TOTAL MESA', isCurrency: true}] },
    { id: 'hospedes', label: 'HÓSPEDES', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD HÓSP.', isNum: true}, {key: 'valor', label: 'R$ PAG.', isCurrency: true}] },
    { id: 'retirada', label: 'RETIRADA', IconComp: Package,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'ci', label: 'C.I.', IconComp: FileCheck2,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD CI', isNum: true}, {key: 'reajuste', label: 'R$ REAJ.', isCurrency: true}, {key: 'total', label: 'R$ TOTAL CI', isCurrency: true}] },
    { id: 'generic', label: 'DIVERSOS', IconComp: HelpCircle,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'cdmListaHospedes', label: 'LISTA DE HÓSPEDES', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'cdmNoShow', label: 'NO-SHOW', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'cdmSemCheckIn', label: 'S/ CHECK-IN', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'cdmAvulsos', label: 'AVULSOS', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'madrugadaResumo', label: 'RESUMO MADRUGADA', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtdPedidos', label: 'QTD PEDIDOS', isNum: true}, {key: 'qtdPratos', label: 'QTD PRATOS', isNum: true}, {key: 'pagDireto', label: 'PAG. DIRETO (R$)', isCurrency: true}, {key: 'valorServico', label: 'VALOR SERVIÇO (R$)', isCurrency: true}, {key: 'total', label: 'TOTAL (R$)', isCurrency: true}] },
    { id: 'eventosHotel', label: 'EVENTOS (HOTEL)', IconComp: Building,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'eventName', label: 'NOME DO EVENTO'}, {key: 'serviceType', label: 'TIPO DE SERVIÇO'}, {key: 'quantity', label: 'QTD', isNum: true }, {key: 'totalValue', label: 'VALOR (R$)', isCurrency: true } ]},
    { id: 'eventosDireto', label: 'EVENTOS (DIRETO)', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'eventName', label: 'NOME DO EVENTO'}, {key: 'serviceType', label: 'TIPO DE SERVIÇO'}, {key: 'quantity', label: 'QTD', isNum: true }, {key: 'totalValue', label: 'VALOR (R$)', isCurrency: true } ]},
    { id: 'frigobarPT', label: '1º TURNO', IconComp: Sun,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD QUARTOS', isNum: true}, {key: 'restaurante', label: 'R$ RESTAURANTE', isCurrency: true}, {key: 'hotel', label: 'R$ HOTEL', isCurrency: true}, {key: 'total', label: 'TOTAL (R$)', isCurrency: true} ]},
    { id: 'frigobarST', label: '2º TURNO', IconComp: Sun,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD QUARTOS', isNum: true}, {key: 'restaurante', label: 'R$ RESTAURANTE', isCurrency: true}, {key: 'hotel', label: 'R$ HOTEL', isCurrency: true}, {key: 'total', label: 'TOTAL (R$)', isCurrency: true} ]},
    { id: 'frigobarJNT', label: 'JANTAR', IconComp: Moon,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD QUARTOS', isNum: true}, {key: 'restaurante', label: 'R$ RESTAURANTE', isCurrency: true}, {key: 'hotel', label: 'R$ HOTEL', isCurrency: true}, {key: 'total', label: 'TOTAL (R$)', isCurrency: true} ]},
    { id: 'ci-almoco-pt', label: 'ALMOÇO 1º TURNO', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'ci-almoco-st', label: 'ALMOÇO 2º TURNO', IconComp: Utensils,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'ci-jantar', label: 'JANTAR', IconComp: Wine,
      cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    // Room Service Tabs
    { id: 'rsMadrugada', label: 'MADRUGADA', IconComp: Moon, cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD PEDIDOS', isNum: true}, {key: 'qtdPratos', label: 'QTD PRATOS', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'rsAlmocoPT', label: 'ALMOÇO 01', IconComp: Sun, cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'rsAlmocoST', label: 'ALMOÇO 02', IconComp: Sun, cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
    { id: 'rsJantar', label: 'JANTAR', IconComp: Wine, cols: [ {key: 'date', label: 'DATA'}, {key: 'qtd', label: 'QTD', isNum: true}, {key: 'valor', label: 'VALOR', isCurrency: true}] },
];
