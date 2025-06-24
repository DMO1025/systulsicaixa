
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettingFromFile, saveSettingToFile } from '@/lib/fileDb';
import { getDbPool, isMysqlConnected, SETTINGS_TABLE_NAME, safeStringify } from '@/lib/mysql';
import type { Settings } from '@/lib/types';
import { revalidateTag } from 'next/cache';
import type mysql from 'mysql2/promise';

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
    return NextResponse.json({ message: `ConfigId inválido: ${params.configId}. Deve ser um de: ${validConfigIds.options.join(', ')}.` }, { status: 400 });
  }
  const configId = parsedConfigId.data as ValidConfigId;

  try {
    const pool = await getDbPool();
    let configValue = null;

    if (await isMysqlConnected(pool)) {
      const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT value FROM \`${SETTINGS_TABLE_NAME}\` WHERE id = ?`, [configId]);
      if (rows.length > 0 && rows[0].value) {
        configValue = rows[0].value;
      }
    }
    
    // If not in DB or DB not connected, fall back to file
    if (configValue === null) {
        configValue = await getSettingFromFile(configId);
    }

    if (configValue === null || configValue === undefined) {
      // It's ok if it doesn't exist, return an empty object for the config
      return NextResponse.json({ config: {} });
    }
    return NextResponse.json({ config: configValue });
  } catch (error: any) {
    console.error(`API GET Setting Erro para ${configId}:`, error);
    return NextResponse.json({ message: `Erro ao ler configuração ${configId}.`, details: error.toString() }, { status: 500 });
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

  if (typeof requestBody.config === 'undefined') {
    return NextResponse.json({ message: 'Payload deve conter a propriedade "config".' }, { status: 400 });
  }

  const configValue = requestBody.config as Settings[ValidConfigId];

  try {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
      const jsonValue = safeStringify(configValue);
      if (jsonValue) {
          const sql = `INSERT INTO \`${SETTINGS_TABLE_NAME}\` (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`;
          await pool!.query(sql, [configId, jsonValue]);
      } else {
          // If value is null/empty, delete from DB
          await pool!.query(`DELETE FROM \`${SETTINGS_TABLE_NAME}\` WHERE id = ?`, [configId]);
      }
    } else {
      await saveSettingToFile(configId, configValue);
    }
    
    revalidateTag('settings');
    revalidateTag(`setting-${configId}`);

    return NextResponse.json({ message: `Configuração ${configId} salva com sucesso.` });
  } catch (error: any) {
    console.error(`API POST Setting Erro para ${configId}:`, error);
    return NextResponse.json({ message: `Erro ao salvar configuração ${configId}.`, details: error.message }, { status: 500 });
  }
}
