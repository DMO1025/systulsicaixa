
'use server';

import { getDbPool, isMysqlConnected, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import { readSettingsFile, writeSettingsFile } from '@/lib/fileDb';
import type { Settings } from '@/lib/types';
import type mysql from 'mysql2/promise';

export async function getSetting<T extends keyof Settings>(configId: T): Promise<Settings[T] | null> {
    const pool = await getDbPool();
    let isConnected = await isMysqlConnected(pool);
    
    if (pool && isConnected) {
        try {
            const [rows] = await pool.query<mysql.RowDataPacket[]>(`SELECT value FROM ${SETTINGS_TABLE_NAME} WHERE configId = ?`, [configId]);
            if (rows.length > 0 && rows[0].value) {
                // MySQL JSON type is often returned as a string, so we parse it.
                // If it's already an object, parsing won't hurt.
                const value = rows[0].value;
                return typeof value === 'string' ? JSON.parse(value) : value;
            }
            return null;
        } catch (dbError: any) {
            console.warn(`MySQL getSetting for '${configId}' failed, falling back to file. Error: ${dbError.message}`);
            // Fallback to file if DB read fails for any reason
        }
    }
    
    // Fallback to file-based storage
    try {
        const settings = await readSettingsFile();
        return settings[configId] || null;
    } catch(fileError: any) {
        console.error(`File-based getSetting for '${configId}' failed. Error: ${fileError.message}`);
        return null;
    }
}


export async function saveSetting<T extends keyof Settings>(configId: T, value: Settings[T]): Promise<void> {
    const pool = await getDbPool();
    let isConnected = await isMysqlConnected(pool);
    
    if (pool && isConnected) {
        try {
            const sql = `
                INSERT INTO ${SETTINGS_TABLE_NAME} (configId, value) 
                VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE value = ?;
            `;
            const valueAsJsonString = JSON.stringify(value);
            await pool.query(sql, [configId, valueAsJsonString, valueAsJsonString]);
            return;
        } catch (dbError: any) {
            console.warn(`MySQL saveSetting for '${configId}' failed, falling back to file. Error: ${dbError.message}`);
        }
    }

    // Fallback to file-based storage
    try {
        const settings = await readSettingsFile();
        settings[configId] = value;
        await writeSettingsFile(settings);
    } catch(fileError: any) {
         console.error(`File-based saveSetting for '${configId}' failed. Error: ${fileError.message}`);
         throw fileError; // Re-throw file error as it's the last resort
    }
}
