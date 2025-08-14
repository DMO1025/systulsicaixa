
'use server';

import { getDbPool, isMysqlConnected, AUDIT_LOG_TABLE_NAME } from '@/lib/mysql';
import type { AuditLog } from '@/lib/types';
import type mysql from 'mysql2/promise';

export async function logAction(username: string, action: string, details: string): Promise<void> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        console.error('AUDIT LOG FAILED: Database not connected.');
        return;
    }
    try {
        const sql = `INSERT INTO ${AUDIT_LOG_TABLE_NAME} (username, action, details) VALUES (?, ?, ?)`;
        await pool.query(sql, [username, action, details]);
    } catch (dbError: any) {
        console.error(`AUDIT LOG FAILED for user ${username}, action ${action}:`, dbError);
    }
}

export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado para buscar histórico.');
    }
    try {
        const sql = `SELECT * FROM ${AUDIT_LOG_TABLE_NAME} ORDER BY timestamp DESC LIMIT ?`;
        const [rows] = await pool.query<mysql.RowDataPacket[]>(sql, [limit]);
        return rows as AuditLog[];
    } catch(dbError: any) {
        throw new Error(`Erro ao buscar histórico no banco de dados: ${dbError.message}`);
    }
}
