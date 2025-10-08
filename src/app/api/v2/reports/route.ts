

import { NextResponse, type NextRequest } from 'next/server';
import { getAllEntries as getAllEntriesFromDataLayer } from '@/lib/data/entries';
import { generateGeneralReportForApiV2 } from '@/lib/utils/api/v2/reportGenerators';

import type { DailyLogEntry, FilterType, EstornoItem, FrigobarConsumptionLog, FrigobarPeriodData, FrigobarItem, UnifiedPersonTransaction, PeriodId, DashboardItemVisibilityConfig, ChannelUnitPricesConfig } from '@/lib/types';
import { isValid, parse, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { getDbPool, isMysqlConnected, ESTORNOS_TABLE_NAME, DAILY_ENTRIES_TABLE_NAME, safeParse } from '@/lib/mysql';
import type mysql from 'mysql2/promise';
import { generatePeriodReportData } from '@/lib/reports/period/generator';
import { getSetting as getSettingFromDataLayer } from '@/lib/data/settings';

import { extractPersonTransactions } from '@/lib/reports/person/generator';


const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Access-control-allow-credentials': 'true',
};

export async function OPTIONS(request: NextRequest) {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        
        const filterType: FilterType = searchParams.get('filterType') as FilterType || 'range';
        
        let startDateStr: string | undefined;
        let endDateStr: string | undefined;

        if (filterType === 'range' || filterType.startsWith('controle-cafe') || filterType === 'estornos' || filterType === 'controle-frigobar' || filterType.startsWith('client-')) {
            startDateStr = searchParams.get('startDate') || undefined;
            endDateStr = searchParams.get('endDate') || undefined;
            
            if (!startDateStr || !isValid(parse(startDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetros 'startDate'/'endDate' são necessários para este filtro.` }, { status: 400, headers: CORS_HEADERS });
            } else if (endDateStr && !isValid(parse(endDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'endDate' inválido. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
        } else if (filterType === 'period') {
            const monthStr = searchParams.get('month'); // YYYY-MM
            if (monthStr && isValid(parse(monthStr, 'yyyy-MM', new Date()))) {
                const monthDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
                startDateStr = format(monthDate, 'yyyy-MM-dd');
                const endOfMonthDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                endDateStr = `${monthStr}-${String(endOfMonthDay).padStart(2, '0')}`;
            } else {
                 return NextResponse.json({ message: `Parâmetro 'month' inválido ou ausente para este tipo de filtro. Use AAAA-MM.` }, { status: 400, headers: CORS_HEADERS });
            }
        }
        
        if (filterType === 'estornos') {
            const pool = await getDbPool();
            if (!pool || !(await isMysqlConnected(pool))) {
                throw new Error('Banco de dados não conectado.');
            }

            const [rows] = await pool.query<mysql.RowDataPacket[]>(
                `SELECT items FROM ${ESTORNOS_TABLE_NAME} WHERE daily_entry_id BETWEEN ? AND ?`,
                [startDateStr, endDateStr]
            );
            const allItems: EstornoItem[] = rows.flatMap(row => safeParse<EstornoItem[]>(row.items) || []);
            const category = searchParams.get('category');
            const filteredItems = category && category !== 'all' ? allItems.filter(item => item.category === category) : allItems;
            
            return NextResponse.json({ type: 'estornos', data: { dailyBreakdowns: filteredItems } }, { headers: CORS_HEADERS });
        }
        
        if (filterType === 'controle-frigobar') {
            const pool = await getDbPool();
            if (!pool || !(await isMysqlConnected(pool))) {
                throw new Error('Banco de dados não conectado.');
            }
            const [rows] = await pool.query<mysql.RowDataPacket[]>(
                `SELECT controleFrigobar FROM ${DAILY_ENTRIES_TABLE_NAME} WHERE id BETWEEN ? AND ?`,
                [startDateStr, endDateStr]
            );
            
            const frigobarItemsSettings: FrigobarItem[] = (await getSettingFromDataLayer('frigobarItems')) || [];
            const itemMap = new Map(frigobarItemsSettings.map(item => [item.id, item.name]));

            const allLogs: FrigobarConsumptionLog[] = rows.flatMap(row => {
                const frigobarData = safeParse<FrigobarPeriodData>(row.controleFrigobar);
                if (!frigobarData?.logs) return [];

                return frigobarData.logs.map(log => {
                    const newItems: Record<string, number> = {};
                    Object.entries(log.items).forEach(([itemId, quantity]) => {
                        const itemName = itemMap.get(itemId) || itemId;
                        newItems[itemName] = quantity;
                    });
                    return { ...log, items: newItems };
                });
            });

            return NextResponse.json({ type: 'controle-frigobar', data: { dailyBreakdowns: allLogs } }, { headers: CORS_HEADERS });
        }
        
        if (filterType === 'controle-cafe' || filterType === 'controle-cafe-no-show') {
            const allEntries = await getAllEntriesFromDataLayer({ 
                startDate: startDateStr, 
                endDate: endDateStr, 
                fields: 'id,date,controleCafeDaManha,cafeManhaNoShow'
            });
            
            const relevantData = allEntries.map(entry => ({
              id: entry.id,
              date: entry.date,
              controleCafeDaManha: entry.controleCafeDaManha,
              cafeManhaNoShow: entry.cafeManhaNoShow,
            }));

            return NextResponse.json({ type: filterType, data: { dailyBreakdowns: relevantData } }, { headers: CORS_HEADERS });
        }


        const entries = await getAllEntriesFromDataLayer({ startDate: startDateStr, endDate: endDateStr }) as DailyLogEntry[];
        
         if (filterType === 'client-extract') {
            const consumptionType = searchParams.get('consumptionType') || 'all';
            const personName = searchParams.get('personName') || undefined;
            const { personList, allTransactions } = extractPersonTransactions(entries, consumptionType);
            let filteredTransactions = allTransactions;
            if (personName) {
                filteredTransactions = allTransactions.filter(t => t.personName === personName);
            }
            return NextResponse.json({ 
                type: 'client-extract', 
                data: { 
                    availablePeople: personList,
                    dailyBreakdowns: filteredTransactions 
                } 
            }, { headers: CORS_HEADERS });
        }

        if (filterType === 'client-summary') {
            const consumptionType = searchParams.get('consumptionType') || 'all';
            const { allTransactions } = extractPersonTransactions(entries, consumptionType);
            
            const summary: Record<string, { qtd: number; valor: number }> = {};
            allTransactions.forEach(t => {
                if (!summary[t.personName]) {
                    summary[t.personName] = { qtd: 0, valor: 0 };
                }
                summary[t.personName].qtd += t.quantity;
                summary[t.personName].valor += t.value;
            });
            
            const summaryArray = Object.entries(summary).map(([key, value]) => ({ personName: key, ...value }));
            
            return NextResponse.json({ type: 'client-summary', data: { dailyBreakdowns: summaryArray } }, { headers: CORS_HEADERS });
        }

        if (filterType === 'period') {
            const periodId = searchParams.get('periodId') as PeriodId;
            const reportData = generatePeriodReportData(entries, periodId);
            return NextResponse.json({ type: 'period', data: reportData }, { headers: CORS_HEADERS });
        }
        
        // This is the default case for 'range'
        const pool = await getDbPool();
        let estornos: EstornoItem[] = [];
        if (pool && (await isMysqlConnected(pool)) && startDateStr && endDateStr) {
            const [rows] = await pool.query<mysql.RowDataPacket[]>(
                `SELECT items FROM ${ESTORNOS_TABLE_NAME} WHERE daily_entry_id BETWEEN ? AND ?`,
                [startDateStr, endDateStr]
            );
            estornos = rows.flatMap(row => safeParse<EstornoItem[]>(row.items) || []);
        }

        const visibilityConfig = await getSettingFromDataLayer<DashboardItemVisibilityConfig>('dashboardItemVisibilityConfig');
        const unitPricesConfig = await getSettingFromDataLayer<ChannelUnitPricesConfig>('channelUnitPricesConfig');
        
        const reportData = await generateGeneralReportForApiV2(entries, estornos, visibilityConfig, unitPricesConfig);
        return NextResponse.json({ type: 'general', data: reportData }, { headers: CORS_HEADERS });


    } catch (error: any) {
        console.error("API v2/reports Error:", error);
        return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500, headers: CORS_HEADERS });
    }
}
