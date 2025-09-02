

import {
  Moon, Coffee, Utensils, Wine, Sun, Martini, Package, CalendarDays, Refrigerator, HelpCircle, type LucideIcon, ClipboardCheck, BedDouble
} from 'lucide-react';

export const PERIOD_DEFINITIONS = [
  { id: "madrugada", label: "Madrugada", icon: BedDouble, type: 'entry' },
  { id: "cafeDaManha", label: "Café da Manhã", icon: Coffee, type: 'entry' },
  { id: "controleCafeDaManha", label: "Controle Café da Manhã", icon: ClipboardCheck, type: 'control' },
  { id: "cafeManhaNoShow", label: "Controle No-Show Café da Manhã", icon: ClipboardCheck, type: 'control' },
  { id: "breakfast", label: "Breakfast", icon: Coffee, type: 'entry' },
  { id: "almocoPrimeiroTurno", label: "Almoço Primeiro Turno", icon: Utensils, type: 'entry' },
  { id: "almocoSegundoTurno", label: "Almoço Segundo Turno", icon: Utensils, type: 'entry' },
  { id: "jantar", label: "Jantar", icon: Wine, type: 'entry' },
  { id: "italianoAlmoco", label: "RW Italiano Almoço", icon: Utensils, type: 'entry' },
  { id: "italianoJantar", label: "RW Italiano Jantar", icon: Wine, type: 'entry' },
  { id: "indianoAlmoco", label: "RW Indiano Almoço", icon: Utensils, type: 'entry' },
  { id: "indianoJantar", label: "RW Indiano Jantar", icon: Wine, type: 'entry' },
  { id: "baliAlmoco", label: "Bali Almoço", icon: Sun, type: 'entry' },
  { id: "baliHappy", label: "Bali Happy Hour", icon: Martini, type: 'entry' },
  { id: "eventos", label: "Eventos", icon: CalendarDays, type: 'entry' },
  { id: "frigobar", label: "Frigobar", icon: Refrigerator, type: 'entry'},
] as const;

export type PeriodId = typeof PERIOD_DEFINITIONS[number]['id'];
export type PeriodDefinition = typeof PERIOD_DEFINITIONS[number];
export type PeriodType = typeof PERIOD_DEFINITIONS[number]['type'];

export function getPeriodIcon(periodId: PeriodId | 'roomService'): LucideIcon {
  if (periodId === 'roomService') {
    return BedDouble;
  }
  const period = PERIOD_DEFINITIONS.find(p => p.id === periodId);
  return period ? period.icon : HelpCircle;
}
