
import type { Settings, CardVisibilityConfig, ChannelUnitPricesConfig, MysqlConnectionConfig } from '@/lib/types';

const API_BASE_URL = '/api/setting';

export async function getSetting<T extends keyof Settings>(configId: T): Promise<Settings[T] | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/${configId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      let errorMsg = `Falha ao buscar configuração ${configId}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (parseError) {
        errorMsg = `${errorMsg}: ${response.statusText}`;
      }
      throw new Error(errorMsg);
    }
    const data = await response.json();
    return data?.config ?? null;
  } catch (error) {
    console.error(`Erro ao buscar configuração ${configId}:`, error);
    throw error;
  }
}

export async function saveSetting<T extends keyof Settings>(configId: T, configValue: Settings[T]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/${configId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config: configValue }),
    });
    if (!response.ok) {
      let errorMessage = `Falha ao salvar configuração ${configId}.`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `${errorMessage}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error(`Erro ao salvar configuração ${configId}:`, error);
    throw error; 
  }
}
