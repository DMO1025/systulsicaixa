
import { type NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { PeriodId, DailyLogEntry, PeriodData, EventItemData, SubEventItem, EventLocationKey, EventServiceTypeKey, EventosPeriodData } from '@/lib/types';
import { getDailyEntry, saveDailyEntry } from '@/services/dailyEntryService';
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


async function processSimplePeriod(sheet: XLSX.WorkSheet, sheetName: string, periodId: PeriodId, existingEntries: Map<string, DailyLogEntry>): Promise<{ processed: number, errors: ErrorDetail[] }> {
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
    if (data.length < 2) return { processed: 0, errors: [] };
    const headers = data[0] as string[];
    const rows = data.slice(1);
    const errors: ErrorDetail[] = [];

    const headerMap = headers.map(header => {
        const match = header.match(/^(.*) \((Qtd|Valor)\)$/);
        if (match) {
            const label = match[1];
            const type = match[2].toLowerCase() as 'qtd' | 'vtotal';
            const channelId = channelLabelToIdMap.get(label);
            return { header, channelId, type };
        }
        return { header, channelId: null, type: null };
    });

    for (const [index, row] of rows.entries()) {
        const rowIndex = index + 2;
        const dateValue = row[0];
        
        let dateObj: Date;
        if (dateValue instanceof Date) {
            dateObj = dateValue;
        } else if (typeof dateValue === 'number') {
            dateObj = XLSX.SSF.parse_date_code(dateValue);
        } else if (typeof dateValue === 'string') {
            dateObj = parse(dateValue, 'yyyy-MM-dd', new Date());
        } else {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido na primeira coluna. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
            continue;
        }

        if (!dateObj || !isValid(dateObj)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Data inválida: "${row[0]}". Use o formato AAAA-MM-DD ou um formato de data padrão do Excel.` });
            continue;
        }

        const dateString = format(dateObj, 'yyyy-MM-dd');
        let entry = existingEntries.get(dateString) || await getDailyEntry(dateObj) || { id: dateString, date: dateObj } as DailyLogEntry;
        
        let periodData = (entry[periodId] || { channels: {} }) as PeriodData;
        if (!periodData.channels) periodData.channels = {};

        let rowHasError = false;
        for (let i = 1; i < headers.length; i++) {
            const col = headerMap[i];
            const cellValue = row[i];
            
            if (col.channelId && col.type && cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
                const numericValue = Number(String(cellValue).replace(',', '.')); // Handle comma decimal separator
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

        if (rowHasError) {
            continue; 
        }
        
        entry = { ...entry, [periodId]: periodData };
        existingEntries.set(dateString, entry);
    }
    
    return { processed: rows.length, errors };
}

async function processComplexPeriod(workbook: XLSX.WorkBook, periodId: PeriodId, existingEntries: Map<string, DailyLogEntry>): Promise<{ processed: number, errors: ErrorDetail[] }> {
    const allErrors: ErrorDetail[] = [];
    let totalProcessed = 0;
    const periodConfig = PERIOD_FORM_CONFIG[periodId];
    if (!periodConfig || !periodConfig.subTabs) return { processed: 0, errors: [{ sheetName: 'Geral', rowIndex: 0, rowData: [], headers: [], message: 'Configuração de período inválida.' }]};

    const subTabLabelToKeyMap = new Map<string, string>();
    for (const [key, value] of Object.entries(periodConfig.subTabs)) {
        subTabLabelToKeyMap.set(value.label, key);
    }

    for (const sheetName of workbook.SheetNames) {
        const cleanSheetName = sheetName.substring(0, 31);
        const subTabKey = subTabLabelToKeyMap.get(cleanSheetName);
        if (!subTabKey) {
            continue; 
        }
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
        if (data.length < 2) continue;

        const headers = data[0] as string[];
        const rows = data.slice(1);
        totalProcessed += rows.length;

        const headerMap = headers.map(header => {
            const match = header.match(/^(.*) \((Qtd|Valor)\)$/);
            if (match) {
                const label = match[1];
                const type = match[2].toLowerCase() as 'qtd' | 'vtotal';
                const channelId = channelLabelToIdMap.get(label);
                return { header, channelId, type };
            }
            return { header, channelId: null, type: null };
        });

        for (const [index, row] of rows.entries()) {
            const rowIndex = index + 2;
            const dateValue = row[0];
            let dateObj: Date;

            if (dateValue instanceof Date) {
                dateObj = dateValue;
            } else if (typeof dateValue === 'number') {
                dateObj = XLSX.SSF.parse_date_code(dateValue);
            } else if (typeof dateValue === 'string') {
                dateObj = parse(dateValue, 'yyyy-MM-dd', new Date());
            } else {
                allErrors.push({ sheetName: cleanSheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido na primeira coluna. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
                continue;
            }

            if (!dateObj || !isValid(dateObj)) {
                allErrors.push({ sheetName: cleanSheetName, rowIndex, rowData: row, headers, message: `Data inválida: "${row[0]}". Use o formato AAAA-MM-DD ou um formato de data padrão do Excel.` });
                continue;
            }
            
            const dateString = format(dateObj, 'yyyy-MM-dd');
            let entry = existingEntries.get(dateString) || await getDailyEntry(dateObj) || { id: dateString, date: dateObj } as DailyLogEntry;
            
            let periodData = (entry[periodId] || { subTabs: {} }) as PeriodData;
            if (!periodData.subTabs) periodData.subTabs = {};
            if (!periodData.subTabs[subTabKey]) periodData.subTabs[subTabKey] = { channels: {} };
            if (!periodData.subTabs[subTabKey]!.channels) periodData.subTabs[subTabKey]!.channels = {};

            let rowHasError = false;
            for (let i = 1; i < headers.length; i++) {
                const col = headerMap[i];
                const cellValue = row[i];
                
                if (col.channelId && col.type && cellValue !== undefined && cellValue !== null && String(cellValue).trim() !== '') {
                    const numericValue = Number(String(cellValue).replace(',', '.')); // Handle comma decimal separator
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

            if (rowHasError) {
                continue;
            }

            entry = { ...entry, [periodId]: periodData };
            existingEntries.set(dateString, entry);
        }
    }
    return { processed: totalProcessed, errors: allErrors };
}

async function processEventosPeriod(sheet: XLSX.WorkSheet, sheetName: string, existingEntries: Map<string, DailyLogEntry>): Promise<{ processed: number, errors: ErrorDetail[] }> {
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
    if (data.length < 2) return { processed: 0, errors: [] };
    const headers = data[0] as string[];
    const rows = data.slice(1);
    const errors: ErrorDetail[] = [];
    const headerIndexMap = new Map(headers.map((h, i) => [h, i]));

    for (const [index, row] of rows.entries()) {
        const rowIndex = index + 2;
        let rowHasError = false;
        
        const dateValue = row[headerIndexMap.get('Data (AAAA-MM-DD)')!];
        let dateObj: Date;

        if (dateValue instanceof Date) {
            dateObj = dateValue;
        } else if (typeof dateValue === 'number') {
            dateObj = XLSX.SSF.parse_date_code(dateValue);
        } else if (typeof dateValue === 'string') {
            dateObj = parse(dateValue, 'yyyy-MM-dd', new Date());
        } else {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: 'Data ausente ou em formato inválido. Use AAAA-MM-DD ou formato de data padrão do Excel.' });
            continue;
        }
        
        if (!dateObj || !isValid(dateObj)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Data inválida: "${dateValue}". Use o formato AAAA-MM-DD ou um formato de data padrão do Excel.` });
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
        const quantityNumber = Number(quantityValue);
        if (quantityValue && isNaN(quantityNumber)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor de Quantidade não é um número: "${quantityValue}".` });
            rowHasError = true;
        }
        
        const totalValue = row[headerIndexMap.get('Valor Total (R$)')!];
        const totalValueNumber = Number(String(totalValue).replace(',', '.'));
        if (totalValue && isNaN(totalValueNumber)) {
            errors.push({ sheetName, rowIndex, rowData: row, headers, message: `Valor Total não é um número: "${totalValue}".` });
            rowHasError = true;
        }
        
        if (rowHasError) continue;
        

        let entry = existingEntries.get(dateString) || await getDailyEntry(dateObj) || { id: dateString, date: dateObj } as DailyLogEntry;
        
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
            quantity: quantityNumber || 0,
            totalValue: totalValueNumber || 0,
        };
        eventItem.subEvents.push(subEvent);

        entry = { ...entry, eventos: eventosData };
        existingEntries.set(dateString, entry);
    }
    
    return { processed: rows.length, errors };
}


export async function POST(request: NextRequest) {
    try {
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
        
        const modifiedEntries = new Map<string, DailyLogEntry>();
        let result: { processed: number, errors: ErrorDetail[] };

        const periodConfig = PERIOD_FORM_CONFIG[periodId];

        if (periodId === 'eventos') {
            const sheetName = workbook.SheetNames[0];
            result = await processEventosPeriod(workbook.Sheets[sheetName], sheetName, modifiedEntries);
        } else if (periodConfig.subTabs) {
            result = await processComplexPeriod(workbook, periodId, modifiedEntries);
        } else {
            const sheetName = workbook.SheetNames[0];
            result = await processSimplePeriod(workbook.Sheets[sheetName], sheetName, periodId, modifiedEntries);
        }
        
        if (result.errors.length === 0) {
            for (const [dateString, entry] of modifiedEntries.entries()) {
                try {
                    await saveDailyEntry(parse(dateString, 'yyyy-MM-dd', new Date()), entry);
                } catch (saveError: any) {
                    result.errors.push({ 
                        sheetName: 'Geral', 
                        rowIndex: 0, 
                        rowData: [], 
                        headers: [],
                        message: `Erro ao salvar lançamento para ${dateString}: ${saveError.message}`
                    });
                }
            }
        }
        
        const finalMessage = `Importação concluída. ${result.processed} linhas processadas.`;
        if (result.errors.length > 0) {
            return NextResponse.json({ success: false, message: `${finalMessage} Encontrado(s) ${result.errors.length} erro(s).`, processed: result.processed, errors: result.errors }, { status: 207 });
        }

        return NextResponse.json({ success: true, message: finalMessage, processed: result.processed });

    } catch (error: any) {
        console.error('API Import Error:', error);
        return NextResponse.json({ success: false, message: `Erro no servidor: ${error.message}` }, { status: 500 });
    }
}
