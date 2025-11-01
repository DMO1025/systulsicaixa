

import { type NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { PeriodId, DailyLogEntry, PeriodData, EventItemData, SubEventItem, EventLocationKey, EventServiceTypeKey, EventosPeriodData, FaturadoItem, ConsumoInternoItem } from '@/lib/types';
import { getAllDailyEntries } from '@/services/dailyEntryService';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { SALES_CHANNELS, PERIOD_FORM_CONFIG, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS } from '@/lib/config/forms';
import { format, parse, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const PeriodIdSchema = z.enum(PERIOD_DEFINITIONS.map(p => p.id) as [PeriodId, ...PeriodId[]]);

type ErrorDetail = {
    sheetName: string;
    rowIndex: number;
    rowData: any[];
    headers: string[];
    message: string;
};

const createReverseMap = (obj: Record<string, string>) => {
    const map = new Map<string, string>();
    for (const [key, value] of Object.entries(obj)) {
        map.set(value.toLowerCase(), key);
    }
    return map;
};

const channelLabelToIdMap = createReverseMap(SALES_CHANNELS);
const locationLabelToKeyMap = new Map(EVENT_LOCATION_OPTIONS.map(opt => [opt.label.toLowerCase(), opt.value]));
const serviceLabelToKeyMap = new Map(EVENT_SERVICE_TYPE_OPTIONS.map(opt => [opt.label.toLowerCase(), opt.value]));

const parseFlexibleNumber = (value: any): number => {
    if (value === null || value === undefined) return NaN;
    let s = String(value).trim();
    if (s === '') return NaN;

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    
    // If it has a comma, it's likely a Brazilian-style number.
    if (hasComma) {
        // Handle cases like "1.500,50"
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (hasDot && s.split('.').length > 2) {
        // Handle cases like "1.500.000"
        s = s.replace(/\./g, '');
    }
    
    const num = Number(s);
    return isNaN(num) ? NaN : num;
};


const parseDateValue = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    let dateObj: Date;
    if (dateValue instanceof Date && isValid(dateValue)) {
        dateObj = dateValue;
    } else if (typeof dateValue === 'number') {
        // Excel's date is a number of days since 1899-12-30 (for compatibility with Lotus 1-2-3)
        dateObj = new Date(1899, 11, 30 + dateValue);
    } else if (typeof dateValue === 'string') {
        // Handle common string formats
        const formats = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy'];
        for (const fmt of formats) {
            try {
                const parsed = parse(dateValue, fmt, new Date());
                if (isValid(parsed)) {
                    dateObj = parsed;
                    return dateObj;
                }
            } catch(e) {
                // Try next format
            }
        }
        return null;
    } else {
        return null;
    }
    return isValid(dateObj) ? dateObj : null;
};


function processSimplePeriod(sheet: XLSX.WorkSheet, sheetName: string, periodId: PeriodId, entriesMap: Map<string, DailyLogEntry>): { processed: number, errors: ErrorDetail[] } {
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, blankrows: false });
    if (data.length < 2) return { processed: 0, errors: [] };
    const headers = data[0] as string[];
    const rows = data.slice(1);
    const errors: ErrorDetail[] = [];

    const headerMap = headers.map(header => {
        const match = header.match(/^(.*) \((Qtd|R\$)\)$/);
        if (match) {
            const label = match[1].trim().toLowerCase();
            const type = match[2].toLowerCase() === 'r$' ? 'vtotal' : 'qtd'; 
            const channelId = channelLabelToIdMap.get(label);
            return { header, channelId, type };
        }
        return { header, channelId: null, type: null };
    });

    for (const [index, row] of rows.entries()) {
        const rowIndex = index + 2;
        if (row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue;
        }

        const dateObj = parseDateValue(row[0]);
        if (!dateObj) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
            continue;
        }

        const dateString = format(dateObj, 'yyyy-MM-dd');
        let entry = entriesMap.get(dateString) || { id: dateString, date: dateObj } as DailyLogEntry;
        
        let periodData = (entry[periodId] || { channels: {} }) as PeriodData;
        if (!periodData.channels) periodData.channels = {};

        let rowHasError = false;
        for (let i = 1; i < headers.length; i++) {
            const col = headerMap[i];
            const cellValue = row[i];
            
            if (col.channelId && col.type && (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '' || Number(cellValue) === 0)) {
                const numericValue = parseFlexibleNumber(cellValue);
                if (isNaN(numericValue)) { 
                    errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor não numérico "${cellValue}" encontrado na coluna "${col.header}". Use apenas números.` });
                    rowHasError = true;
                    break; 
                }

                if (!periodData.channels![col.channelId]) {
                    periodData.channels![col.channelId] = {};
                }
                periodData.channels![col.channelId]![col.type as 'qtd' | 'vtotal'] = isNaN(numericValue) ? 0 : numericValue;
            }
        }

        if (rowHasError) continue; 
        
        entry = { ...entry, [periodId]: periodData };
        entriesMap.set(dateString, entry);
    }
    
    return { processed: rows.length, errors };
}

function processFaturadoConsumoInternoSheet(
    sheetData: any[][], sheetName: string, periodId: PeriodId, entriesMap: Map<string, DailyLogEntry>, isConsumoInterno: boolean
): { processed: number; errors: ErrorDetail[] } {
    if (sheetData.length < 2) return { processed: 0, errors: [] };
    const headers = sheetData[0] as string[];
    const rows = sheetData.slice(1);
    const errors: ErrorDetail[] = [];
    
    const findHeaderIndex = (possibleNames: string[]) => {
        const lowerCaseNames = possibleNames.map(name => name.toLowerCase());
        return headers.findIndex(h => h && lowerCaseNames.includes(h.trim().toLowerCase()));
    };
    
    const dateIdx = findHeaderIndex(['data (aaaa-mm-dd)', 'data']);
    const clientIdx = findHeaderIndex(['pessoa/setor', 'pessoa']);
    const valueIdx = findHeaderIndex(['valor (r$)', 'valor']);
    const qtdIdx = findHeaderIndex(['quantidade']);
    const obsIdx = findHeaderIndex(['observação']);
    const typeIdx = findHeaderIndex(['tipo (hotel/funcionario/outros)', 'tipo']); // Only for faturado
    const reajusteIdx = findHeaderIndex(['reajuste de c.i (valor total do dia)']); // Only for CI
    
    if (dateIdx === -1 || clientIdx === -1 || valueIdx === -1) {
        return { processed: 0, errors: [{ sheetName, rowIndex: 1, rowData: headers, headers, message: `Cabeçalhos obrigatórios não encontrados. Necessário: 'Data', 'Pessoa/Setor', 'Valor (R$)'.` }] };
    }

    for (const [index, row] of rows.entries()) {
        const rowIndex = index + 2;
        if (row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue;
        }
        
        const dateObj = parseDateValue(row[dateIdx]);
        if (!dateObj) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido.' });
            continue;
        }
        
        const dateString = format(dateObj, 'yyyy-MM-dd');
        let entry = entriesMap.get(dateString) || { id: dateString, date: dateObj } as DailyLogEntry;
        let periodData = (entry[periodId] || { subTabs: {} }) as PeriodData;
        if (!periodData.subTabs) periodData.subTabs = {};
        
        const subTabKey = isConsumoInterno ? 'consumoInterno' : 'faturado';
        if (!periodData.subTabs[subTabKey]) periodData.subTabs[subTabKey] = { faturadoItems: [], consumoInternoItems: [] };

        if (isConsumoInterno) {
            if (!periodData.subTabs.consumoInterno!.consumoInternoItems) periodData.subTabs.consumoInterno!.consumoInternoItems = [];
            
            if (reajusteIdx !== -1) {
              const reajuste = parseFlexibleNumber(row[reajusteIdx] ?? 0);
              if (!isNaN(reajuste) && reajuste !== 0) {
                  if (!periodData.subTabs.consumoInterno!.channels) periodData.subTabs.consumoInterno!.channels = {};
                  periodData.subTabs.consumoInterno!.channels['reajusteCI'] = { vtotal: reajuste };
              }
            }

            const item: ConsumoInternoItem = {
                id: uuidv4(),
                clientName: String(row[clientIdx] || ''),
                quantity: parseFlexibleNumber(row[qtdIdx]),
                value: parseFlexibleNumber(row[valueIdx]),
                observation: obsIdx !== -1 ? String(row[obsIdx] || '') : '',
            };
            if(item.clientName) periodData.subTabs.consumoInterno!.consumoInternoItems!.push(item);

        } else { // Faturado
             if (!periodData.subTabs.faturado!.faturadoItems) periodData.subTabs.faturado!.faturadoItems = [];
             
             const tipoRaw = typeIdx !== -1 ? String(row[typeIdx] || 'outros').toLowerCase().trim() : 'outros';
             const tipo: 'hotel' | 'funcionario' | 'outros' = (tipoRaw === 'hotel' || tipoRaw === 'funcionario') ? tipoRaw : 'outros';

             const item: FaturadoItem = {
                id: uuidv4(),
                clientName: String(row[clientIdx] || ''),
                type: tipo,
                quantity: parseFlexibleNumber(row[qtdIdx]),
                value: parseFlexibleNumber(row[valueIdx]),
                observation: obsIdx !== -1 ? String(row[obsIdx] || '') : '',
             };
             if(item.clientName) periodData.subTabs.faturado!.faturadoItems!.push(item);
        }
        
        entry = { ...entry, [periodId]: periodData };
        entriesMap.set(dateString, entry);
    }
    
    return { processed: rows.length, errors };
}


function processComplexPeriod(workbook: XLSX.WorkBook, periodId: PeriodId, entriesMap: Map<string, DailyLogEntry>): { processed: number, errors: ErrorDetail[] } {
    let allErrors: ErrorDetail[] = [];
    let totalProcessed = 0;
    const periodConfig = PERIOD_FORM_CONFIG[periodId];
    if (!periodConfig || !periodConfig.subTabs) return { processed: 0, errors: [{ sheetName: 'Geral', rowIndex: 0, rowData: [], headers: [], message: 'Configuração de período inválida.' }]};

    const subTabLabelToKeyMap = new Map<string, string>();
    for (const [key, value] of Object.entries(periodConfig.subTabs)) {
        subTabLabelToKeyMap.set(value.label.toLowerCase(), key);
    }

    for (const sheetName of workbook.SheetNames) {
        const cleanSheetName = sheetName.trim().toLowerCase();
        
        if (cleanSheetName === 'faturado') {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
            const { processed, errors } = processFaturadoConsumoInternoSheet(data, sheetName, periodId, entriesMap, false);
            totalProcessed += processed;
            allErrors = allErrors.concat(errors);
            continue;
        }
        if (cleanSheetName === 'consumo interno') {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
            const { processed, errors } = processFaturadoConsumoInternoSheet(data, sheetName, periodId, entriesMap, true);
            totalProcessed += processed;
            allErrors = allErrors.concat(errors);
            continue;
        }

        const subTabKey = subTabLabelToKeyMap.get(cleanSheetName);
        if (!subTabKey) continue;
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, blankrows: false });
        if (data.length < 2) continue;

        const headers = data[0] as string[];
        const rows = data.slice(1);
        
        for (const [index, row] of rows.entries()) {
            const rowIndex = index + 2;
            totalProcessed++;
            if (row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
                continue;
            }

            const headerMap = headers.map(header => {
                const match = header.match(/^(.*) \((Qtd|R\$)\)$/);
                if (match) {
                    const label = match[1].trim().toLowerCase();
                    const type = match[2].toLowerCase() === 'r$' ? 'vtotal' : 'qtd';
                    const channelId = channelLabelToIdMap.get(label);
                    return { header, channelId, type };
                }
                return { header, channelId: null, type: null };
            });

            const dateObj = parseDateValue(row[0]);
            if (!dateObj) {
                allErrors.push({ sheetName: sheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
                continue;
            }
            
            const dateString = format(dateObj, 'yyyy-MM-dd');
            let entry = entriesMap.get(dateString) || { id: dateString, date: dateObj } as DailyLogEntry;
            
            let periodData = (entry[periodId] || { subTabs: {} }) as PeriodData;
            if (!periodData.subTabs) periodData.subTabs = {};
            if (!periodData.subTabs[subTabKey]) periodData.subTabs[subTabKey] = { channels: {} };
            if (!periodData.subTabs[subTabKey]!.channels) periodData.subTabs[subTabKey]!.channels = {};

            let rowHasError = false;
            for (let i = 1; i < headers.length; i++) {
                const col = headerMap[i];
                const cellValue = row[i];
                
                if (col.channelId && col.type && (cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '' || Number(cellValue) === 0)) {
                    const numericValue = parseFlexibleNumber(cellValue);
                    if (isNaN(numericValue)) {
                        allErrors.push({ sheetName: sheetName, rowIndex, rowData: row, headers, message: `Valor não numérico "${cellValue}" encontrado na coluna "${col.header}". Use apenas números.` });
                        rowHasError = true;
                        break;
                    }
                    if (!periodData.subTabs![subTabKey]!.channels![col.channelId]) {
                         periodData.subTabs![subTabKey]!.channels![col.channelId] = {};
                    }
                    periodData.subTabs![subTabKey]!.channels![col.channelId]![col.type as 'qtd' | 'vtotal'] = numericValue;
                }
            }

            if (rowHasError) continue;

            entry = { ...entry, [periodId]: periodData };
            entriesMap.set(dateString, entry);
        }
    }
    return { processed: totalProcessed, errors: allErrors };
}

function processEventosPeriod(sheet: XLSX.WorkSheet, sheetName: string, entriesMap: Map<string, DailyLogEntry>): { processed: number, errors: ErrorDetail[] } {
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, blankrows: false });
    if (data.length < 2) return { processed: 0, errors: [] };
    const headers = data[0] as string[];
    const rows = data.slice(1);
    const errors: ErrorDetail[] = [];
    const headerIndexMap = new Map(headers.map((h, i) => [h.trim().toLowerCase(), i]));

    const getHeaderIndex = (possibleNames: string[]): number | undefined => {
        for (const name of possibleNames) {
            const index = headerIndexMap.get(name.trim().toLowerCase());
            if (index !== undefined) return index;
        }
        return undefined;
    };

    const dateIdx = getHeaderIndex(['data (aaaa-mm-dd)', 'data']);
    const eventNameIdx = getHeaderIndex(['nome do evento']);
    const locationIdx = getHeaderIndex(['local']);
    const serviceTypeIdx = getHeaderIndex(['tipo de serviço']);
    const customDescIdx = getHeaderIndex(['descrição (se outro)']);
    const quantityIdx = getHeaderIndex(['quantidade']);
    const totalValueIdx = getHeaderIndex(['valor total (r$)']);
    
    if (dateIdx === undefined || eventNameIdx === undefined) {
         errors.push({ sheetName, rowIndex: 1, rowData: headers, headers, message: `Cabeçalhos 'Data (AAAA-MM-DD)' e 'Nome do Evento' são obrigatórios.` });
         return { processed: rows.length, errors };
    }


    for (const [index, row] of rows.entries()) {
        const rowIndex = index + 2;
        let rowHasError = false;
        if (row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue;
        }
        
        const dateObj = parseDateValue(row[dateIdx]);
        if (!dateObj) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
            continue;
        }

        const dateString = format(dateObj, 'yyyy-MM-dd');
        
        const locationValue = locationIdx !== undefined ? row[locationIdx] : undefined;
        const locationKey = locationValue ? locationLabelToKeyMap.get(String(locationValue).toLowerCase()) : undefined;
        if (locationValue && !locationKey) {
             errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Local "${locationValue}" inválido. Valores válidos são: ${EVENT_LOCATION_OPTIONS.map(o => `'${o.label}'`).join(', ')}.` });
             rowHasError = true;
        }

        const serviceValue = serviceTypeIdx !== undefined ? row[serviceTypeIdx] : undefined;
        const serviceKey = serviceValue ? serviceLabelToKeyMap.get(String(serviceValue).toLowerCase()) : undefined;
         if (serviceValue && !serviceKey) {
             errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Tipo de Serviço "${serviceValue}" inválido. Valores válidos são: ${EVENT_SERVICE_TYPE_OPTIONS.map(o => `'${o.label}'`).join(', ')}.` });
             rowHasError = true;
        }

        const quantityValue = quantityIdx !== undefined ? row[quantityIdx] : undefined;
        const quantityNumber = parseFlexibleNumber(quantityValue);
        if (quantityValue && isNaN(quantityNumber)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor de Quantidade não é um número: "${quantityValue}".` });
            rowHasError = true;
        }
        
        const totalValue = totalValueIdx !== undefined ? row[totalValueIdx] : undefined;
        const totalValueNumber = parseFlexibleNumber(totalValue);
        if (totalValue && isNaN(totalValueNumber)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor Total não é um número: "${totalValue}".` });
            rowHasError = true;
        }
        
        if (rowHasError) continue;
        
        let entry = entriesMap.get(dateString) || { id: dateString, date: dateObj } as DailyLogEntry;
        let eventosData = (entry.eventos || { items: [], periodObservations: '' }) as EventosPeriodData;
        if (!eventosData.items) eventosData.items = [];

        const eventName = row[eventNameIdx] || `Evento Sem Nome ${rowIndex}`;
        let eventItem = eventosData.items.find(item => item.eventName === eventName);
        if (!eventItem) {
            eventItem = { id: uuidv4(), eventName, subEvents: [] };
            eventosData.items.push(eventItem);
        }
        
        const subEvent: SubEventItem = {
            id: uuidv4(),
            location: locationKey as EventLocationKey | undefined,
            serviceType: serviceKey as EventServiceTypeKey | undefined,
            customServiceDescription: (customDescIdx !== undefined ? row[customDescIdx] : '') || '',
            quantity: isNaN(quantityNumber) ? undefined : quantityNumber,
            totalValue: isNaN(totalValueNumber) ? undefined : totalValueNumber,
        };
        eventItem.subEvents.push(subEvent);
        entry = { ...entry, eventos: eventosData };
        entriesMap.set(dateString, entry);
    }
    
    return { processed: rows.length, errors };
}

export async function POST(request: NextRequest) {
    try {
        const baseUrl = new URL(request.url).origin;
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const periodIdValue = formData.get('periodId') as string | null;

        if (!file) return NextResponse.json({ success: false, message: 'Nenhum arquivo enviado.' }, { status: 400 });
        if (!periodIdValue) return NextResponse.json({ success: false, message: 'ID do período não enviado.' }, { status: 400 });

        const periodIdResult = PeriodIdSchema.safeParse(periodIdValue);
        if (!periodIdResult.success) {
            return NextResponse.json({ success: false, message: `ID do período inválido: ${periodIdValue}` }, { status: 400 });
        }
        const periodId = periodIdResult.data;

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        
        // --- PRE-FETCHING ---
        const allDates = new Set<string>();
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;
            const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false });
            if (data.length < 1) continue;
            
            data.slice(1).forEach(row => {
                if (row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) return;
                const dateObj = parseDateValue(row[0]);
                if (dateObj) {
                    allDates.add(format(dateObj, 'yyyy-MM-dd'));
                }
            });
        }
        
        const datesArray = Array.from(allDates);
        const minDate = datesArray.reduce((min, p) => p < min ? p : min, datesArray[0] || '');
        const maxDate = datesArray.reduce((max, p) => p > max ? p : max, datesArray[0] || '');
        
        let existingEntriesArray: DailyLogEntry[] = [];
        if (minDate && maxDate) {
            existingEntriesArray = await getAllDailyEntries(minDate, maxDate, baseUrl);
        }
        
        const entriesMap = new Map<string, DailyLogEntry>(
            existingEntriesArray.map(e => {
                const dateString = e.date instanceof Date ? format(e.date, 'yyyy-MM-dd') : format(parseISO(String(e.date)), 'yyyy-MM-dd');
                return [dateString, e];
            })
        );
        // --- END PRE-FETCHING ---
        
        let result: { processed: number, errors: ErrorDetail[] };
        const periodConfig = PERIOD_FORM_CONFIG[periodId];

        if (periodId === 'eventos') {
            const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('eventos'));
            if (!sheetName) {
                return NextResponse.json({ success: false, message: `A planilha de importação de eventos deve conter uma aba chamada "Eventos".` }, { status: 400 });
            }
            result = processEventosPeriod(workbook.Sheets[sheetName], sheetName, entriesMap);
        } else if (periodConfig?.subTabs) {
            result = processComplexPeriod(workbook, periodId, entriesMap);
        } else {
            const sheetName = workbook.SheetNames[0];
            result = processSimplePeriod(workbook.Sheets[sheetName], sheetName, periodId, entriesMap);
        }
        
        if (result.errors.length > 0) {
            return NextResponse.json({ success: false, message: `Análise concluída com ${result.errors.length} erro(s).`, processed: result.processed, errors: result.errors }, { status: 207 });
        }

        const dataToSync = Object.fromEntries(entriesMap);

        return NextResponse.json({ 
            success: true, 
            message: `Análise concluída com sucesso. ${result.processed} linhas de dados processadas.`, 
            processed: result.processed,
            data: dataToSync 
        });

    } catch (error: any) {
        console.error('API Import Error:', error);
        return NextResponse.json({ success: false, message: `Erro no servidor: ${error.message}` }, { status: 500 });
    }
}
    

    




