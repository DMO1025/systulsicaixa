
import { type NextRequest, NextResponse } from 'next/server';
import { getAuditLogs as getLogsFromDb } from '@/services/auditService';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const userRole = getCookie('userRole', { cookies });
    if (userRole !== 'administrator') {
      return NextResponse.json({ message: 'Acesso não autorizado.' }, { status: 403 });
    }
    
    const logs = await getLogsFromDb();
    return NextResponse.json(logs);

  } catch (error: any) {
    console.error('API get-audit-log error:', error);
    return NextResponse.json({ message: 'Erro ao buscar o histórico de auditoria.' }, { status: 500 });
  }
}
