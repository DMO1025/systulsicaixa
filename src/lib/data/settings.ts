

'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { getDbPool, isMysqlConnected, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import type { Settings } from '@/lib/types';
import type mysql from 'mysql2/promise';

const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');


// This function remains to read the DB connection details from the file system.
// It's a special case, as we need this info to connect to the DB in the first place.
async function getMysqlConfigFromFile(): Promise<Settings['mysqlConnectionConfig'] | null> {
    try {
        await fs.access(path.join(process.cwd(), 'data'));
        const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
        const settings = JSON.parse(fileContent) as Settings;
        return settings.mysqlConnectionConfig || null;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
          return null;
        }
        console.error('Error reading mysqlConnectionConfig from settings.json:', error);
        return null;
    }
}

export async function getSetting<T extends keyof Settings>(configId: T): Promise<Settings[T] | null> {
    if (configId === 'mysqlConnectionConfig') {
        return getMysqlConfigFromFile() as Promise<Settings[T] | null>;
    }
    
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }

    try {
        const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT value FROM ${SETTINGS_TABLE_NAME} WHERE configId = ?`, [configId]);
        if (rows.length > 0 && rows[0].value) {
            return rows[0].value as Settings[T];
        }
        return null;
    } catch (dbError) {
        console.error(`Database error getting setting ${configId}:`, dbError);
        throw new Error(`Erro ao buscar configuração '${configId}' no banco de dados.`);
    }
}

async function saveSettingToFile<K extends keyof Settings>(configId: K, value: Settings[K]): Promise<void> {
    const DATA_DIR = path.join(process.cwd(), 'data');
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
    let settings: Partial<Settings> = {};
    try {
        const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
        settings = JSON.parse(fileContent);
    } catch (error: any) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading settings file for save:', error);
            throw new Error('Failed to read existing settings file.');
        }
    }
    settings[configId] = value;
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2));
}


export async function saveSetting<T extends keyof Settings>(configId: T, configValue: Settings[T]): Promise<void> {
    // Always save mysqlConnectionConfig to file first to allow the pool to be recreated.
    if (configId === 'mysqlConnectionConfig') {
        await saveSettingToFile(configId, configValue);
    }
    
    const pool = await getDbPool(configId === 'mysqlConnectionConfig');
    if (!pool || !(await isMysqlConnected(pool))) {
        if(configId !== 'mysqlConnectionConfig') {
            throw new Error('Banco de dados não conectado. Salve a configuração do banco de dados primeiro.');
        }
        // If it's mysqlConnectionConfig and connection failed, it's okay, the file is saved.
        return;
    }

    try {
        const sql = `INSERT INTO ${SETTINGS_TABLE_NAME} (configId, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`;
        const valueToStore = JSON.stringify(configValue);
        await pool!.query(sql, [configId, valueToStore]);
    } catch (dbError: any) {
        console.error(`Database error saving setting ${configId}.`, dbError);
        throw new Error(`Falha ao salvar a configuração no banco de dados. Erro: ${dbError.message}`);
    }
}
