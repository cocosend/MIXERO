const CREDENTIAL_STORAGE_KEY = 'mixero_admin_webauthn_cred';
const PIN_HASH_STORAGE_KEY = 'mixero_admin_pin_hash';

export interface StoredBiometricCredential {
  credentialId: string; // Base64URL encoded rawId
  createdAt: number;
  label: string;
  rpId: string;
  userId: string;
}

export interface BiometricSupportStatus {
  supported: boolean;
  platformAvailable: boolean;
  reason?: string;
}

function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getSafeRpId(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname || 'localhost';
}

export async function checkBiometricSupport(): Promise<BiometricSupportStatus> {
  if (typeof window === 'undefined') {
    return { supported: false, platformAvailable: false, reason: 'Недоступно вне браузера' };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      platformAvailable: false,
      reason: 'WebAuthn требует HTTPS или localhost',
    };
  }

  if (!('PublicKeyCredential' in window) || !navigator.credentials) {
    return {
      supported: false,
      platformAvailable: false,
      reason: 'Браузер не поддерживает WebAuthn',
    };
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      return {
        supported: true,
        platformAvailable: false,
        reason: 'На устройстве не настроен FaceID / TouchID или платформенный аутентификатор',
      };
    }
    return { supported: true, platformAvailable: true };
  } catch (err) {
    return {
      supported: false,
      platformAvailable: false,
      reason: err instanceof Error ? err.message : 'Доступ к WebAuthn ограничен политикой окна',
    };
  }
}

export function getStoredBiometricCredential(): StoredBiometricCredential | null {
  try {
    const raw = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBiometricCredential;
    if (parsed && parsed.credentialId) return parsed;
  } catch {
    // Ignored
  }
  return null;
}

export function clearStoredBiometricCredential(): void {
  try {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  } catch {
    // Ignored
  }
}

export async function registerBiometricAdmin(
  label = 'MIXERO Operator (FaceID / TouchID)'
): Promise<{ success: boolean; credential?: StoredBiometricCredential; error?: string }> {
  const support = await checkBiometricSupport();
  if (!support.supported) {
    return { success: false, error: support.reason || 'WebAuthn не поддерживается' };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userIdBytes = new Uint8Array(16);
    crypto.getRandomValues(userIdBytes);
    const userId = bufferToBase64Url(userIdBytes);
    const rpId = getSafeRpId();

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'MIXERO Operator Vault',
          id: rpId,
        },
        user: {
          id: userIdBytes,
          name: 'operator@mixero.local',
          displayName: 'MIXERO Operator',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256 (Apple Secure Enclave / Android Keystore)
          { type: 'public-key', alg: -257 }, // RS256 fallback
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      return { success: false, error: 'Регистрация биометрии отменена' };
    }

    const stored: StoredBiometricCredential = {
      credentialId: bufferToBase64Url(credential.rawId),
      createdAt: Date.now(),
      label,
      rpId,
      userId,
    };

    localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(stored));
    return { success: true, credential: stored };
  } catch (err) {
    const msg =
      err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Запрос отклонён пользователем или заблокирован встроенным iframe (откройте в отдельном окне Safari/Chrome)'
        : err instanceof Error
        ? err.message
        : 'Не удалось привязать FaceID / TouchID';
    return { success: false, error: msg };
  }
}

export interface BiometricAssertionProof {
  credentialId: string;
  challenge: string;
  signaturePreview: string;
  verifiedAt: number;
}

export async function authenticateBiometricAdmin(): Promise<{
  success: boolean;
  proof?: BiometricAssertionProof;
  error?: string;
}> {
  const stored = getStoredBiometricCredential();
  if (!stored) {
    return { success: false, error: 'Биометрический ключ еще не привязан' };
  }

  const support = await checkBiometricSupport();
  if (!support.supported) {
    return { success: false, error: support.reason || 'WebAuthn недоступен' };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const expectedChallenge = bufferToBase64Url(challenge);

    const credentialIdBytes = base64UrlToUint8Array(stored.credentialId);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: stored.rpId || getSafeRpId(),
        allowCredentials: [
          {
            id: credentialIdBytes.buffer as ArrayBuffer,
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion || !assertion.response) {
      return { success: false, error: 'Проверка биометрии не завершена' };
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    if (!response.clientDataJSON || !response.authenticatorData || !response.signature) {
      return { success: false, error: 'Некорректный ответ аутентификатора' };
    }

    // Verify clientDataJSON challenge and type
    const clientDataText = new TextDecoder().decode(response.clientDataJSON);
    const clientData = JSON.parse(clientDataText) as {
      type?: string;
      challenge?: string;
    };

    if (clientData.type !== 'webauthn.get' || clientData.challenge !== expectedChallenge) {
      return { success: false, error: 'Ошибка проверки криптографического challenge WebAuthn' };
    }

    const sigDigest = await crypto.subtle.digest('SHA-256', response.signature);
    const signaturePreview = bufferToBase64Url(sigDigest).slice(0, 16).toUpperCase();

    return {
      success: true,
      proof: {
        credentialId: stored.credentialId,
        challenge: expectedChallenge.slice(0, 12),
        signaturePreview,
        verifiedAt: Date.now(),
      },
    };
  } catch (err) {
    const msg =
      err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Биометрическая проверка отменена или истекло время ожидания'
        : err instanceof Error
        ? err.message
        : 'Ошибка биометрической проверки';
    return { success: false, error: msg };
  }
}

export async function hashAdminPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(`mixero_pin_salt_${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bufferToBase64Url(digest);
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const customHash = localStorage.getItem(PIN_HASH_STORAGE_KEY);
  if (customHash) {
    const inputHash = await hashAdminPin(pin);
    return inputHash === customHash;
  }
  return pin === '1337' || pin === '7777' || pin.toLowerCase() === 'admin';
}

export async function saveCustomAdminPin(newPin: string): Promise<void> {
  const hashed = await hashAdminPin(newPin);
  localStorage.setItem(PIN_HASH_STORAGE_KEY, hashed);
}

export function resetCustomAdminPin(): void {
  localStorage.removeItem(PIN_HASH_STORAGE_KEY);
}
