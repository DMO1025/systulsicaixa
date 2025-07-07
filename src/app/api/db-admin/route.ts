
import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool, DATABASE_INIT_SCHEMA, isMysqlConnected, safeStringify, DAILY_ENTRIES_TABLE_NAME, USERS_TABLE_NAME, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import { getAllEntriesFromFile, getUsersFromFile, readSettingsFile } from '@/lib/fileDb';
import type { MysqlConnectionConfig, DailyLogEntry, Settings, User, PeriodData } from '@/lib/types';
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
    const log: string[] = [];
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
      log.push('ERRO: MySQL não está conectado. Configure e salve as credenciais do MySQL primeiro.');
      return NextResponse.json({ message: 'MySQL não está conectado.', log }, { status: 400 });
    }

    const connection = await pool.getConnection();
    log.push('Conexão com o banco de dados estabelecida.');

    try {
        await connection.beginTransaction();
        log.push('Transação iniciada.');

        const results = {
            settings: { migrated: 0 },
            users: { migrated: 0 },
            entries: { migrated: 0 },
        };

        // Migrate Settings
        log.push('--- Iniciando migração de Configurações ---');
        const settings = await readSettingsFile();
        for (const [key, value] of Object.entries(settings)) {
            const settingsSql = `INSERT INTO \`${SETTINGS_TABLE_NAME}\` (configId, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`;
            await connection.query(settingsSql, [key, JSON.stringify(value)]);
            results.settings.migrated++;
            log.push(`  - Configuração '${key}' salva.`);
        }
        log.push(`> ${results.settings.migrated} configurações migradas com sucesso.`);

        // Migrate Users
        log.push('--- Iniciando migração de Usuários ---');
        const users = await getUsersFromFile();
        for (const user of users) {
            const usersSql = `INSERT INTO \`${USERS_TABLE_NAME}\` (id, username, password, role, shifts, allowedPages, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE username=VALUES(username), password=VALUES(password), role=VALUES(role), shifts=VALUES(shifts), allowedPages=VALUES(allowedPages)`;
            await connection.query(usersSql, [user.id, user.username, user.password, user.role, JSON.stringify(user.shifts || []), JSON.stringify(user.allowedPages || []), user.createdAt || new Date()]);
            results.users.migrated++;
            log.push(`  - Usuário '${user.username}' salvo.`);
        }
        log.push(`> ${results.users.migrated} usuários migrados com sucesso.`);

        // Migrate Daily Entries
        log.push('--- Iniciando migração de Lançamentos Diários ---');
        const jsonEntries = await getAllEntriesFromFile();
        log.push(`Encontrados ${jsonEntries.length} lançamentos no arquivo JSON para processar.`);

        for (const rawEntry of jsonEntries) {
            const entry = JSON.parse(JSON.stringify(rawEntry));
            let oldFrigobarData: PeriodData | undefined;
            if (entry.frigobar) {
                if (typeof entry.frigobar === 'string') { try { oldFrigobarData = JSON.parse(entry.frigobar); } catch(e) { /* ignore */ } } 
                else if (typeof entry.frigobar === 'object') { oldFrigobarData = entry.frigobar; }
            }
            if (oldFrigobarData?.subTabs) {
                log.push(`  - [${entry.id}] Dados antigos do Frigobar encontrados e migrados para a nova estrutura.`);
                if (!entry.almocoPrimeiroTurno) entry.almocoPrimeiroTurno = { subTabs: {} };
                if (!(entry.almocoPrimeiroTurno as PeriodData).subTabs) (entry.almocoPrimeiroTurno as PeriodData).subTabs = {};
                if (!entry.almocoSegundoTurno) entry.almocoSegundoTurno = { subTabs: {} };
                if (!(entry.almocoSegundoTurno as PeriodData).subTabs) (entry.almocoSegundoTurno as PeriodData).subTabs = {};
                if (!entry.jantar) entry.jantar = { subTabs: {} };
                if (!(entry.jantar as PeriodData).subTabs) (entry.jantar as PeriodData).subTabs = {};
                if (oldFrigobarData.subTabs.primeiroTurno) { (entry.almocoPrimeiroTurno as PeriodData).subTabs!.frigobar = oldFrigobarData.subTabs.primeiroTurno; }
                if (oldFrigobarData.subTabs.segundoTurno) { (entry.almocoSegundoTurno as PeriodData).subTabs!.frigobar = oldFrigobarData.subTabs.segundoTurno; }
                if ((oldFrigobarData.subTabs as any).jantar) { (entry.jantar as PeriodData).subTabs!.frigobar = (oldFrigobarData.subTabs as any).jantar; }
                delete entry.frigobar;
            }

            const entryId = entry.id;
            let entryDateStr: string;
            if (entry.date instanceof Date && isValid(entry.date)) { entryDateStr = format(entry.date, 'yyyy-MM-dd'); } 
            else if (typeof entry.date === 'string') { const parsedDate = parseISO(entry.date); if (isValid(parsedDate)) { entryDateStr = format(parsedDate, 'yyyy-MM-dd'); } else { throw new Error(`Formato de data inválido para o ID ${entryId}`); } } 
            else { throw new Error(`Data ausente ou inválida para o ID ${entryId}`); }

            const columns: string[] = ['id', 'date', 'generalObservations'];
            const values: (string | null | Date)[] = [entryId, entryDateStr, entry.generalObservations || null];
            const updatePlaceholders: string[] = ['`date` = VALUES(`date`)', '`generalObservations` = VALUES(`generalObservations`)'];
            PERIOD_DEFINITIONS.forEach(pDef => {
                columns.push(pDef.id);
                const periodValue = entry[pDef.id as keyof DailyLogEntry];
                values.push(safeStringify(periodValue));
                updatePlaceholders.push(`\`${pDef.id}\` = VALUES(\`${pDef.id}\`)`);
            });

            const [existingRows] = await connection.query<mysql.RowDataPacket[]>(`SELECT id, createdAt FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE id = ?`, [entryId]);
            if (existingRows.length === 0) {
                columns.push('createdAt');
                let createdAtDate = new Date();
                if (entry.createdAt) { const parsedCreatedAt = entry.createdAt instanceof Date ? entry.createdAt : parseISO(String(entry.createdAt)); if (isValid(parsedCreatedAt)) createdAtDate = parsedCreatedAt; }
                values.push(createdAtDate); 
            }
            const columnsSqlString = columns.map(c => `\`${c}\``).join(', ');
            const valuePlaceholdersSqlString = values.map(() => '?').join(', ');
            const onUpdateSqlString = updatePlaceholders.join(', ');
            const sql = `INSERT INTO \`${DAILY_ENTRIES_TABLE_NAME}\` (${columnsSqlString}) VALUES (${valuePlaceholdersSqlString}) ON DUPLICATE KEY UPDATE ${onUpdateSqlString}`;
            await connection.query(sql, values);
            results.entries.migrated++;
        }
        log.push(`> ${results.entries.migrated} lançamentos diários migrados com sucesso.`);
        
        await connection.commit();
        log.push('--- Transação confirmada (COMMIT) com sucesso! ---');

        revalidateTag('settings');
        revalidateTag('users');
        revalidateTag('entries');
        
        const successMessage = `Migração completa! Configurações: ${results.settings.migrated}, Usuários: ${results.users.migrated}, Lançamentos: ${results.entries.migrated}.`;
        log.push(`\n${successMessage}`);

        return NextResponse.json({ message: successMessage, log });

    } catch (error: any) {
        await connection.rollback();
        log.push('--- ERRO! A transação foi revertida (ROLLBACK). Nenhuma alteração foi salva. ---');
        log.push(`  - Causa do erro: ${error.message}`);
        console.error('Erro na migração do banco de dados (transação revertida):', error);
        return NextResponse.json({
            message: `Erro na migração: ${error.message}. Todas as alterações foram revertidas.`,
            log
        }, { status: 500 });
    } finally {
        connection.release();
        log.push('Conexão com o banco de dados liberada.');
    }
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
