
import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool, DATABASE_INIT_SCHEMA, isMysqlConnected, safeStringify, DAILY_ENTRIES_TABLE_NAME, USERS_TABLE_NAME, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import { getAllEntriesFromFile, getUsersFromFile, readSettingsFile } from '@/lib/fileDb';
import type { MysqlConnectionConfig, DailyLogEntry, Settings, User, PeriodData, SubTabData } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import mysql, { type PoolOptions, type RowDataPacket } from 'mysql2/promise';
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

const applyStructuralTransformations = (rawEntry: any, log: string[]): any => {
    // Deep copy to avoid modifying the original object during iteration
    const entry = JSON.parse(JSON.stringify(rawEntry));

    // --- DATA MIGRATION LOGIC ---
    // This function can now be used for both JSON migration and MySQL updates.
    const migrateCiEFaturados = (periodData: PeriodData | undefined, prefix: 'apt' | 'ast' | 'jnt') => {
        if (!periodData || typeof periodData === 'string' || !periodData.subTabs?.ciEFaturados) return;

        log.push(`  - [${entry.id}] Atualizando 'ciEFaturados' para ${prefix.toUpperCase()}...`);
        const oldCiData = periodData.subTabs.ciEFaturados.channels;
        
        if (!periodData.subTabs.faturado) periodData.subTabs.faturado = { channels: {} };
        if (!periodData.subTabs.consumoInterno) periodData.subTabs.consumoInterno = { channels: {} };

        periodData.subTabs.faturado.channels![`${prefix}FaturadosQtd`] = oldCiData?.[`${prefix}CiEFaturadosFaturadosQtd`];
        periodData.subTabs.faturado.channels![`${prefix}FaturadosValorHotel`] = oldCiData?.[`${prefix}CiEFaturadosValorHotel`];
        periodData.subTabs.faturado.channels![`${prefix}FaturadosValorFuncionario`] = oldCiData?.[`${prefix}CiEFaturadosValorFuncionario`];
        
        periodData.subTabs.consumoInterno.channels![`${prefix}ConsumoInternoQtd`] = oldCiData?.[`${prefix}CiEFaturadosConsumoInternoQtd`];
        periodData.subTabs.consumoInterno.channels![`${prefix}ReajusteCI`] = oldCiData?.[`${prefix}CiEFaturadosReajusteCI`];
        periodData.subTabs.consumoInterno.channels![`${prefix}TotalCI`] = oldCiData?.[`${prefix}CiEFaturadosTotalCI`];
        
        delete periodData.subTabs.ciEFaturados;
    };
    
    // Parse period data from JSON strings if they are strings
    PERIOD_DEFINITIONS.forEach(pDef => {
        if (entry[pDef.id] && typeof entry[pDef.id] === 'string') {
            try {
                entry[pDef.id] = JSON.parse(entry[pDef.id]);
            } catch (e) {
                log.push(`  - [${entry.id}] AVISO: Falha ao analisar JSON para o período '${pDef.id}'. Pulando.`);
                entry[pDef.id] = null;
            }
        }
    });

    migrateCiEFaturados(entry.almocoPrimeiroTurno, 'apt');
    migrateCiEFaturados(entry.almocoSegundoTurno, 'ast');
    migrateCiEFaturados(entry.jantar, 'jnt');

    // Migrate old top-level 'frigobar' to new nested structure
    if (entry.frigobar) {
        log.push(`  - [${entry.id}] Atualizando estrutura antiga do Frigobar...`);
        const oldFrigobarData = typeof entry.frigobar === 'string' ? JSON.parse(entry.frigobar) : entry.frigobar;
        
        const processTurno = (turnoKey: 'primeiroTurno' | 'segundoTurno' | 'jantar', targetPeriod: 'almocoPrimeiroTurno' | 'almocoSegundoTurno' | 'jantar') => {
            const turnoData = oldFrigobarData.subTabs?.[turnoKey] as SubTabData | undefined;
            if (turnoData && Object.keys(turnoData.channels || {}).length > 0) {
                 if (!entry[targetPeriod]) entry[targetPeriod] = { subTabs: {} };
                 if (!(entry[targetPeriod] as PeriodData).subTabs) (entry[targetPeriod] as PeriodData).subTabs = {};
                 (entry[targetPeriod] as PeriodData).subTabs!.frigobar = turnoData;
            }
        };

        processTurno('primeiroTurno', 'almocoPrimeiroTurno');
        processTurno('segundoTurno', 'almocoSegundoTurno');
        processTurno('jantar' as any, 'jantar'); // Cast as any to handle 'jantar' key
    }
    delete entry.frigobar;

    // --- END DATA MIGRATION LOGIC ---
    return entry;
};


async function updateMysqlStructure(): Promise<NextResponse> {
    const log: string[] = [];
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
      log.push('ERRO: MySQL não está conectado.');
      return NextResponse.json({ message: 'MySQL não está conectado.', log }, { status: 400 });
    }

    const connection = await pool.getConnection();
    log.push('Conexão com o banco de dados estabelecida.');

    try {
        await connection.beginTransaction();
        log.push('Transação iniciada.');

        const [allEntries] = await connection.query<RowDataPacket[]>(`SELECT * FROM \`${DAILY_ENTRIES_TABLE_NAME}\``);
        log.push(`Encontrados ${allEntries.length} registros no MySQL para verificação.`);
        let updatedCount = 0;

        for (const rawEntry of allEntries) {
            const transformedEntry = applyStructuralTransformations(rawEntry, log);

            // Compare original with transformed by stringifying. If they differ, an update is needed.
            if (JSON.stringify(rawEntry) !== JSON.stringify(transformedEntry)) {
                updatedCount++;
                log.push(`  - [${transformedEntry.id}] Modificações detectadas. Preparando para atualizar...`);
                
                const updateFragments: string[] = [];
                const updateValues: (string | null)[] = [];

                PERIOD_DEFINITIONS.forEach(pDef => {
                    updateFragments.push(`\`${pDef.id}\` = ?`);
                    updateValues.push(safeStringify(transformedEntry[pDef.id]));
                });
                updateFragments.push('`frigobar` = ?');
                updateValues.push(null); // Explicitly nullify the old frigobar column

                updateValues.push(transformedEntry.id); // For the WHERE clause

                const updateSql = `UPDATE \`${DAILY_ENTRIES_TABLE_NAME}\` SET ${updateFragments.join(', ')} WHERE id = ?`;
                await connection.query(updateSql, updateValues);
            }
        }
        
        await connection.commit();
        log.push(`--- Transação confirmada (COMMIT) com sucesso! ---`);
        
        if (updatedCount > 0) {
            revalidateTag('entries');
            log.push("Cache de lançamentos ('entries') invalidado.");
        }

        const successMessage = `Verificação concluída. ${updatedCount} de ${allEntries.length} registros foram atualizados para a nova estrutura.`;
        log.push(`\n${successMessage}`);

        return NextResponse.json({ message: successMessage, log });

    } catch (error: any) {
        await connection.rollback();
        log.push('--- ERRO! A transação foi revertida (ROLLBACK). Nenhuma alteração foi salva. ---');
        log.push(`  - Causa do erro: ${error.message}`);
        console.error('Erro na atualização da estrutura do MySQL (transação revertida):', error);
        return NextResponse.json({
            message: `Erro na atualização: ${error.message}. Todas as alterações foram revertidas.`,
            log
        }, { status: 500 });
    } finally {
        connection.release();
        log.push('Conexão com o banco de dados liberada.');
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
            const entry = applyStructuralTransformations(rawEntry, log);
            
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
    case 'update-mysql-structure':
        return await updateMysqlStructure();
    default:
        return NextResponse.json({ message: `Ação '${action}' desconhecida ou não implementada.` }, { status: 400 });
  }
}
