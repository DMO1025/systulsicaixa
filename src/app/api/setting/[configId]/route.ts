
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Settings } from '@/lib/types';
import { getSetting as getSettingFromData, saveSetting as saveSettingToData } from '@/lib/data/settings';
import { revalidateTag } from 'next/cache';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';
import { logAction } from '@/services/auditService';


const validConfigIds = z.enum([
  'appName',
  'cardVisibilityConfig', 
  'channelUnitPricesConfig', 
  'mysqlConnectionConfig',
  'dashboardItemVisibilityConfig',
  'summaryCardItemsConfig',
  'eventosNoServicoRestaurante',
  'billedClients',
  'noShowClients',
  'apiAccessConfig',
  'frigobarItems',
  'companies',
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
    const configValue = await getSettingFromData(validatedConfigId);
    if (configValue === null || configValue === undefined) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json(configValue);
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

  if (requestBody === null || typeof requestBody.configValue === 'undefined') {
    return NextResponse.json({ message: 'Payload deve conter a propriedade "configValue".' }, { status: 400 });
  }

  const configValue = requestBody.configValue as Settings[ValidConfigId];

  try {
    const username = getCookie('username', { cookies }) || 'sistema';
    await saveSettingToData(validatedConfigId, configValue);
    
    await logAction(username, 'SAVE_SETTING', `Configuração '${validatedConfigId}' foi salva.`);

    revalidateTag('settings');
    revalidateTag(`setting-${validatedConfigId}`);

    return NextResponse.json({ message: `Configuração ${validatedConfigId} salva com sucesso.` });
  } catch (error: any) {
    console.error(`API POST Setting Erro para ${validatedConfigId}:`, error);
    return NextResponse.json({ message: `Erro ao salvar configuração ${validatedConfigId}.`, details: error.message }, { status: 500 });
  }
}
