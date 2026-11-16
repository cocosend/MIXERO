import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  ShieldCheck,
  Trash2,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  BiometricSupportStatus,
  StoredBiometricCredential,
  checkBiometricSupport,
  getStoredBiometricCredential,
  registerBiometricAdmin,
  authenticateBiometricAdmin,
  clearStoredBiometricCredential,
  saveCustomAdminPin,
  resetCustomAdminPin,
} from '../utils/webauthn';
import { triggerHaptic } from '../utils/haptics';

interface AdminSecurityTabProps {
  onLockPanel: () => void;
  onCredentialChange: (cred: StoredBiometricCredential | null) => void;
  authorizeMutation: (actionLabel: string, mutationFn: () => void | Promise<void>) => void;
}

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({
  onLockPanel,
  onCredentialChange,
  authorizeMutation,
}) => {
  const [support, setSupport] = useState<BiometricSupportStatus | null>(null);
  const [credential, setCredential] = useState<StoredBiometricCredential | null>(() =>
    getStoredBiometricCredential()
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricSupport().then(setSupport);
  }, []);

  const handleEnroll = async () => {
    setBusy(true);
    setFeedback(null);
    const res = await registerBiometricAdmin('MIXERO Operator FaceID / TouchID');
    setBusy(false);

    if (res.success && res.credential) {
      triggerHaptic([30, 40, 60]);
      setCredential(res.credential);
      onCredentialChange(res.credential);
      setFeedback({
        type: 'ok',
        text: 'FaceID / TouchID привязан к этому устройству.',
      });
    } else {
      setFeedback({
        type: 'err',
        text: res.error || 'Не удалось выполнить привязку.',
      });
    }
  };

  const handleVerifyTest = async () => {
    setBusy(true);
    setFeedback(null);
    const res = await authenticateBiometricAdmin();
    setBusy(false);

    if (res.success) {
      triggerHaptic([35, 30, 50]);
      setFeedback({
        type: 'ok',
        text: 'Проверка FaceID / TouchID пройдена успешно.',
      });
    } else {
      setFeedback({
        type: 'err',
        text: res.error || 'Проверка не пройдена.',
      });
    }
  };

  const handleRemoveBiometric = () => {
    authorizeMutation('Удаление биометрического ключа WebAuthn', () => {
      clearStoredBiometricCredential();
      setCredential(null);
      onCredentialChange(null);
      setFeedback({
        type: 'ok',
        text: 'Биометрический ключ удалён с этого устройства.',
      });
    });
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setPinMsg('PIN должен содержать минимум 4 символа');
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg('PIN-коды не совпадают');
      return;
    }
    authorizeMutation('Изменение резервного PIN-кода оператора', async () => {
      await saveCustomAdminPin(newPin.trim());
      setNewPin('');
      setConfirmPin('');
      setPinMsg('Новый PIN-код сохранён (SHA-256)');
      setTimeout(() => setPinMsg(null), 3000);
    });
  };

  const handleResetPin = () => {
    authorizeMutation('Сброс PIN-кода на стандартный (1337)', () => {
      resetCustomAdminPin();
      setPinMsg('PIN сброшен на стандартный (1337)');
      setTimeout(() => setPinMsg(null), 3000);
    });
  };

  return (
    <div className="space-y-4">
      {/* WebAuthn FaceID / TouchID Card */}
      <div className="mixero-surface rounded-2xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#022024] text-[#FF9838] flex items-center justify-center shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h4 className="mixero-display text-xs sm:text-sm font-extrabold text-[#F2FCFC]">
                FACEID / TOUCHID (WEBAUTHN)
              </h4>
              <p className="text-xs text-[#96C8CB] font-medium mt-0.5">
                Аппаратная защита панели оператора через Secure Enclave
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-mono font-extrabold shrink-0 px-2.5 py-1 rounded-full ${
              credential
                ? 'bg-[#063E2A]/90 border border-[#22D96E]/50 text-[#42F28B]'
                : 'bg-[#03252A]/85 border border-[#22A8AC]/28 text-[#96C8CB]'
            }`}
          >
            {credential ? 'Активен' : 'Не привязан'}
          </span>
        </div>

        {/* Device capability summary */}
        <div className="mixero-inset rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#96C8CB] font-semibold">Статус WebAuthn</span>
            <span
              className={
                support?.supported
                  ? 'text-[#42F28B] font-extrabold'
                  : 'text-[#FF7878] font-extrabold'
              }
            >
              {support === null
                ? 'Проверка...'
                : support.platformAvailable
                ? 'FaceID / TouchID доступен'
                : support.supported
                ? 'Платформенный сенсор не найден'
                : 'Ограничено средой'}
            </span>
          </div>

          {support?.reason && (
            <p className="text-xs text-[#FF7878] font-medium leading-snug">{support.reason}</p>
          )}

          {credential && (
            <div className="pt-2 mt-2 border-t border-[#22A8AC]/28 space-y-1 font-mono text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-[#96C8CB] font-sans font-semibold">Ключ</span>
                <span className="text-[#F2FCFC] font-bold truncate max-w-[190px]">
                  {credential.credentialId}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#96C8CB] font-sans font-semibold">Привязан</span>
                <span className="text-[#F2FCFC] font-semibold">
                  {new Date(credential.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          )}
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'ok'
                ? 'bg-[#063E2A]/90 border-[#22D96E]/50 text-[#42F28B]'
                : 'bg-[#4A1218]/90 border-[#F87171]/55 text-[#FF7878]'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleEnroll}
            className="min-h-[50px] px-4 mixero-cta disabled:opacity-50 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <Fingerprint className="w-4 h-4" />
            <span>{credential ? 'Перепривязать FaceID / TouchID' : 'Подключить FaceID / TouchID'}</span>
          </button>

          {credential && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleVerifyTest}
                className="flex-1 min-h-[50px] px-3 mixero-secondary-btn font-bold text-sm rounded-xl flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#FF9838]" />
                <span>Проверить</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleRemoveBiometric}
                className="min-h-[50px] px-3.5 mixero-pill hover:bg-[#4A1218]/90 text-[#F2FCFC] hover:text-[#FF7878] rounded-xl flex items-center justify-center"
                title="Удалить биометрию"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom PIN Management */}
      <form
        onSubmit={handleUpdatePin}
        className="mixero-surface rounded-2xl p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#F2FCFC] mixero-display">
            <KeyRound className="w-4 h-4 mixero-accent-text shrink-0" />
            <span>РЕЗЕРВНЫЙ PIN-КОД</span>
          </div>
          <button
            type="button"
            onClick={handleResetPin}
            className="text-xs text-[#96C8CB] hover:text-[#FFFFFF] flex items-center gap-1 font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить (1337)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Новый PIN (мин. 4)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className="w-full min-h-[48px] mixero-input rounded-xl px-3 text-base font-mono font-bold"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Повторите PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className="w-full min-h-[48px] mixero-input rounded-xl px-3 text-base font-mono font-bold"
          />
        </div>

        {pinMsg && <p className="text-xs text-[#42F28B] font-bold">{pinMsg}</p>}

        <button
          type="submit"
          className="w-full min-h-[48px] mixero-secondary-btn font-bold text-sm rounded-xl transition"
        >
          Обновить PIN-код
        </button>
      </form>

      {/* Lock Now Button */}
      <button
        type="button"
        onClick={onLockPanel}
        className="w-full min-h-[50px] mixero-pill hover:border-[#FF6B6B] text-[#FF7878] font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition"
      >
        <Lock className="w-4 h-4" />
        <span>Заблокировать панель сейчас</span>
      </button>
    </div>
  );
};
