
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbPool, isMysqlConnected, DAILY_ENTRIES_TABLE_NAME, safeStringify, safeParse } from '@/lib/mysql';
import { getDailyEntryFromFile, saveDailyEntryToFile } from '@/lib/fileDb';
import type { DailyLogEntry, PeriodData, EventosPeriodData } from '@/lib/types';
import { PERIOD_DEFINITIONS } from '@/lib/constants';
import type mysql from 'mysql2/promise';
import { format, parseISO, isValid } from 'date-fns';
import { unstable_cache as cache, revalidateTag } from 'next/cache';

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data deve estar no formato AAAA-MM-DD");

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
           // Assume it's already a valid object from the DB driver
           entry[pDef.id as keyof DailyLogEntry] = columnValue;
       }
    }
  });
  return entry;
}

const getEntry = (date: string) => cache(
  async (entryId: string) => {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
      try {
        const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE id = ?`, [entryId]);
        if (rows.length === 0) {
          return null;
        }
        const entryFromDb = parsePeriodDataFromDbRow(rows[0]);
        if (entryFromDb.date && typeof entryFromDb.date === 'string') {
          const parsedDate = parseISO(entryFromDb.date);
          if (isValid(parsedDate)) entryFromDb.date = parsedDate;
        }
        return entryFromDb as DailyLogEntry;
      } catch (error: any) {
        console.error(`API GET (MySQL) Erro para data ${entryId}:`, error);
        throw new Error('Erro ao ler lançamento do banco de dados.');
      }
    } else {
      try {
        const entryFromFile = await getDailyEntryFromFile(entryId);
        if (!entryFromFile) {
          return null;
        }
        if (entryFromFile.date && typeof entryFromFile.date === 'string') {
          const parsedDate = parseISO(entryFromFile.date);
          if (isValid(parsedDate)) entryFromFile.date = parsedDate;
        }
        return entryFromFile;
      } catch (error: any) {
        console.error(`API GET (JSON) Erro para data ${entryId}:`, error);
        throw new Error('Erro ao ler lançamento do arquivo JSON.');
      }
    }
  },
  ['entry', date],
  { tags: ['entries', `entry-${date}`], revalidate: 15 }
)(date);

export async function GET(request: NextRequest, { params }: { params: { date: string } }) {
  const parsedDateString = DateStringSchema.safeParse(params.date);

  if (!parsedDateString.success) {
    return NextResponse.json({
      message: "Formato de data inválido na URL.",
      errors: { date: parsedDateString.error.format()._errors } 
    }, { status: 400 });
  }
  const entryId = parsedDateString.data; 

  try {
    const entry = await getEntry(entryId);
    if (!entry) {
      return NextResponse.json({ message: `Lançamento para a data ${entryId} não encontrado` }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (error: any) {
    return NextResponse.json({ message: error.message, details: error.toString() }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { date: string } }) {
  const parsedDateString = DateStringSchema.safeParse(params.date);
  if (!parsedDateString.success) {
    return NextResponse.json({
      message: "Formato de data inválido na URL para POST.",
      errors: { date: parsedDateString.error.format()._errors }
    }, { status: 400 });
  }
  const entryIdFromUrl = parsedDateString.data;

  let newEntryData: Partial<DailyLogEntry>;
  try {
    newEntryData = await request.json();
    if (!newEntryData || typeof newEntryData !== 'object') {
      return NextResponse.json({ message: 'Payload da requisição inválido. Esperado um objeto JSON.' }, { status: 400 });
    }
  } catch (jsonError) {
    return NextResponse.json({ message: 'Payload JSON inválido.' }, { status: 400 });
  }
  
  let dateForDbOrFile: string;
  if (newEntryData.date instanceof Date && isValid(newEntryData.date)) {
      dateForDbOrFile = format(newEntryData.date, 'yyyy-MM-dd');
  } else if (typeof newEntryData.date === 'string') {
      const parsedDate = parseISO(newEntryData.date);
      if (isValid(parsedDate)) {
          dateForDbOrFile = format(parsedDate, 'yyyy-MM-dd');
      } else {
          return NextResponse.json({ message: 'Formato de data inválido no payload.' }, { status: 400 });
      }
  } else {
      return NextResponse.json({ message: 'Campo de data ausente ou inválido no payload.' }, { status: 400 });
  }

  if (dateForDbOrFile !== entryIdFromUrl) {
      return NextResponse.json({ message: `Data da URL (${entryIdFromUrl}) e do payload (${dateForDbOrFile}) não correspondem.` }, { status: 400 });
  }

  const pool = await getDbPool();
  let savedEntry;
  let message;

  if (await isMysqlConnected(pool)) {
    try {
      const columnsForInsert: string[] = ['id', 'date', 'generalObservations'];
      const valuesForInsert: (string | null | Date)[] = [entryIdFromUrl, dateForDbOrFile, newEntryData.generalObservations || null];
      const onUpdateFragments: string[] = ['`date` = VALUES(`date`)', '`generalObservations` = VALUES(`generalObservations`)'];

      PERIOD_DEFINITIONS.forEach(pDef => {
        columnsForInsert.push(pDef.id); 
        const periodValue = newEntryData[pDef.id as keyof DailyLogEntry];
        valuesForInsert.push(safeStringify(periodValue)); 
        onUpdateFragments.push(`\`${pDef.id}\` = VALUES(\`${pDef.id}\`)`);
      });
      
      const [existingRows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT id, createdAt FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE id = ?`, [entryIdFromUrl]);
      let finalCreatedAt: Date | string = new Date();

      if (existingRows.length > 0 && existingRows[0].createdAt) {
        finalCreatedAt = existingRows[0].createdAt; 
      }
      
      const finalSqlColumns: string[] = [...columnsForInsert];
      const finalSqlValues: (string | null | Date)[] = [...valuesForInsert];

      if (existingRows.length === 0) { 
          finalSqlColumns.push('createdAt'); 
          finalSqlValues.push(finalCreatedAt); 
      }

      const columnsSqlString = finalSqlColumns.map(c => `\`${c}\``).join(', ');
      const valuePlaceholdersSqlString = finalSqlValues.map(() => '?').join(', ');
      const onUpdateSqlString = onUpdateFragments.join(', ');

      const sql = `
        INSERT INTO \`${DAILY_ENTRIES_TABLE_NAME}\` (${columnsSqlString}) 
        VALUES (${valuePlaceholdersSqlString})
        ON DUPLICATE KEY UPDATE ${onUpdateSqlString}
      `;
      
      await pool!.query(sql, finalSqlValues);
      
      const [updatedRows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${DAILY_ENTRIES_TABLE_NAME}\` WHERE id = ?`, [entryIdFromUrl]);
      savedEntry = parsePeriodDataFromDbRow(updatedRows[0]);
      if (savedEntry.date && typeof savedEntry.date === 'string') {
        const parsedDate = parseISO(savedEntry.date);
        if (isValid(parsedDate)) savedEntry.date = parsedDate;
      }
      message = `Lançamento para ${entryIdFromUrl} salvo com sucesso no banco de dados.`;

    } catch (error: any) {
      console.error(`API POST (MySQL) Erro para data ${entryIdFromUrl}:`, error);
      return NextResponse.json({ message: `Falha ao salvar no banco de dados: ${error.message}`, details: error.toString() }, { status: 500 });
    }
  } else {
    try {
      const entryToSaveToFile: DailyLogEntry = {
        ...newEntryData,
        id: entryIdFromUrl, 
        date: dateForDbOrFile, 
      } as DailyLogEntry; 

      savedEntry = await saveDailyEntryToFile(entryToSaveToFile);
      if (savedEntry.date && typeof savedEntry.date === 'string') {
        const parsedDate = parseISO(savedEntry.date);
        if (isValid(parsedDate)) savedEntry.date = parsedDate;
      }
      message = `Lançamento para ${entryIdFromUrl} salvo com sucesso no arquivo JSON.`;
    } catch (error: any) {
      console.error(`API POST (JSON) Erro para data ${entryIdFromUrl}:`, error);
      return NextResponse.json({ message: `Falha ao salvar no arquivo JSON: ${error.message}`, details: error.toString() }, { status: 500 });
    }
  }

  revalidateTag('entries');
  revalidateTag(`entry-${entryIdFromUrl}`);

  return NextResponse.json({ message, data: savedEntry }, { status: 200 });
}
