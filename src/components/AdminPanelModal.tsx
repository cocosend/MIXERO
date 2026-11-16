import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  X,
  Key,
  AlertTriangle,
  RefreshCw,
  Send,
  Check,
  PlusCircle,
  DollarSign,
  Copy,
  Upload,
  Sparkles,
  Sliders,
  Pencil,
  Calendar,
  Fingerprint,
  Shield,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { CleanTransaction } from './MixerSection';
import { AccountTransaction, ClientProfile } from '../types/account';
import { ProtocolConfig } from '../types/config';
import { AdminPricingTab } from './AdminPricingTab';
import { AdminSecurityTab } from './AdminSecurityTab';
import {
  generateAccountApiKey,
  parseAccountApiKey,
  FullAccountSyncPayload,
} from '../utils/apiKeySync';
import {
  StoredBiometricCredential,
  BiometricAssertionProof,
  getStoredBiometricCredential,
  authenticateBiometricAdmin,
  registerBiometricAdmin,
  verifyAdminPin,
} from '../utils/webauthn';
import { triggerHaptic } from '../utils/haptics';

interface PendingMutation {
  label: string;
  execute: () => void | Promise<void>;
  mode: 'verifying' | 'enroll_required' | 'failed';
  error?: string;
}

// Convert timestamp (ms) to value for <input type="datetime-local" />
function toDateTimeLocal(ts: number): string {
  const d = new Date(ts || Date.now());
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocal(val: string, fallback: number): number {
  if (!val) return fallback;
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? fallback : parsed;
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: CleanTransaction[];
  onUpdateTransactionStatus: (
    id: string,
    status: CleanTransaction['status']
  ) => void;
  onUpdateTransaction: (id: string, patch: Partial<CleanTransaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCustomTransaction: (tx: CleanTransaction) => void;
  onAddCustomAccountTx: (tx: AccountTransaction, adjustBalance: number) => void;
  onUpdateAccountTx: (id: string, patch: Partial<AccountTransaction>) => void;
  customAddresses: { trc20: string; erc20: string };
  onUpdateAddresses: (addresses: { trc20: string; erc20: string }) => void;
  clientBalance: number;
  onUpdateClientBalance: (newBalance: number) => void;
  accountTransactions: AccountTransaction[];
  onDeleteAccountTx: (id: string) => void;
  onClearAllAccountTxs?: () => void;
  profile: ClientProfile;
  onUpdateProfile: (patch: Partial<ClientProfile>) => void;
  onImportSyncPayload?: (payload: FullAccountSyncPayload) => void;
  protocolConfig: ProtocolConfig;
  onUpdateProtocolConfig: (next: ProtocolConfig) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onUpdateTransactionStatus,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddCustomTransaction,
  onAddCustomAccountTx,
  onUpdateAccountTx,
  customAddresses,
  onUpdateAddresses,
  clientBalance,
  onUpdateClientBalance,
  accountTransactions,
  onDeleteAccountTx,
  onClearAllAccountTxs,
  profile,
  onUpdateProfile,
  onImportSyncPayload,
  protocolConfig,
  onUpdateProtocolConfig,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [biometricCred, setBiometricCred] = useState<StoredBiometricCredential | null>(() =>
    getStoredBiometricCredential()
  );
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [showPinFallback, setShowPinFallback] = useState(() => !getStoredBiometricCredential());
  const [dismissBioBanner, setDismissBioBanner] = useState(false);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [fallbackPin, setFallbackPin] = useState('');
  const [fallbackPinError, setFallbackPinError] = useState(false);
  const [lastWebAuthnAudit, setLastWebAuthnAudit] = useState<{
    label: string;
    proof: BiometricAssertionProof;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    'orders' | 'pricing' | 'create_tx' | 'account_txs' | 'wallets' | 'api_sync' | 'security'
  >('orders');

  // Inline Edit states
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState<Partial<CleanTransaction>>({});

  const [editingAccTxId, setEditingAccTxId] = useState<string | null>(null);
  const [accTxDraft, setAccTxDraft] = useState<Partial<AccountTransaction>>({});

  // Profile Edit state
  const [editingClientId, setEditingClientId] = useState(profile.clientId);
  const [editingBalance, setEditingBalance] = useState(clientBalance.toString());
  const [editingInCleaning, setEditingInCleaning] = useState(profile.inCleaning.toString());
  const [editingTotalCleaned, setEditingTotalCleaned] = useState(profile.totalCleaned.toString());
  const [editingJoinedDate, setEditingJoinedDate] = useState(toDateTimeLocal(profile.joinedDate));
  const [profileSaved, setProfileSaved] = useState(false);

  // Wallet edit state
  const [trcAddr, setTrcAddr] = useState(customAddresses.trc20);
  const [ercAddr, setErcAddr] = useState(customAddresses.erc20);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEditingClientId(profile.clientId);
    setEditingBalance(clientBalance.toString());
    setEditingInCleaning(profile.inCleaning.toString());
    setEditingTotalCleaned(profile.totalCleaned.toString());
    setEditingJoinedDate(toDateTimeLocal(profile.joinedDate));
    setTrcAddr(customAddresses.trc20);
    setErcAddr(customAddresses.erc20);
  }, [
    isOpen,
    profile.clientId,
    profile.inCleaning,
    profile.totalCleaned,
    profile.joinedDate,
    clientBalance,
    customAddresses.trc20,
    customAddresses.erc20,
  ]);

  // API Key Sync State
  const [inputApiKey, setInputApiKey] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  const currentAccountApiKey = useMemo(() => {
    return generateAccountApiKey(
      { ...profile, balance: clientBalance },
      transactions,
      accountTransactions,
      { trc20: trcAddr, erc20: ercAddr },
      protocolConfig
    );
  }, [profile, clientBalance, transactions, accountTransactions, trcAddr, ercAddr, protocolConfig]);

  // New Custom Cleaning Transaction Form State
  const [newTxAmount, setNewTxAmount] = useState('1500');
  const [newTxReceiveAmount, setNewTxReceiveAmount] = useState('');
  const [newTxNetwork, setNewTxNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [newTxTariff, setNewTxTariff] = useState<'standard' | 'express'>('standard');
  const [newTxDelayHours, setNewTxDelayHours] = useState('24');
  const [newTxRecipient, setNewTxRecipient] = useState('TNwS3upnJmFADuCEVy24z8g2F79eV6pv79');
  const [newTxStatus, setNewTxStatus] = useState<CleanTransaction['status']>('completed');
  const [newTxDateTime, setNewTxDateTime] = useState(toDateTimeLocal(Date.now()));
  const [newTxKey, setNewTxKey] = useState('');
  const [createdTxSuccess, setCreatedTxSuccess] = useState(false);

  // New Custom Account Transaction Form State
  const [newAccType, setNewAccType] = useState<AccountTransaction['type']>('topup');
  const [newAccAmount, setNewAccAmount] = useState('500');
  const [newAccNetwork, setNewAccNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [newAccTitle, setNewAccTitle] = useState('Оплата комиссий сети');
  const [newAccNote, setNewAccNote] = useState('Зачислено оператором');
  const [newAccDateTime, setNewAccDateTime] = useState(toDateTimeLocal(Date.now()));
  const [newAccProofKey, setNewAccProofKey] = useState('');
  const [newAccRecipient, setNewAccRecipient] = useState('');
  const [newAccApplyToBalance, setNewAccApplyToBalance] = useState(true);
  const [createdAccSuccess, setCreatedAccSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await verifyAdminPin(pin);
    if (ok) {
      triggerHaptic([35, 30, 50]);
      setIsAuthenticated(true);
      setPinError(false);
      setPin('');
    } else {
      setPinError(true);
    }
  };

  const handleBiometricUnlock = async () => {
    setBiometricBusy(true);
    setBiometricError(null);
    const res = await authenticateBiometricAdmin();
    setBiometricBusy(false);

    if (res.success) {
      triggerHaptic([35, 30, 55]);
      setIsAuthenticated(true);
      setBiometricError(null);
    } else {
      setBiometricError(res.error || 'Не удалось пройти проверку FaceID / TouchID');
      setShowPinFallback(true);
    }
  };

  const handleQuickEnrollAfterAuth = async () => {
    setBiometricBusy(true);
    setBiometricError(null);
    const res = await registerBiometricAdmin();
    setBiometricBusy(false);
    if (res.success && res.credential) {
      triggerHaptic([35, 30, 55]);
      setBiometricCred(res.credential);
    } else {
      setBiometricError(res.error || 'Ошибка привязки биометрии');
    }
  };

  /**
   * Enforces WebAuthn biometric authentication for every administrative state modification.
   * Invokes navigator.credentials.get immediately when a WebAuthn credential is enrolled,
   * or prompts WebAuthn credential creation (navigator.credentials.create) first if none exists.
   */
  const authorizeAdminMutation = async (
    label: string,
    execute: () => void | Promise<void>
  ) => {
    const activeCred = getStoredBiometricCredential() || biometricCred;
    setFallbackPin('');
    setFallbackPinError(false);

    if (!activeCred) {
      setPendingMutation({ label, execute, mode: 'enroll_required' });
      return;
    }

    setPendingMutation({ label, execute, mode: 'verifying' });
    setMutationBusy(true);
    const res = await authenticateBiometricAdmin();
    setMutationBusy(false);

    if (res.success) {
      triggerHaptic([35, 25, 55]);
      await execute();
      if (res.proof) {
        setLastWebAuthnAudit({ label, proof: res.proof });
      }
      setPendingMutation(null);
    } else {
      setPendingMutation({
        label,
        execute,
        mode: 'failed',
        error: res.error || 'Биометрическая проверка WebAuthn не пройдена',
      });
    }
  };

  const handleRetryBiometricMutation = async () => {
    if (!pendingMutation) return;
    setMutationBusy(true);
    setPendingMutation({ ...pendingMutation, mode: 'verifying', error: undefined });
    const res = await authenticateBiometricAdmin();
    setMutationBusy(false);

    if (res.success) {
      triggerHaptic([35, 25, 55]);
      await pendingMutation.execute();
      if (res.proof) {
        setLastWebAuthnAudit({ label: pendingMutation.label, proof: res.proof });
      }
      setPendingMutation(null);
    } else {
      setPendingMutation({
        ...pendingMutation,
        mode: 'failed',
        error: res.error || 'Биометрическая проверка WebAuthn отклонёна',
      });
    }
  };

  const handleEnrollBiometricForMutation = async () => {
    if (!pendingMutation) return;
    setMutationBusy(true);
    const reg = await registerBiometricAdmin();
    if (!reg.success || !reg.credential) {
      setMutationBusy(false);
      setPendingMutation({
        ...pendingMutation,
        mode: 'failed',
        error: reg.error || 'Не удалось создать ключ WebAuthn на этом устройстве',
      });
      return;
    }

    setBiometricCred(reg.credential);
    setPendingMutation({ ...pendingMutation, mode: 'verifying', error: undefined });
    const authRes = await authenticateBiometricAdmin();
    setMutationBusy(false);

    if (authRes.success) {
      triggerHaptic([35, 25, 55]);
      await pendingMutation.execute();
      if (authRes.proof) {
        setLastWebAuthnAudit({ label: pendingMutation.label, proof: authRes.proof });
      }
      setPendingMutation(null);
    } else {
      setPendingMutation({
        ...pendingMutation,
        mode: 'failed',
        error: authRes.error || 'Ключ создан, но подтверждение не завершено',
      });
    }
  };

  const handleFallbackPinForMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingMutation) return;
    const ok = await verifyAdminPin(fallbackPin);
    if (!ok) {
      setFallbackPinError(true);
      return;
    }
    triggerHaptic([35, 25, 45]);
    await pendingMutation.execute();
    setFallbackPin('');
    setFallbackPinError(false);
    setPendingMutation(null);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(currentAccountApiKey);
    setCopiedApiKey(true);
    setTimeout(() => setCopiedApiKey(false), 2000);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputApiKey(text.trim());
    } catch {
      // Ignored
    }
  };

  const handleApplyApiKeySync = () => {
    setImportError(null);
    const result = parseAccountApiKey(inputApiKey);
    if (!result.success || !result.data) {
      setImportError(result.error || 'Ошибка декодирования ключа');
      return;
    }

    const payloadData = result.data;
    authorizeAdminMutation('Импорт состояния и тарифов (MIXERO SYNC KEY)', () => {
      if (onImportSyncPayload) onImportSyncPayload(payloadData);
      if (payloadData.customAddresses) {
        setTrcAddr(payloadData.customAddresses.trc20 || customAddresses.trc20);
        setErcAddr(payloadData.customAddresses.erc20 || customAddresses.erc20);
      }
      if (payloadData.profile) {
        setEditingBalance(payloadData.profile.balance.toString());
        setEditingClientId(payloadData.profile.clientId);
        setEditingInCleaning(payloadData.profile.inCleaning.toString());
        setEditingTotalCleaned(payloadData.profile.totalCleaned.toString());
      }
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 4000);
    });
  };

  const handleSaveWallets = (e: React.FormEvent) => {
    e.preventDefault();
    authorizeAdminMutation('Обновление адресов приёма депозитов (TRC-20 / ERC-20)', () => {
      onUpdateAddresses({ trc20: trcAddr.trim(), erc20: ercAddr.trim() });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(editingBalance);
    const inClean = parseFloat(editingInCleaning);
    const totClean = parseFloat(editingTotalCleaned);

    authorizeAdminMutation('Изменение профиля и баланса клиента', () => {
      if (!isNaN(bal)) onUpdateClientBalance(bal);
      onUpdateProfile({
        clientId: editingClientId.trim() || profile.clientId,
        balance: isNaN(bal) ? profile.balance : bal,
        inCleaning: isNaN(inClean) ? profile.inCleaning : inClean,
        totalCleaned: isNaN(totClean) ? profile.totalCleaned : totClean,
        joinedDate: fromDateTimeLocal(editingJoinedDate, profile.joinedDate),
      });

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    });
  };

  const handleCreateCustomCleaningTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newTxAmount) || 100;
    const customRec = parseFloat(newTxReceiveAmount);
    const recAmt = !isNaN(customRec) && newTxReceiveAmount.trim() !== '' ? customRec : amt;
    const key =
      newTxKey.trim() ||
      `MIX_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    const newTx: CleanTransaction = {
      id: key,
      network: newTxNetwork,
      tariff: newTxTariff,
      amount: amt,
      receivedAmount: recAmt,
      recipientAddress: newTxRecipient.trim(),
      depositAddress: newTxNetwork === 'TRC20' ? customAddresses.trc20 : customAddresses.erc20,
      mixingKey: key,
      delayHours:
        parseInt(newTxDelayHours, 10) ||
        (newTxTariff === 'express'
          ? protocolConfig.expressDelayHours
          : protocolConfig.standardMinHours),
      timestamp: fromDateTimeLocal(newTxDateTime, Date.now()),
      status: newTxStatus,
    };

    authorizeAdminMutation(`Создание сеанса ${key} (${amt} USDT)`, () => {
      onAddCustomTransaction(newTx);
      setCreatedTxSuccess(true);
      setTimeout(() => setCreatedTxSuccess(false), 2000);
    });
  };

  const handleCreateCustomAccountTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAccAmount) || 100;
    const txId = `TX_${Date.now().toString(36).toUpperCase()}`;
    const txTimestamp = fromDateTimeLocal(newAccDateTime, Date.now());
    const proofKey = newAccProofKey.trim() || `PROOF_${txId}`;
    const sshSig = `SHA256:MIXERO_${(txId + proofKey)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 1337)
      .toString(16)
      .toUpperCase()}`;

    const newTx: AccountTransaction = {
      id: txId,
      type: newAccType,
      title: newAccTitle || 'Операция ЛК',
      amount:
        newAccType === 'fee_payment' || newAccType === 'withdrawal'
          ? -Math.abs(amt)
          : Math.abs(amt),
      network: newAccNetwork,
      timestamp: txTimestamp,
      status: 'completed',
      txHash: `0x${Math.random().toString(16).slice(2, 14)}`,
      note: newAccNote,
      proofKey,
      sshSignature: sshSig,
      recipientAddress: newAccRecipient.trim() || undefined,
    };

    const delta = newAccApplyToBalance
      ? newAccType === 'topup' || newAccType === 'payout'
        ? Math.abs(amt)
        : -Math.abs(amt)
      : 0;

    authorizeAdminMutation(`Добавление проводки ЛК (${amt} USDT)`, () => {
      onAddCustomAccountTx(newTx, delta);
      setCreatedAccSuccess(true);
      setTimeout(() => setCreatedAccSuccess(false), 2000);
    });
  };

  const startEditingOrder = (tx: CleanTransaction) => {
    setEditingOrderId(tx.id);
    setOrderDraft({ ...tx });
  };

  const saveOrderEdit = (id: string) => {
    const draftCopy = { ...orderDraft };
    authorizeAdminMutation(`Сохранение изменений сеанса ${id}`, () => {
      onUpdateTransaction(id, draftCopy);
      setEditingOrderId(null);
      setOrderDraft({});
    });
  };

  const startEditingAccTx = (tx: AccountTransaction) => {
    setEditingAccTxId(tx.id);
    setAccTxDraft({ ...tx });
  };

  const saveAccTxEdit = (id: string) => {
    const draftCopy = { ...accTxDraft };
    authorizeAdminMutation(`Редактирование проводки ЛК ${id}`, () => {
      onUpdateAccountTx(id, draftCopy);
      setEditingAccTxId(null);
      setAccTxDraft({});
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-[#022024]/55 backdrop-blur-sm">
      <div className="w-full max-w-2xl mixero-card rounded-3xl overflow-hidden flex flex-col max-h-[92vh] text-[#F2FCFC]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#22A8AC]/28 mixero-surface gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl mixero-cta flex items-center justify-center font-black shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="mixero-display text-xs sm:text-sm font-extrabold text-[#F2FCFC] truncate">
                  MIXERO 📼 · ПАНЕЛЬ ОПЕРАТОРА
                </h3>
                {isAuthenticated && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#063E2A]/90 border border-[#22D96E]/50 text-[10px] font-mono font-extrabold text-[#42F28B]">
                    <Fingerprint className="w-3 h-3" />
                    <span>WEBAUTHN GUARD</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#96C8CB] font-medium truncate">
                Любые изменения состояния требуют подтверждения WebAuthn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setIsAuthenticated(false);
                  setBiometricError(null);
                  setShowPinFallback(!biometricCred);
                }}
                className="w-11 h-11 rounded-2xl text-[#F2FCFC] hover:border-[#FF9436] mixero-pill flex items-center justify-center transition"
                aria-label="Заблокировать панель"
                title="Заблокировать панель"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-2xl text-[#F2FCFC] hover:border-[#FF9436] mixero-pill flex items-center justify-center transition"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 space-y-5 my-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#022024] text-[#FF9838] flex items-center justify-center mx-auto shadow-md">
              {biometricCred ? (
                <Fingerprint className="w-8 h-8" />
              ) : (
                <Key className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1.5">
              <h4 className="mixero-display text-sm sm:text-base font-extrabold text-[#F2FCFC]">
                АВТОРИЗАЦИЯ ОПЕРАТОРА
              </h4>
              <p className="text-xs sm:text-sm text-[#96C8CB] max-w-xs mx-auto leading-relaxed font-medium">
                {biometricCred
                  ? 'Подтвердите личность через FaceID / TouchID или используйте резервный PIN'
                  : 'Введите PIN для доступа к панели (по умолч. 1337). FaceID / TouchID можно подключить после входа.'}
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-3">
              {biometricCred && (
                <>
                  <button
                    type="button"
                    disabled={biometricBusy}
                    onClick={handleBiometricUnlock}
                    className="w-full min-h-[54px] mixero-cta disabled:opacity-60 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
                  >
                    <Fingerprint className="w-5 h-5" />
                    <span>
                      {biometricBusy ? 'Ожидание FaceID / TouchID...' : 'Войти через FaceID / TouchID'}
                    </span>
                  </button>

                  {biometricError && (
                    <div className="p-3 rounded-xl bg-[#4A1218]/90 border border-[#F87171]/55 text-xs text-[#FF7878] font-bold text-left flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{biometricError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPinFallback((prev) => !prev)}
                    className="w-full min-h-[44px] text-xs font-bold text-[#96C8CB] hover:text-[#FFFFFF] transition"
                  >
                    {showPinFallback ? 'Скрыть ввод PIN-кода' : 'Войти по PIN-коду'}
                  </button>
                </>
              )}

              {(!biometricCred || showPinFallback) && (
                <form onSubmit={handleUnlock} className="space-y-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={12}
                    autoFocus={!biometricCred}
                    placeholder="PIN-код"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setPinError(false);
                    }}
                    className="w-full min-h-[52px] text-center tracking-widest text-lg font-mono font-extrabold px-4 mixero-input rounded-2xl"
                  />

                  {pinError && (
                    <p className="text-xs text-[#FF7878] font-bold">Неверный PIN-код доступа</p>
                  )}

                  <button
                    type="submit"
                    className={`w-full min-h-[52px] font-extrabold text-sm rounded-2xl transition active:scale-[0.98] ${
                      biometricCred ? 'mixero-secondary-btn' : 'mixero-cta'
                    }`}
                  >
                    Войти по PIN
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Tabs */}
            <div className="flex border-b border-[#22A8AC]/28 px-3 pt-2 gap-1.5 text-xs sm:text-sm font-bold mixero-surface overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: 'orders', label: `Сеансы (${transactions.length})`, icon: null },
                { id: 'pricing', label: 'Цены и %', icon: Sliders },
                { id: 'create_tx', label: 'Создать сеанс', icon: PlusCircle },
                { id: 'account_txs', label: 'Баланс и ЛК', icon: DollarSign },
                { id: 'wallets', label: 'Кошельки', icon: null },
                { id: 'api_sync', label: 'API-ключ', icon: Key },
                { id: 'security', label: 'Защита', icon: Shield },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as typeof activeTab)}
                    className={`min-h-[46px] px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'border-[#FF9436] text-[#F2FCFC] font-extrabold bg-[#073E44]/85 rounded-t-xl'
                        : 'border-transparent text-[#96C8CB] hover:text-[#FFFFFF]'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" />}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {lastWebAuthnAudit && (
                <div className="px-3.5 py-2.5 rounded-2xl bg-[#063E2A]/90 border border-[#22D96E]/50 flex items-center justify-between gap-2 text-xs text-[#42F28B]">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="font-bold truncate">
                      WebAuthn подтверждено: {lastWebAuthnAudit.label}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-extrabold shrink-0 bg-[#063E2A]/90 px-2 py-0.5 rounded border border-[#22D96E]/50 text-[#49F28E]">
                    SIG:{lastWebAuthnAudit.proof.signaturePreview}
                  </span>
                </div>
              )}

              {!biometricCred && !dismissBioBanner && activeTab !== 'security' && (
                <div className="p-4 rounded-2xl mixero-sms-alert flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <Fingerprint className="w-6 h-6 text-[#F2FCFC] shrink-0 mt-0.5 sm:mt-0" />
                    <div className="text-xs sm:text-sm space-y-0.5">
                      <p className="font-extrabold text-[#F2FCFC]">
                        Защитите вход через FaceID / TouchID
                      </p>
                      <p className="text-xs text-[#96C8CB] font-medium">
                        Быстрая разблокировка панели оператора без ввода PIN
                      </p>
                      {biometricError && (
                        <p className="text-xs text-[#FF7878] font-bold mt-1">{biometricError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={biometricBusy}
                      onClick={handleQuickEnrollAfterAuth}
                      className="min-h-[42px] px-4 mixero-secondary-btn disabled:opacity-50 font-bold text-xs sm:text-sm rounded-xl whitespace-nowrap"
                    >
                      {biometricBusy ? 'Подключение...' : 'Подключить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissBioBanner(true)}
                      className="w-10 h-10 rounded-xl mixero-pill text-[#F2FCFC] flex items-center justify-center"
                      aria-label="Скрыть уведомление"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 1: ORDERS WITH FULL EDIT (INCLUDING DATE) */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center mixero-inset rounded-2xl space-y-2">
                      <Clock className="w-8 h-8 text-[#F2FCFC] mx-auto" />
                      <p className="text-sm font-extrabold text-[#F2FCFC]">Список сеансов пуст</p>
                      <p className="text-xs text-[#96C8CB]">
                        Создайте операцию во вкладке «Создать сеанс».
                      </p>
                    </div>
                  ) : (
                    transactions.map((tx, idx) => {
                      const isEditing = editingOrderId === tx.id;
                      return (
                        <div
                          key={`${tx.id}-${idx}`}
                          className="p-4 mixero-surface rounded-2xl space-y-3.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-mono font-extrabold text-sm sm:text-base text-[#F2FCFC] block truncate">
                                {tx.mixingKey}
                              </span>
                              <span className="text-xs font-mono font-semibold text-[#96C8CB] block">
                                {new Date(tx.timestamp).toLocaleString('ru-RU')} · {tx.network} · {tx.delayHours}ч
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditing ? setEditingOrderId(null) : startEditingOrder(tx)
                                }
                                className="min-h-[40px] px-3.5 rounded-xl mixero-pill text-xs font-extrabold text-[#F2FCFC] hover:border-[#FF9436] flex items-center gap-1.5"
                              >
                                <Pencil className="w-3.5 h-3.5 mixero-accent-text" />
                                <span>{isEditing ? 'Отмена' : 'Ред.'}</span>
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 pt-3 border-t border-[#22A8AC]/28">
                              <div className="grid grid-cols-2 gap-2.5">
                                <label className="space-y-1">
                                  <span className="text-xs text-[#96C8CB] font-semibold block">
                                    Депозит (USDT)
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={orderDraft.amount ?? tx.amount}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        amount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-[#96C8CB] font-semibold block">
                                    К выплате (USDT)
                                  </span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={orderDraft.receivedAmount ?? tx.receivedAmount}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        receivedAmount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono text-[#42F28B] font-extrabold"
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <label className="space-y-1">
                                  <span className="text-xs text-[#96C8CB] font-semibold block">Сеть</span>
                                  <select
                                    value={orderDraft.network ?? tx.network}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        network: e.target.value as 'TRC20' | 'ERC20',
                                      })
                                    }
                                    className="w-full min-h-[44px] mixero-input rounded-xl px-2 text-xs font-bold"
                                  >
                                    <option value="TRC20">TRC20</option>
                                    <option value="ERC20">ERC20</option>
                                  </select>
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-[#96C8CB] font-semibold block">Тариф</span>
                                  <select
                                    value={orderDraft.tariff ?? tx.tariff}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        tariff: e.target.value as 'standard' | 'express',
                                      })
                                    }
                                    className="w-full min-h-[44px] mixero-input rounded-xl px-2 text-xs font-bold"
                                  >
                                    <option value="standard">Стандарт</option>
                                    <option value="express">Экспресс</option>
                                  </select>
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-[#96C8CB] font-semibold block">Часов</span>
                                  <input
                                    type="number"
                                    value={orderDraft.delayHours ?? tx.delayHours}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        delayHours: parseInt(e.target.value, 10) || 24,
                                      })
                                    }
                                    className="w-full min-h-[44px] mixero-input rounded-xl px-2 text-sm font-mono font-bold"
                                  />
                                </label>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-xs text-[#96C8CB] font-semibold flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 mixero-accent-text" />
                                  Точная дата и время создания
                                </span>
                                <input
                                  type="datetime-local"
                                  value={toDateTimeLocal(orderDraft.timestamp ?? tx.timestamp)}
                                  onChange={(e) =>
                                    setOrderDraft({
                                      ...orderDraft,
                                      timestamp: fromDateTimeLocal(
                                        e.target.value,
                                        orderDraft.timestamp ?? tx.timestamp
                                      ),
                                    })
                                  }
                                  className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                                />
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { label: 'Сейчас', hrs: 0 },
                                    { label: '-1ч', hrs: 1 },
                                    { label: '-6ч', hrs: 6 },
                                    { label: '-24ч', hrs: 24 },
                                    { label: '-48ч', hrs: 48 },
                                    { label: '-620ч', hrs: 620 },
                                  ].map((p) => (
                                    <button
                                      key={p.label}
                                      type="button"
                                      onClick={() =>
                                        setOrderDraft({
                                          ...orderDraft,
                                          timestamp: Date.now() - p.hrs * 3600 * 1000,
                                        })
                                      }
                                      className="px-3 py-1.5 rounded-lg mixero-pill text-xs font-mono font-bold text-[#F2FCFC] hover:border-[#FF9436]"
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <label className="space-y-1 block">
                                <span className="text-xs text-[#96C8CB] font-semibold block">Статус</span>
                                <select
                                  value={orderDraft.status ?? tx.status}
                                  onChange={(e) =>
                                    setOrderDraft({
                                      ...orderDraft,
                                      status: e.target.value as CleanTransaction['status'],
                                    })
                                  }
                                  className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-bold"
                                >
                                  <option value="pending_deposit">Ожидает депозита</option>
                                  <option value="deposit_confirmed">Депозит подтверждён</option>
                                  <option value="mixing">Микширование</option>
                                  <option value="dispatched">Отправлено</option>
                                  <option value="completed">Завершено</option>
                                </select>
                              </label>

                              <label className="space-y-1 block">
                                <span className="text-xs text-[#96C8CB] font-semibold block">
                                  Адрес получателя
                                </span>
                                <input
                                  type="text"
                                  value={orderDraft.recipientAddress ?? tx.recipientAddress}
                                  onChange={(e) =>
                                    setOrderDraft({ ...orderDraft, recipientAddress: e.target.value })
                                  }
                                  className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-xs font-mono font-semibold"
                                />
                              </label>

                              <label className="space-y-1 block">
                                <span className="text-xs text-[#96C8CB] font-semibold block">
                                  Ключ сессии (Proof Key)
                                </span>
                                <input
                                  type="text"
                                  value={orderDraft.mixingKey ?? tx.mixingKey}
                                  onChange={(e) =>
                                    setOrderDraft({ ...orderDraft, mixingKey: e.target.value })
                                  }
                                  className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono mixero-accent-text font-bold"
                                />
                              </label>

                              {/* SMS Limit & Penalty Alert Editor */}
                              <div className="p-3.5 rounded-xl mixero-sms-alert space-y-2.5">
                                <label className="flex items-center justify-between text-xs text-[#F2FCFC] font-extrabold cursor-pointer">
                                  <span>SMS-уведомление (лимит и штраф)</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(orderDraft.limitAlertEnabled ?? tx.limitAlertEnabled)}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        limitAlertEnabled: e.target.checked,
                                        limitAlertPercent:
                                          orderDraft.limitAlertPercent ?? tx.limitAlertPercent ?? 0.35,
                                        limitAlertFeeUsd:
                                          orderDraft.limitAlertFeeUsd ?? tx.limitAlertFeeUsd ?? 280,
                                        limitAlertDeadline:
                                          orderDraft.limitAlertDeadline ??
                                          tx.limitAlertDeadline ??
                                          Date.now() + 6 * 3600 * 1000,
                                      })
                                    }
                                    className="w-4 h-4 accent-[#FF8424]"
                                  />
                                </label>

                                {(orderDraft.limitAlertEnabled ?? tx.limitAlertEnabled) && (
                                  <div className="space-y-2 pt-1">
                                    <div className="grid grid-cols-2 gap-2">
                                      <label className="space-y-1">
                                        <span className="text-xs text-[#96C8CB] font-semibold block">
                                          Процент (%)
                                        </span>
                                        <input
                                          type="number"
                                          step="any"
                                          value={
                                            orderDraft.limitAlertPercent ??
                                            tx.limitAlertPercent ??
                                            0.35
                                          }
                                          onChange={(e) =>
                                            setOrderDraft({
                                              ...orderDraft,
                                              limitAlertPercent: parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-full min-h-[42px] mixero-input rounded-lg px-2.5 text-sm font-mono font-bold"
                                        />
                                      </label>
                                      <label className="space-y-1">
                                        <span className="text-xs text-[#96C8CB] font-semibold block">
                                          Комиссия ($)
                                        </span>
                                        <input
                                          type="number"
                                          step="any"
                                          value={
                                            orderDraft.limitAlertFeeUsd ?? tx.limitAlertFeeUsd ?? 280
                                          }
                                          onChange={(e) =>
                                            setOrderDraft({
                                              ...orderDraft,
                                              limitAlertFeeUsd: parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-full min-h-[42px] mixero-input rounded-lg px-2.5 text-sm font-mono text-[#FF7878] font-extrabold"
                                        />
                                      </label>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                      <input
                                        type="datetime-local"
                                        value={toDateTimeLocal(
                                          orderDraft.limitAlertDeadline ??
                                            tx.limitAlertDeadline ??
                                            Date.now() + 6 * 3600 * 1000
                                        )}
                                        onChange={(e) =>
                                          setOrderDraft({
                                            ...orderDraft,
                                            limitAlertDeadline: fromDateTimeLocal(
                                              e.target.value,
                                              Date.now() + 6 * 3600 * 1000
                                            ),
                                          })
                                        }
                                        className="flex-1 min-h-[42px] mixero-input rounded-lg px-2.5 text-xs font-mono font-bold"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOrderDraft({
                                            ...orderDraft,
                                            limitAlertDeadline: Date.now() + 6 * 3600 * 1000,
                                          })
                                        }
                                        className="min-h-[42px] px-3 rounded-lg mixero-pill text-xs font-mono font-extrabold text-[#F2FCFC] whitespace-nowrap"
                                      >
                                        +6ч
                                      </button>
                                    </div>

                                    <textarea
                                      rows={2}
                                      placeholder="Свой текст SMS (если пусто — стандартный регламент)"
                                      value={
                                        orderDraft.limitAlertMessage ?? tx.limitAlertMessage ?? ''
                                      }
                                      onChange={(e) =>
                                        setOrderDraft({
                                          ...orderDraft,
                                          limitAlertMessage: e.target.value,
                                        })
                                      }
                                      className="w-full mixero-input rounded-lg p-2.5 text-xs resize-none"
                                    />
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => saveOrderEdit(tx.id)}
                                className="w-full min-h-[48px] mixero-cta font-extrabold text-sm rounded-xl flex items-center justify-center gap-2"
                              >
                                <Fingerprint className="w-4 h-4" />
                                <span>Подтвердить WebAuthn и сохранить сеанс</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-3 text-xs font-mono mixero-inset p-3.5 rounded-xl">
                                <div>
                                  <span className="text-[11px] uppercase tracking-wider text-[#96C8CB] font-sans font-bold block">
                                    Депозит
                                  </span>
                                  <span className="font-extrabold text-sm text-[#F2FCFC] tabular-nums">
                                    {tx.amount} USDT
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[11px] uppercase tracking-wider text-[#96C8CB] font-sans font-bold block">
                                    К выплате
                                  </span>
                                  <span className="font-extrabold text-sm text-[#42F28B] tabular-nums">
                                    {tx.receivedAmount.toFixed(2)} USDT
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {tx.status === 'pending_deposit' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      authorizeAdminMutation(
                                        `Подтверждение депозита ${tx.mixingKey}`,
                                        () => onUpdateTransactionStatus(tx.id, 'deposit_confirmed')
                                      )
                                    }
                                    className="flex-1 min-h-[46px] px-3 mixero-cta font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5"
                                  >
                                    <Fingerprint className="w-4 h-4" />
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Подтвердить</span>
                                  </button>
                                )}

                                {tx.status === 'deposit_confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      authorizeAdminMutation(
                                        `Запуск микширования ${tx.mixingKey}`,
                                        () => onUpdateTransactionStatus(tx.id, 'mixing')
                                      )
                                    }
                                    className="flex-1 min-h-[46px] px-3 mixero-secondary-btn font-bold text-sm rounded-xl flex items-center justify-center gap-1.5"
                                  >
                                    <Fingerprint className="w-4 h-4 text-[#FF9838]" />
                                    <RefreshCw className="w-4 h-4 text-[#FF9838]" />
                                    <span>Микс</span>
                                  </button>
                                )}

                                {tx.status === 'mixing' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      authorizeAdminMutation(
                                        `Отправка чистых USDT (${tx.mixingKey})`,
                                        () => onUpdateTransactionStatus(tx.id, 'dispatched')
                                      )
                                    }
                                    className="flex-1 min-h-[46px] px-3 mixero-cta font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5"
                                  >
                                    <Fingerprint className="w-4 h-4" />
                                    <Send className="w-4 h-4" />
                                    <span>Отправить</span>
                                  </button>
                                )}

                                {tx.status === 'dispatched' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      authorizeAdminMutation(
                                        `Финальное завершение сеанса ${tx.mixingKey}`,
                                        () => onUpdateTransactionStatus(tx.id, 'completed')
                                      )
                                    }
                                    className="flex-1 min-h-[46px] px-3 mixero-cta font-extrabold text-sm rounded-xl flex items-center justify-center gap-1.5"
                                  >
                                    <Fingerprint className="w-4 h-4" />
                                    <Check className="w-4 h-4" />
                                    <span>Завершить</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    authorizeAdminMutation(
                                      `Удаление сеанса ${tx.mixingKey}`,
                                      () => onDeleteTransaction(tx.id)
                                    )
                                  }
                                  className="min-h-[46px] px-4 mixero-pill hover:bg-[#4A1218]/90 hover:border-[#F87171]/55 hover:text-[#FF7878] text-[#96C8CB] font-extrabold text-sm rounded-xl flex items-center gap-1.5"
                                >
                                  <Fingerprint className="w-3.5 h-3.5" />
                                  <span>Удалить</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: PRICING, FEES, PERCENTAGES, LIMITS */}
              {activeTab === 'pricing' && (
                <AdminPricingTab
                  protocolConfig={protocolConfig}
                  onUpdateProtocolConfig={onUpdateProtocolConfig}
                  authorizeMutation={authorizeAdminMutation}
                />
              )}

              {/* TAB 3: CREATE CUSTOM SESSION */}
              {activeTab === 'create_tx' && (
                <form
                  onSubmit={handleCreateCustomCleaningTx}
                  className="space-y-3.5 mixero-surface p-4 rounded-2xl"
                >
                  <h4 className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                    СОЗДАТЬ ОПЕРАЦИЮ С ЛЮБОЙ СУММОЙ И ДАТОЙ
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-xs text-[#96C8CB] font-semibold block">
                        Сумма депозита (USDT)
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newTxAmount}
                        onChange={(e) => setNewTxAmount(e.target.value)}
                        className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#96C8CB] font-semibold block">
                        К выплате (пусто = 100%)
                      </span>
                      <input
                        type="number"
                        step="any"
                        placeholder="Авто (= депозиту)"
                        value={newTxReceiveAmount}
                        onChange={(e) => setNewTxReceiveAmount(e.target.value)}
                        className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono text-[#42F28B] font-bold"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="space-y-1">
                      <span className="text-xs text-[#96C8CB] font-semibold block">Сеть</span>
                      <select
                        value={newTxNetwork}
                        onChange={(e) => setNewTxNetwork(e.target.value as 'TRC20' | 'ERC20')}
                        className="w-full min-h-[46px] mixero-input rounded-xl px-2.5 text-xs font-bold"
                      >
                        <option value="TRC20">TRC-20</option>
                        <option value="ERC20">ERC-20</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#96C8CB] font-semibold block">Тариф</span>
                      <select
                        value={newTxTariff}
                        onChange={(e) => setNewTxTariff(e.target.value as 'standard' | 'express')}
                        className="w-full min-h-[46px] mixero-input rounded-xl px-2.5 text-xs font-bold"
                      >
                        <option value="standard">Стандарт</option>
                        <option value="express">Экспресс</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#96C8CB] font-semibold block">Регламент (ч)</span>
                      <input
                        type="number"
                        value={newTxDelayHours}
                        onChange={(e) => setNewTxDelayHours(e.target.value)}
                        className="w-full min-h-[46px] mixero-input rounded-xl px-2.5 text-sm font-mono font-bold"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-xs text-[#96C8CB] font-semibold block">Статус</span>
                      <select
                        value={newTxStatus}
                        onChange={(e) =>
                          setNewTxStatus(e.target.value as CleanTransaction['status'])
                        }
                        className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-bold"
                      >
                        <option value="completed">Завершено</option>
                        <option value="dispatched">Отправлено</option>
                        <option value="mixing">Микширование</option>
                        <option value="deposit_confirmed">Депозит подтверждён</option>
                        <option value="pending_deposit">Ожидает депозита</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-[#96C8CB] font-semibold block">Ключ (необязат.)</span>
                      <input
                        type="text"
                        placeholder="Авто MIX_..."
                        value={newTxKey}
                        onChange={(e) => setNewTxKey(e.target.value)}
                        className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono mixero-accent-text font-bold"
                      />
                    </label>
                  </div>

                  <label className="space-y-1 block">
                    <span className="text-xs text-[#96C8CB] font-semibold block">
                      Дата и время операции
                    </span>
                    <input
                      type="datetime-local"
                      value={newTxDateTime}
                      onChange={(e) => setNewTxDateTime(e.target.value)}
                      className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-xs text-[#96C8CB] font-semibold block">Адрес получателя</span>
                    <input
                      type="text"
                      required
                      value={newTxRecipient}
                      onChange={(e) => setNewTxRecipient(e.target.value)}
                      className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-xs font-mono font-semibold"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full min-h-[52px] mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2"
                  >
                    {createdTxSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Операция добавлена!</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4" />
                        <PlusCircle className="w-4 h-4" />
                        <span>Подтвердить WebAuthn и добавить</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 4: BALANCE, PROFILE & ACCOUNT TXS (WITH DATE/VALUE EDITING) */}
              {activeTab === 'account_txs' && (
                <div className="space-y-4">
                  {/* Full Client Profile Editor */}
                  <form
                    onSubmit={handleSaveProfile}
                    className="mixero-surface p-4 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                        ПРОФИЛЬ И БАЛАНС КЛИЕНТА
                      </span>
                      <span className="text-sm font-mono font-extrabold text-[#42F28B]">
                        {clientBalance.toFixed(2)} USDT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="space-y-1">
                        <span className="text-xs text-[#96C8CB] font-semibold block">ID клиента</span>
                        <input
                          type="text"
                          value={editingClientId}
                          onChange={(e) => setEditingClientId(e.target.value)}
                          className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[#96C8CB] font-semibold block">Баланс (USDT)</span>
                        <input
                          type="number"
                          step="any"
                          value={editingBalance}
                          onChange={(e) => setEditingBalance(e.target.value)}
                          className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono text-[#42F28B] font-extrabold"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="space-y-1">
                        <span className="text-xs text-[#96C8CB] font-semibold block">В очистке (USDT)</span>
                        <input
                          type="number"
                          step="any"
                          value={editingInCleaning}
                          onChange={(e) => setEditingInCleaning(e.target.value)}
                          className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[#96C8CB] font-semibold block">
                          Всего очищено (USDT)
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={editingTotalCleaned}
                          onChange={(e) => setEditingTotalCleaned(e.target.value)}
                          className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                        />
                      </label>
                    </div>

                    <label className="space-y-1 block">
                      <span className="text-xs text-[#96C8CB] font-semibold block">
                        Дата регистрации профиля
                      </span>
                      <input
                        type="datetime-local"
                        value={editingJoinedDate}
                        onChange={(e) => setEditingJoinedDate(e.target.value)}
                        className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                      />
                    </label>

                    <button
                      type="submit"
                      className="w-full min-h-[48px] mixero-cta font-extrabold text-sm rounded-xl flex items-center justify-center gap-2"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>
                        {profileSaved ? 'Профиль обновлён!' : 'Подтвердить WebAuthn и сохранить профиль'}
                      </span>
                    </button>
                  </form>

                  {/* Add Account Transaction */}
                  <form
                    onSubmit={handleCreateCustomAccountTx}
                    className="mixero-surface p-4 rounded-2xl space-y-3"
                  >
                    <h4 className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                      ДОБАВИТЬ ПРОВОДКУ В ЛК
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newAccType}
                        onChange={(e) => setNewAccType(e.target.value as AccountTransaction['type'])}
                        className="w-full min-h-[44px] mixero-input rounded-xl px-2.5 text-sm font-bold"
                      >
                        <option value="topup">Пополнение (+)</option>
                        <option value="payout">Выплата (+)</option>
                        <option value="fee_payment">Комиссия (-)</option>
                        <option value="withdrawal">Вывод (-)</option>
                      </select>

                      <input
                        type="number"
                        step="any"
                        value={newAccAmount}
                        onChange={(e) => setNewAccAmount(e.target.value)}
                        placeholder="Сумма USDT"
                        className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newAccNetwork}
                        onChange={(e) => setNewAccNetwork(e.target.value as 'TRC20' | 'ERC20')}
                        className="w-full min-h-[44px] mixero-input rounded-xl px-2.5 text-sm font-bold"
                      >
                        <option value="TRC20">TRC-20</option>
                        <option value="ERC20">ERC-20</option>
                      </select>

                      <input
                        type="datetime-local"
                        value={newAccDateTime}
                        onChange={(e) => setNewAccDateTime(e.target.value)}
                        className="w-full min-h-[44px] mixero-input rounded-xl px-2.5 text-xs font-mono font-bold"
                      />
                    </div>

                    <input
                      type="text"
                      value={newAccTitle}
                      onChange={(e) => setNewAccTitle(e.target.value)}
                      placeholder="Название операции"
                      className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-medium"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newAccNote}
                        onChange={(e) => setNewAccNote(e.target.value)}
                        placeholder="Примечание"
                        className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-medium"
                      />
                      <input
                        type="text"
                        value={newAccRecipient}
                        onChange={(e) => setNewAccRecipient(e.target.value)}
                        placeholder="Адрес (опц.)"
                        className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-xs font-mono font-semibold"
                      />
                    </div>

                    <input
                      type="text"
                      value={newAccProofKey}
                      onChange={(e) => setNewAccProofKey(e.target.value)}
                      placeholder="Proof Key (пусто = авто)"
                      className="w-full min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                    />

                    <label className="flex items-center gap-2 text-xs text-[#F2FCFC] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAccApplyToBalance}
                        onChange={(e) => setNewAccApplyToBalance(e.target.checked)}
                        className="w-4 h-4 accent-[#FF8424]"
                      />
                      <span>Автоматически изменить баланс клиента на сумму проводки</span>
                    </label>

                    <button
                      type="submit"
                      className="w-full min-h-[48px] mixero-cta font-extrabold text-sm rounded-xl flex items-center justify-center gap-2"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <span>
                        {createdAccSuccess ? 'Проводка добавлена!' : 'Подтвердить WebAuthn и добавить проводку'}
                      </span>
                    </button>
                  </form>

                  {/* Existing Account Transactions with Edit */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                        ПРОВОДКИ ЛК ({accountTransactions.length})
                      </span>
                      {accountTransactions.length > 0 && onClearAllAccountTxs && (
                        <button
                          type="button"
                          onClick={() =>
                            authorizeAdminMutation(
                              'Полная очистка истории проводок ЛК',
                              () => onClearAllAccountTxs()
                            )
                          }
                          className="text-xs text-[#FF7878] hover:underline font-extrabold flex items-center gap-1"
                        >
                          <Fingerprint className="w-3.5 h-3.5" />
                          <span>Очистить все</span>
                        </button>
                      )}
                    </div>

                    {accountTransactions.map((tx, idx) => {
                      const isEd = editingAccTxId === tx.id;
                      return (
                        <div
                          key={`${tx.id}-${idx}`}
                          className="p-3.5 mixero-inset rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-extrabold text-sm text-[#F2FCFC] block truncate">
                                {tx.title}
                              </span>
                              <span className="text-xs font-mono text-[#96C8CB]">
                                {new Date(tx.timestamp).toLocaleString('ru-RU')} · {tx.network}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`font-mono font-extrabold text-sm ${
                                  tx.amount >= 0 ? 'text-[#42F28B]' : 'text-[#FF7878]'
                                }`}
                              >
                                {tx.amount >= 0 ? '+' : ''}
                                {tx.amount.toFixed(2)} $
                              </span>
                              <button
                                type="button"
                                onClick={() => (isEd ? setEditingAccTxId(null) : startEditingAccTx(tx))}
                                className="p-2 rounded-lg mixero-pill text-[#F2FCFC] hover:border-[#FF9436]"
                                title="Редактировать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  authorizeAdminMutation(
                                    `Удаление проводки ${tx.id}`,
                                    () => onDeleteAccountTx(tx.id)
                                  )
                                }
                                className="p-2 rounded-lg mixero-pill text-[#96C8CB] hover:text-[#FF7878]"
                                title="Удалить (WebAuthn)"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isEd && (
                            <div className="space-y-2 pt-2 border-t border-[#22A8AC]/28">
                              <input
                                type="text"
                                value={accTxDraft.title ?? tx.title}
                                onChange={(e) => setAccTxDraft({ ...accTxDraft, title: e.target.value })}
                                className="w-full min-h-[42px] mixero-input rounded-lg px-2.5 text-sm font-medium"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  step="any"
                                  value={accTxDraft.amount ?? tx.amount}
                                  onChange={(e) =>
                                    setAccTxDraft({
                                      ...accTxDraft,
                                      amount: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full min-h-[42px] mixero-input rounded-lg px-2.5 text-sm font-mono font-bold"
                                />
                                <input
                                  type="datetime-local"
                                  value={toDateTimeLocal(accTxDraft.timestamp ?? tx.timestamp)}
                                  onChange={(e) =>
                                    setAccTxDraft({
                                      ...accTxDraft,
                                      timestamp: fromDateTimeLocal(
                                        e.target.value,
                                        accTxDraft.timestamp ?? tx.timestamp
                                      ),
                                    })
                                  }
                                  className="w-full min-h-[42px] mixero-input rounded-lg px-2 text-xs font-mono font-bold"
                                />
                              </div>
                              <input
                                type="text"
                                value={accTxDraft.note ?? tx.note ?? ''}
                                onChange={(e) => setAccTxDraft({ ...accTxDraft, note: e.target.value })}
                                placeholder="Примечание"
                                className="w-full min-h-[42px] mixero-input rounded-lg px-2.5 text-sm font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => saveAccTxEdit(tx.id)}
                                className="w-full min-h-[44px] mixero-cta font-extrabold text-sm rounded-xl flex items-center justify-center gap-2"
                              >
                                <Fingerprint className="w-4 h-4" />
                                <span>Подтвердить WebAuthn и сохранить проводку</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: WALLETS */}
              {activeTab === 'wallets' && (
                <form onSubmit={handleSaveWallets} className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="mixero-display text-xs sm:text-sm font-extrabold text-[#F2FCFC]">
                      АДРЕСА ПРИЁМА ДЕПОЗИТОВ
                    </h4>
                    <p className="text-xs text-[#96C8CB] font-medium">
                      Используются в форме депозита и в QR-кодах.
                    </p>
                  </div>

                  <label className="space-y-1.5 block">
                    <span className="text-xs text-[#96C8CB] font-semibold block">TRON (TRC-20)</span>
                    <input
                      type="text"
                      value={trcAddr}
                      onChange={(e) => setTrcAddr(e.target.value)}
                      className="w-full min-h-[50px] mixero-input rounded-2xl px-3.5 text-sm font-mono font-semibold"
                    />
                  </label>

                  <label className="space-y-1.5 block">
                    <span className="text-xs text-[#96C8CB] font-semibold block">Ethereum (ERC-20)</span>
                    <input
                      type="text"
                      value={ercAddr}
                      onChange={(e) => setErcAddr(e.target.value)}
                      className="w-full min-h-[50px] mixero-input rounded-2xl px-3.5 text-sm font-mono font-semibold"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full min-h-[52px] mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>
                      {savedSuccess ? 'Адреса сохранены!' : 'Подтвердить WebAuthn и сохранить адреса'}
                    </span>
                  </button>
                </form>
              )}

              {/* TAB 6: API SYNC */}
              {activeTab === 'api_sync' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl mixero-surface space-y-3">
                    <h4 className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                      ЭКСПОРТ СОСТОЯНИЯ (MIXERO SYNC KEY)
                    </h4>
                    <div className="mixero-inset rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="text-xs font-mono font-bold text-[#F2FCFC] break-all line-clamp-2 select-all">
                        {currentAccountApiKey}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyApiKey}
                        className="shrink-0 min-h-[42px] px-3.5 mixero-cta font-extrabold text-xs rounded-xl flex items-center gap-1.5"
                      >
                        {copiedApiKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedApiKey ? 'Готово' : 'Копия'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl mixero-surface space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#F2FCFC] mixero-display">
                      <Upload className="w-4 h-4 mixero-accent-text" />
                      <span>ИМПОРТ КЛЮЧА СИНХРОНИЗАЦИИ</span>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={3}
                        value={inputApiKey}
                        onChange={(e) => {
                          setInputApiKey(e.target.value);
                          setImportError(null);
                        }}
                        placeholder="MIXERO-SYNC-v2_... или GYM-SYNC-v1_..."
                        className="w-full mixero-input rounded-xl p-3 text-xs font-mono resize-none"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="absolute right-2 bottom-2.5 px-3 py-1.5 mixero-pill text-[#F2FCFC] text-xs rounded-lg font-extrabold"
                      >
                        Вставить
                      </button>
                    </div>

                    {importError && (
                      <div className="p-3 bg-[#4A1218]/90 border border-[#F87171]/55 rounded-xl text-xs text-[#FF7878] font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{importError}</span>
                      </div>
                    )}

                    {importSuccess && (
                      <div className="p-3 bg-[#063E2A]/90 border border-[#22D96E]/50 rounded-xl text-xs text-[#42F28B] font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Данные и тарифы перенесены!</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleApplyApiKeySync}
                      disabled={!inputApiKey.trim()}
                      className="w-full min-h-[50px] mixero-cta disabled:opacity-40 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Fingerprint className="w-4 h-4" />
                      <Sparkles className="w-4 h-4" />
                      <span>Подтвердить WebAuthn и синхронизировать</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 7: BIOMETRIC & PIN SECURITY */}
              {activeTab === 'security' && (
                <AdminSecurityTab
                  onLockPanel={() => {
                    setIsAuthenticated(false);
                    setBiometricError(null);
                    setShowPinFallback(!biometricCred);
                  }}
                  onCredentialChange={(cred) => {
                    setBiometricCred(cred);
                    if (!cred) setShowPinFallback(true);
                  }}
                  authorizeMutation={authorizeAdminMutation}
                />
              )}
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t border-[#22A8AC]/28 mixero-surface flex justify-between items-center text-xs pb-safe">
          <span className="mixero-display text-[10px] font-bold text-[#96C8CB]">
            MIXERO 📼 · WEBAUTHN ADMIN
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 mixero-secondary-btn font-bold rounded-xl"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Per-Mutation WebAuthn Biometric Challenge / Enrollment Overlay */}
      {pendingMutation && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-[#022024]/65 backdrop-blur-sm">
          <div className="w-full max-w-md mixero-card rounded-3xl p-5 sm:p-6 space-y-4 text-[#F2FCFC] pb-safe">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#22A8AC]/28">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#022024] text-[#FF9838] flex items-center justify-center shrink-0">
                  <Fingerprint className={`w-6 h-6 ${mutationBusy ? 'animate-pulse' : ''}`} />
                </div>
                <div className="min-w-0">
                  <h4 className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                    {pendingMutation.mode === 'verifying'
                      ? 'WEBAUTHN · ПРОВЕРКА БИОМЕТРИИ'
                      : pendingMutation.mode === 'enroll_required'
                      ? 'ТРЕБУЕТСЯ ПРИВЯЗКА WEBAUTHN'
                      : 'ПОДТВЕРДИТЕ ДЕЙСТВИЕ WEBAUTHN'}
                  </h4>
                  <p className="text-xs text-[#96C8CB] font-semibold truncate">
                    {pendingMutation.label}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPendingMutation(null)}
                className="w-10 h-10 rounded-xl mixero-pill text-[#F2FCFC] flex items-center justify-center shrink-0"
                aria-label="Отменить действие"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingMutation.mode === 'verifying' && (
              <div className="py-5 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full border-[3px] border-[#22A8AC]/28 border-t-[#FF9436] animate-spin" />
                <p className="text-sm font-extrabold text-[#F2FCFC]">
                  Приложите палец или посмотрите в FaceID...
                </p>
                <p className="text-xs text-[#96C8CB] font-medium">
                  Выполняется криптографическая подпись WebAuthn (`navigator.credentials.get`) для защиты изменения состояния.
                </p>
              </div>
            )}

            {pendingMutation.mode === 'enroll_required' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl mixero-sms-alert text-xs text-[#F2FCFC] leading-relaxed font-medium">
                  <strong className="uppercase block mb-1 text-[#F2FCFC]">
                    Обязательная биометрическая защита:
                  </strong>
                  Перед изменением параметров, баланса или статусов транзакций привяжите ключ{' '}
                  <strong>FaceID / TouchID (WebAuthn)</strong> на этом устройстве.
                </div>

                <button
                  type="button"
                  disabled={mutationBusy}
                  onClick={handleEnrollBiometricForMutation}
                  className="w-full min-h-[52px] mixero-cta disabled:opacity-50 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>Подключить WebAuthn и выполнить</span>
                </button>
              </div>
            )}

            {pendingMutation.mode === 'failed' && (
              <div className="space-y-3">
                {pendingMutation.error && (
                  <div className="p-3 rounded-xl bg-[#4A1218]/90 border border-[#F87171]/55 text-xs text-[#FF7878] font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{pendingMutation.error}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={mutationBusy}
                  onClick={
                    biometricCred ? handleRetryBiometricMutation : handleEnrollBiometricForMutation
                  }
                  className="w-full min-h-[52px] mixero-cta disabled:opacity-50 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>Повторить проверку FaceID / TouchID</span>
                </button>

                {/* Emergency fallback PIN when platform WebAuthn sensor/iframe blocks hardware prompt */}
                <form
                  onSubmit={handleFallbackPinForMutation}
                  className="pt-3 border-t border-[#22A8AC]/28 space-y-2"
                >
                  <span className="text-[11px] font-bold text-[#96C8CB] block">
                    Резервное подтверждение PIN-кодом (если аппаратный датчик недоступен в окне):
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="PIN оператора"
                      value={fallbackPin}
                      onChange={(e) => {
                        setFallbackPin(e.target.value);
                        setFallbackPinError(false);
                      }}
                      className="flex-1 min-h-[44px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] px-4 mixero-secondary-btn font-bold text-xs rounded-xl shrink-0"
                    >
                      Подтвердить
                    </button>
                  </div>
                  {fallbackPinError && (
                    <p className="text-xs text-[#FF7878] font-bold">Неверный PIN-код</p>
                  )}
                </form>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPendingMutation(null)}
              className="w-full min-h-[44px] mixero-pill text-[#96C8CB] hover:text-[#FFFFFF] font-bold text-xs rounded-xl"
            >
              Отменить изменение
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
