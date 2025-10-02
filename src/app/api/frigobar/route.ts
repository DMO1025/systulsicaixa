
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbPool, isMysqlConnected, DAILY_ENTRIES_TABLE_NAME, safeParse, safeStringify } from '@/lib/mysql';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';
import { logAction } from '@/services/auditService';
import type { FrigobarConsumptionLog, FrigobarPeriodData } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import type mysql from 'mysql2/promise';


const logSchema = z.object({
  id: z.string(),
  uh: z.string().min(1, "O número do quarto (UH) é obrigatório."),
  items: z.record(z.string(), z.number().min(1, 'Quantidade deve ser maior que zero')),
  totalValue: z.number(),
  valorRecebido: z.number().optional(),
  timestamp: z.string().datetime(),
  registeredBy: z.string().optional(),
});


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
        return NextResponse.json({ message: 'Data de início e fim são obrigatórios.' }, { status: 400 });
    }

    try {
        const pool = await getDbPool();
        if (!pool || !(await isMysqlConnected(pool))) {
            throw new Error('Banco de dados não conectado.');
        }

        const [rows] = await pool.query<mysql.RowDataPacket[]>(
            `SELECT controleFrigobar FROM ${DAILY_ENTRIES_TABLE_NAME} WHERE id BETWEEN ? AND ?`,
            [startDateStr, endDateStr]
        );
        
        const allLogs: FrigobarConsumptionLog[] = rows.flatMap(row => {
            const frigobarData = safeParse<FrigobarPeriodData>(row.controleFrigobar);
            return frigobarData?.logs || [];
        });
        
        return NextResponse.json(allLogs);
    } catch (error: any) {
        console.error('API GET Frigobar Error:', error);
        return NextResponse.json({ message: `Erro ao buscar histórico de frigobar: ${error.message}` }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = logSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ message: 'Dados inválidos.', errors: validation.error.format() }, { status: 400 });
        }
        
        const newLog = validation.data;
        const daily_entry_id = format(parseISO(newLog.timestamp), 'yyyy-MM-dd');

        const pool = await getDbPool();
        if (!pool || !(await isMysqlConnected(pool))) {
            throw new Error('Banco de dados não conectado.');
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            const [rows] = await connection.query<mysql.RowDataPacket[]>(
                `SELECT controleFrigobar FROM ${DAILY_ENTRIES_TABLE_NAME} WHERE id = ? FOR UPDATE`,
                [daily_entry_id]
            );

            let frigobarData: FrigobarPeriodData;
            if (rows.length > 0) {
                frigobarData = safeParse<FrigobarPeriodData>(rows[0].controleFrigobar) || { logs: [] };
            } else {
                frigobarData = { logs: [] };
                await connection.query(`INSERT INTO ${DAILY_ENTRIES_TABLE_NAME} (id, date) VALUES (?, ?)`, [daily_entry_id, daily_entry_id]);
            }
            
            const existingLogIndex = frigobarData.logs.findIndex(log => log.id === newLog.id);

            if (existingLogIndex > -1) {
                // Update existing log
                frigobarData.logs[existingLogIndex] = { ...frigobarData.logs[existingLogIndex], ...newLog };
            } else {
                // Add new log
                frigobarData.logs.push(newLog as FrigobarConsumptionLog);
            }

            const sql = `UPDATE ${DAILY_ENTRIES_TABLE_NAME} SET controleFrigobar = ? WHERE id = ?`;
            await connection.query(sql, [safeStringify(frigobarData), daily_entry_id]);

            await connection.commit();

            const username = getCookie('username', { cookies }) || 'sistema';
            const action = existingLogIndex > -1 ? 'UPDATE_FRIGOBAR_LOG' : 'CREATE_FRIGOBAR_LOG';
            const itemsSummary = Object.keys(newLog.items).join(', ');
            await logAction(username, action, `Consumo de frigobar ${action === 'UPDATE_FRIGOBAR_LOG' ? 'atualizado' : 'adicionado'} em ${daily_entry_id} para UH ${newLog.uh}: ${itemsSummary}`);

            return NextResponse.json({ message: 'Consumo de frigobar salvo com sucesso.', data: newLog }, { status: 201 });

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('API POST Frigobar Error:', error);
        return NextResponse.json({ message: `Erro ao salvar consumo de frigobar: ${error.message}` }, { status: 500 });
    }
}


export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const deleteSchema = z.object({ id: z.string() });
        const validation = deleteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ message: 'ID do log para exclusão é obrigatório.', errors: validation.error.format() }, { status: 400 });
        }
        const { id: logIdToDelete } = validation.data;
        
        const pool = await getDbPool();
        if (!pool) throw new Error('Banco de dados não conectado.');
        
        const [allEntries] = await pool.query<mysql.RowDataPacket[]>(
            `SELECT id, controleFrigobar FROM ${DAILY_ENTRIES_TABLE_NAME} WHERE controleFrigobar IS NOT NULL AND JSON_LENGTH(controleFrigobar, '$.logs') > 0`
        );

        for (const entry of allEntries) {
            const frigobarData = safeParse<FrigobarPeriodData>(entry.controleFrigobar);
            if (frigobarData?.logs) {
                const logIndex = frigobarData.logs.findIndex(log => log.id === logIdToDelete);
                
                if (logIndex > -1) {
                    const logToRemove = frigobarData.logs[logIndex];
                    frigobarData.logs.splice(logIndex, 1);
                    
                    await pool.query(
                        `UPDATE ${DAILY_ENTRIES_TABLE_NAME} SET controleFrigobar = ? WHERE id = ?`,
                        [safeStringify(frigobarData), entry.id]
                    );

                    const username = getCookie('username', { cookies }) || 'sistema';
                    await logAction(username, 'DELETE_FRIGOBAR_LOG', `Log de consumo de frigobar removido (ID: ${logIdToDelete}) para UH ${logToRemove.uh}`);

                    return NextResponse.json({ message: 'Consumo de frigobar removido com sucesso.' });
                }
            }
        }
        
        return NextResponse.json({ message: 'Log de consumo não encontrado para exclusão.' }, { status: 404 });

    } catch (error: any) {
        console.error('API DELETE Frigobar Error:', error);
        return NextResponse.json({ message: `Erro ao remover consumo de frigobar: ${error.message}` }, { status: 500 });
    }
}
