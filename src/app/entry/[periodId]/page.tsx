
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; 
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { CalendarIcon, Loader2, List as ListIcon, DollarSign } from 'lucide-react';
import { PERIOD_DEFINITIONS, SALES_CHANNELS, PeriodId, PERIOD_FORM_CONFIG, getPeriodIcon, type PeriodDefinition, type IndividualPeriodConfig as PeriodConfig, type IndividualSubTabConfig as SubTabConfig, type SalesChannelId, EVENT_SERVICE_TYPES, type EventServiceTypeKey, EVENT_LOCATION_OPTIONS, type EventLocationKey } from '@/lib/constants';
import type { DailyEntryFormData, SalesItem, PeriodData, SubTabData, ChannelUnitPricesConfig, EventosPeriodData, DailyLogEntry, SubEventItem, EventItemData } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRouter, useParams as useNextParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ResumoLateralCard from '@/components/shared/ResumoLateralCard';
import { getDailyEntry, saveDailyEntry } from '@/services/dailyEntryService';
import { getSetting } from '@/services/settingsService';
import { v4 as uuidv4 } from 'uuid';

// Import period form components
import MadrugadaForm from '@/components/period-forms/MadrugadaForm';
import CafeDaManhaForm from '@/components/period-forms/CafeDaManhaForm';
import AlmocoPrimeiroTurnoForm from '@/components/period-forms/AlmocoPrimeiroTurnoForm';
import AlmocoSegundoTurnoForm from '@/components/period-forms/AlmocoSegundoTurnoForm';
import JantarForm from '@/components/period-forms/JantarForm';
import BaliAlmocoForm from '@/components/period-forms/BaliAlmocoForm';
import BaliHappyForm from '@/components/period-forms/BaliHappyForm';
import EventosForm from '@/components/period-forms/EventosForm';
import FrigobarForm from '@/components/period-forms/FrigobarForm';
import ItalianoAlmocoForm from '@/components/period-forms/ItalianoAlmocoForm';
import ItalianoJantarForm from '@/components/period-forms/ItalianoJantarForm';
import IndianoAlmocoForm from '@/components/period-forms/IndianoAlmocoForm';
import IndianoJantarForm from '@/components/period-forms/IndianoJantarForm';
import BreakfastForm from '@/components/period-forms/BreakfastForm';
import type { PeriodFormProps as GenericPeriodFormProps } from '@/components/period-forms/MadrugadaForm'; 
import type { PeriodFormProps as EventosSpecificFormProps } from '@/components/period-forms/EventosForm'; 


const salesItemSchema = z.object({
  qtd: z.coerce.number().min(0, "Quantidade deve ser positiva").optional(),
  vtotal: z.coerce.number().min(0, "Valor deve ser positivo").optional(),
}).optional();

const subTabDataSchema = z.object({
  channels: z.record(z.string(), salesItemSchema).optional(),
});

const basePeriodDataFields = {
  periodObservations: z.string().optional(),
};

const directChannelsSchema = z.object({
  channels: z.record(z.string(), salesItemSchema).optional(),
});

const subTabsContainerSchema = z.object({
  subTabs: z.record(z.string(), subTabDataSchema.optional()).optional(),
});

const eventServiceTypeKeys = Object.keys(EVENT_SERVICE_TYPES) as [EventServiceTypeKey, ...EventServiceTypeKey[]];
const eventLocationKeys = EVENT_LOCATION_OPTIONS.map(opt => opt.value) as [EventLocationKey, ...EventLocationKey[]];

const subEventItemSchema = z.object({
  id: z.string(),
  location: z.enum(eventLocationKeys).optional(),
  serviceType: z.enum(eventServiceTypeKeys).optional(),
  customServiceDescription: z.string().optional().default(''),
  quantity: z.coerce.number().min(0).optional(),
  totalValue: z.coerce.number().min(0).optional(),
});

const eventItemDataSchema = z.object({
  id: z.string(),
  eventName: z.string().optional().default(''),
  subEvents: z.array(subEventItemSchema).default([]),
});

const eventosPeriodSchema = z.object({
  items: z.array(eventItemDataSchema).default([]),
  periodObservations: z.string().optional().default(''),
});



const dailyEntryFormFields = PERIOD_DEFINITIONS.reduce((acc, periodDef) => {
  if (periodDef.id === 'eventos') {
    acc[periodDef.id] = eventosPeriodSchema.optional();
  } else {
    const config = PERIOD_FORM_CONFIG[periodDef.id];
    let specificPeriodSchema = z.object({...basePeriodDataFields});

    if (config.subTabs) {
      specificPeriodSchema = specificPeriodSchema.merge(subTabsContainerSchema);
    } else if (config.channels) {
      specificPeriodSchema = specificPeriodSchema.merge(directChannelsSchema);
    }
    acc[periodDef.id] = specificPeriodSchema.optional();
  }
  return acc;
}, {} as Record<PeriodId, z.ZodOptional<z.ZodObject<any, any, any>>>);


const dailyEntryFormSchema = z.object({
  date: z.date({ required_error: "Data é obrigatória." }),
  generalObservations: z.string().optional(),
  ...dailyEntryFormFields,
});

const initialDefaultValuesForAllPeriods: DailyEntryFormData = {
  date: new Date(),
  generalObservations: '',
  ...PERIOD_DEFINITIONS.reduce((acc, period) => {
    const periodId = period.id;
    if (periodId === 'eventos') {
      acc[periodId] = { 
        items: [], 
        periodObservations: '',
      } as EventosPeriodData;
    } else {
      const config = PERIOD_FORM_CONFIG[periodId];
      const currentPeriodData: Partial<PeriodData> = {
        periodObservations: '',
      };

      if (config.subTabs) {
        currentPeriodData.subTabs = Object.keys(config.subTabs).reduce((subAcc, subTabKey) => {
          subAcc[subTabKey] = { channels: {} };
          Object.keys(config.subTabs![subTabKey].channels).forEach(channelKey => {
              if (!subAcc[subTabKey].channels) subAcc[subTabKey].channels = {};
               subAcc[subTabKey].channels![channelKey as SalesChannelId] = { qtd: undefined, vtotal: undefined };
          });
          return subAcc;
        }, {} as Record<string, SubTabData>);
      } else if (config.channels) { 
        currentPeriodData.channels = {};
         Object.keys(config.channels).forEach(channelKey => {
            if (!currentPeriodData.channels) currentPeriodData.channels = {};
            currentPeriodData.channels[channelKey as SalesChannelId] = { qtd: undefined, vtotal: undefined };
         });
      }
      acc[periodId] = currentPeriodData as PeriodData;
    }
    return acc;
  }, {} as Partial<Record<PeriodId, PeriodData | EventosPeriodData>>) 
};


const PERIOD_FORM_COMPONENTS: Record<PeriodId, React.FC<GenericPeriodFormProps | EventosSpecificFormProps>> = {
  madrugada: MadrugadaForm,
  cafeDaManha: CafeDaManhaForm,
  almocoPrimeiroTurno: AlmocoPrimeiroTurnoForm,
  almocoSegundoTurno: AlmocoSegundoTurnoForm,
  jantar: JantarForm,
  baliAlmoco: BaliAlmocoForm,
  baliHappy: BaliHappyForm,
  eventos: EventosForm,
  frigobar: FrigobarForm,
  italianoAlmoco: ItalianoAlmocoForm,
  italianoJantar: ItalianoJantarForm,
  indianoAlmoco: IndianoAlmocoForm,
  indianoJantar: IndianoJantarForm,
  breakfast: BreakfastForm,
};

export default function PeriodEntryPage() {
  const { userRole } = useAuth();
  const router = useRouter();
  const params = useNextParams(); 
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // For save operation
  const [isDataLoading, setIsDataLoading] = useState(true); // For data fetching
  const [unitPricesConfig, setUnitPricesConfig] = useState<ChannelUnitPricesConfig>({});
  
  const activePeriodId = params.periodId as PeriodId;

  const [activeSubTabs, setActiveSubTabs] = useState<Record<PeriodId, string>>({});

  const form = useForm<DailyEntryFormData>({
    resolver: zodResolver(dailyEntryFormSchema),
    defaultValues: initialDefaultValuesForAllPeriods,
  });

  const watchedDate = form.watch("date");
  const watchedDateString = useMemo(() => 
    watchedDate && isValid(watchedDate) ? format(watchedDate, 'yyyy-MM-dd') : null,
  [watchedDate]);


  useEffect(() => {
    async function fetchInitialConfigs() {
      try {
        const prices = await getSetting<ChannelUnitPricesConfig>('channelUnitPricesConfig');
        setUnitPricesConfig(prices || {});
      } catch (error) {
        console.error("Failed to load unit prices config:", error);
        toast({ title: "Erro ao Carregar Configurações", description: "Não foi possível carregar os preços unitários.", variant: "destructive" });
      }
    }
    fetchInitialConfigs();
  }, [toast]);

  // Refactored data loading logic
  useEffect(() => {
    const loadAndSetData = async (dateToLoad: Date) => {
      setIsDataLoading(true);

      // Always start with a clean, zeroed-out form structure for the effective date
      let dataToResetWith: DailyEntryFormData = { 
        ...initialDefaultValuesForAllPeriods, 
        date: dateToLoad 
      };

      try {
        const entryForDate = await getDailyEntry(dateToLoad);

        // If an entry exists, merge its data into our default structure
        if (entryForDate) {
          dataToResetWith.generalObservations = entryForDate.generalObservations || '';
          
          PERIOD_DEFINITIONS.forEach(pDef => {
            const periodId = pDef.id;
            const existingPeriodData = entryForDate[periodId];

            if (existingPeriodData) {
              if (periodId === 'eventos') {
                const eventosData = existingPeriodData as EventosPeriodData;
                const processedEventItems = (eventosData.items || []).map(item => ({
                  ...item,
                  id: item.id || uuidv4(),
                  subEvents: (item.subEvents || []).map(sub => ({ ...sub, id: sub.id || uuidv4() }))
                }));
                dataToResetWith.eventos = {
                  ...(initialDefaultValuesForAllPeriods.eventos as EventosPeriodData),
                  ...eventosData,
                  items: processedEventItems,
                };
              } else {
                const periodDefaults = initialDefaultValuesForAllPeriods[periodId] as PeriodData;
                const existing = existingPeriodData as PeriodData;
                
                // Deep merge logic to ensure all fields from defaults are present
                dataToResetWith[periodId] = {
                  ...periodDefaults,
                  ...existing,
                  channels: {
                    ...(periodDefaults.channels || {}),
                    ...(existing.channels || {}),
                  },
                  subTabs: {
                    ...(periodDefaults.subTabs || {}),
                    ...Object.keys(periodDefaults.subTabs || {}).reduce((acc, subTabKey) => {
                      const defaultSubTab = periodDefaults.subTabs?.[subTabKey];
                      const existingSubTab = existing.subTabs?.[subTabKey];
                      acc[subTabKey] = {
                        ...defaultSubTab,
                        ...existingSubTab,
                        channels: {
                          ...(defaultSubTab?.channels || {}),
                          ...(existingSubTab?.channels || {}),
                        },
                      };
                      return acc;
                    }, {} as Record<string, SubTabData>),
                  },
                };
              }
            }
          });
        }
        // If no entry is found, `dataToResetWith` remains the clean default object.
      } catch (error) {
        console.error("Error loading data for date:", error);
        toast({ title: "Erro ao Carregar Dados", description: (error as Error).message || "Não foi possível carregar os lançamentos para esta data.", variant: "destructive" });
        // On error, we still use the clean default object to reset the form.
      } finally {
        form.reset(dataToResetWith);
        setIsDataLoading(false);
      }
    };

    const dateToProcess = userRole === 'operator' ? new Date() : watchedDate;
    if(dateToProcess && isValid(dateToProcess)) {
      loadAndSetData(dateToProcess);
    }
  }, [watchedDateString, userRole, form, toast]);


  const calculateSubTabTotal = useCallback((periodId: PeriodId, subTabId: string): number => {
    const subTabDataPath = `${periodId}.subTabs.${subTabId}.channels`;
    const channelsData = form.getValues(subTabDataPath as any) as PeriodData['subTabs'][string]['channels'];
    let total = 0;
    if (channelsData) {
      for (const channelKey in channelsData) {
        const channel = channelsData[channelKey as SalesChannelId];
        if (channel?.vtotal) {
          total += Number(channel.vtotal);
        }
      }
    }
    return total;
  }, [form]);

  const calculatePeriodTotal = useCallback((periodIdToCalc: PeriodId) => {
    const periodData = form.getValues(periodIdToCalc);
    const config = PERIOD_FORM_CONFIG[periodIdToCalc];
    let total = 0;

    if (periodIdToCalc === 'eventos') {
      const eventosData = periodData as EventosPeriodData | undefined;
      (eventosData?.items || []).forEach(item => {
        (item.subEvents || []).forEach(subEvent => {
          total += subEvent.totalValue || 0;
        });
      });
      return total;
    }
    
    const standardPeriodData = periodData as PeriodData | undefined; 
    if (config.subTabs && standardPeriodData?.subTabs) {
      for (const subTabKey in config.subTabs) {
        if(standardPeriodData.subTabs[subTabKey]){
            total += calculateSubTabTotal(periodIdToCalc, subTabKey);
        }
      }
    } else if (standardPeriodData?.channels) { 
      for (const channelKey in standardPeriodData.channels) {
        const channel = standardPeriodData.channels[channelKey as SalesChannelId];
        if (channel?.vtotal) {
          total += Number(channel.vtotal);
        }
      }
    }
    return total;
  }, [form, calculateSubTabTotal]);

  const onSubmit = async (data: DailyEntryFormData) => {
    setIsLoading(true);
    const dateFromForm = data.date;

    if (!(dateFromForm instanceof Date) || !isValid(dateFromForm)) {
        toast({ title: "Data Inválida", description: "Não é possível salvar o lançamento com uma data inválida.", variant: "destructive" });
        setIsLoading(false);
        form.setValue('date', new Date(), { shouldValidate: true, shouldDirty: true }); 
        return;
    }

    const dateToSave = userRole === 'operator' ? new Date() : dateFromForm;
    
    const dataToSubmit = { ...data };
    if (dataToSubmit.eventos && dataToSubmit.eventos.items) {
      dataToSubmit.eventos.items = dataToSubmit.eventos.items.map(eventItem => ({
        ...eventItem,
        id: eventItem.id || uuidv4(),
        subEvents: (eventItem.subEvents || []).map(subEvent => ({
          ...subEvent,
          id: subEvent.id || uuidv4(),
        }))
      }));
    }


    try {
      await saveDailyEntry(dateToSave, dataToSubmit);
      toast({
        title: "Sucesso!",
        description: `Lançamento para ${format(dateToSave, 'dd/MM/yyyy', {locale: ptBR})} salvo.`,
      });
    } catch (error) {
      console.error("Error saving daily entry:", error);
      toast({
        title: "Erro ao Salvar",
        description: (error as Error).message || "Não foi possível salvar os dados. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderChannelInputs = useCallback((
    channelsConfig: NonNullable<PeriodConfig['channels'] | SubTabConfig['channels']>,
    basePath: string,
    totalValue: number, 
    currentForm: UseFormReturn<DailyEntryFormData>,
    currentUnitPrices: ChannelUnitPricesConfig,
    formPeriodId: PeriodId 
  ) => {
    return (
      <div className="border rounded-md overflow-hidden">
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between font-semibold text-sm text-muted-foreground bg-muted/50 px-3 py-2 border-b">
          <span className="w-full xs:w-3/5 mb-1 xs:mb-0">OPERAÇÃO</span>
          <span className="w-full xs:w-2/5 text-left xs:text-right">QTD / R$ TOTAL</span>
        </div>
        <div className="divide-y divide-border">
          {Object.entries(channelsConfig).map(([channelId, channelCfg]) => {
             if (channelCfg.text) { 
                return null; 
             }
            const isPureQtyField = channelCfg.qtd && !channelCfg.vtotal;
            const isPureVtotalField = channelCfg.vtotal && !channelCfg.qtd;
            const isBothQtyAndVtotal = channelCfg.qtd && channelCfg.vtotal;

            const CurrentIcon = isPureQtyField || isBothQtyAndVtotal ? ListIcon : null;
            const VTotalIcon = isPureVtotalField || isBothQtyAndVtotal ? DollarSign : null;
            
            const unitPriceForChannel = currentUnitPrices[channelId as SalesChannelId];
            const isVtotalDisabledByUnitPrice = typeof unitPriceForChannel === 'number' && !isNaN(unitPriceForChannel);

            return (
              <div key={channelId} className="flex flex-col xs:flex-row items-start xs:items-center justify-between px-3 py-3 hover:bg-muted/20 transition-colors">
                <span className="w-full xs:w-3/5 font-medium text-sm mb-2 xs:mb-0">
                  {SALES_CHANNELS[channelId as SalesChannelId]}
                </span>
                <div className="w-full xs:w-2/5 flex items-center justify-end space-x-2">
                  <div className={cn("flex-grow flex gap-2", isBothQtyAndVtotal ? "sm:max-w-[200px]" : "sm:max-w-[120px]")}>
                    {channelCfg.qtd && (
                      <FormField
                        control={currentForm.control}
                        name={`${basePath}.${channelId}.qtd` as any}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="relative">
                                {CurrentIcon && <CurrentIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                                <Input 
                                  type="number" 
                                  placeholder="0" 
                                  {...field} 
                                  value={field.value ?? ''} 
                                  onChange={e => {
                                    const rawValue = e.target.value;
                                    const newQty = rawValue === '' ? undefined : parseFloat(rawValue);
                                    field.onChange(newQty);

                                    if (isVtotalDisabledByUnitPrice) {
                                      const calculatedVtotal = (Number(newQty) || 0) * unitPriceForChannel;
                                      currentForm.setValue(`${basePath}.${channelId}.vtotal` as any, calculatedVtotal, { shouldValidate: true, shouldDirty: true });
                                    }
                                  }} 
                                  className="h-8 text-sm text-right w-full pl-7" 
                                  />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs mt-1 text-right" />
                          </FormItem>
                        )}
                      />
                    )}
                    {channelCfg.vtotal && (
                    <FormField
                        control={currentForm.control}
                        name={`${basePath}.${channelId}.vtotal` as any}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                             <FormControl>
                                <div className="relative">
                                  {VTotalIcon && <VTotalIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    className="h-8 text-sm text-right w-full pl-7"
                                    disabled={isVtotalDisabledByUnitPrice}
                                  />
                                </div>
                              </FormControl>
                            <FormMessage className="text-xs mt-1 text-right" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between px-3 py-3 bg-muted/50 border-t">
          <span className="w-full xs:w-3/5 font-semibold text-sm text-foreground mb-1 xs:mb-0">
            TOTAL ACUMULADO
          </span>
          <div className="w-full xs:w-2/5 flex items-center justify-start xs:justify-end space-x-1 font-semibold text-sm text-foreground">
            <span className="text-muted-foreground">R$</span>
            <span>{totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    );
  }, []); 

  const activePeriodDefinition = PERIOD_DEFINITIONS.find(p => p.id === activePeriodId);
  const activePeriodConfig = activePeriodDefinition ? PERIOD_FORM_CONFIG[activePeriodId] : null;

  if (!activePeriodDefinition || !activePeriodConfig) { // Show loader if these are not ready yet.
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const PeriodSpecificFormComponent = PERIOD_FORM_COMPONENTS[activePeriodId] as React.FC<GenericPeriodFormProps | EventosSpecificFormProps>;
  
  const formPropsForComponent: GenericPeriodFormProps | EventosSpecificFormProps = {
    form: form,
    periodId: activePeriodId,
    periodDefinition: activePeriodDefinition,
    periodConfig: activePeriodConfig as any,
    unitPricesConfig: unitPricesConfig,
    calculatePeriodTotal: calculatePeriodTotal,
    renderChannelInputs: renderChannelInputs,
    ...( (activePeriodConfig.subTabs || activePeriodId === 'eventos') && { 
      activeSubTabs: activeSubTabs,
      setActiveSubTabs: setActiveSubTabs,
      calculateSubTabTotal: calculateSubTabTotal,
    }),
     ...(activePeriodId === 'eventos' && {
      triggerMainSubmit: form.handleSubmit(onSubmit),
      isMainFormLoading: isLoading || isDataLoading,
    })
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Lançamento Diário: {activePeriodDefinition.label}</h1>
        <Button variant="outline" onClick={() => router.push('/entry')}>Voltar para Seleção</Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
        <div className="lg:w-1/2 space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data do Lançamento</FormLabel>
                        {userRole === 'administrator' ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full max-w-xs sm:max-w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value && isValid(field.value) ? format(field.value, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value instanceof Date && isValid(field.value) ? field.value : undefined}
                                onSelect={(newDate) => {
                                  if (newDate && isValid(newDate)) {
                                      field.onChange(newDate);
                                  }
                                }}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <p className="text-base font-medium pt-2">
                            {field.value && isValid(field.value) ? format(field.value, "PPP", { locale: ptBR }) : format(new Date(), "PPP", { locale: ptBR })}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="generalObservations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Gerais do Dia</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Notas sobre o dia, eventos especiais, etc." {...field} value={field.value ?? ''}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {isDataLoading ? (
                 <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /> Carregando dados do período...</div>
              ) : PeriodSpecificFormComponent ? (
                 React.createElement(PeriodSpecificFormComponent, formPropsForComponent) 
              ) : (
                <Card>
                  <CardHeader><CardTitle>Erro de Configuração</CardTitle></CardHeader>
                  <CardContent>
                    <p>Componente de formulário para o período '{activePeriodDefinition.label}' não foi encontrado. Verifique a configuração.</p>
                  </CardContent>
                </Card>
              )}
              
              <Button type="submit" className="w-full md:w-auto" disabled={isLoading || isDataLoading}>
                {(isLoading || isDataLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Lançamento
              </Button>
            </form>
          </Form>
        </div>
        <div className="lg:w-1/2 lg:sticky lg:top-24 h-fit">
           <ResumoLateralCard 
              dailyData={form.watch()}
            />
        </div>
      </div>
    </div>
  );
}
