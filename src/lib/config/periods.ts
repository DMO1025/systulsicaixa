import {
  Moon, Coffee, Utensils, Wine, Sun, Martini, Package, CalendarDays, Refrigerator, HelpCircle, type LucideIcon
} from 'lucide-react';

export const PERIOD_DEFINITIONS = [
  { id: "madrugada", label: "Madrugada", icon: Moon },
  { id: "cafeDaManha", label: "Café da Manhã", icon: Coffee },
  { id: "breakfast", label: "Breakfast", icon: Coffee },
  { id: "almocoPrimeiroTurno", label: "Almoço Primeiro Turno", icon: Utensils },
  { id: "almocoSegundoTurno", label: "Almoço Segundo Turno", icon: Utensils },
  { id: "jantar", label: "Jantar", icon: Wine },
  { id: "italianoAlmoco", label: "RW Italiano Almoço", icon: Utensils },
  { id: "italianoJantar", label: "RW Italiano Jantar", icon: Wine },
  { id: "indianoAlmoco", label: "RW Indiano Almoço", icon: Utensils },
  { id: "indianoJantar", label: "RW Indiano Jantar", icon: Wine },
  { id: "baliAlmoco", label: "Bali Almoço", icon: Sun },
  { id: "baliHappy", label: "Bali Happy Hour", icon: Martini },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
] as const;

export type PeriodId = typeof PERIOD_DEFINITIONS[number]['id'];
export type PeriodDefinition = typeof PERIOD_DEFINITIONS[number];

export function getPeriodIcon(periodId: PeriodId): LucideIcon {
  const period = PERIOD_DEFINITIONS.find(p => p.id === periodId);
  return period ? period.icon : HelpCircle;
}
