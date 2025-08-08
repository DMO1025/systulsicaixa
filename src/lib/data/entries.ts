

'use server';

import { getDbPool, isMysqlConnected, DAILY_ENTRIES_TABLE_NAME, safeParse, safeStringify } from '@/lib/mysql';
import type { DailyLogEntry, PeriodData, EventosPeriodData, FaturadoItem } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import type mysql from 'mysql2/promise';
import { format, parseISO, isValid } from 'date-fns';

function processRawEntry(entry: any): DailyLogEntry {
  const processedEntry = { ...entry };

  if (processedEntry.date && typeof processedEntry.date === 'string') {
    const parsedDate = parseISO(processedEntry.date);
    if (isValid(parsedDate)) {
      processedEntry.date = parsedDate;
    }
  }

  PERIOD_DEFINITIONS.forEach(pDef => {
    const periodKey = pDef.id as keyof DailyLogEntry;
    if (processedEntry[periodKey] && typeof processedEntry[periodKey] === 'string') {
      try {
        const parsedData = JSON.parse(processedEntry[periodKey] as string);
        processedEntry[periodKey] = parsedData;
      } catch (e) {
        console.error(`Error parsing JSON for period ${pDef.id} in entry ${processedEntry.id}:`, e);
      }
    }
    if (pDef.id === 'eventos' && processedEntry.eventos && typeof processedEntry.eventos === 'object') {
        const eventosData = processedEntry.eventos as EventosPeriodData;
        if (!Array.isArray(eventosData.items)) {
            eventosData.items = [];
        } else {
            eventosData.items = eventosData.items.map((item: any) => ({
                ...item,
                subEvents: Array.isArray(item.subEvents) ? item.subEvents : [],
            }));
        }
    }
  });
  return processedEntry as DailyLogEntry;
}

export async function getEntry(entryId: string): Promise<DailyLogEntry | null> {
  const pool = await getDbPool();
  if (!pool || !(await isMysqlConnected(pool))) {
    throw new Error('Banco de dados não conectado. Verifique as configurações.');
  }

  try {
    const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE id = ?`, [entryId]);
    if (rows.length === 0) {
      return null;
    }
    return processRawEntry(rows[0]);
  } catch (error: any) {
    console.error(`Data Layer (MySQL) Erro para data ${entryId}:`, error);
    throw new Error(`Erro ao buscar lançamento no banco de dados: ${error.message}`);
  }
}

export async function getAllEntries(
    { startDate, endDate, fields }: { startDate?: string; endDate?: string; fields?: string | null }
): Promise<Partial<DailyLogEntry>[]> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }

    try {
        const selectFields = fields === 'id' ? 'id' : '*';
        let query = `SELECT ${selectFields} FROM \`${DAILY_ENTRIES_TABLE_NAME}\``;
        const params: string[] = [];
        if (startDate && endDate) {
            query += ' WHERE id BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }
        query += ' ORDER BY id ASC';
        const [rows] = await pool!.query<mysql.RowDataPacket[]>(query, params);
        
        if (fields === 'id') return rows as Partial<DailyLogEntry>[];
        
        return rows.map(processRawEntry);
    } catch (error: any) {
        console.error('Data Layer (MySQL) Erro:', error);
        throw new Error(`Erro ao buscar lançamentos no banco de dados: ${error.message}`);
    }
}


export async function saveEntry(
    entryId: string, 
    entryData: Partial<DailyLogEntry>
): Promise<{ savedEntry: DailyLogEntry, source: 'mysql' }> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }

    let dateForDb: string;
    if (entryData.date instanceof Date && isValid(entryData.date)) {
        dateForDb = format(entryData.date, 'yyyy-MM-dd');
    } else if (typeof entryData.date === 'string') {
        const parsedDate = parseISO(entryData.date);
        if (!isValid(parsedDate)) throw new Error('Formato de data inválido no payload.');
        dateForDb = format(parsedDate, 'yyyy-MM-dd');
    } else {
        throw new Error('Campo de data ausente ou inválido no payload.');
    }

    if (dateForDb !== entryId) {
        throw new Error(`Data da URL (${entryId}) e do payload (${dateForDb}) não correspondem.`);
    }

    try {
        const columnsForInsert: string[] = ['id', 'date', 'generalObservations'];
        const valuesForInsert: (string | null | Date)[] = [
            entryId, 
            dateForDb, 
            entryData.generalObservations || null,
        ];
        
        const onUpdateFragments: string[] = ['`date` = VALUES(`date`)', '`generalObservations` = VALUES(`generalObservations`)'];
        
        PERIOD_DEFINITIONS.forEach(pDef => {
            columnsForInsert.push(pDef.id); 
            const periodValue = entryData[pDef.id as keyof DailyLogEntry];
            valuesForInsert.push(safeStringify(periodValue)); 
            onUpdateFragments.push(`\`${pDef.id}\` = VALUES(\`${pDef.id}\`)`);
        });

        const [existingRows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT id FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE id = ?`, [entryId]);
        if (existingRows.length === 0) {
            columnsForInsert.push('createdAt');
            valuesForInsert.push(new Date()); 
        }

        const sql = `
            INSERT INTO \`${DAILY_ENTRIES_TABLE_NAME}\` (${columnsForInsert.map(c => `\`${c}\``).join(', ')}) 
            VALUES (${valuesForInsert.map(() => '?').join(', ')})
            ON DUPLICATE KEY UPDATE ${onUpdateFragments.join(', ')}
        `;
        
        await pool!.query(sql, valuesForInsert);
        const savedEntry = await getEntry(entryId);
        if (!savedEntry) {
            throw new Error("Falha ao recuperar o lançamento após salvar.");
        }
        return { savedEntry, source: 'mysql' };
    } catch (error: any) {
        console.error(`Data Layer (MySQL) Erro ao salvar para data ${entryId}:`, error);
        throw new Error(`Falha ao salvar no banco de dados: ${error.message}`);
    }
}
