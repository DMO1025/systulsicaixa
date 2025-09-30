

import mysql from 'mysql2/promise';
import type { Pool, PoolOptions } from 'mysql2/promise';
import type { Settings, MysqlConnectionConfig } from './types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import fs from 'node:fs/promises';
import path from 'node:path';

let pool: Pool | null = null;

export const DAILY_ENTRIES_TABLE_NAME = 'daily_entries';
export const SETTINGS_TABLE_NAME = 'settings';
export const USERS_TABLE_NAME = 'users';
export const AUDIT_LOG_TABLE_NAME = 'audit_log';
export const ESTORNOS_TABLE_NAME = 'estornos';

const generateSchemaCommands = (): string[] => {
  const dailyEntriesPeriodColumns = PERIOD_DEFINITIONS.map(p => `\`${p.id}\` JSON`).join(',\n  ');

  const dailyEntriesSchema = `
  CREATE TABLE IF NOT EXISTS \`${DAILY_ENTRIES_TABLE_NAME}\` (
    id VARCHAR(10) NOT NULL PRIMARY KEY,
    date DATE NOT NULL,
    generalObservations TEXT,
    ${dailyEntriesPeriodColumns},
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX date_idx (date)
  );`;
  
  const settingsSchema = `
  CREATE TABLE IF NOT EXISTS \`${SETTINGS_TABLE_NAME}\` (
    configId VARCHAR(255) PRIMARY KEY,
    value JSON,
    lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );`;

  const usersSchema = `
  CREATE TABLE IF NOT EXISTS \`${USERS_TABLE_NAME}\` (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    shifts JSON,
    allowedPages JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );`;

  const auditLogSchema = `
  CREATE TABLE IF NOT EXISTS \`${AUDIT_LOG_TABLE_NAME}\` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT
  );`;

  const estornosSchema = `
  CREATE TABLE IF NOT EXISTS \`${ESTORNOS_TABLE_NAME}\` (
    daily_entry_id VARCHAR(10) NOT NULL PRIMARY KEY,
    items JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (daily_entry_id) REFERENCES ${DAILY_ENTRIES_TABLE_NAME}(id) ON DELETE CASCADE
  );`;

  return [dailyEntriesSchema, settingsSchema, usersSchema, auditLogSchema, estornosSchema];
};

export const DATABASE_INIT_COMMANDS = generateSchemaCommands();

async function getMysqlConfigFromFile(): Promise<MysqlConnectionConfig | null> {
    const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'settings.json');
    try {
        await fs.access(path.dirname(SETTINGS_FILE_PATH));
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


export async function getDbPool(forceNew?: boolean): Promise<Pool | null> {
  if (pool && !forceNew) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return pool;
    } catch (pingError) {
      console.warn('Existing MySQL pool failed ping, attempting to recreate.');
      pool = null;
    }
  }
  
  if (pool && forceNew) {
    await pool.end();
    pool = null;
  }
  
  const dbConfig = await getMysqlConfigFromFile();

  if (!dbConfig || !dbConfig.host || !dbConfig.user || !dbConfig.database) {
    pool = null;
    return null;
  }

  const options: PoolOptions = {
    host: dbConfig.host,
    port: dbConfig.port || 3306,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 5000,
  };

  try {
    pool = mysql.createPool(options);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return pool;
  } catch (error: any) {
    pool = null;
    // Don't throw here, as it might be expected during setup.
    // Return null, and let callers decide how to handle a failed connection.
    console.error(`MySQL Connection Error: ${error.message}`);
    return null;
  }
}

export async function isMysqlConnected(currentPool?: Pool | null): Promise<boolean> {
    const poolToTest = currentPool || pool;
    if (!poolToTest) {
        return false;
    }
    try {
        const connection = await poolToTest.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error: any) {
        if(poolToTest === pool){
          pool = null; 
        }
        return false;
    }
}


export function safeStringify(value: any): string | null {
  if (value === undefined || value === null) return null;
  try {
    // Handling for estornos table structure
    if (value && Array.isArray(value) && value.length > 0 && ('description' in value[0] && 'category' in value[0])) {
      return JSON.stringify(value);
    }

    if (typeof value === 'object' && value !== null) {
      // Check for empty arrays within faturadoItems or consumoInternoItems
      if (('faturadoItems' in value && Array.isArray(value.faturadoItems) && value.faturadoItems.length === 0) ||
          ('consumoInternoItems' in value && Array.isArray(value.consumoInternoItems) && value.consumoInternoItems.length === 0)) {
         // If it only contains empty item arrays and no channels, it's empty
         if (!value.channels || Object.keys(value.channels).length === 0) return null;
      }

      if ('items' in value && Array.isArray(value.items)) {
        const hasObservations = value.periodObservations && value.periodObservations.trim() !== '';
        if (value.items.length === 0 && !hasObservations) {
          return JSON.stringify({"items":[]}); // Return an empty items string instead of null for estornos
        }
      }
      
      const hasMeaningfulData = Object.values(value).some(v => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'string' && v.trim() === '') return false;
        if (Array.isArray(v) && v.length === 0) return false;
        if (typeof v === 'object' && v !== null && Object.keys(v).length === 0) return false;
        if(typeof v === 'object' && v !== null && ('faturadoItems' in v || 'consumoInternoItems' in v)) {
            return (v as any)?.faturadoItems?.length > 0 || (v as any)?.consumoInternoItems?.length > 0;
        }
        if(typeof v === 'object' && v !== null && 'channels' in v && Object.keys((v as any).channels).length > 0){
            return Object.values((v as any).channels).some(ch => ch && ( (ch as any).qtd !== undefined || (ch as any).vtotal !== undefined));
        }
        return true;
      });

      if (!hasMeaningfulData) {
        return null;
      }
    }
    
    return JSON.stringify(value);
  } catch (e) {
    return JSON.stringify({serializationError: `Failed to stringify: ${(e as Error).message}`});
  }
}


export function safeParse<T>(jsonString: any): T | null {
  if (jsonString === null || jsonString === undefined) return null;
  // If it's not a string, assume it's already a parsed object
  if (typeof jsonString !== 'string' || jsonString.trim() === "") return jsonString as T;

  try {
    const parsed = JSON.parse(jsonString) as T;
    if (parsed && typeof parsed === 'object' && 'serializationError' in parsed) {
        return null;
    }
    return parsed;
  } catch (e) {
    return null; 
  }
}
