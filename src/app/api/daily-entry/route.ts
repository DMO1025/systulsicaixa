
import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool, isMysqlConnected, DAILY_ENTRIES_TABLE_NAME, safeParse } from '@/lib/mysql';
import { getAllEntriesFromFile } from '@/lib/fileDb';
import type { DailyLogEntry, PeriodData, EventosPeriodData } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/constants';
import type mysql from 'mysql2/promise';
import { parseISO, isValid } from 'date-fns';

function parseAndProcessEntry(row: any, source: 'mysql' | 'file'): DailyLogEntry {
  const entry: Partial<DailyLogEntry> = {
    id: row.id,
    date: row.date,
    generalObservations: row.generalObservations,
    createdAt: row.createdAt,
    lastModifiedAt: row.lastModifiedAt,
  };

  PERIOD_DEFINITIONS.forEach(pDef => {
    const periodKey = pDef.id as keyof DailyLogEntry;
    const columnValue = row[periodKey];

    if (columnValue !== undefined && columnValue !== null) {
      let periodDataObject: PeriodData | EventosPeriodData | null = null;
      if (typeof columnValue === 'string') {
          periodDataObject = safeParse(columnValue);
      } else if (typeof columnValue === 'object') {
          // Assume it's already a parsed object from MySQL driver
          periodDataObject = columnValue;
      }
      
      if (periodDataObject) {
        entry[periodKey] = periodDataObject;
        // Ensure events structure is valid
        if (pDef.id === 'eventos' && entry.eventos && typeof entry.eventos === 'object') {
            const eventosData = entry.eventos as EventosPeriodData;
            if (!Array.isArray(eventosData.items)) {
                eventosData.items = [];
            } else {
                eventosData.items = eventosData.items.map(item => ({
                    ...item,
                    subEvents: Array.isArray(item.subEvents) ? item.subEvents : [],
                }));
            }
        }
      }
    }
  });

  if (entry.date && typeof entry.date === 'string') {
    const parsedDate = parseISO(entry.date);
    if (isValid(parsedDate)) {
      entry.date = parsedDate;
    } else {
        console.warn(`Data inválida para o ID ${entry.id} da fonte ${source}: ${row.date}`);
    }
  }

  return entry as DailyLogEntry;
}

async function getEntries(startDateStr?: string, endDateStr?: string): Promise<DailyLogEntry[]> {
  const pool = await getDbPool();
  if (await isMysqlConnected(pool)) {
    try {
      let query = `SELECT * FROM ${DAILY_ENTRIES_TABLE_NAME}`;
      const params: string[] = [];
      if (startDateStr && endDateStr) {
        query += ' WHERE date BETWEEN ? AND ?';
        params.push(startDateStr, endDateStr);
      }
      query += ' ORDER BY date DESC';
      const [rows] = await pool!.query<mysql.RowDataPacket[]>(query, params);
      return rows.map(row => parseAndProcessEntry(row, 'mysql'));
    } catch (error: any) {
      console.error('API GET (lançamentos, MySQL) Erro:', error);
      throw new Error('Erro ao ler lançamentos do banco de dados.');
    }
  } else {
    try {
      let entries = await getAllEntriesFromFile();
      if (startDateStr && endDateStr) {
        entries = entries.filter(entry => {
          if (entry.id && typeof entry.id === 'string') {
            return entry.id >= startDateStr && entry.id <= endDateStr;
          }
          return false;
        });
      }
      return entries;
    } catch (error: any) {
      console.error('API GET (lançamentos, JSON) Erro:', error);
      throw new Error('Erro ao ler lançamentos do arquivo JSON.');
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const entries = await getEntries(startDate, endDate);
    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ message: error.message, details: error.toString() }, { status: 500 });
  }
}
