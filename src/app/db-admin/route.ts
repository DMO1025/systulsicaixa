
import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool, DAILY_ENTRIES_TABLE_SCHEMA, APP_SETTINGS_TABLE_SCHEMA, USERS_TABLE_SCHEMA, isMysqlConnected, safeParse, safeStringify, TABLE_NAME, SETTINGS_TABLE_NAME, USERS_TABLE_NAME } from '@/lib/mysql';
import { getAllEntriesFromFile, getUsersFromFile, readSettingsFile } from '@/lib/fileDb';
import type { MysqlConnectionConfig, DailyLogEntry, User, Settings } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/constants';
import mysql, { type PoolOptions } from 'mysql2/promise';
import { format, isValid, parseISO } from 'date-fns';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  if (action === 'test-connection') {
    let mysqlConfigFromRequest: MysqlConnectionConfig | undefined;
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
         if (body && typeof body === 'object' && ('host' in body || 'user' in body || 'database' in body)) {
            mysqlConfigFromRequest = body as MysqlConnectionConfig;
        }
      }
    } catch (e) {
      // Sem corpo ou JSON inválido
    }

    try {
      if (mysqlConfigFromRequest && mysqlConfigFromRequest.host) {
        const testOptions: PoolOptions = {
          host: mysqlConfigFromRequest.host,
          port: mysqlConfigFromRequest.port || 3306,
          user: mysqlConfigFromRequest.user,
          password: mysqlConfigFromRequest.password,
          database: mysqlConfigFromRequest.database,
          connectTimeout: 5000,
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

  if (action === 'ensure-table') {
    try {
      const pool = await getDbPool();
      if (!pool || !(await isMysqlConnected(pool))) {
        return NextResponse.json({ message: 'Não foi possível conectar ao MySQL. Verifique as configurações e tente novamente.' }, { status: 500 });
      }
      await pool.query(DAILY_ENTRIES_TABLE_SCHEMA);
      await pool.query(APP_SETTINGS_TABLE_SCHEMA);
      await pool.query(USERS_TABLE_SCHEMA);
      return NextResponse.json({ message: 'Tabelas de lançamentos, configurações e usuários verificadas/criadas com sucesso!' });
    } catch (error: any) {
      console.error('API db-admin/ensure-table erro:', error);
      return NextResponse.json({ message: `Erro ao verificar/criar tabela: ${error.message}` }, { status: 500 });
    }
  }
  
  if (action === 'migrate-json-to-mysql') {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
      return NextResponse.json({ message: 'MySQL não está conectado. Configure e salve as credenciais do MySQL primeiro.' }, { status: 400 });
    }

    let totalMigrated = 0;
    const errors: string[] = [];

    // Migrate Daily Entries
    try {
      const jsonEntries = await getAllEntriesFromFile();
      if (jsonEntries.length > 0) {
        for (const entry of jsonEntries) {
            try {
            const entryId = entry.id;
            let entryDateStr: string;

            if (entry.date instanceof Date && isValid(entry.date)) {
                entryDateStr = format(entry.date, 'yyyy-MM-dd');
            } else if (typeof entry.date === 'string') {
                const parsedDate = parseISO(entry.date);
                if (isValid(parsedDate)) entryDateStr = format(parsedDate, 'yyyy-MM-dd');
                else throw new Error(`Formato de data inválido para o ID ${entryId}`);
            } else throw new Error(`Data ausente ou inválida para o ID ${entryId}`);

            const columns: string[] = ['id', 'date', 'generalObservations'];
            const values: (string | null)[] = [entryId, entryDateStr, entry.generalObservations || null];
            const updatePlaceholders: string[] = ['date = VALUES(date)', 'generalObservations = VALUES(generalObservations)'];

            PERIOD_DEFINITIONS.forEach(pDef => {
                columns.push(`\`${pDef.id}\``);
                const periodValue = entry[pDef.id as keyof DailyLogEntry];
                values.push(safeStringify(periodValue));
                updatePlaceholders.push(`\`${pDef.id}\` = VALUES(\`${pDef.id}\`)`);
            });
            
            const [existingRows] = await pool.query<mysql.RowDataPacket[]>(`SELECT id FROM ${TABLE_NAME} WHERE id = ?`, [entryId]);
            if (existingRows.length === 0) {
                columns.push('createdAt');
                let createdAtDate = new Date();
                if (entry.createdAt) {
                    const parsedCreatedAt = entry.createdAt instanceof Date ? entry.createdAt : parseISO(String(entry.createdAt));
                    if (isValid(parsedCreatedAt)) createdAtDate = parsedCreatedAt;
                }
                values.push(format(createdAtDate, 'yyyy-MM-dd HH:mm:ss'));
            }
            
            const sql = `INSERT INTO ${TABLE_NAME} (${columns.join(', ')}) VALUES (${values.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updatePlaceholders.join(', ')}, lastModifiedAt = VALUES(lastModifiedAt)`;
            await pool.query(sql, values);
            totalMigrated++;
            } catch (entryError: any) {
                 errors.push(`Lançamento ID ${entry.id || 'desconhecido'}: ${entryError.message}`);
            }
        }
        revalidateTag('entries');
      }
    } catch(e: any) {
        errors.push(`Erro geral ao migrar lançamentos: ${e.message}`);
    }

    // Migrate Users
    try {
        const jsonUsers = await getUsersFromFile();
        if (jsonUsers.length > 0) {
            for (const user of jsonUsers) {
                try {
                    const { id, username, password, role, shifts, allowedPages } = user;
                    if (!password) continue; // Skip users without a password
                    const sql = `INSERT INTO ${USERS_TABLE_NAME} (id, username, password, role, shifts, allowedPages) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role), shifts = VALUES(shifts), allowedPages = VALUES(allowedPages)`;
                    await pool.query(sql, [id, username, password, role, safeStringify(shifts), safeStringify(allowedPages)]);
                    totalMigrated++;
                } catch(userError: any) {
                    errors.push(`Usuário ${user.username}: ${userError.message}`);
                }
            }
            revalidateTag('users');
        }
    } catch (e: any) {
        errors.push(`Erro geral ao migrar usuários: ${e.message}`);
    }

    // Migrate Settings
    try {
        const jsonSettings = await readSettingsFile();
        if (Object.keys(jsonSettings).length > 0) {
            for (const [key, value] of Object.entries(jsonSettings)) {
                try {
                    const sql = `INSERT INTO ${SETTINGS_TABLE_NAME} (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`;
                    await pool.query(sql, [key, safeStringify(value)]);
                    totalMigrated++;
                } catch (settingError: any) {
                     errors.push(`Configuração ${key}: ${settingError.message}`);
                }
            }
             revalidateTag('settings');
        }
    } catch (e: any) {
        errors.push(`Erro geral ao migrar configurações: ${e.message}`);
    }


    if (errors.length > 0) {
      return NextResponse.json({ 
        message: `Migração concluída com ${errors.length} erro(s). ${totalMigrated} registros migrados/atualizados.`,
        errors 
      }, { status: 207 }); // Multi-Status
    }
    return NextResponse.json({ message: `Migração concluída com sucesso! ${totalMigrated} registros migrados/atualizados.` });
  }

  return NextResponse.json({ message: `Ação '${action}' desconhecida ou não implementada.` }, { status: 400 });
}
