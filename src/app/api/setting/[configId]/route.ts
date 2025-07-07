
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Settings } from '@/lib/types';
import { getSetting, saveSetting } from '@/lib/data/settings';
import { revalidateTag } from 'next/cache';

const validConfigIds = z.enum([
  'cardVisibilityConfig', 
  'channelUnitPricesConfig', 
  'mysqlConnectionConfig',
  'dashboardItemVisibilityConfig',
  'summaryCardItemsConfig'
]);
type ValidConfigId = z.infer<typeof validConfigIds>;


export async function GET(request: NextRequest, { params }: { params: { configId: string } }) {
  const parsedConfigId = validConfigIds.safeParse(params.configId);

  if (!parsedConfigId.success) {
    return NextResponse.json({ message: `ConfigId inválido: ${params.configId}.` }, { status: 400 });
  }
  const configId = parsedConfigId.data as ValidConfigId;

  try {
    const configValue = await getSetting(configId);
    if (configValue === null || configValue === undefined) {
      return NextResponse.json({ config: {} });
    }
    return NextResponse.json({ config: configValue });
  } catch (error: any) {
    return NextResponse.json({ message: error.message, details: error.toString() }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { configId: string } }) {
  const parsedConfigId = validConfigIds.safeParse(params.configId);

  if (!parsedConfigId.success) {
    return NextResponse.json({ message: `ConfigId inválido: ${params.configId}.` }, { status: 400 });
  }
  const configId = parsedConfigId.data as ValidConfigId;

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
    await saveSetting(configId, configValue);
    
    revalidateTag('settings');
    revalidateTag(`setting-${configId}`);

    return NextResponse.json({ message: `Configuração ${configId} salva com sucesso.` });
  } catch (error: any) {
    console.error(`API POST Setting Erro para ${configId}:`, error);
    return NextResponse.json({ message: `Erro ao salvar configuração ${configId}.`, details: error.message }, { status: 500 });
  }
}
