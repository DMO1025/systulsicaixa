

'use server';

import type { Settings } from '@/lib/types';
import { getDbPool, isMysqlConnected, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import { readSettingsFile, writeSettingsFile } from '@/lib/fileDb';
import type mysql from 'mysql2/promise';

export async function getSetting<K extends keyof Settings>(configId: K): Promise<Settings[K] | null> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT value FROM \`${SETTINGS_TABLE_NAME}\` WHERE configId = ?`, [configId]);
            if (rows.length > 0 && rows[0].value) {
                // MySQL connector can autoparse JSON, but we ensure it's an object.
                const value = rows[0].value;
                return typeof value === 'string' ? JSON.parse(value) : value;
            }
            return null;
        } catch (error) {
            console.warn(`MySQL getSetting for '${configId}' failed, falling back to file. Error: ${error}`);
            // Fallback to file if DB read fails
            return await getSettingFromFile(configId);
        }
    } else {
        return await getSettingFromFile(configId);
    }
}

async function getSettingFromFile<K extends keyof Settings>(configId: K): Promise<Settings[K] | null> {
    const settings = await readSettingsFile();
    return settings[configId] || null;
}

export async function saveSetting<K extends keyof Settings>(configId: K, value: Settings[K]): Promise<void> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const sql = `INSERT INTO ${SETTINGS_TABLE_NAME} (configId, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`;
            await pool!.query(sql, [configId, JSON.stringify(value)]);
        } catch (dbError) {
             console.warn(`MySQL saveSetting for '${configId}' failed, saving to file as fallback. Error: ${dbError}`);
            // Fallback to file if DB write fails
            await saveSettingToFile(configId, value);
        }
    } else {
        await saveSettingToFile(configId, value);
    }
}

async function saveSettingToFile<K extends keyof Settings>(configId: K, value: Settings[K]): Promise<void> {
    const settings = await readSettingsFile();
    settings[configId] = value;
    await writeSettingsFile(settings);
}

export async function getMysqlConnectionConfig() {
    // This is a special case. To connect to the DB, we can't first ask the DB for creds.
    // We MUST read this from the file.
    return await getSettingFromFile('mysqlConnectionConfig');
}
