

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

import type { DailyEntryFormData, ChannelUnitPricesConfig, DailyLogEntry, PeriodData, EventosPeriodData, PeriodId, FaturadoItem, ConsumoInternoItem, CafeManhaNoShowItem, CafeManhaNoShowPeriodData, ControleCafePeriodData, ControleCafeItem, UserRole } from '@/lib/types';
import { getDailyEntry, saveDailyEntry, getAllEntryDates } from '@/services/dailyEntryService';
import { getSetting } from '@/services/settingsService';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { PERIOD_FORM_CONFIG } from '@/lib/config/forms';
import { dailyEntryFormSchema, initialDefaultValuesForAllPeriods } from '@/lib/form-schema';
import { getSafeNumericValue } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function useDailyEntryForm(activePeriodId: PeriodId) {
  const { userRole, operatorShift } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [unitPricesConfig, setUnitPricesConfig] = useState<ChannelUnitPricesConfig>({});
  const [isDateInitialized, setIsDateInitialized] = useState(false);
  const [datesWithEntries, setDatesWithEntries] = useState<Date[]>([]);
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
    if (isDateInitialized || !userRole) return;

    let initialDate: Date | undefined;
    if (userRole === 'administrator') {
      const storedDateStr = localStorage.getItem('entryflow-selected-date');
      if (storedDateStr) {
        const parsedDate = parseISO(storedDateStr);
        if (isValid(parsedDate)) initialDate = parsedDate;
      }
    }
    form.setValue('date', initialDate || new Date(), { shouldValidate: true, shouldDirty: true });
    setIsDateInitialized(true);
  }, [userRole, form, isDateInitialized]);

  useEffect(() => {
    if (isDateInitialized && userRole === 'administrator' && watchedDate && isValid(watchedDate)) {
      localStorage.setItem('entryflow-selected-date', watchedDate.toISOString());
    }
  }, [watchedDate, userRole, isDateInitialized]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [prices, allEntryDates] = await Promise.all([
          getSetting<ChannelUnitPricesConfig>('channelUnitPricesConfig'),
          getAllEntryDates()
        ]);
        setUnitPricesConfig(prices || {});
        const dates = allEntryDates.map(e => parseISO(e.id)).filter(isValid);
        setDatesWithEntries(dates);
      } catch (error) {
        toast({ title: "Erro ao Carregar Configurações", description: (error as Error).message, variant: "destructive" });
      }
    };
    fetchInitialData();
  }, [toast]);

  useEffect(() => {
    const loadEntryData = async (dateToLoad: Date) => {
      setIsDataLoading(true);
      let dataToResetWith: DailyEntryFormData = { ...initialDefaultValuesForAllPeriods, date: dateToLoad };

      try {
        const entryForDate = await getDailyEntry(dateToLoad);
        if (entryForDate) {
          dataToResetWith.generalObservations = entryForDate.generalObservations || '';
          
          PERIOD_DEFINITIONS.forEach(pDef => {
            const periodId = pDef.id;
            const existingPeriodData = entryForDate[periodId as keyof typeof entryForDate];
            if (existingPeriodData) {
              if (periodId === 'eventos') {
                 const eventosData = existingPeriodData as EventosPeriodData;
                 dataToResetWith.eventos = {
                    ...(initialDefaultValuesForAllPeriods.eventos as EventosPeriodData), ...eventosData,
                    items: (eventosData.items || []).map(item => ({ ...item, id: item.id || uuidv4(), subEvents: (item.subEvents || []).map(sub => ({ ...sub, id: sub.id || uuidv4() })) })),
                 };
              } else if (periodId === 'cafeManhaNoShow') {
                  const noShowData = existingPeriodData as CafeManhaNoShowPeriodData;
                  dataToResetWith.cafeManhaNoShow = {
                      ...(initialDefaultValuesForAllPeriods.cafeManhaNoShow as CafeManhaNoShowPeriodData),
                      ...noShowData,
                      items: (noShowData.items || []).map(item => ({ ...item, id: item.id || uuidv4()})),
                      // newItem is kept as default to allow new entries
                  };
              } else if (periodId === 'controleCafeDaManha') {
                  const controleData = existingPeriodData as ControleCafePeriodData;
                  dataToResetWith.controleCafeDaManha = {
                      ...(initialDefaultValuesForAllPeriods.controleCafeDaManha as ControleCafePeriodData),
                      ...controleData,
                      items: (controleData.items || []).map(item => ({ ...item, id: item.id || uuidv4()})),
                  };
              } else {
                 const periodDefaults = initialDefaultValuesForAllPeriods[periodId] as PeriodData;
                 const existing = existingPeriodData as PeriodData;
                 dataToResetWith[periodId] = {
                    ...periodDefaults, ...existing,
                    channels: { ...(periodDefaults.channels || {}), ...(existing.channels || {}) },
                    subTabs: {
                        ...(periodDefaults.subTabs || {}),
                        ...Object.keys(periodDefaults.subTabs || {}).reduce((acc, subTabKey) => {
                            acc[subTabKey] = { ...(periodDefaults.subTabs?.[subTabKey]), ...(existing.subTabs?.[subTabKey]), channels: { ...(periodDefaults.subTabs?.[subTabKey]?.channels || {}), ...(existing.subTabs?.[subTabKey]?.channels || {}) },
                            faturadoItems: (existing.subTabs?.[subTabKey]?.faturadoItems || []).map(item => ({...item, id: item.id || uuidv4()})),
                            consumoInternoItems: (existing.subTabs?.[subTabKey]?.consumoInternoItems || []).map(item => ({...item, id: item.id || uuidv4()}))
                            };
                            return acc;
                        }, {} as Record<string, any>),
                    },
                 };
              }
            }
          });
        }
      } catch (error) {
        toast({ title: "Erro ao Carregar Lançamento", description: (error as Error).message, variant: "destructive" });
      } finally {
        form.reset(dataToResetWith);
        setIsDataLoading(false);
      }
    };

    if (isDateInitialized && watchedDateString) {
      const dateToLoad = parseISO(watchedDateString);
      if (isValid(dateToLoad)) loadEntryData(dateToLoad);
    } else {
      setIsDataLoading(true);
    }
  }, [watchedDateString, form, toast, isDateInitialized]);

  const calculateSubTabTotal = useCallback((periodId: PeriodId, subTabId: string): number => {
    const subTab = form.getValues(`${periodId}.subTabs.${subTabId}` as any);
    let total = 0;
    if (subTab?.channels) {
      Object.values(subTab.channels).forEach((channel: any) => {
        if (channel?.vtotal) total += Number(channel.vtotal);
      });
    }
    if(subTab?.faturadoItems){
        total += subTab.faturadoItems.reduce((acc: number, item: FaturadoItem) => acc + (item.value || 0), 0);
    }
    if(subTab?.consumoInternoItems){
        total += subTab.consumoInternoItems.reduce((acc: number, item: ConsumoInternoItem) => acc + (item.value || 0), 0);
    }
    return total;
  }, [form]);

  const calculatePeriodTotal = useCallback((periodIdToCalc: PeriodId) => {
    const periodData = form.getValues(periodIdToCalc);
    let total = 0;
    if (periodIdToCalc === 'eventos') {
        const eventosData = periodData as EventosPeriodData;
        total = eventosData?.items?.reduce((acc, item) => 
            acc + (item.subEvents?.reduce((subAcc, sub) => subAcc + (sub.totalValue || 0), 0) || 0), 0) || 0;
    } else if (periodIdToCalc === 'cafeManhaNoShow') {
        const noShowData = periodData as CafeManhaNoShowPeriodData;
        total = noShowData?.items?.reduce((acc, item) => acc + (item.valor || 0), 0) || 0;
    } else {
        const pData = periodData as PeriodData;
        if (pData?.channels) {
            total += Object.values(pData.channels).reduce((acc, ch) => acc + getSafeNumericValue(ch, 'vtotal'), 0);
        }
        if (pData?.subTabs) {
            total += Object.values(pData.subTabs).reduce((subTabAcc, subTab) => {
                let subTotal = 0;
                if (subTab?.channels) {
                    subTotal += Object.values(subTab.channels).reduce((acc, ch) => acc + getSafeNumericValue(ch, 'vtotal'), 0);
                }
                if(subTab?.faturadoItems){
                    subTotal += subTab.faturadoItems.reduce((acc, item) => acc + (item.value || 0), 0);
                }
                if(subTab?.consumoInternoItems){
                    subTotal += subTab.consumoInternoItems.reduce((acc, item) => acc + (item.value || 0), 0);
                }
                return subTabAcc + subTotal;
            }, 0);
        }
    }
    return total;
  }, [form]);

  const onSubmit = async (data: DailyEntryFormData) => {
    setIsLoading(true);
    const dateToSave = userRole === 'operator' ? new Date() : data.date;
    if (!isValid(dateToSave)) {
        toast({ title: "Data Inválida", description: "A data selecionada para o lançamento é inválida.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    // Special handling for cafeManhaNoShow newItem
    if (data.cafeManhaNoShow && data.cafeManhaNoShow.newItem) {
        const newItem = data.cafeManhaNoShow.newItem as CafeManhaNoShowItem;
        if (Object.values(newItem).some(v => v !== undefined && v !== '')) {
            const currentItems = data.cafeManhaNoShow.items || [];
            data.cafeManhaNoShow.items = [...currentItems, { ...newItem, id: uuidv4() }];
        }
        data.cafeManhaNoShow.newItem = initialDefaultValuesForAllPeriods.cafeManhaNoShow?.newItem;
    }
    
    // Special handling for controleCafeDaManha newItem
    if (data.controleCafeDaManha && data.controleCafeDaManha.newItem) {
        const newItem = data.controleCafeDaManha.newItem as ControleCafeItem;
        if (Object.values(newItem).some(v => v !== undefined && v !== '')) {
            const currentItems = data.controleCafeDaManha.items || [];
            data.controleCafeDaManha.items = [...currentItems, { ...newItem, id: uuidv4() }];
        }
        data.controleCafeDaManha.newItem = initialDefaultValuesForAllPeriods.controleCafeDaManha?.newItem;
    }


    try {
      await saveDailyEntry(dateToSave, data);
      toast({ title: "Sucesso!", description: `Lançamento para ${format(dateToSave, 'dd/MM/yyyy')} salvo.` });
      
      form.reset(data);
      
      const newDates = await getAllEntryDates();
      setDatesWithEntries(newDates.map(e => parseISO(e.id)).filter(isValid));
    } catch (error) {
      toast({ title: "Erro ao Salvar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const activePeriodDefinition = PERIOD_DEFINITIONS.find(p => p.id === activePeriodId)!;
  const activePeriodConfig = PERIOD_FORM_CONFIG[activePeriodId];

  return {
    form,
    isLoading,
    isDataLoading,
    unitPricesConfig,
    datesWithEntries,
    activeSubTabs,
    setActiveSubTabs,
    activePeriodDefinition,
    activePeriodConfig,
    calculatePeriodTotal,
    calculateSubTabTotal,
    onSubmit,
    router
  };
}
