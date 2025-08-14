

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Settings } from '@/lib/types';
import { getSetting, saveSetting } from '@/lib/data/settings';
import { revalidateTag } from 'next/cache';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';
import { logAction } from '@/services/auditService';


const validConfigIds = z.enum([
  'cardVisibilityConfig', 
  'channelUnitPricesConfig', 
  'mysqlConnectionConfig',
  'dashboardItemVisibilityConfig',
  'summaryCardItemsConfig',
  'billedClients',
  'noShowClients',
  'apiAccessConfig'
]);
type ValidConfigId = z.infer<typeof validConfigIds>;


export async function GET(request: NextRequest, { params }: { params: { configId: string } }) {
  const { configId } = params;
  const parsedConfigId = validConfigIds.safeParse(configId);

  if (!parsedConfigId.success) {
    return NextResponse.json({ message: `ConfigId inválido: ${configId}.` }, { status: 400 });
  }
  
  const validatedConfigId = parsedConfigId.data as ValidConfigId;

  try {
    const configValue = await getSetting(validatedConfigId);
    if (configValue === null || configValue === undefined) {
      return NextResponse.json({ config: {} });
    }
    return NextResponse.json({ config: configValue });
  } catch (error: any) {
    return NextResponse.json({ message: error.message, details: error.toString() }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { configId: string } }) {
  const { configId } = params;
  const parsedConfigId = validConfigIds.safeParse(configId);

  if (!parsedConfigId.success) {
    return NextResponse.json({ message: `ConfigId inválido: ${configId}.` }, { status: 400 });
  }
  
  const validatedConfigId = parsedConfigId.data as ValidConfigId;

  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Payload JSON inválido.' }, { status: 400 });
  }

  if (!requestBody || typeof requestBody.config === 'undefined') {
    return NextResponse.json({ message: 'Payload deve conter a propriedade "config".' }, { status: 400 });
  }

  const configValue = requestBody.config as Settings[ValidConfigId];

  try {
    const username = getCookie('username', { cookies }) || 'desconhecido';
    await saveSetting(validatedConfigId, configValue);
    
    await logAction(username, 'SAVE_SETTING', `Configuração '${validatedConfigId}' foi salva.`);

    revalidateTag('settings');
    revalidateTag(`setting-${validatedConfigId}`);

    return NextResponse.json({ message: `Configuração ${validatedConfigId} salva com sucesso.` });
  } catch (error: any) {
    console.error(`API POST Setting Erro para ${validatedConfigId}:`, error);
    return NextResponse.json({ message: `Erro ao salvar configuração ${validatedConfigId}.`, details: error.message }, { status: 500 });
  }
}
