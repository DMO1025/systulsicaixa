
'use server';

import { getDbPool, isMysqlConnected, DAILY_ENTRIES_TABLE_NAME, safeParse, safeStringify } from '@/lib/mysql';
import { getDailyEntryFromFile, saveDailyEntryToFile, getAllEntriesFromFile } from '@/lib/fileDb';
import type { DailyLogEntry, PeriodData, EventosPeriodData } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/constants';
import type mysql from 'mysql2/promise';
import { format, parseISO, isValid } from 'date-fns';

function parsePeriodDataFromDbRow(row: any): Partial<DailyLogEntry> {
  const entry: Partial<DailyLogEntry> = {
    id: row.id,
    date: row.date, 
    generalObservations: row.generalObservations,
    createdAt: row.createdAt,
    lastModifiedAt: row.lastModifiedAt,
  };

  PERIOD_DEFINITIONS.forEach(pDef => {
    const columnValue = row[pDef.id];
    if (columnValue !== undefined && columnValue !== null) {
       if (typeof columnValue === 'string') {
          const parsedPeriodData = safeParse<PeriodData | EventosPeriodData>(columnValue);
          if (parsedPeriodData) {
            entry[pDef.id as keyof DailyLogEntry] = parsedPeriodData;
          }
       } else if (typeof columnValue === 'object') {
           entry[pDef.id as keyof DailyLogEntry] = columnValue;
       }
    }
  });
  return entry;
}

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
        processedEntry[periodKey] = JSON.parse(processedEntry[periodKey] as string);
      } catch (e) { /* ignore */ }
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
  if (await isMysqlConnected(pool)) {
    try {
      const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE id = ?`, [entryId]);
      if (rows.length === 0) {
        return null;
      }
      return processRawEntry(rows[0]);
    } catch (error: any) {
      console.error(`Data Layer (MySQL) Erro para data ${entryId}, usando JSON:`, error);
      return getDailyEntryFromFile(entryId);
    }
  } else {
    return getDailyEntryFromFile(entryId);
  }
}

export async function getAllEntries(
    { startDate, endDate, fields }: { startDate?: string; endDate?: string; fields?: string | null }
): Promise<Partial<DailyLogEntry>[]> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const selectFields = fields === 'id' ? 'id' : '*';
            let query = `SELECT ${selectFields} FROM ${DAILY_ENTRIES_TABLE_NAME}`;
            const params: string[] = [];
            if (startDate && endDate) {
                query += ' WHERE date BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }
            query += ' ORDER BY date ASC';
            const [rows] = await pool!.query<mysql.RowDataPacket[]>(query, params);
            
            if (fields === 'id') return rows as Partial<DailyLogEntry>[];
            
            return rows.map(processRawEntry);
        } catch (error: any) {
            console.error('Data Layer (MySQL) Erro, usando JSON:', error);
            // Fallback to file on any DB error
            return getAllEntriesFromFile();
        }
    } else {
        let entries = await getAllEntriesFromFile();
        if (startDate && endDate) {
            entries = entries.filter(entry => {
                if (entry.id && typeof entry.id === 'string') {
                    return entry.id >= startDate && entry.id <= endDate;
                }
                return false;
            });
        }
        if (fields === 'id') {
            return entries.map(e => ({ id: e.id }));
        }
        return entries;
    }
}


export async function saveEntry(
    entryId: string, 
    entryData: Partial<DailyLogEntry>
): Promise<{ savedEntry: DailyLogEntry, source: 'mysql' | 'json' }> {
    const pool = await getDbPool();

    let dateForDbOrFile: string;
    if (entryData.date instanceof Date && isValid(entryData.date)) {
        dateForDbOrFile = format(entryData.date, 'yyyy-MM-dd');
    } else if (typeof entryData.date === 'string') {
        const parsedDate = parseISO(entryData.date);
        if (!isValid(parsedDate)) throw new Error('Formato de data inválido no payload.');
        dateForDbOrFile = format(parsedDate, 'yyyy-MM-dd');
    } else {
        throw new Error('Campo de data ausente ou inválido no payload.');
    }

    if (dateForDbOrFile !== entryId) {
        throw new Error(`Data da URL (${entryId}) e do payload (${dateForDbOrFile}) não correspondem.`);
    }

    if (await isMysqlConnected(pool)) {
        try {
            const columnsForInsert: string[] = ['id', 'date', 'generalObservations'];
            const valuesForInsert: (string | null | Date)[] = [entryId, dateForDbOrFile, entryData.generalObservations || null];
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
            return { savedEntry: savedEntry!, source: 'mysql' };
        } catch (error: any) {
            console.error(`Data Layer (MySQL) Erro ao salvar para data ${entryId}:`, error);
            throw new Error(`Falha ao salvar no banco de dados: ${error.message}`);
        }
    } else {
        const entryToSave: DailyLogEntry = {
            ...entryData,
            id: entryId, 
            date: dateForDbOrFile,
        } as DailyLogEntry; 

        const savedEntry = await saveDailyEntryToFile(entryToSave);
        return { savedEntry, source: 'json' };
    }
}
