
import mysql from 'mysql2/promise';
import type { Pool, PoolOptions } from 'mysql2/promise';
import { getSettingFromFile } from '@/lib/fileDb';
import type { MysqlConnectionConfig } from './types';
import { PERIOD_DEFINITIONS } from './constants';

let pool: Pool | null = null;

export const TABLE_NAME = 'daily_entries';
export const SETTINGS_TABLE_NAME = 'app_settings';
export const USERS_TABLE_NAME = 'users';


const generateTableSchema = (): string => {
  const periodColumns = PERIOD_DEFINITIONS.map(p => `\`${p.id}\` JSON`).join(',\n  ');
  
  return `
CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
  id VARCHAR(10) PRIMARY KEY, -- YYYY-MM-DD
  date DATE NOT NULL,
  generalObservations TEXT,
  ${periodColumns},
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX date_idx (date)
);`;
};

export const DAILY_ENTRIES_TABLE_SCHEMA = generateTableSchema();

export const APP_SETTINGS_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS \`${SETTINGS_TABLE_NAME}\` (
  id VARCHAR(255) PRIMARY KEY,
  value JSON NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`;

export const USERS_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS \`${USERS_TABLE_NAME}\` (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  shifts JSON,
  allowedPages JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastModifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`;


export async function getDbPool(forceNew?: boolean): Promise<Pool | null> {
  if (pool && !forceNew) {
    try {
      // Test existing pool before returning
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return pool;
    } catch (pingError) {
      // Existing pool is bad, proceed to create a new one
      console.warn('Existing MySQL pool failed ping, attempting to recreate.');
      pool = null; // Invalidate the current pool
    }
  }
  
  if (pool && forceNew) {
    await pool.end();
    pool = null;
  }
  
  const dbConfig = await getSettingFromFile('mysqlConnectionConfig');

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
    // Test the new pool immediately
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return pool;
  } catch (error: any) {
    pool = null;
    throw new Error(`MySQL Connection Error: ${error.message}`);
  }
}

export async function isMysqlConnected(currentPool?: Pool | null): Promise<boolean> {
    const poolToTest = currentPool ?? await getDbPool().catch(() => null); // Catch error from getDbPool
    if (!poolToTest) {
        return false;
    }
    try {
        const connection = await poolToTest.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error: any) {
        // If ping fails, we should invalidate the main pool so getDbPool tries to recreate it next time.
        pool = null; 
        return false;
    }
}


export function safeStringify(value: any): string | null {
  if (value === undefined || value === null) return null;
  try {
    // Avoid storing empty objects or objects with only empty periodObservations
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return null;
      if (keys.length === 1 && keys[0] === 'periodObservations' && 
          (value.periodObservations === '' || value.periodObservations === null || value.periodObservations === undefined)) {
        return null;
      }
       // Specific check for 'eventos' to not store if items array is empty and no observations
      if ('items' in value && Array.isArray(value.items) && value.items.length === 0) {
        if (keys.length === 1 || (keys.length === 2 && 'periodObservations' in value && 
            (value.periodObservations === '' || value.periodObservations === null || value.periodObservations === undefined))) {
                return null;
            }
      }
    }
    return JSON.stringify(value);
  } catch (e) {
    return JSON.stringify({serializationError: `Failed to stringify: ${(e as Error).message}`});
  }
}

export function safeParse<T>(jsonString: string | null | undefined): T | null {
  if (jsonString === null || jsonString === undefined || jsonString.trim() === "") return null;
  try {
    const parsed = JSON.parse(jsonString) as T;
    if (parsed && typeof parsed === 'object' && 'serializationError' in parsed) {
        return null; // Or handle as an error appropriately
    }
    return parsed;
  } catch (e) {
    return null; 
  }
}
