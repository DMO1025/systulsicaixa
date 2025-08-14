

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAllDailyEntries } from '@/lib/data/entries';
import { generateGeneralReport } from '@/lib/reports/general/generator';
import { generatePeriodReportData } from '@/lib/reports/period/generator';
import type { DailyLogEntry, FilterType } from '@/lib/types';
import { isValid, parse, format, startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
    // This is the internal, authenticated endpoint.
    const cookieStore = cookies();
    const userRole = cookieStore.get('userRole')?.value;

    if (!userRole) {
        return NextResponse.json({ message: 'Não autorizado: você precisa estar logado.' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        
        const filterType: FilterType = searchParams.get('filterType') as FilterType || 'month';
        
        // --- Date Range Calculation ---
        let startDateStr: string | undefined;
        let endDateStr: string | undefined;

        if (filterType === 'date') {
            const date = searchParams.get('date');
            if (date && isValid(parse(date, 'yyyy-MM-dd', new Date()))) {
                startDateStr = endDateStr = date;
            } else {
                return NextResponse.json({ message: `Parâmetro 'date' inválido ou ausente. Use AAAA-MM-DD.` }, { status: 400 });
            }
        } else if (filterType === 'range' || filterType.startsWith('client-')) {
            startDateStr = searchParams.get('startDate') || undefined;
            endDateStr = searchParams.get('endDate') || undefined;
            if (!startDateStr || !isValid(parse(startDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'startDate' inválido ou ausente. Use AAAA-MM-DD.` }, { status: 400 });
            }
             if (endDateStr && !isValid(parse(endDateStr, 'yyyy-MM-dd', new Date()))) {
                return NextResponse.json({ message: `Parâmetro 'endDate' inválido. Use AAAA-MM-DD.` }, { status: 400 });
            }
        } else {
            const monthStr = searchParams.get('month'); // YYYY-MM
            if (monthStr && isValid(parse(monthStr, 'yyyy-MM', new Date()))) {
                const monthDate = startOfMonth(parse(monthStr, 'yyyy-MM', new Date()));
                startDateStr = format(monthDate, 'yyyy-MM-dd');
                const endOfMonthDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                endDateStr = `${monthStr}-${String(endOfMonthDay).padStart(2, '0')}`;
            } else {
                 return NextResponse.json({ message: `Parâmetro 'month' inválido ou ausente para este tipo de filtro. Use AAAA-MM.` }, { status: 400 });
            }
        }
        
        const entries = await getAllEntries({ startDate: startDateStr, endDate: endDateStr }) as DailyLogEntry[];
        
        if (filterType === 'date' && entries.length > 0) {
            return NextResponse.json(entries[0]);
        }
        if (filterType === 'date' && entries.length === 0) {
            return NextResponse.json({});
        }

        const periodId = searchParams.get('periodId') as any;
        
        if(filterType === 'month' || filterType === 'range'){
            const reportData = generateGeneralReport(entries);
            return NextResponse.json({ type: 'general', data: reportData });
        } else {
            const reportData = generatePeriodReportData(entries, periodId || 'all');
            return NextResponse.json({ type: 'period', data: reportData });
        }

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500 });
    }
}
