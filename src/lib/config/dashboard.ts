
import type { PeriodId } from './periods';

// --- Dashboard Constants ---
export const DASHBOARD_ACCUMULATED_ITEMS_CONFIG = [
  { item: "ROOM SERVICE", periodId: "madrugada" },
  { item: "CAFÉ DA MANHÃ", periodId: "cafeDaManha" },
  { item: "BREAKFAST", periodId: "breakfast" },
  { item: "ALMOÇO", periodId: "almocoPrimeiroTurno" }, // Consolidated link for both lunch periods
  { item: "JANTAR", periodId: "jantar" },
  { item: "RW ITALIANO ALMOÇO", periodId: "italianoAlmoco" },
  { item: "RW ITALIANO JANTAR", periodId: "italianoJantar" },
  { item: "RW INDIANO ALMOÇO", periodId: "indianoAlmoco" },
  { item: "RW INDIANO JANTAR", periodId: "indianoJantar" },
  { item: "BALI ALMOÇO", periodId: "baliAlmoco" },
  { item: "BALI HAPPY HOUR", periodId: "baliHappy" },
  { item: "FRIGOBAR", periodId: "frigobar"},
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
