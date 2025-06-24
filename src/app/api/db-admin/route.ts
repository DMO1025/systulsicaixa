
import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool, DAILY_ENTRIES_TABLE_SCHEMA, isMysqlConnected, safeParse, safeStringify, TABLE_NAME } from '@/lib/mysql';
import { getAllEntriesFromFile } from '@/lib/fileDb';
import type { MysqlConnectionConfig, DailyLogEntry } from '@/lib/types';
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
      return NextResponse.json({ message: 'Tabela de lançamentos diários verificada/criada com sucesso!' });
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

    try {
      const jsonEntries = await getAllEntriesFromFile();
      if (!jsonEntries || jsonEntries.length === 0) {
        return NextResponse.json({ message: 'Nenhum lançamento encontrado no arquivo JSON para migrar.' });
      }

      let migratedCount = 0;
      let errorCount = 0;
      const errors = [];

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
            } else {
              throw new Error(`Formato de data inválido para o ID ${entryId}`);
            }
          } else {
            throw new Error(`Data ausente ou inválida para o ID ${entryId}`);
          }

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
                  if (isValid(parsedCreatedAt)) {
                      createdAtDate = parsedCreatedAt;
                  }
              }
              values.push(format(createdAtDate, 'yyyy-MM-dd HH:mm:ss'));
          }
          
          const sql = `
            INSERT INTO ${TABLE_NAME} (${columns.join(', ')}) 
            VALUES (${values.map(() => '?').join(', ')})
            ON DUPLICATE KEY UPDATE ${updatePlaceholders.join(', ')}, lastModifiedAt = VALUES(lastModifiedAt)
          `;

          await pool.query(sql, values);
          migratedCount++;
        } catch (migrationError: any) {
          errorCount++;
          errors.push(`ID do Lançamento ${entry.id || 'desconhecido'}: ${migrationError.message}`);
          console.error(`Erro ao migrar lançamento ${entry.id || 'desconhecido'}:`, migrationError);
        }
      }

      if (migratedCount > 0) {
        revalidateTag('entries');
      }

      if (errorCount > 0) {
        return NextResponse.json({ 
          message: `Migração concluída com ${errorCount} erro(s). ${migratedCount} lançamentos migrados.`,
          errors 
        }, { status: 207 }); // Multi-Status
      }
      return NextResponse.json({ message: `Migração concluída com sucesso! ${migratedCount} lançamentos migrados.` });

    } catch (error: any) {
      console.error('API db-admin/migrate-json-to-mysql erro:', error);
      return NextResponse.json({ message: `Erro durante a migração: ${error.message}` }, { status: 500 });
    }
  }


  return NextResponse.json({ message: `Ação '${action}' desconhecida ou não implementada.` }, { status: 400 });
}
