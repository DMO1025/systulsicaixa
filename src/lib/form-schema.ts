

import { z } from 'zod';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { PERIOD_FORM_CONFIG } from '@/lib/config/forms';


const salesItemSchema = z.object({
  qtd: z.number().optional().nullable(),
  vtotal: z.number().optional().nullable(),
}).optional();

const channelDataSchema = z.record(z.string(), salesItemSchema);

const faturadoItemSchema = z.object({
    id: z.string(),
    clientName: z.string().min(1, "O nome do cliente é obrigatório."),
    type: z.enum(['hotel', 'funcionario', 'outros']),
    quantity: z.number().optional(),
    value: z.number().optional(),
    observation: z.string().optional(),
});

const consumoInternoItemSchema = z.object({
    id: z.string(),
    clientName: z.string().min(1, "O nome do cliente/setor é obrigatório."),
    quantity: z.number().optional(),
    value: z.number().optional(),
    observation: z.string().optional(),
});

const cafeManhaNoShowItemSchema = z.object({
  id: z.string(),
  data: z.date().optional(),
  horario: z.string().optional(),
  hospede: z.string().optional(),
  uh: z.string().optional(),
  reserva: z.string().optional(),
  valor: z.number().optional(),
  observation: z.string().optional(),
});

const controleCafePeriodDataSchema = z.object({
  adultoQtd: z.number().optional().nullable(),
  crianca01Qtd: z.number().optional().nullable(),
  crianca02Qtd: z.number().optional().nullable(),
  contagemManual: z.number().optional().nullable(),
  semCheckIn: z.number().optional().nullable(),
  periodObservations: z.string().optional(),
});


const frigobarConsumptionLogSchema = z.object({
  id: z.string(),
  uh: z.string(),
  items: z.record(z.string(), z.number()),
  totalValue: z.number(),
  valorRecebido: z.number().optional(),
  registeredBy: z.string().optional(),
  timestamp: z.string(),
  observation: z.string().optional(),
  isAntecipado: z.boolean().optional(),
});

const frigobarPeriodDataSchema = z.object({
  logs: z.array(frigobarConsumptionLogSchema).optional(),
  periodObservations: z.string().optional(),
  checkoutsPrevistos: z.number().optional(),
  checkoutsProrrogados: z.number().optional(),
  abatimentoAvulso: z.number().optional(),
});


const subTabSchema = z.object({
  channels: channelDataSchema.optional(),
  faturadoItems: z.array(faturadoItemSchema).optional(),
  consumoInternoItems: z.array(consumoInternoItemSchema).optional(),
});

const subTabsSchema = z.record(z.string(), subTabSchema);

const periodDataSchema = z.object({
  channels: channelDataSchema.optional(),
  subTabs: subTabsSchema.optional(),
  periodObservations: z.string().optional(),
});

const subEventItemSchema = z.object({
  id: z.string(),
  location: z.string().optional(),
  serviceType: z.string().optional(),
  customServiceDescription: z.string().optional(),
  quantity: z.number().optional(),
  totalValue: z.number().optional(),
});

const eventItemDataSchema = z.object({
  id: z.string(),
  eventName: z.string().optional(),
  subEvents: z.array(subEventItemSchema),
});

const eventosPeriodDataSchema = z.object({
  items: z.array(eventItemDataSchema),
  periodObservations: z.string().optional(),
});

const cafeManhaNoShowPeriodDataSchema = z.object({
  items: z.array(cafeManhaNoShowItemSchema).optional(),
  periodObservations: z.string().optional(),
  newItem: cafeManhaNoShowItemSchema.optional(), // To handle the new item form fields
});



// Main Form Schema
export const dailyEntryFormSchema = z.object({
  date: z.date({ required_error: "A data do lançamento é obrigatória." }),
  generalObservations: z.string().optional(),
  ...Object.fromEntries(
    PERIOD_DEFINITIONS.map(p => {
      if (p.id === 'eventos') return [p.id, eventosPeriodDataSchema.optional()];
      if (p.id === 'cafeManhaNoShow') return [p.id, cafeManhaNoShowPeriodDataSchema.optional()];
      if (p.id === 'controleCafeDaManha') return [p.id, controleCafePeriodDataSchema.optional()];
      if (p.id === 'controleFrigobar') return [p.id, frigobarPeriodDataSchema.optional()];
      return [p.id, periodDataSchema.optional()];
    })
  ),
});


// --- Initial Default Values for Forms ---

export const initialDefaultValuesForAllPeriods = (() => {
  const defaults: any = {
    date: new Date(),
    generalObservations: '',
  };

  PERIOD_DEFINITIONS.forEach(periodDef => {
    const periodId = periodDef.id;
    const config = PERIOD_FORM_CONFIG[periodId];
    
    // Handle custom form structures
    if (periodId === 'eventos') {
      defaults.eventos = { items: [], periodObservations: '' };
      return;
    }
    if (periodId === 'cafeManhaNoShow') {
      defaults.cafeManhaNoShow = { 
          items: [], 
          periodObservations: '',
          newItem: { id: '', data: undefined, horario: '', hospede: '', uh: '', reserva: '', valor: undefined, observation: '' }
      };
      return;
    }
    if (periodId === 'controleCafeDaManha') {
      defaults.controleCafeDaManha = { 
          adultoQtd: undefined,
          crianca01Qtd: undefined,
          crianca02Qtd: undefined,
          contagemManual: undefined,
          semCheckIn: undefined,
          periodObservations: '',
      };
      return;
    }
    if (periodId === 'controleFrigobar') {
      defaults.controleFrigobar = { logs: [], periodObservations: '', checkoutsPrevistos: undefined, checkoutsProrrogados: undefined, abatimentoAvulso: undefined };
      return;
    }
    
    // Handle standard period structures
    if (!config) return;

    const currentPeriodData: any = { periodObservations: '' };

    if (config.channels) {
      currentPeriodData.channels = {};
      Object.keys(config.channels).forEach(channelId => {
        currentPeriodData.channels[channelId] = { qtd: undefined, vtotal: undefined };
      });
    }

    if (config.subTabs) {
      currentPeriodData.subTabs = {};
      Object.keys(config.subTabs).forEach(subTabKey => {
        const subTabConfig = config.subTabs![subTabKey];
        currentPeriodData.subTabs[subTabKey] = { channels: {}, faturadoItems: [], consumoInternoItems: [] };
        subTabConfig.groupedChannels.forEach(group => {
            if (group.qtd) currentPeriodData.subTabs[subTabKey].channels[group.qtd] = { qtd: undefined, vtotal: undefined };
            if (group.vtotal) currentPeriodData.subTabs[subTabKey].channels[group.vtotal] = { qtd: undefined, vtotal: undefined };
        });
      });
    }
    
    defaults[periodId] = currentPeriodData;
  });

  return defaults as z.infer<typeof dailyEntryFormSchema>;
})();
