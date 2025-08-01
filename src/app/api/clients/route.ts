

import { NextResponse } from 'next/server';
import { getDbPool, isMysqlConnected, DAILY_ENTRIES_TABLE_NAME } from '@/lib/mysql';
import type { FaturadoItem, PeriodData } from '@/lib/types';
import type mysql from 'mysql2/promise';

const extractFaturadoItems = (period: PeriodData | string | undefined): FaturadoItem[] => {
    if (!period) return [];
    
    let parsedPeriod: PeriodData;
    if (typeof period === 'string') {
        try {
            parsedPeriod = JSON.parse(period);
        } catch {
            return [];
        }
    } else {
        parsedPeriod = period;
    }
    
    let items: FaturadoItem[] = [];
    if (parsedPeriod.subTabs?.faturado?.faturadoItems) {
        items = items.concat(parsedPeriod.subTabs.faturado.faturadoItems);
    }
    return items;
};


export async function GET() {
    try {
        const pool = await getDbPool();
        let allClientNames = new Set<string>();

        if (await isMysqlConnected(pool)) {
            const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT almocoPrimeiroTurno, almocoSegundoTurno, jantar FROM \`${DAILY_ENTRIES_TABLE_NAME}\``);
            rows.forEach(row => {
                const ptItems = extractFaturadoItems(row.almocoPrimeiroTurno);
                const stItems = extractFaturadoItems(row.almocoSegundoTurno);
                const jntItems = extractFaturadoItems(row.jantar);

                [...ptItems, ...stItems, ...jntItems].forEach(client => {
                    if (client.clientName) {
                        allClientNames.add(client.clientName);
                    }
                });
            });
        }
        
        const sortedClients = Array.from(allClientNames).sort((a, b) => a.localeCompare(b));
        return NextResponse.json(sortedClients);
    } catch (error: any) {
        console.error("Failed to fetch unique clients:", error);
        return NextResponse.json({ message: "Erro ao buscar pessoas/setores." }, { status: 500 });
    }
}
