
import type { DailyEntryFormData, DailyLogEntry, EventosPeriodData, PeriodData } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/constants';
import { format, parseISO, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = '/api/daily-entry';

function processEntryFromSource(entry: any): DailyLogEntry {
  if (!entry) return entry;

  const processedEntry = { ...entry };

  if (processedEntry.date && typeof processedEntry.date === 'string') {
    const parsedDate = parseISO(processedEntry.date);
    if (isValid(parsedDate)) {
      processedEntry.date = parsedDate;
    } else {
      console.warn(`Data inválida da fonte para o ID ${processedEntry.id}: ${entry.date}`);
      processedEntry.date = new Date(NaN);
    }
  } else if (processedEntry.date && !(processedEntry.date instanceof Date)) {
     console.warn(`Data para o ID ${processedEntry.id} não é uma string ou objeto Date. Definindo como inválida.`);
     processedEntry.date = new Date(NaN);
  } else if (!processedEntry.date) {
    if (processedEntry.id && typeof processedEntry.id === 'string') {
        const parsedDateFromId = parseISO(processedEntry.id);
        if (isValid(parsedDateFromId)) {
            processedEntry.date = parsedDateFromId;
        } else {
            console.warn(`Data ausente para o ID ${processedEntry.id}, e ID não é uma data válida. Definindo como inválida.`);
            processedEntry.date = new Date(NaN);
        }
    } else {
        console.warn(`Data e ID ausentes ou inválidos. Definindo como inválida.`);
        processedEntry.date = new Date(NaN);
    }
  }


  PERIOD_DEFINITIONS.forEach(pDef => {
    const periodKey = pDef.id as keyof DailyLogEntry;
    if (processedEntry[periodKey] && typeof processedEntry[periodKey] === 'string') {
      try {
        processedEntry[periodKey] = JSON.parse(processedEntry[periodKey] as string);
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

export async function getDailyEntry(date: Date): Promise<DailyLogEntry | null> {
  if (!(date instanceof Date) || !isValid(date)) {
    console.error('Serviço getDailyEntry chamado com data inválida:', date);
    throw new Error('Tentativa de buscar lançamento com data inválida.');
  }
  const formattedDate = format(date, 'yyyy-MM-dd');

  try {
    const response = await fetch(`${API_BASE_URL}/${formattedDate}`);
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

export async function saveDailyEntry(date: Date, data: DailyEntryFormData): Promise<DailyLogEntry> {
  if (!(date instanceof Date) || !isValid(date)) {
    console.error('Serviço saveDailyEntry chamado com data inválida:', date);
    throw new Error('Tentativa de salvar lançamento com data inválida.');
  }
  const formattedDate = format(date, 'yyyy-MM-dd');
  
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
    const response = await fetch(`${API_BASE_URL}/${formattedDate}`, {
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

export async function getAllDailyEntries(startDate?: string, endDate?: string): Promise<DailyLogEntry[]> {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = queryString ? `${API_BASE_URL}?${queryString}` : API_BASE_URL;

    const response = await fetch(url);
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
    return entriesFromApi.map(processEntryFromSource);
  } catch (error) {
    console.error('Erro ao buscar todos os lançamentos:', error);
    throw error;
  }
}
