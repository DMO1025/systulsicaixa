
import { type NextRequest, NextResponse } from 'next/server';
import { getAllEntries, saveEntry } from '@/lib/data/entries';
import type { DailyLogEntry, PeriodData, FaturadoItem, ConsumoInternoItem, BilledClient } from '@/lib/types';
import { getSetting, saveSetting } from '@/lib/data/settings';

export async function POST(request: NextRequest) {
    try {
        const { oldName, newName, startDate, endDate } = await request.json();

        if (!oldName || !newName) {
            return NextResponse.json({ message: 'Nome antigo e novo são obrigatórios.' }, { status: 400 });
        }
        
        if (!startDate || !endDate) {
            return NextResponse.json({ message: 'Datas de início e fim são obrigatórias.' }, { status: 400 });
        }

        // 1. Rename within entries
        const entriesToUpdate = await getAllEntries({ startDate, endDate });
        let updatedCount = 0;

        for (const entry of entriesToUpdate) {
            let entryWasModified = false;
            
            const processPeriod = (period?: PeriodData) => {
                if (!period?.subTabs) return;

                const processItems = (items?: (FaturadoItem | ConsumoInternoItem)[]) => {
                    if (!items) return;
                    items.forEach(item => {
                        if (item.clientName === oldName) {
                            item.clientName = newName;
                            entryWasModified = true;
                        }
                    });
                };

                processItems(period.subTabs.faturado?.faturadoItems);
                processItems(period.subTabs.consumoInterno?.consumoInternoItems);
            };

            processPeriod(entry.almocoPrimeiroTurno as PeriodData);
            processPeriod(entry.almocoSegundoTurno as PeriodData);
            processPeriod(entry.jantar as PeriodData);
            
            if (entryWasModified) {
                await saveEntry(entry.id, entry as DailyLogEntry);
                updatedCount++;
            }
        }

        // 2. Rename in billedClients settings
        let settingsMessage = '';
        try {
            const billedClients = await getSetting('billedClients') as BilledClient[] | null;
            if (billedClients) {
                const clientIndex = billedClients.findIndex(c => c.name === oldName);
                if (clientIndex > -1) {
                    billedClients[clientIndex].name = newName;
                    await saveSetting('billedClients', billedClients);
                    settingsMessage = ' O nome também foi atualizado na lista de pessoas faturadas.';
                }
            }
        } catch (settingsError: any) {
            console.error("Failed to update billedClients setting:", settingsError);
            settingsMessage = " (Falha ao atualizar a lista de pessoas faturadas).";
        }
        
        return NextResponse.json({ message: `Nome alterado com sucesso em ${updatedCount} registro(s).${settingsMessage}` });

    } catch (error: any) {
        console.error("API rename-person error:", error);
        return NextResponse.json({ message: 'Erro interno do servidor ao renomear pessoa.' }, { status: 500 });
    }
}
