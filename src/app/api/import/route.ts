
import { type NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { PeriodId, DailyLogEntry, PeriodData, EventItemData, SubEventItem, EventLocationKey, EventServiceTypeKey, EventosPeriodData } from '@/lib/types';
import { getAllDailyEntries } from '@/services/dailyEntryService';
import { SALES_CHANNELS, PERIOD_FORM_CONFIG, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS, PERIOD_DEFINITIONS } from '@/lib/constants';
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
        map.set(value, key);
    }
    return map;
};

const channelLabelToIdMap = createReverseMap(SALES_CHANNELS);
const locationLabelToKeyMap = new Map(EVENT_LOCATION_OPTIONS.map(opt => [opt.label, opt.value]));
const serviceLabelToKeyMap = new Map(EVENT_SERVICE_TYPE_OPTIONS.map(opt => [opt.label, opt.value]));

const parseFlexibleNumber = (value: any): number => {
    if (value === null || value === undefined) return NaN;
    let s = String(value).trim();
    if (s === '') return NaN;

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    
    if (hasComma) {
        return Number(s.replace(/\./g, '').replace(',', '.'));
    }
    
    if (hasDot) {
        const parts = s.split('.');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
            return Number(parts.join(''));
        }
    }
    
    return Number(s);
};

const parseDateValue = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    let dateObj: Date;
    if (dateValue instanceof Date && isValid(dateValue)) {
        dateObj = dateValue;
    } else if (typeof dateValue === 'number') {
        dateObj = new Date(1899, 11, 30 + dateValue);
    } else if (typeof dateValue === 'string') {
        dateObj = parse(dateValue, 'yyyy-MM-dd', new Date());
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
        const match = header.match(/^(.*) \((Qtd|Valor)\)$/);
        if (match) {
            const label = match[1];
            const type = match[2].toLowerCase() === 'valor' ? 'vtotal' : 'qtd'; 
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
            
            if (col.channelId && col.type && cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
                const numericValue = parseFlexibleNumber(cellValue);
                if (isNaN(numericValue)) {
                    errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor não numérico "${cellValue}" encontrado na coluna "${col.header}". Use apenas números.` });
                    rowHasError = true;
                    break; 
                }

                if (!periodData.channels![col.channelId]) {
                    periodData.channels![col.channelId] = {};
                }
                periodData.channels![col.channelId]![col.type] = numericValue;
            }
        }

        if (rowHasError) continue; 
        
        entry = { ...entry, [periodId]: periodData };
        entriesMap.set(dateString, entry);
    }
    
    return { processed: rows.length, errors };
}

function processComplexPeriod(workbook: XLSX.WorkBook, periodId: PeriodId, entriesMap: Map<string, DailyLogEntry>): { processed: number, errors: ErrorDetail[] } {
    const allErrors: ErrorDetail[] = [];
    let totalProcessed = 0;
    const periodConfig = PERIOD_FORM_CONFIG[periodId];
    if (!periodConfig || !periodConfig.subTabs) return { processed: 0, errors: [{ sheetName: 'Geral', rowIndex: 0, rowData: [], headers: [], message: 'Configuração de período inválida.' }]};

    const subTabLabelToKeyMap = new Map<string, string>();
    for (const [key, value] of Object.entries(periodConfig.subTabs)) {
        subTabLabelToKeyMap.set(value.label.substring(0, 31), key);
    }

    for (const sheetName of workbook.SheetNames) {
        const cleanSheetName = sheetName.substring(0, 31);
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
                const match = header.match(/^(.*) \((Qtd|Valor)\)$/);
                if (match) {
                    const label = match[1];
                    const type = match[2].toLowerCase() === 'valor' ? 'vtotal' : 'qtd';
                    const channelId = channelLabelToIdMap.get(label);
                    return { header, channelId, type };
                }
                return { header, channelId: null, type: null };
            });

            const dateObj = parseDateValue(row[0]);
            if (!dateObj) {
                allErrors.push({ sheetName: cleanSheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
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
                
                if (col.channelId && col.type && cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
                    const numericValue = parseFlexibleNumber(cellValue);
                    if (isNaN(numericValue)) {
                        allErrors.push({ sheetName: cleanSheetName, rowIndex, rowData: row, headers, message: `Valor não numérico "${cellValue}" encontrado na coluna "${col.header}". Use apenas números.` });
                        rowHasError = true;
                        break;
                    }
                    if (!periodData.subTabs![subTabKey]!.channels![col.channelId]) {
                         periodData.subTabs![subTabKey]!.channels![col.channelId] = {};
                    }
                    periodData.subTabs![subTabKey]!.channels![col.channelId]![col.type] = numericValue;
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
    const headerIndexMap = new Map(headers.map((h, i) => [h, i]));

    for (const [index, row] of rows.entries()) {
        const rowIndex = index + 2;
        let rowHasError = false;
        if (row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue;
        }
        
        const dateObj = parseDateValue(row[headerIndexMap.get('Data (AAAA-MM-DD)')!]);
        if (!dateObj) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
            continue;
        }

        const dateString = format(dateObj, 'yyyy-MM-dd');
        
        const locationValue = row[headerIndexMap.get('Local')!];
        const locationKey = locationLabelToKeyMap.get(locationValue);
        if (!locationKey && locationValue) {
             errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Local "${locationValue}" inválido. Valores válidos são: ${EVENT_LOCATION_OPTIONS.map(o => `'${o.label}'`).join(', ')}.` });
             rowHasError = true;
        }

        const serviceValue = row[headerIndexMap.get('Tipo de Serviço')!];
        const serviceKey = serviceLabelToKeyMap.get(serviceValue);
         if (!serviceKey && serviceValue) {
             errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Tipo de Serviço "${serviceValue}" inválido. Valores válidos são: ${EVENT_SERVICE_TYPE_OPTIONS.map(o => `'${o.label}'`).join(', ')}.` });
             rowHasError = true;
        }

        const quantityValue = row[headerIndexMap.get('Quantidade')!];
        const quantityNumber = parseFlexibleNumber(quantityValue);
        if (quantityValue && isNaN(quantityNumber)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor de Quantidade não é um número: "${quantityValue}".` });
            rowHasError = true;
        }
        
        const totalValue = row[headerIndexMap.get('Valor Total (R$)')!];
        const totalValueNumber = parseFlexibleNumber(totalValue);
        if (totalValue && isNaN(totalValueNumber)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor Total não é um número: "${totalValue}".` });
            rowHasError = true;
        }
        
        if (rowHasError) continue;
        
        let entry = entriesMap.get(dateString) || { id: dateString, date: dateObj } as DailyLogEntry;
        let eventosData = (entry.eventos || { items: [], periodObservations: '' }) as EventosPeriodData;
        if (!eventosData.items) eventosData.items = [];

        const eventName = row[headerIndexMap.get('Nome do Evento')!] || `Evento Sem Nome ${rowIndex}`;
        let eventItem = eventosData.items.find(item => item.eventName === eventName);
        if (!eventItem) {
            eventItem = { id: uuidv4(), eventName, subEvents: [] };
            eventosData.items.push(eventItem);
        }
        
        const subEvent: SubEventItem = {
            id: uuidv4(),
            location: locationKey as EventLocationKey | undefined,
            serviceType: serviceKey as EventServiceTypeKey | undefined,
            customServiceDescription: row[headerIndexMap.get('Descrição (se Outro)')!] || '',
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
        // 1. First pass: Collect all dates from the spreadsheet
        const allDates = new Set<string>();
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
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
        
        // 2. Fetch all existing entries in the date range at once
        const datesArray = Array.from(allDates);
        const minDate = datesArray.reduce((min, p) => p < min ? p : min, datesArray[0] || '');
        const maxDate = datesArray.reduce((max, p) => p > max ? p : max, datesArray[0] || '');
        
        let existingEntriesArray: DailyLogEntry[] = [];
        if (minDate && maxDate) {
            existingEntriesArray = await getAllDailyEntries(minDate, maxDate, baseUrl);
        }
        
        const entriesMap = new Map<string, DailyLogEntry>(
            existingEntriesArray.map(e => [format(e.date, 'yyyy-MM-dd'), e])
        );
        // --- END PRE-FETCHING ---
        
        let result: { processed: number, errors: ErrorDetail[] };
        const periodConfig = PERIOD_FORM_CONFIG[periodId];

        if (periodId === 'eventos') {
            const sheetName = workbook.SheetNames[0];
            result = processEventosPeriod(workbook.Sheets[sheetName], sheetName, entriesMap);
        } else if (periodConfig.subTabs) {
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
