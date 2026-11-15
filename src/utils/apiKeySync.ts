import { ClientProfile, AccountTransaction } from '../types/account';
import { CleanTransaction } from '../components/MixerSection';
import { ProtocolConfig } from '../types/config';

export interface FullAccountSyncPayload {
  version: number;
  syncTimestamp: number;
  profile: ClientProfile;
  transactions: CleanTransaction[];
  accountTransactions: AccountTransaction[];
  customAddresses: { trc20: string; erc20: string };
  protocolConfig?: ProtocolConfig;
  checksum: string;
}

/**
 * Generates an encoded portable API Sync Key containing all account & protocol config data
 */
export const generateAccountApiKey = (
  profile: ClientProfile,
  transactions: CleanTransaction[],
  accountTransactions: AccountTransaction[],
  customAddresses: { trc20: string; erc20: string },
  protocolConfig?: ProtocolConfig
): string => {
  try {
    const rawData = {
      version: 2,
      syncTimestamp: Date.now(),
      profile,
      transactions,
      accountTransactions,
      customAddresses,
      protocolConfig,
    };

    const jsonString = JSON.stringify(rawData);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      hash = (hash << 5) - hash + jsonString.charCodeAt(i);
      hash |= 0;
    }
    const checksum = Math.abs(hash).toString(16).padStart(8, '0');

    const fullPayload: FullAccountSyncPayload = {
      ...rawData,
      checksum,
    };

    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(fullPayload))));
    return `MIXERO-SYNC-v2_${base64}`;
  } catch (err) {
    console.error('Failed to generate API Key:', err);
    return '';
  }
};

/**
 * Parses and validates an API Sync Key (supports MIXERO-SYNC-v2_ and legacy GYM-SYNC-v1_)
 */
export const parseAccountApiKey = (
  apiKeyString: string
): { success: boolean; data?: FullAccountSyncPayload; error?: string } => {
  try {
    const trimmed = apiKeyString.trim();
    if (!trimmed) {
      return { success: false, error: 'Ключ синхронизации не может быть пустым' };
    }

    let base64Part = '';
    if (trimmed.startsWith('MIXERO-SYNC-v2_')) {
      base64Part = trimmed.replace('MIXERO-SYNC-v2_', '');
    } else if (trimmed.startsWith('GYM-SYNC-v1_')) {
      base64Part = trimmed.replace('GYM-SYNC-v1_', '');
    } else {
      return {
        success: false,
        error: 'Неверный формат ключа (ожидается MIXERO-SYNC-v2_ или GYM-SYNC-v1_)',
      };
    }

    const jsonString = decodeURIComponent(escape(atob(base64Part)));
    const payload: FullAccountSyncPayload = JSON.parse(jsonString);

    if (!payload.profile || typeof payload.profile.balance !== 'number') {
      return { success: false, error: 'Ключ поврежден: отсутствует профиль пользователя' };
    }

    return {
      success: true,
      data: payload,
    };
  } catch {
    return {
      success: false,
      error: 'Не удалось расшифровать ключ. Проверьте правильность вставки.',
    };
  }
};
