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
}

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = ({
  onLockPanel,
  onCredentialChange,
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
    clearStoredBiometricCredential();
    setCredential(null);
    onCredentialChange(null);
    setFeedback({
      type: 'ok',
      text: 'Биометрический ключ удален с этого устройства.',
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
    await saveCustomAdminPin(newPin.trim());
    setNewPin('');
    setConfirmPin('');
    setPinMsg('Новый PIN-код сохранён (SHA-256)');
    setTimeout(() => setPinMsg(null), 3000);
  };

  const handleResetPin = () => {
    resetCustomAdminPin();
    setPinMsg('PIN сброшен на стандартный (1337)');
    setTimeout(() => setPinMsg(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* WebAuthn FaceID / TouchID Card */}
      <div className="bg-[#0d131d] border border-white/10 rounded-2xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">FaceID / TouchID (WebAuthn)</h4>
              <p className="text-xs text-slate-400">
                Аппаратная защита панели оператора через Secure Enclave
              </p>
            </div>
          </div>

          <span
            className={`text-[11px] font-mono font-bold shrink-0 ${
              credential ? 'text-teal-300' : 'text-slate-400'
            }`}
          >
            {credential ? 'Активен' : 'Не привязан'}
          </span>
        </div>

        {/* Device capability summary */}
        <div className="bg-[#070a0f] border border-white/[0.07] rounded-xl p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Статус WebAuthn</span>
            <span className={support?.supported ? 'text-teal-300 font-semibold' : 'text-amber-300 font-semibold'}>
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
            <p className="text-[11px] text-amber-300/90 leading-snug">{support.reason}</p>
          )}

          {credential && (
            <div className="pt-2 mt-2 border-t border-white/[0.06] space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Ключ</span>
                <span className="text-slate-200 truncate max-w-[190px]">{credential.credentialId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Привязан</span>
                <span className="text-slate-300">
                  {new Date(credential.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          )}
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              feedback.type === 'ok'
                ? 'bg-teal-950/50 border-teal-500/40 text-teal-200'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}
          >
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-300" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleEnroll}
            className="min-h-[48px] px-4 mixero-cta disabled:opacity-50 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
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
                className="flex-1 min-h-[48px] px-3 bg-[#15202e] hover:bg-[#1c2a3d] border border-sky-400/30 text-sky-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Проверить</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={handleRemoveBiometric}
                className="min-h-[48px] px-3.5 bg-[#151c27] hover:bg-rose-950/70 border border-white/10 text-slate-300 hover:text-rose-300 rounded-xl flex items-center justify-center"
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
        className="bg-[#0d131d] border border-white/10 rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <KeyRound className="w-4 h-4 text-amber-300" />
            <span>Резервный PIN-код</span>
          </div>
          <button
            type="button"
            onClick={handleResetPin}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить (1337)</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Новый PIN (мин. 4)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            className="w-full min-h-[46px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-base font-mono text-white"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Повторите PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className="w-full min-h-[46px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-base font-mono text-white"
          />
        </div>

        {pinMsg && <p className="text-xs text-teal-300 font-medium">{pinMsg}</p>}

        <button
          type="submit"
          className="w-full min-h-[46px] bg-[#15202e] hover:bg-[#1c2a3d] border border-white/10 text-white font-bold text-xs rounded-xl transition"
        >
          Обновить PIN-код
        </button>
      </form>

      {/* Lock Now Button */}
      <button
        type="button"
        onClick={onLockPanel}
        className="w-full min-h-[48px] bg-[#101621] hover:bg-rose-950/50 border border-white/10 hover:border-rose-500/40 text-slate-200 hover:text-rose-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition"
      >
        <Lock className="w-4 h-4" />
        <span>Заблокировать панель сейчас</span>
      </button>
    </div>
  );
};
