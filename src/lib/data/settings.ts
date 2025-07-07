
'use server';

import { getDbPool, isMysqlConnected, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import { getSettingFromFile, saveSettingToFile } from '@/lib/fileDb';
import type { Settings } from '@/lib/types';
import type mysql from 'mysql2/promise';

export async function getSetting<T extends keyof Settings>(configId: T): Promise<Settings[T] | null> {
    // Exception: mysqlConnectionConfig MUST always come from the file.
    if (configId === 'mysqlConnectionConfig') {
        return getSettingFromFile(configId);
    }
    
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT value FROM ${SETTINGS_TABLE_NAME} WHERE configId = ?`, [configId]);
            if (rows.length > 0) {
                // Return data from DB if found
                return rows[0].value as Settings[T] | null;
            }
            // If not found in DB, it might exist in the file (e.g., during a migration period or if DB save failed)
            return getSettingFromFile(configId);
        } catch (dbError) {
            console.error(`Database error getting setting ${configId}, falling back to file:`, dbError);
            return getSettingFromFile(configId);
        }
    } else {
        // Fallback to file if DB is not connected
        return getSettingFromFile(configId);
    }
}

export async function saveSetting<T extends keyof Settings>(configId: T, configValue: Settings[T]): Promise<void> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const sql = `INSERT INTO ${SETTINGS_TABLE_NAME} (configId, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`;
            await pool!.query(sql, [configId, JSON.stringify(configValue)]);
            // Also save to file as a backup and for mysqlConnectionConfig itself
            if (configId === 'mysqlConnectionConfig') {
                 await saveSettingToFile(configId, configValue);
            }
        } catch (dbError) {
            console.error(`Database error saving setting ${configId}:`, dbError);
            throw new Error(`Failed to save setting ${configId} to database.`);
        }
    } else {
        // If DB isn't connected, just save to the file
        await saveSettingToFile(configId, configValue);
    }
}
