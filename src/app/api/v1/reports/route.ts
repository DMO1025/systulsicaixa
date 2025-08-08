
import { NextResponse, type NextRequest } from 'next/server';
import { getAllEntries } from '@/lib/data/entries';
import { generateApiReportData } from '@/lib/api/reportUtils'; // Updated import
import type { DailyLogEntry, FilterType } from '@/lib/types';
import { isValid, parse, format, startOfMonth } from 'date-fns';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        const filterType: FilterType = searchParams.get('filterType') as FilterType || 'month';
        
        let startDateStr: string | undefined;
        let endDateStr: string | undefined;

        if (filterType === 'date') {
            const date = searchParams.get('date');
            if (date && isValid(parse(date, 'yyyy-MM-dd', new Date()))) {
                startDateStr = endDateStr = date;
            } else {
                return NextResponse.json({ message: `Parâmetro 'date' inválido ou ausente. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
        } else if (filterType === 'range') {
            startDateStr = searchParams.get('startDate') || undefined;
            endDateStr = searchParams.get('endDate') || undefined;
            if (!startDateStr || !isValid(parse(startDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'startDate' inválido ou ausente. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
             if (endDateStr && !isValid(parse(endDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'endDate' inválido. Use AAAA-MM-DD.` }, { status: 400, headers: CORS_HEADERS });
            }
        } else {
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
        
        const entries = await getAllEntries({ startDate: startDateStr, endDate: endDateStr }) as DailyLogEntry[];
        
        if (filterType === 'date' && entries.length > 0) {
            return NextResponse.json(entries[0], { headers: CORS_HEADERS });
        }
        if (filterType === 'date' && entries.length === 0) {
            return NextResponse.json({}, { headers: CORS_HEADERS });
        }
        
        const periodId = searchParams.get('periodId') as any;
        const reportData = generateApiReportData(entries, periodId || 'all');

        return NextResponse.json(reportData, { headers: CORS_HEADERS });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500, headers: CORS_HEADERS });
    }
}
