

import {
  Moon, Coffee, Utensils, Wine, Sun, Martini, Package, CalendarDays, Refrigerator, HelpCircle, type LucideIcon, ClipboardCheck, BedDouble, Undo2
} from 'lucide-react';

export const PERIOD_DEFINITIONS = [
  { id: "madrugada", label: "Madrugada", icon: BedDouble, type: 'entry', description: 'Serviço de quarto da madrugada.' },
  { id: "cafeDaManha", label: "Café da Manhã", icon: Coffee, type: 'entry', description: 'Controle detalhado do café.' },
  { id: "controleCafeDaManha", label: "Controle Café da Manhã", icon: ClipboardCheck, type: 'control', description: 'Controle de PAX para o café da manhã.' },
  { id: "cafeManhaNoShow", label: "Controle No-Show Café", icon: ClipboardCheck, type: 'control', description: 'Registro de no-shows e cortesias.' },
  { id: "breakfast", label: "Breakfast", icon: Coffee, type: 'entry', description: 'Lançamentos de breakfast.' },
  { id: "almocoPrimeiroTurno", label: "Almoço Primeiro Turno", icon: Utensils, type: 'entry', description: 'Movimento do almoço no 1º turno.' },
  { id: "almocoSegundoTurno", label: "Almoço Segundo Turno", icon: Utensils, type: 'entry', description: 'Movimento do almoço no 2º turno.' },
  { id: "jantar", label: "Jantar", icon: Wine, type: 'entry', description: 'Movimento do jantar.' },
  { id: "italianoAlmoco", label: "RW Italiano Almoço", icon: Utensils, type: 'entry', description: 'Restaurant Week - Italiano (Almoço).' },
  { id: "italianoJantar", label: "RW Italiano Jantar", icon: Wine, type: 'entry', description: 'Restaurant Week - Italiano (Jantar).' },
  { id: "indianoAlmoco", label: "RW Indiano Almoço", icon: Utensils, type: 'entry', description: 'Restaurant Week - Indiano (Almoço).' },
  { id: "indianoJantar", label: "RW Indiano Jantar", icon: Wine, type: 'entry', description: 'Restaurant Week - Indiano (Jantar).' },
  { id: "baliAlmoco", label: "Bali Almoço", icon: Sun, type: 'entry', description: 'Movimentação do Bali Bar (Almoço).' },
  { id: "baliHappy", label: "Bali Happy Hour", icon: Martini, type: 'entry', description: 'Movimentação do Bali Bar (Happy Hour).' },
  { id: "eventos", label: "Eventos", icon: CalendarDays, type: 'entry', description: 'Lançamento de eventos e serviços.' },
  { id: "controleFrigobar", label: "Controle de Frigobar", icon: Refrigerator, type: 'control', description: 'Controle de consumo e perdas do frigobar.' },
] as const;

export type PeriodId = typeof PERIOD_DEFINITIONS[number]['id'];
export type PeriodDefinition = typeof PERIOD_DEFINITIONS[number];
export type PeriodType = typeof PERIOD_DEFINITIONS[number]['type'];

export function getPeriodIcon(periodId: PeriodId | 'roomService' | 'estornos' | 'frigobar'): LucideIcon {
  if (periodId === 'roomService') {
    return BedDouble;
  }
  if (periodId === 'estornos') {
    return Undo2;
  }
  if (periodId === 'frigobar') {
    return Refrigerator;
  }
  const period = PERIOD_DEFINITIONS.find(p => p.id === periodId);
  return period ? period.icon : HelpCircle;
}
