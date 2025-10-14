
import mysql from 'mysql2/promise';
import type { Pool, PoolOptions } from 'mysql2/promise';
import type { Settings, MysqlConnectionConfig } from './types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { getMysqlConnectionConfig } from '@/lib/data/settings';


let pool: Pool | null = null;
let lastUsedConfig: MysqlConnectionConfig | null = null;

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


export async function getDbPool(): Promise<Pool | null> {
  const latestConfig = await getMysqlConnectionConfig();
  const configChanged = JSON.stringify(lastUsedConfig) !== JSON.stringify(latestConfig);

  if (pool && configChanged) {
      console.log("MySQL configuration has changed. Recreating connection pool.");
      try {
        await pool.end();
      } catch (e) {
        console.error("Error ending the stale pool:", e);
      }
      pool = null;
  }
  
  if (pool) {
      return pool;
  }

  if (!latestConfig || !latestConfig.host || !latestConfig.user || !latestConfig.database) {
    lastUsedConfig = null;
    return null;
  }
  
  lastUsedConfig = latestConfig; 

  const options: PoolOptions = {
    host: latestConfig.host,
    port: latestConfig.port || 3306,
    user: latestConfig.user,
    password: latestConfig.password,
    database: latestConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 5000,
  };

  try {
    console.log("Creating new MySQL connection pool.");
    pool = mysql.createPool(options);
    return pool;
  } catch (error: any) {
    console.error(`MySQL Connection Pool Error: ${error.message}`);
    pool = null; 
    lastUsedConfig = null;
    return null;
  }
}

export async function isMysqlConnected(currentPool?: Pool | null): Promise<boolean> {
    const poolToTest = currentPool || await getDbPool();
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
          try {
            if (pool) await pool.end();
          } catch(e) {
            console.error("Error ending the stale pool:", e);
          }
          pool = null; 
          lastUsedConfig = null;
        }
        return false;
    }
}


export function safeStringify(value: any): string | null {
  if (value === undefined || value === null) return null;
  try {
    if (typeof value === 'object' && value !== null) {
      if (Object.keys(value).length === 0 && !Array.isArray(value)) return null;

      if ('items' in value && Array.isArray(value.items) && value.items.length === 0) {
        if ('periodObservations' in value && value.periodObservations && value.periodObservations.trim() !== '') {
        } else {
           if(Object.keys(value).length <= 2) return null;
        }
      }
    }
    
    return JSON.stringify(value);
  } catch (e) {
    console.error("Error during safeStringify:", e);
    return JSON.stringify({ serializationError: `Failed to stringify a value.` });
  }
}


export function safeParse<T>(jsonString: any): T | null {
  if (jsonString === null || jsonString === undefined) return null;
  
  if (typeof jsonString === 'object') {
     return jsonString as T; // Assume it's already a parsed object
  }
  
  if (typeof jsonString !== 'string' || jsonString.trim() === "") {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonString) as T;
    if (parsed && typeof parsed === 'object' && 'serializationError' in parsed) {
        console.warn("safeParse found a value that failed serialization earlier.");
        return null;
    }
    return parsed;
  } catch (e) {
    return null; 
  }
}
