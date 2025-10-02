
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbPool, isMysqlConnected, ESTORNOS_TABLE_NAME, safeParse, safeStringify, DAILY_ENTRIES_TABLE_NAME } from '@/lib/mysql';
import { logAction } from '@/services/auditService';
import type { EstornoItem } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type mysql from 'mysql2/promise';

const relaunchSchema = z.object({
  originalItemId: z.string().uuid(),
  originalItemDate: z.string(),
  additionalObservation: z.string().optional(),
  registeredBy: z.string(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = relaunchSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json({ message: 'Dados de relançamento inválidos.', errors: validation.error.format() }, { status: 400 });
        }

        const { originalItemId, originalItemDate, additionalObservation, registeredBy } = validation.data;
        
        const pool = await getDbPool();
        if (!pool || !(await isMysqlConnected(pool))) {
            throw new Error('Banco de dados não conectado.');
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [rows] = await connection.query<mysql.RowDataPacket[]>(
                `SELECT items FROM ${ESTORNOS_TABLE_NAME} WHERE daily_entry_id = ?`,
                [originalItemDate]
            );

            if (rows.length === 0 || !rows[0].items) {
                 await connection.rollback();
                 connection.release();
                 return NextResponse.json({ message: 'Registro de estorno original não encontrado para esta data.' }, { status: 404 });
            }

            const existingItemsForDate: EstornoItem[] = safeParse<EstornoItem[]>(rows[0].items) || [];
            const originalItem = existingItemsForDate.find(item => item.id === originalItemId);

            if (!originalItem) {
                await connection.rollback();
                connection.release();
                return NextResponse.json({ message: 'Item de estorno original específico não encontrado para relançamento.' }, { status: 404 });
            }

            const newDate = new Date();
            const newDailyEntryId = format(newDate, 'yyyy-MM-dd');

            const relaunchPayload: EstornoItem = {
              id: uuidv4(),
              date: newDailyEntryId,
              hora: format(newDate, 'HH:mm'),
              registeredBy: registeredBy || 'sistema',
              reason: 'relancamento',
              valorEstorno: Math.abs(originalItem.valorEstorno || 0),
              observation: additionalObservation || '',
              uh: originalItem.uh,
              nf: originalItem.nf,
              quantity: originalItem.quantity || 0,
              valorTotalNota: originalItem.valorTotalNota,
              category: originalItem.category,
            };
            
            // Garante que a "folha" do dia exista na tabela principal de lançamentos.
            await connection.query(
                `INSERT INTO ${DAILY_ENTRIES_TABLE_NAME} (id, date) VALUES (?, ?) ON DUPLICATE KEY UPDATE date=date`,
                [newDailyEntryId, newDailyEntryId]
            );
            
            // Busca os estornos para a data ATUAL, travando a linha para atualização.
            const [relaunchDateRows] = await connection.query<mysql.RowDataPacket[]>(`SELECT items FROM ${ESTORNOS_TABLE_NAME} WHERE daily_entry_id = ? FOR UPDATE`, [newDailyEntryId]);

            let itemsForRelaunchDate: EstornoItem[] = [];
            if (relaunchDateRows.length > 0 && relaunchDateRows[0].items) {
                itemsForRelaunchDate = safeParse<EstornoItem[]>(relaunchDateRows[0].items) || [];
            }
            
            itemsForRelaunchDate.push(relaunchPayload);

            const sql = `
              INSERT INTO ${ESTORNOS_TABLE_NAME} (daily_entry_id, items)
              VALUES (?, ?)
              ON DUPLICATE KEY UPDATE items = VALUES(items);
            `;
            await connection.query(sql, [newDailyEntryId, safeStringify(itemsForRelaunchDate)]);

            await connection.commit();

            await logAction(registeredBy, 'RELAUNCH_ESTORNO', `Estorno ID ${originalItemId} relançado como crédito de ${relaunchPayload.valorEstorno}`);

            return NextResponse.json({ message: 'Estorno relançado como crédito com sucesso.' }, { status: 201 });

        } catch (dbError) {
            await connection.rollback();
            throw dbError; 
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('[ERRO NA API DE RELANÇAMENTO]', error);
        return NextResponse.json({ message: error.message || 'Um erro inesperado ocorreu no servidor.' }, { status: 500 });
    }
}
