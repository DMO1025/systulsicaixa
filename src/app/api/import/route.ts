
import { type NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { PeriodId, DailyLogEntry, PeriodData, EventItemData, SubEventItem, EventLocationKey, EventServiceTypeKey } from '@/lib/types';
import { getDailyEntry, saveDailyEntry } from '@/services/dailyEntryService';
import { SALES_CHANNELS, PERIOD_FORM_CONFIG, EVENT_LOCATION_OPTIONS, EVENT_SERVICE_TYPE_OPTIONS, PERIOD_DEFINITIONS } from '@/lib/constants';
import { format, parse, isValid } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Schemas for validation
const PeriodIdSchema = z.enum(PERIOD_DEFINITIONS.map(p => p.id) as [PeriodId, ...PeriodId[]]);

// Helper to create a reverse map for easier lookup
const createReverseMap = (obj: Record<string, string>) => {
    const map = new Map<string, string>();
    for (const [key, value] of Object.entries(obj)) {
        map.set(value, key);
    }
    return map;
};

const channelLabelToIdMap = createReverseMap(SALES_CHANNELS);
const locationLabelToKeyMap = createReverseMap(Object.fromEntries(EVENT_LOCATION_OPTIONS.map(opt => [opt.value, opt.label])));
const serviceLabelToKeyMap = createReverseMap(Object.fromEntries(EVENT_SERVICE_TYPE_OPTIONS.map(opt => [opt.value, opt.label])));


async function processSimplePeriod(sheet: XLSX.WorkSheet, periodId: PeriodId, existingEntries: Map<string, DailyLogEntry>): Promise<{ processed: number, errors: string[] }> {
    const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
    const headers = data[0] as string[];
    const rows = data.slice(1);
    const errors: string[] = [];

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
        
        // Handle Excel's numeric date format
        let dateObj: Date;
        if (typeof dateValue === 'number') {
            dateObj = XLSX.SSF.parse_date_code(dateValue);
        } else if (typeof dateValue === 'string') {
            dateObj = parse(dateValue, 'yyyy-MM-dd', new Date());
        } else {
            errors.push(`Linha ${rowIndex}: Formato de data inválido ou ausente.`);
            continue;
        }

        if (!dateObj || !isValid(dateObj)) {
            errors.push(`Linha ${rowIndex}: Data inválida: ${row[0]}`);
            continue;
        }

        const dateString = format(dateObj, 'yyyy-MM-dd');
        let entry = existingEntries.get(dateString) || await getDailyEntry(dateObj) || { id: dateString, date: dateObj } as DailyLogEntry;
        
        let periodData = (entry[periodId] || { channels: {} }) as PeriodData;
        if (!periodData.channels) periodData.channels = {};

        headerMap.slice(1).forEach((col, i) => {
            const cellValue = row[i + 1];
            if (col.channelId && col.type && cellValue !== undefined && cellValue !== null) {
                if (!periodData.channels![col.channelId]) {
                    periodData.channels![col.channelId] = {};
                }
                periodData.channels![col.channelId]![col.type] = Number(cellValue);
            }
        });
        
        entry = { ...entry, [periodId]: periodData };
        existingEntries.set(dateString, entry);
    }
    
    return { processed: rows.length, errors };
}

async function processComplexPeriod(workbook: XLSX.WorkBook, periodId: PeriodId, existingEntries: Map<string, DailyLogEntry>): Promise<{ processed: number, errors: string[] }> {
    const errors: string[] = [];
    let totalProcessed = 0;
    const periodConfig = PERIOD_FORM_CONFIG[periodId];
    if (!periodConfig || !periodConfig.subTabs) return { processed: 0, errors: ["Configuração de período inválida."]};

    const subTabLabelToKeyMap = new Map<string, string>();
    for (const [key, value] of Object.entries(periodConfig.subTabs)) {
        subTabLabelToKeyMap.set(value.label, key);
    }

    for (const sheetName of workbook.SheetNames) {
        const subTabKey = subTabLabelToKeyMap.get(sheetName.substring(0, 31));
        if (!subTabKey) {
            errors.push(`Aba "${sheetName}" não corresponde a nenhuma sub-aba do período.`);
            continue;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
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

            if (typeof dateValue === 'number') {
                dateObj = XLSX.SSF.parse_date_code(dateValue);
            } else if (typeof dateValue === 'string') {
                dateObj = parse(dateValue, 'yyyy-MM-dd', new Date());
            } else {
                errors.push(`Aba ${sheetName}, Linha ${rowIndex}: Formato de data inválido ou ausente.`);
                continue;
            }

            if (!dateObj || !isValid(dateObj)) {
                errors.push(`Aba ${sheetName}, Linha ${rowIndex}: Data inválida: ${row[0]}`);
                continue;
            }
            
            const dateString = format(dateObj, 'yyyy-MM-dd');
            let entry = existingEntries.get(dateString) || await getDailyEntry(dateObj) || { id: dateString, date: dateObj } as DailyLogEntry;
            
            let periodData = (entry[periodId] || { subTabs: {} }) as PeriodData;
            if (!periodData.subTabs) periodData.subTabs = {};
            if (!periodData.subTabs[subTabKey]) periodData.subTabs[subTabKey] = { channels: {} };
            if (!periodData.subTabs[subTabKey]!.channels) periodData.subTabs[subTabKey]!.channels = {};

            headerMap.slice(1).forEach((col, i) => {
                const cellValue = row[i + 1];
                if (col.channelId && col.type && cellValue !== undefined && cellValue !== null) {
                    if (!periodData.subTabs![subTabKey]!.channels![col.channelId]) {
                         periodData.subTabs![subTabKey]!.channels![col.channelId] = {};
                    }
                    periodData.subTabs![subTabKey]!.channels![col.channelId]![col.type] = Number(cellValue);
                }
            });

            entry = { ...entry, [periodId]: periodData };
            existingEntries.set(dateString, entry);
        }
    }
    return { processed: totalProcessed, errors };
}

async function processEventosPeriod(sheet: XLSX.WorkSheet, existingEntries: Map<string, DailyLogEntry>): Promise<{ processed: number, errors: string[] }> {
    const data = XLSX.utils.sheet_to_json<any>(sheet);
    const errors: string[] = [];

    for (const [index, row] of data.entries()) {
        const rowIndex = index + 2;
        const dateValue = row['Data (AAAA-MM-DD)'];
        let dateObj: Date;

        if (typeof dateValue === 'number') {
            dateObj = XLSX.SSF.parse_date_code(dateValue);
        } else if (typeof dateValue === 'string') {
            dateObj = parse(dateValue, 'yyyy-MM-dd', new Date());
        } else {
            errors.push(`Linha ${rowIndex}: Formato de data inválido ou ausente.`);
            continue;
        }
        
        if (!dateObj || !isValid(dateObj)) {
            errors.push(`Linha ${rowIndex}: Data inválida: ${row['Data (AAAA-MM-DD)']}`);
            continue;
        }

        const dateString = format(dateObj, 'yyyy-MM-dd');
        let entry = existingEntries.get(dateString) || await getDailyEntry(dateObj) || { id: dateString, date: dateObj } as DailyLogEntry;
        
        let eventosData = (entry.eventos || { items: [], periodObservations: '' }) as EventosPeriodData;
        if (!eventosData.items) eventosData.items = [];

        const eventName = row['Nome do Evento'] || `Evento Sem Nome ${rowIndex}`;
        let eventItem = eventosData.items.find(item => item.eventName === eventName);
        if (!eventItem) {
            eventItem = { id: uuidv4(), eventName, subEvents: [] };
            eventosData.items.push(eventItem);
        }
        
        const subEvent: SubEventItem = {
            id: uuidv4(),
            location: locationLabelToKeyMap.get(row['Local']) as EventLocationKey | undefined,
            serviceType: serviceLabelToKeyMap.get(row['Tipo de Serviço']) as EventServiceTypeKey | undefined,
            customServiceDescription: row['Descrição (se Outro)'] || '',
            quantity: Number(row['Quantidade']) || 0,
            totalValue: Number(row['Valor Total (R$)']) || 0,
        };
        eventItem.subEvents.push(subEvent);

        entry = { ...entry, eventos: eventosData };
        existingEntries.set(dateString, entry);
    }
    
    return { processed: data.length, errors };
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
        
        // Cache for daily entries modified during this import
        const modifiedEntries = new Map<string, DailyLogEntry>();
        let result: { processed: number, errors: string[] };

        const periodConfig = PERIOD_FORM_CONFIG[periodId];

        if (periodId === 'eventos') {
            result = await processEventosPeriod(workbook.Sheets[workbook.SheetNames[0]], modifiedEntries);
        } else if (periodConfig.subTabs) {
            result = await processComplexPeriod(workbook, periodId, modifiedEntries);
        } else {
            result = await processSimplePeriod(workbook.Sheets[workbook.SheetNames[0]], periodId, modifiedEntries);
        }
        
        // Save all modified entries
        for (const [dateString, entry] of modifiedEntries.entries()) {
            try {
                // The date object inside entry might have been manipulated, so we parse from the key for safety
                await saveDailyEntry(parse(dateString, 'yyyy-MM-dd', new Date()), entry);
            } catch (saveError: any) {
                result.errors.push(`Erro ao salvar lançamento para ${dateString}: ${saveError.message}`);
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
