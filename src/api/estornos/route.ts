

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbPool, isMysqlConnected, ESTORNOS_TABLE_NAME, safeParse, safeStringify, DAILY_ENTRIES_TABLE_NAME } from '@/lib/mysql';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';
import { logAction } from '@/services/auditService';
import type { EstornoItem, EstornoReason } from '@/lib/types';
import type mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const itemSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  registeredBy: z.string().optional(),
  uh: z.string().optional(),
  nf: z.string().optional(),
  reason: z.enum([
    'duplicidade',
    'erro de lancamento',
    'pagamento direto',
    'nao consumido',
    'assinatura divergente',
    'cortesia',
    'relancamento',
  ]),
  quantity: z.number(),
  valorTotalNota: z.number().optional(),
  valorEstorno: z.number(),
  observation: z.string().optional(),
  category: z.string(),
  hora: z.string().optional(),
});


export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const category = searchParams.get('category');

    if (!startDateStr || !endDateStr) {
        return NextResponse.json({ message: 'Data de início e fim são obrigatórios.' }, { status: 400 });
    }

    try {
        const pool = await getDbPool();
        if (!pool || !(await isMysqlConnected(pool))) {
            throw new Error('Banco de dados não conectado.');
        }

        const [rows] = await pool.query<mysql.RowDataPacket[]>(
            `SELECT items FROM ${ESTORNOS_TABLE_NAME} WHERE daily_entry_id BETWEEN ? AND ?`,
            [startDateStr, endDateStr]
        );
        
        let allItems: EstornoItem[] = rows.flatMap(row => safeParse<EstornoItem[]>(row.items) || []);
        
        if (category && category !== 'all') {
            allItems = allItems.filter(item => item.category === category);
        }
        
        return NextResponse.json(allItems);
    } catch (error: any) {
        console.error('API GET Estornos Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    let body;
    try {
        body = await request.json();
        const validation = itemSchema.safeParse(body);
        if (!validation.success) {
            console.error('[LOG DE ERRO] Dados inválidos recebidos na API de estornos:', {
                bodyRecebido: body,
                erros: validation.error.format(),
            });
            return NextResponse.json({ message: 'Dados inválidos.', errors: validation.error.format() }, { status: 400 });
        }
        
        const newItem = validation.data;
        
        if (!newItem.id) {
            newItem.id = uuidv4();
        }

        if (newItem.reason === 'relancamento') {
            newItem.valorEstorno = Math.abs(newItem.valorEstorno);
        } else {
            newItem.valorEstorno = -Math.abs(newItem.valorEstorno);
        }
        
        const daily_entry_id = newItem.date;

        const pool = await getDbPool();
        if (!pool || !(await isMysqlConnected(pool))) {
            throw new Error('Banco de dados não conectado.');
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [parentRows] = await connection.query<mysql.RowDataPacket[]>(
                `SELECT id FROM ${DAILY_ENTRIES_TABLE_NAME} WHERE id = ?`,
                [daily_entry_id]
            );
            if (parentRows.length === 0) {
                await connection.query(
                    `INSERT INTO ${DAILY_ENTRIES_TABLE_NAME} (id, date) VALUES (?, ?)`,
                    [daily_entry_id, daily_entry_id]
                );
            }

            const [rows] = await connection.query<mysql.RowDataPacket[]>(
                `SELECT items FROM ${ESTORNOS_TABLE_NAME} WHERE daily_entry_id = ? FOR UPDATE`,
                [daily_entry_id]
            );

            let existingItems: EstornoItem[] = [];
            if (rows.length > 0 && rows[0].items) {
                existingItems = safeParse<EstornoItem[]>(rows[0].items) || [];
            }
            
            existingItems.push(newItem as EstornoItem);

            const sql = `
              INSERT INTO ${ESTORNOS_TABLE_NAME} (daily_entry_id, items)
              VALUES (?, ?)
              ON DUPLICATE KEY UPDATE items = VALUES(items);
            `;
            await connection.query(sql, [daily_entry_id, safeStringify(existingItems)]);

            await connection.commit();

            const actorUsername = newItem.registeredBy || getCookie('username', { cookies }) || 'sistema';
            await logAction(actorUsername, 'CREATE_ESTORNO', `Estorno adicionado em ${daily_entry_id}: ${newItem.reason} (R$ ${newItem.valorEstorno})`);

            return NextResponse.json({ message: 'Estorno salvo com sucesso.' }, { status: 201 });

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('API POST Estornos Error:', error);
        console.error('[LOG DE ERRO] Payload que causou o erro:', body);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}


export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const deleteSchema = itemSchema.pick({ id: true, date: true });
        const validation = deleteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ message: 'Dados inválidos para exclusão.', errors: validation.error.format() }, { status: 400 });
        }
        const itemToDelete = validation.data;
        const daily_entry_id = itemToDelete.date;
        
        const pool = await getDbPool();
        if (!pool || !(await isMysqlConnected(pool))) {
            throw new Error('Banco de dados não conectado.');
        }
        
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.query<mysql.RowDataPacket[]>(
                `SELECT items FROM ${ESTORNOS_TABLE_NAME} WHERE daily_entry_id = ? FOR UPDATE`,
                [daily_entry_id]
            );

            if (rows.length === 0) {
                 await connection.rollback();
                 return NextResponse.json({ message: 'Nenhum estorno encontrado para esta data.' }, { status: 404 });
            }

            let existingItems: EstornoItem[] = safeParse<EstornoItem[]>(rows[0].items) || [];
            const itemToRemove = existingItems.find(item => item.id === itemToDelete.id);
            const updatedItems = existingItems.filter(item => item.id !== itemToDelete.id);

            if (existingItems.length === updatedItems.length) {
                await connection.rollback();
                return NextResponse.json({ message: 'Item de estorno não encontrado para exclusão.' }, { status: 404 });
            }
            
            await connection.query(
                `UPDATE ${ESTORNOS_TABLE_NAME} SET items = ? WHERE daily_entry_id = ?`,
                [safeStringify(updatedItems), daily_entry_id]
            );
            
            await connection.commit();

            const username = getCookie('username', { cookies }) || 'sistema';
            await logAction(username, 'DELETE_ESTORNO', `Estorno removido: ${itemToRemove?.reason} (ID: ${itemToDelete.id})`);

            return NextResponse.json({ message: 'Estorno removido com sucesso.' });

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error('API DELETE Estornos Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
