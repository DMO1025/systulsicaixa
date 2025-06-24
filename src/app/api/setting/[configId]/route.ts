
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Settings } from '@/lib/types';
import { getDbPool, isMysqlConnected, SETTINGS_TABLE_NAME } from '@/lib/mysql';
import { getSettingFromFile, saveSettingToFile } from '@/lib/fileDb';
import type mysql from 'mysql2/promise';
import { revalidateTag } from 'next/cache';

const validConfigIds = z.enum([
  'cardVisibilityConfig', 
  'channelUnitPricesConfig', 
  'mysqlConnectionConfig',
  'dashboardItemVisibilityConfig',
  'summaryCardItemsConfig'
]);
type ValidConfigId = z.infer<typeof validConfigIds>;

// This is the actual server-side logic, moved from the service file.
async function getSettingFromServer<T extends keyof Settings>(configId: T): Promise<Settings[T] | null> {
  const pool = await getDbPool();

  if (await isMysqlConnected(pool)) {
    try {
      const [rows] = await pool!.query<mysql.RowDataPacket[]>(
        `SELECT value FROM ${SETTINGS_TABLE_NAME} WHERE configId = ?`,
        [configId]
      );
      if (rows.length === 0) return null;
      // mysql2/promise with JSON support will automatically parse the JSON
      return rows[0].value as Settings[T] | null;
    } catch (dbError) {
      console.error(`Database error getting setting ${configId}:`, dbError);
      throw new Error(`Failed to get setting ${configId} from database.`);
    }
  } else {
    // Fallback to file
    return await getSettingFromFile(configId);
  }
}

async function saveSettingToServer<T extends keyof Settings>(configId: T, configValue: Settings[T]): Promise<void> {
  const pool = await getDbPool();

  if (await isMysqlConnected(pool)) {
    try {
      const sql = `INSERT INTO ${SETTINGS_TABLE_NAME} (configId, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`;
      await pool!.query(sql, [configId, JSON.stringify(configValue)]);
    } catch (dbError) {
      console.error(`Database error saving setting ${configId}:`, dbError);
      throw new Error(`Failed to save setting ${configId} to database.`);
    }
  } else {
    // Fallback to file
    await saveSettingToFile(configId, configValue);
  }
}


// API Handlers
export async function GET(request: NextRequest, { params }: { params: { configId: string } }) {
  const parsedConfigId = validConfigIds.safeParse(params.configId);

  if (!parsedConfigId.success) {
    return NextResponse.json({ message: `ConfigId inválido: ${params.configId}.` }, { status: 400 });
  }
  const configId = parsedConfigId.data as ValidConfigId;

  try {
    const configValue = await getSettingFromServer(configId);
    if (configValue === null || configValue === undefined) {
      // Return a default-like empty object for a 200, or a 404. 200 is often better for client-side.
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
    await saveSettingToServer(configId, configValue);
    
    // Revalidate cache for the specific setting
    revalidateTag('settings');
    revalidateTag(`setting-${configId}`);

    return NextResponse.json({ message: `Configuração ${configId} salva com sucesso.` });
  } catch (error: any) {
    console.error(`API POST Setting Erro para ${configId}:`, error);
    return NextResponse.json({ message: `Erro ao salvar configuração ${configId}.`, details: error.message }, { status: 500 });
  }
}
