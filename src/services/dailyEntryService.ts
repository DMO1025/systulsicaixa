

import type { DailyEntryFormData, DailyLogEntry, EventosPeriodData, PeriodData, BilledClient, FaturadoItem } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { format, parseISO, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { getSetting, saveSetting } from './settingsService';

const API_BASE_URL = '/api/daily-entry';

function getFaturadoItemsFromData(data: DailyEntryFormData): FaturadoItem[] {
    const allItems: FaturadoItem[] = [];
    
    const almocoPT = data.almocoPrimeiroTurno?.subTabs?.faturado?.faturadoItems;
    if (almocoPT) allItems.push(...almocoPT);

    const almocoST = data.almocoSegundoTurno?.subTabs?.faturado?.faturadoItems;
    if (almocoST) allItems.push(...almocoST);

    const jantar = data.jantar?.subTabs?.faturado?.faturadoItems;
    if (jantar) allItems.push(...jantar);
    
    return allItems;
}

function processEntryFromSource(entry: any): DailyLogEntry {
  if (!entry) return entry;

  const processedEntry = { ...entry };

  if (entry.id && typeof entry.id === 'string' && entry.id.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsedDateFromId = parseISO(entry.id);
      if (isValid(parsedDateFromId)) {
        processedEntry.date = parsedDateFromId;
      }
  } else if (processedEntry.date && typeof processedEntry.date === 'string') {
    const parsedDate = parseISO(processedEntry.date);
    if (isValid(parsedDate)) {
      processedEntry.date = parsedDate;
    }
  }


  PERIOD_DEFINITIONS.forEach(pDef => {
    const periodKey = pDef.id as keyof DailyLogEntry;
    if (processedEntry[periodKey] && typeof processedEntry[periodKey] === 'string') {
      try {
        const parsedData = JSON.parse(processedEntry[periodKey] as string);
        processedEntry[periodKey] = parsedData;
      } catch (e) {
        console.error(`Erro ao analisar a string do período ${pDef.id} para o lançamento ${processedEntry.id}:`, e);
      }
    }
    if (pDef.id === 'eventos' && processedEntry.eventos && typeof processedEntry.eventos === 'object') {
        const eventosData = processedEntry.eventos as EventosPeriodData;
        if (!Array.isArray(eventosData.items)) {
            eventosData.items = [];
        } else {
            eventosData.items = eventosData.items.map((item: any) => ({
                ...item,
                id: item.id || uuidv4(),
                subEvents: (Array.isArray(item.subEvents) ? item.subEvents : []).map((subItem: any) => ({
                    ...subItem,
                    id: subItem.id || uuidv4(),
                }))
            }));
        }
    }
  });

  return processedEntry as DailyLogEntry;
}

export async function getDailyEntry(date: Date, baseUrl?: string): Promise<DailyLogEntry | null> {
  if (!(date instanceof Date) || !isValid(date)) {
    console.error('Serviço getDailyEntry chamado com data inválida:', date);
    throw new Error('Tentativa de buscar lançamento com data inválida.');
  }
  const formattedDate = format(date, 'yyyy-MM-dd');
  const finalUrl = `${baseUrl || ''}${API_BASE_URL}/${formattedDate}`;

  try {
    const response = await fetch(finalUrl, { cache: 'no-store' });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      let errorMessage = `Falha ao buscar lançamento para ${formattedDate}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `${errorMessage}: ${response.statusText || 'Erro desconhecido do servidor'}`;
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data ? processEntryFromSource(data) : null;
  } catch (error) {
    console.error(`Erro ao buscar lançamento para ${formattedDate}:`, error);
    throw error;
  }
}

export async function saveDailyEntry(date: Date, data: DailyEntryFormData, baseUrl?: string): Promise<DailyLogEntry> {
  if (!(date instanceof Date) || !isValid(date)) {
    console.error('Serviço saveDailyEntry chamado com data inválida:', date);
    throw new Error('Tentativa de salvar lançamento com data inválida.');
  }

  const formattedDate = format(date, 'yyyy-MM-dd');
  const finalUrl = `${baseUrl || ''}${API_BASE_URL}/${formattedDate}`;
  
  const payloadForApi = { ...data } as any;
  if (payloadForApi.date instanceof Date && isValid(payloadForApi.date)) {
      payloadForApi.date = format(payloadForApi.date, 'yyyy-MM-dd');
  }
   PERIOD_DEFINITIONS.forEach(pDef => {
    const periodKey = pDef.id as keyof DailyEntryFormData;
    if (payloadForApi[periodKey] && typeof payloadForApi[periodKey] === 'string') {
      try {
        payloadForApi[periodKey] = JSON.parse(payloadForApi[periodKey] as string);
      } catch (e) { /* se não for JSON válido, pode ser um erro ou já primitivo, passar como está */ }
    }
  });

  try {
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadForApi), 
    });

    if (!response.ok) {
      let errorDetail = `Status: ${response.status}, ${response.statusText || 'Falha ao salvar'}`;
       try {
        const errorData = await response.json();
        errorDetail = errorData.message || errorDetail;
      } catch (e) {
      }
      throw new Error(`Falha ao salvar lançamento: ${errorDetail}`);
    }
    const responseData = await response.json();
    if (!responseData || !responseData.data) {
        throw new Error(`Resposta inválida do servidor após salvar lançamento.`);
    }
    return processEntryFromSource(responseData.data); 
  } catch (error) {
    console.error(`Erro ao salvar lançamento para ${formattedDate}:`, error);
    throw error;
  }
}

export async function getAllDailyEntries(startDate?: string, endDate?: string, baseUrl?: string, fields?: string): Promise<Partial<DailyLogEntry>[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (fields) params.append('fields', fields);

    const queryString = params.toString();
    const url = `${baseUrl || ''}${API_BASE_URL}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      let errorMessage = 'Falha ao buscar todos os lançamentos';
       try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `${errorMessage}: ${response.statusText || 'Erro desconhecido do servidor'}`;
      }
      throw new Error(errorMessage);
    }
    const entriesFromApi: any[] = await response.json();
    if (fields === 'id') {
      return entriesFromApi;
    }
    return entriesFromApi.map(processEntryFromSource);
  } catch (error) {
    console.error('Erro ao buscar todos os lançamentos:', error);
    throw error;
  }
}

export async function getAllEntryDates(baseUrl?: string): Promise<{ id: string }[]> {
  // This function is now a convenience wrapper around the optimized getAllDailyEntries
  try {
    const entries = await getAllDailyEntries(undefined, undefined, baseUrl, 'id');
    return entries as { id: string }[];
  } catch (error) {
    console.error('Erro ao buscar datas dos lançamentos:', error);
    throw error;
  }
}
