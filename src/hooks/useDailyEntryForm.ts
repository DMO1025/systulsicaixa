

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

import type { DailyEntryFormData, ChannelUnitPricesConfig, DailyLogEntry, PeriodData, EventosPeriodData, PeriodId, FaturadoItem, ConsumoInternoItem, CafeManhaNoShowItem, CafeManhaNoShowPeriodData, ControleCafePeriodData, ControleCafeItem, UserRole, FrigobarPeriodData } from '@/lib/types';
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

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedDataRef = useRef<DailyEntryFormData | null>(null);

  const form = useForm<DailyEntryFormData>({
    resolver: zodResolver(dailyEntryFormSchema),
    defaultValues: initialDefaultValuesForAllPeriods,
    mode: 'onBlur',
  });

  const watchedDate = form.watch("date");
  const watchedDateString = useMemo(() =>
    watchedDate && isValid(watchedDate) ? format(watchedDate, 'yyyy-MM-dd') : null,
  [watchedDate]);

  useEffect(() => {
    if (isDateInitialized || !userRole) return;

    let initialDate = new Date();
    try {
        const savedDateString = localStorage.getItem('lastSelectedEntryDate');
        if (savedDateString) {
            const parsedDate = parseISO(savedDateString);
            if (isValid(parsedDate)) {
                initialDate = parsedDate;
            }
        }
    } catch (error) {
        console.warn("Could not read date from localStorage, defaulting to today.");
    }
    
    form.setValue('date', initialDate, { shouldValidate: true });
    setIsDateInitialized(true);
  }, [userRole, form, isDateInitialized]);


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

  const loadEntryData = useCallback(async (dateToLoad: Date) => {
    if (!dateToLoad || !isValid(dateToLoad)) return;

    setIsDataLoading(true);
    setAutoSaveStatus('idle');
    let dataToResetWith: DailyEntryFormData = { ...initialDefaultValuesForAllPeriods, date: dateToLoad };

    try {
      const entryForDate = await getDailyEntry(dateToLoad);
      if (entryForDate) {
        dataToResetWith.generalObservations = entryForDate.generalObservations || '';
        PERIOD_DEFINITIONS.forEach(pDef => {
          const periodId = pDef.id;
          const existingPeriodData = entryForDate[periodId as keyof typeof entryForDate];
          if (existingPeriodData) {
            dataToResetWith[periodId] = existingPeriodData as any;
          }
        });
      }
    } catch (error) {
      toast({ title: "Erro ao Carregar Lançamento", description: (error as Error).message, variant: "destructive" });
    } finally {
      form.reset(dataToResetWith);
      lastSavedDataRef.current = dataToResetWith;
      setIsDataLoading(false);
    }
  }, [form, toast]);


  useEffect(() => {
    if (activePeriodId.startsWith('controle')) {
        setIsDataLoading(false);
        return;
    }
    if (watchedDateString) {
      const dateToLoad = parseISO(watchedDateString);
      if (isValid(dateToLoad)) {
        loadEntryData(dateToLoad);
        try {
            localStorage.setItem('lastSelectedEntryDate', watchedDateString);
        } catch (error) {
            console.warn("Could not save date to localStorage.");
        }
      }
    } else {
      setIsDataLoading(true);
    }
  }, [watchedDateString, loadEntryData, activePeriodId]);
  
  // --- AUTO-SAVE LOGIC ---
  const triggerAutoSave = useCallback((data: DailyEntryFormData) => {
      // Do not auto-save for control pages.
      if (activePeriodId.startsWith('controle')) {
          return;
      }
      
      if (isDataLoading || isSavingRef.current) {
          return;
      }
      
      const dateToSave = userRole === 'operator' ? new Date() : data.date;
      if (!isValid(dateToSave)) {
          setAutoSaveStatus('error');
          return;
      }
      isSavingRef.current = true;
      setAutoSaveStatus('saving');
      
      saveDailyEntry(dateToSave, data).then(savedEntry => {
          const savedDateStr = format(dateToSave, 'dd/MM/yyyy');
          setLastSaved(new Date());
          setAutoSaveStatus('success');
          toast({ title: "Salvo com sucesso!", description: `Dados para ${savedDateStr} salvos.` });
          
          if (!datesWithEntries.some(d => format(d, 'yyyy-MM-dd') === format(dateToSave, 'yyyy-MM-dd'))) {
              setDatesWithEntries(prev => [...prev, dateToSave]);
          }
      }).catch(error => {
          setAutoSaveStatus('error');
          toast({ title: "Erro no Salvamento Automático", description: (error as Error).message, variant: "destructive" });
      }).finally(() => {
          isSavingRef.current = false;
      });

  }, [isDataLoading, userRole, toast, datesWithEntries, activePeriodId]);

  useEffect(() => {
      const subscription = form.watch((value, { name, type }) => {
          if (!name || isDataLoading) return;
          if (name === 'date' && type === 'change') return;
          
          if (debounceTimer.current) {
              clearTimeout(debounceTimer.current);
          }
          setAutoSaveStatus('saving');
          debounceTimer.current = setTimeout(() => {
              triggerAutoSave(value as DailyEntryFormData);
          }, 1500);
      });
      return () => {
          subscription.unsubscribe();
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
  }, [form, triggerAutoSave, isDataLoading]);


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
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    triggerAutoSave(data);
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
    router,
    autoSaveStatus,
    lastSaved,
  };
}
