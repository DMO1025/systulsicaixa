

import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool, DATABASE_INIT_SCHEMA, isMysqlConnected, safeStringify, DAILY_ENTRIES_TABLE_NAME, USERS_TABLE_NAME, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import type { MysqlConnectionConfig, DailyLogEntry, Settings, User, PeriodData, SubTabData } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import mysql, { type PoolOptions, type RowDataPacket } from 'mysql2/promise';
import { format, isValid, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { revalidateTag } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { saveSetting } from '@/lib/data/settings';

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
    const entry = JSON.parse(JSON.stringify(rawEntry));

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
        
        // Add new columns if they don't exist
        const [tableInfo] = await connection.query<RowDataPacket[]>(`SHOW COLUMNS FROM \`${DAILY_ENTRIES_TABLE_NAME}\``);
        const existingColumns = new Set(tableInfo.map(c => c.Field));

        for (const pDef of PERIOD_DEFINITIONS) {
            if (!existingColumns.has(pDef.id)) {
                log.push(`  - Coluna '${pDef.id}' não encontrada. Adicionando...`);
                await connection.query(`ALTER TABLE \`${DAILY_ENTRIES_TABLE_NAME}\` ADD COLUMN \`${pDef.id}\` JSON;`);
                log.push(`  - Coluna '${pDef.id}' adicionada com sucesso.`);
            }
        }

        const [allEntries] = await connection.query<RowDataPacket[]>(`SELECT * FROM \`${DAILY_ENTRIES_TABLE_NAME}\``);
        log.push(`Encontrados ${allEntries.length} registros no MySQL para verificação.`);
        let updatedCount = 0;

        for (const rawEntry of allEntries) {
            const transformedEntry = applyStructuralTransformations(rawEntry, log);

            // This logic is simplified; in a real scenario, you'd have more complex transformation rules
            // For now, we just ensure data is parsed. If you need to move data between columns, add logic here.
            
            // Check if any transformation actually changed the object
            let hasChanged = false;
            for(const key in transformedEntry) {
                if(JSON.stringify(transformedEntry[key]) !== JSON.stringify(rawEntry[key])) {
                    hasChanged = true;
                    break;
                }
            }


            if (hasChanged) {
                updatedCount++;
                log.push(`  - [${transformedEntry.id}] Modificações detectadas. Preparando para atualizar...`);
                
                const updateFragments: string[] = [];
                const updateValues: (string | null)[] = [];

                PERIOD_DEFINITIONS.forEach(pDef => {
                    // Only update columns that exist in the transformed entry
                    if (transformedEntry.hasOwnProperty(pDef.id)) {
                       updateFragments.push(`\`${pDef.id}\` = ?`);
                       updateValues.push(safeStringify(transformedEntry[pDef.id]));
                    }
                });

                if (updateFragments.length > 0) {
                    updateValues.push(transformedEntry.id);
                    const updateSql = `UPDATE \`${DAILY_ENTRIES_TABLE_NAME}\` SET ${updateFragments.join(', ')} WHERE id = ?`;
                    await connection.query(updateSql, updateValues);
                } else {
                     log.push(`  - [${transformedEntry.id}] Nenhuma alteração estrutural necessária para atualizar colunas.`);
                }
            }
        }
        
        await connection.commit();
        log.push(`--- Transação confirmada (COMMIT) com sucesso! ---`);
        
        if (updatedCount > 0) {
            revalidateTag('entries');
            log.push("Cache de lançamentos ('entries') invalidado.");
        }

        const successMessage = `Verificação concluída. ${updatedCount > 0 ? `${updatedCount} de ${allEntries.length} registros foram atualizados` : `Nenhuma atualização estrutural foi necessária nos ${allEntries.length} registros.`} As colunas da tabela também foram verificadas e atualizadas.`;
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
    const log: string[] = ["A migração de JSON para MySQL foi desativada, pois o sistema agora opera exclusivamente com o MySQL."];
    return NextResponse.json({ message: "Função de migração desativada.", log }, { status: 410 });
}

async function clearFciData(request: NextRequest): Promise<NextResponse> {
    const log: string[] = [];
    let updatedCount = 0;
    const periodsToClear: (keyof DailyLogEntry)[] = ['almocoPrimeiroTurno', 'almocoSegundoTurno', 'jantar'];

    const { year, month } = await request.json();
    if (!year || !month) {
        return NextResponse.json({ message: 'Mês e ano são obrigatórios para a limpeza.', success: false, log }, { status: 400 });
    }
    
    const startDate = startOfMonth(new Date(year, month - 1, 1));
    const endDate = endOfMonth(new Date(year, month - 1, 1));
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    log.push(`Iniciando limpeza de dados para o período: ${startDateStr} a ${endDateStr}.`);
    
    const pool = await getDbPool();
     if (!pool || !(await isMysqlConnected(pool))) {
        return NextResponse.json({ message: 'Banco de dados não conectado.', success: false, log }, { status: 500 });
    }
    const connection = await pool.getConnection();
    log.push('Conexão com o banco de dados estabelecida.');
    try {
        await connection.beginTransaction();
        log.push('Transação iniciada para limpeza de dados.');
        const [allEntries] = await connection.query<RowDataPacket[]>(`SELECT id, ${periodsToClear.join(', ')} FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE date BETWEEN ? AND ?`, [startDateStr, endDateStr]);
        log.push(`Encontrados ${allEntries.length} registros para verificar.`);

        for (const rawEntry of allEntries) {
            let entryChanged = false;
            const updates: string[] = [];
            const values: (string | null)[] = [];

            for (const periodId of periodsToClear) {
                if (rawEntry[periodId]) {
                    try {
                        const periodData = JSON.parse(rawEntry[periodId]);
                        
                        // Limpa o formato antigo, preservando os itens do novo formato.
                        if (periodData?.subTabs?.ciEFaturados) {
                            periodData.subTabs.ciEFaturados.channels = {};
                            entryChanged = true;
                            updates.push(`\`${periodId}\` = ?`);
                            values.push(safeStringify(periodData));
                        }
                    } catch (e) {
                        log.push(`AVISO: Falha ao analisar JSON para o período '${periodId}' no registro ${rawEntry.id}. Pulando.`);
                    }
                }
            }

            if (entryChanged) {
                updatedCount++;
                values.push(rawEntry.id);
                const updateSql = `UPDATE \`${DAILY_ENTRIES_TABLE_NAME}\` SET ${updates.join(', ')} WHERE id = ?`;
                await connection.query(updateSql, values);
            }
        }
        
        await connection.commit();
        log.push(`--- Transação confirmada (COMMIT) com sucesso! ---`);
        if (updatedCount > 0) revalidateTag('entries');
        
        return NextResponse.json({
            message: `Limpeza do formato antigo concluída. ${updatedCount} de ${allEntries.length} registros foram atualizados no período selecionado.`,
            log,
        });

    } catch (error: any) {
        await connection.rollback();
        log.push(`--- ERRO! Transação revertida. Nenhuma alteração foi salva. Erro: ${error.message} ---`);
        return NextResponse.json({ message: `Erro ao limpar dados: ${error.message}`, log }, { status: 500 });
    } finally {
        connection.release();
    }
}

async function regenerateApiKey(): Promise<NextResponse> {
    try {
        const newApiKey = uuidv4();
        await saveSetting('apiAccessConfig', { apiKey: newApiKey });
        return NextResponse.json({ success: true, apiKey: newApiKey });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: `Erro ao gerar chave de API: ${error.message}` }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  switch(action) {
    case 'test-connection':
        return await testConnection(request);
    case 'ensure-table':
    case 'ensure-tables':
        return await ensureTables();
    case 'migrate-json-to-mysql':
        return await migrateDataToMysql();
    case 'update-mysql-structure':
        return await updateMysqlStructure();
    case 'clear-fci-data':
        return await clearFciData(request);
    case 'regenerate-api-key':
        return await regenerateApiKey();
    default:
        return NextResponse.json({ message: `Ação '${action}' desconhecida ou não implementada.` }, { status: 400 });
  }
}
