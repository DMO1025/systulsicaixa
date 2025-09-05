

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEntry, saveEntry } from '@/lib/data/entries';
import type { DailyLogEntry } from '@/lib/types';
import { unstable_cache as cache, revalidateTag } from 'next/cache';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';
import { logAction } from '@/services/auditService';


const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data deve estar no formato AAAA-MM-DD");

// The cache wrapper stays in the API layer, wrapping the data layer call.
const getEntryWithCache = (date: string) => cache(
  async (entryId: string) => getEntry(entryId),
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
    const entry = await getEntryWithCache(entryId);
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
  
  try {
    const username = getCookie('username', { cookies }) || 'sistema';
    const existingEntry = await getEntry(entryIdFromUrl);
    const actionType = existingEntry ? 'UPDATE_ENTRY' : 'CREATE_ENTRY';
    
    const { savedEntry, source } = await saveEntry(entryIdFromUrl, newEntryData);
    
    // Log the action after successful save
    await logAction(username, actionType, `Lançamento para ${entryIdFromUrl} foi ${existingEntry ? 'atualizado' : 'criado'}.`);
    
    revalidateTag('entries');
    revalidateTag(`entry-${entryIdFromUrl}`);
    
    const message = `Lançamento para ${entryIdFromUrl} salvo com sucesso no ${source === 'mysql' ? 'banco de dados' : 'arquivo JSON'}.`;

    return NextResponse.json({ message, data: savedEntry }, { status: 200 });
  } catch(error: any) {
     console.error(`API POST (saveEntry) Erro para data ${entryIdFromUrl}:`, error);
     return NextResponse.json({ message: error.message, details: error.toString() }, { status: 500 });
  }
}
