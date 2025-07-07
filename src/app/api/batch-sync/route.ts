
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveDailyEntry } from '@/services/dailyEntryService';
import type { DailyLogEntry } from '@/lib/types';
import { parseISO } from 'date-fns';

const batchSyncSchema = z.object({
    entries: z.record(z.string(), z.any()) // Basic validation, more specific validation happens in service
});

export async function POST(request: NextRequest) {
    const baseUrl = new URL(request.url).origin;
    let successfulSyncs = 0;
    const errors: { date: string, error: string }[] = [];

    try {
        const body = await request.json();
        const validationResult = batchSyncSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json({ success: false, message: 'Payload da requisição inválido.' }, { status: 400 });
        }
        
        const entriesToSync = validationResult.data.entries;

        for (const dateString in entriesToSync) {
            const entryData = entriesToSync[dateString] as DailyLogEntry;
            const dateObj = parseISO(dateString);

            try {
                await saveDailyEntry(dateObj, entryData, baseUrl);
                successfulSyncs++;
            } catch (saveError: any) {
                errors.push({ date: dateString, error: saveError.message });
            }
        }

        if (errors.length > 0) {
            const errorMessage = `Sincronização parcial. ${successfulSyncs} registros salvos. Falhas: ${errors.map(e => `${e.date} (${e.error})`).join(', ')}`;
            return NextResponse.json({ success: false, message: errorMessage }, { status: 207 });
        }
        
        return NextResponse.json({ success: true, message: `${successfulSyncs} registro(s) sincronizado(s) com sucesso.` });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: `Erro no servidor durante a sincronização: ${error.message}` }, { status: 500 });
    }
}
