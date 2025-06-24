
import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool, DATABASE_INIT_SCHEMA, isMysqlConnected, safeStringify, DAILY_ENTRIES_TABLE_NAME, USERS_TABLE_NAME, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import { getAllEntriesFromFile, getUsersFromFile, readSettingsFile } from '@/lib/fileDb';
import type { MysqlConnectionConfig, DailyLogEntry, Settings, User } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/constants';
import mysql, { type PoolOptions } from 'mysql2/promise';
import { format, isValid, parseISO } from 'date-fns';
import { revalidateTag } from 'next/cache';

async function testConnection(request: NextRequest): Promise<NextResponse> {
    let mysqlConfigFromRequest: MysqlConnectionConfig | undefined;
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
         if (body && typeof body === 'object' && ('host' in body || 'user' in body || 'database' in body)) {
            mysqlConfigFromRequest = body as MysqlConnectionConfig;
        }
      }
    } catch (e) {
      // No body or invalid JSON, which is fine.
    }

    try {
      if (mysqlConfigFromRequest && mysqlConfigFromRequest.host) {
        const testOptions: PoolOptions = {
          host: mysqlConfigFromRequest.host, port: mysqlConfigFromRequest.port || 3306, user: mysqlConfigFromRequest.user,
          password: mysqlConfigFromRequest.password, database: mysqlConfigFromRequest.database, connectTimeout: 5000,
        };
        const testPool = mysql.createPool(testOptions);
        const conn = await testPool.getConnection();
        await conn.ping();
        conn.release();
        await testPool.end(); 
        return NextResponse.json({ message: 'Conexão com MySQL (usando dados fornecidos) bem-sucedida!' });
      } else {
        const pool = await getDbPool();
        if (pool && (await isMysqlConnected(pool))) {
          return NextResponse.json({ message: 'Conexão com MySQL (usando config salva) bem-sucedida!' });
        }
        return NextResponse.json({ message: 'Falha na conexão com MySQL. Verifique as configurações salvas.' }, { status: 500 });
      }
    } catch (error: any) {
      console.error('API db-admin/test-connection erro:', error);
      return NextResponse.json({ message: `Falha na conexão com MySQL: ${error.message}` }, { status: 500 });
    }
}

async function ensureTables(): Promise<NextResponse> {
    try {
      const pool = await getDbPool();
      if (!pool || !(await isMysqlConnected(pool))) {
        return NextResponse.json({ message: 'Não foi possível conectar ao MySQL. Verifique as configurações e tente novamente.' }, { status: 500 });
      }
      // Split schema into individual statements and execute them. Some DB versions have issues with multi-statement queries.
      const statements = DATABASE_INIT_SCHEMA.split(';').filter(s => s.trim().length > 0);
      for (const statement of statements) {
          await pool.query(statement);
      }
      return NextResponse.json({ message: 'Tabelas do banco de dados (lançamentos, usuários, configurações) verificadas/criadas com sucesso!' });
    } catch (error: any) {
      console.error('API db-admin/ensure-table erro:', error);
      return NextResponse.json({ message: `Erro ao verificar/criar tabelas: ${error.message}` }, { status: 500 });
    }
}

async function migrateDataToMysql(): Promise<NextResponse> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
      return NextResponse.json({ message: 'MySQL não está conectado. Configure e salve as credenciais do MySQL primeiro.' }, { status: 400 });
    }

    const results = {
        settings: { migrated: 0, errors: 0, errorDetails: [] as string[] },
        users: { migrated: 0, errors: 0, errorDetails: [] as string[] },
        entries: { migrated: 0, errors: 0, errorDetails: [] as string[] },
    };

    // Migrate Settings
    try {
        const settings = await readSettingsFile();
        for (const [key, value] of Object.entries(settings)) {
            const sql = `INSERT INTO ${SETTINGS_TABLE_NAME} (configId, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`;
            await pool.query(sql, [key, JSON.stringify(value)]);
            results.settings.migrated++;
        }
    } catch (error: any) {
        results.settings.errors++;
        results.settings.errorDetails.push(`Erro ao migrar configurações: ${error.message}`);
    }

    // Migrate Users
    try {
        const users = await getUsersFromFile();
        for (const user of users) {
            const sql = `INSERT INTO ${USERS_TABLE_NAME} (id, username, password, role, shifts, allowedPages, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=VALUES(username), password=VALUES(password), role=VALUES(role), shifts=VALUES(shifts), allowedPages=VALUES(allowedPages)`;
            await pool.query(sql, [user.id, user.username, user.password, user.role, JSON.stringify(user.shifts || []), JSON.stringify(user.allowedPages || []), user.createdAt || new Date()]);
            results.users.migrated++;
        }
    } catch (error: any) {
        results.users.errors++;
        results.users.errorDetails.push(`Erro ao migrar usuários: ${error.message}`);
    }

    // Migrate Daily Entries
    try {
        const jsonEntries = await getAllEntriesFromFile();
        for (const entry of jsonEntries) {
            try {
                const entryId = entry.id;
                let entryDateStr: string;

                if (entry.date instanceof Date && isValid(entry.date)) {
                    entryDateStr = format(entry.date, 'yyyy-MM-dd');
                } else if (typeof entry.date === 'string') {
                    const parsedDate = parseISO(entry.date);
                    if (isValid(parsedDate)) {
                        entryDateStr = format(parsedDate, 'yyyy-MM-dd');
                    } else { throw new Error(`Formato de data inválido para o ID ${entryId}`); }
                } else { throw new Error(`Data ausente ou inválida para o ID ${entryId}`); }

                const columns: string[] = ['id', 'date', 'generalObservations'];
                const values: (string | null)[] = [entryId, entryDateStr, entry.generalObservations || null];
                const updatePlaceholders: string[] = ['date = VALUES(date)', 'generalObservations = VALUES(generalObservations)'];

                PERIOD_DEFINITIONS.forEach(pDef => {
                    columns.push(`\`${pDef.id}\``);
                    const periodValue = entry[pDef.id as keyof DailyLogEntry];
                    values.push(safeStringify(periodValue));
                    updatePlaceholders.push(`\`${pDef.id}\` = VALUES(\`${pDef.id}\`)`);
                });

                const [existingRows] = await pool.query<mysql.RowDataPacket[]>(`SELECT id FROM ${DAILY_ENTRIES_TABLE_NAME} WHERE id = ?`, [entryId]);
                if (existingRows.length === 0) {
                    columns.push('createdAt');
                    let createdAtDate = new Date();
                    if (entry.createdAt) {
                        const parsedCreatedAt = entry.createdAt instanceof Date ? entry.createdAt : parseISO(String(entry.createdAt));
                        if (isValid(parsedCreatedAt)) createdAtDate = parsedCreatedAt;
                    }
                    values.push(format(createdAtDate, 'yyyy-MM-dd HH:mm:ss'));
                }
                
                const sql = `INSERT INTO ${DAILY_ENTRIES_TABLE_NAME} (${columns.join(', ')}) VALUES (${values.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updatePlaceholders.join(', ')}, lastModifiedAt = VALUES(lastModifiedAt)`;
                await pool.query(sql, values);
                results.entries.migrated++;
            } catch (migrationError: any) {
                results.entries.errors++;
                results.entries.errorDetails.push(`ID do Lançamento ${entry.id || 'desconhecido'}: ${migrationError.message}`);
                console.error(`Erro ao migrar lançamento ${entry.id || 'desconhecido'}:`, migrationError);
            }
        }
    } catch (error: any) {
        results.entries.errors++;
        results.entries.errorDetails.push(`Erro geral ao migrar lançamentos: ${error.message}`);
    }

    const totalErrors = results.settings.errors + results.users.errors + results.entries.errors;
    if (totalErrors > 0) {
        revalidateTag('settings'); revalidateTag('users'); revalidateTag('entries');
        return NextResponse.json({
            message: `Migração concluída com ${totalErrors} erro(s). Settings: ${results.settings.migrated}, Users: ${results.users.migrated}, Entries: ${results.entries.migrated}.`,
            errors: { ...results }
        }, { status: 207 });
    }

    revalidateTag('settings'); revalidateTag('users'); revalidateTag('entries');
    return NextResponse.json({ message: `Migração completa bem-sucedida! Settings: ${results.settings.migrated}, Users: ${results.users.migrated}, Entries: ${results.entries.migrated}.` });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  switch(action) {
    case 'test-connection':
        return await testConnection(request);
    case 'ensure-table':
    case 'ensure-tables': // Allow both for compatibility
        return await ensureTables();
    case 'migrate-json-to-mysql':
        return await migrateDataToMysql();
    default:
        return NextResponse.json({ message: `Ação '${action}' desconhecida ou não implementada.` }, { status: 400 });
  }
}
