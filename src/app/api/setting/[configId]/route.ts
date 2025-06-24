
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettingFromFile, saveSettingToFile } from '@/lib/fileDb';
import type { Settings } from '@/lib/types';
import { unstable_cache as cache, revalidateTag } from 'next/cache';

const validConfigIds = z.enum([
  'cardVisibilityConfig', 
  'channelUnitPricesConfig', 
  'mysqlConnectionConfig',
  'dashboardItemVisibilityConfig',
  'summaryCardItemsConfig'
]);
type ValidConfigId = z.infer<typeof validConfigIds>;

const getSetting = (configId: ValidConfigId) => cache(
  async (id: ValidConfigId) => {
    try {
      const configValue = await getSettingFromFile(id);
      return configValue;
    } catch (error: any) {
      console.error(`API GET Setting Erro para ${id}:`, error);
      throw new Error(`Erro ao ler configuração ${id}.`);
    }
  },
  ['setting', configId],
  { tags: ['settings', `setting-${configId}`], revalidate: 60 }
)(configId);

export async function GET(request: NextRequest, { params }: { params: { configId: string } }) {
  const parsedConfigId = validConfigIds.safeParse(params.configId);

  if (!parsedConfigId.success) {
    return NextResponse.json({ message: `ConfigId inválido: ${params.configId}. Deve ser um de: ${validConfigIds.options.join(', ')}.` }, { status: 400 });
  }
  const configId = parsedConfigId.data as ValidConfigId;

  try {
    const configValue = await getSetting(configId);
    if (configValue === null || configValue === undefined) {
      return NextResponse.json({ message: `Configuração ${configId} não encontrada.` }, { status: 404 });
    }
    return NextResponse.json({ config: configValue });
  } catch (error: any) {
    return NextResponse.json({ message: error.message, details: error.toString() }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { configId: string } }) {
  const parsedConfigId = validConfigIds.safeParse(params.configId);

  if (!parsedConfigId.success) {
    return NextResponse.json({ message: `ConfigId inválido: ${params.configId}. Deve ser um de: ${validConfigIds.options.join(', ')}.` }, { status: 400 });
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
    if (configId === 'cardVisibilityConfig' && typeof configValue !== 'object') {
        return NextResponse.json({ message: 'cardVisibilityConfig deve ser um objeto.' }, { status: 400 });
    }
    if (configId === 'dashboardItemVisibilityConfig' && typeof configValue !== 'object') {
        return NextResponse.json({ message: 'dashboardItemVisibilityConfig deve ser um objeto.' }, { status: 400 });
    }
    if (configId === 'channelUnitPricesConfig' && typeof configValue !== 'object') {
        return NextResponse.json({ message: 'channelUnitPricesConfig deve ser um objeto.' }, { status: 400 });
    }
     if (configId === 'mysqlConnectionConfig' && typeof configValue !== 'object') {
        return NextResponse.json({ message: 'mysqlConnectionConfig deve ser um objeto.' }, { status: 400 });
    }
    if (configId === 'summaryCardItemsConfig' && typeof configValue !== 'object') {
        return NextResponse.json({ message: 'summaryCardItemsConfig deve ser um objeto.' }, { status: 400 });
    }

    await saveSettingToFile(configId, configValue);
    
    revalidateTag('settings');
    revalidateTag(`setting-${configId}`);

    return NextResponse.json({ message: `Configuração ${configId} salva com sucesso.` });
  } catch (error: any) {
    console.error(`API POST Setting Erro para ${configId}:`, error);
    return NextResponse.json({ message: `Erro ao salvar configuração ${configId}.`, details: error.message }, { status: 500 });
  }
}
