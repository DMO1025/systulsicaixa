
import { NextResponse, type NextRequest } from 'next/server';
import { getAllEntries as getEntriesFromDb } from '@/lib/data/entries';
import type { DailyLogEntry } from '@/lib/types';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const fields = searchParams.get('fields');

    // Diretamente chamando a função que busca do banco de dados/arquivo.
    const entries = await getEntriesFromDb({ startDate, endDate, fields });
    
    // O processamento que estava em `getAllEntries` foi movido para a camada de serviço.
    // A rota agora apenas retorna os dados já processados.
    return NextResponse.json(entries);

  } catch (error: any) {
    console.error('API GET /api/daily-entry error:', error);
    return NextResponse.json({ message: `Erro ao buscar lançamentos: ${error.message}`, details: error.toString() }, { status: 500 });
  }
}
