

import { NextResponse, type NextRequest } from 'next/server';
import { getAllEntries } from '@/lib/data/entries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const fields = searchParams.get('fields');

    const entries = await getAllEntries({ startDate, endDate, fields });
    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ message: error.message, details: error.toString() }, { status: 500 });
  }
}
