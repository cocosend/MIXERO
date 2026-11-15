import React, { useState, useMemo } from 'react';
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
  getStoredBiometricCredential,
  authenticateBiometricAdmin,
  registerBiometricAdmin,
  verifyAdminPin,
} from '../utils/webauthn';
import { triggerHaptic } from '../utils/haptics';

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

    if (onImportSyncPayload) onImportSyncPayload(result.data);
    if (result.data.customAddresses) {
      setTrcAddr(result.data.customAddresses.trc20 || customAddresses.trc20);
      setErcAddr(result.data.customAddresses.erc20 || customAddresses.erc20);
    }
    if (result.data.profile) {
      setEditingBalance(result.data.profile.balance.toString());
      setEditingClientId(result.data.profile.clientId);
      setEditingInCleaning(result.data.profile.inCleaning.toString());
      setEditingTotalCleaned(result.data.profile.totalCleaned.toString());
    }
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 4000);
  };

  const handleSaveWallets = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAddresses({ trc20: trcAddr.trim(), erc20: ercAddr.trim() });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(editingBalance);
    const inClean = parseFloat(editingInCleaning);
    const totClean = parseFloat(editingTotalCleaned);

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
      delayHours: parseInt(newTxDelayHours, 10) || (newTxTariff === 'express' ? protocolConfig.expressDelayHours : protocolConfig.standardMinHours),
      timestamp: fromDateTimeLocal(newTxDateTime, Date.now()),
      status: newTxStatus,
    };

    onAddCustomTransaction(newTx);
    setCreatedTxSuccess(true);
    setTimeout(() => setCreatedTxSuccess(false), 2000);
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
      amount: newAccType === 'fee_payment' || newAccType === 'withdrawal' ? -Math.abs(amt) : Math.abs(amt),
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

    onAddCustomAccountTx(newTx, delta);
    setCreatedAccSuccess(true);
    setTimeout(() => setCreatedAccSuccess(false), 2000);
  };

  const startEditingOrder = (tx: CleanTransaction) => {
    setEditingOrderId(tx.id);
    setOrderDraft({ ...tx });
  };

  const saveOrderEdit = (id: string) => {
    onUpdateTransaction(id, orderDraft);
    setEditingOrderId(null);
    setOrderDraft({});
  };

  const startEditingAccTx = (tx: AccountTransaction) => {
    setEditingAccTxId(tx.id);
    setAccTxDraft({ ...tx });
  };

  const saveAccTxEdit = (id: string) => {
    onUpdateAccountTx(id, accTxDraft);
    setEditingAccTxId(null);
    setAccTxDraft({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-2xl mixero-card rounded-3xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#080c12]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl mixero-cta flex items-center justify-center font-black">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                MIXERO 📼 · Панель оператора
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Цены, проценты, даты, операции и баланс
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setIsAuthenticated(false);
                  setBiometricError(null);
                  setShowPinFallback(!biometricCred);
                }}
                className="w-11 h-11 rounded-2xl text-slate-300 hover:text-amber-300 bg-[#101621] border border-white/10 flex items-center justify-center transition"
                aria-label="Заблокировать панель"
                title="Заблокировать панель"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-2xl text-slate-400 hover:text-white bg-[#101621] border border-white/10 flex items-center justify-center transition"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 space-y-5 my-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#080c12] border border-teal-400/25 flex items-center justify-center text-teal-300 mx-auto">
              {biometricCred ? (
                <Fingerprint className="w-8 h-8" />
              ) : (
                <Key className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Авторизация оператора</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
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
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 text-left flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-300 mt-0.5" />
                      <span>{biometricError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPinFallback((prev) => !prev)}
                    className="w-full min-h-[44px] text-xs font-semibold text-slate-400 hover:text-white transition"
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
                    className="w-full min-h-[52px] text-center tracking-widest text-lg font-mono font-bold px-4 bg-[#080c12] border border-white/15 rounded-2xl focus:outline-none focus:border-teal-400 text-white"
                  />

                  {pinError && (
                    <p className="text-xs text-rose-400 font-medium">Неверный PIN-код доступа</p>
                  )}

                  <button
                    type="submit"
                    className={`w-full min-h-[52px] font-extrabold text-sm rounded-2xl transition active:scale-[0.98] ${
                      biometricCred
                        ? 'bg-[#131b26] hover:bg-[#192434] border border-white/15 text-white'
                        : 'mixero-cta'
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
            <div className="flex border-b border-white/[0.08] px-3 pt-2 gap-1 text-xs font-semibold bg-[#080c12] overflow-x-auto no-scrollbar shrink-0">
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
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`min-h-[44px] px-3 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                      activeTab === t.id
                        ? 'border-teal-400 text-teal-300 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {!biometricCred && !dismissBioBanner && activeTab !== 'security' && (
                <div className="p-3.5 rounded-2xl bg-[#0b131e] border border-sky-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <Fingerprint className="w-5 h-5 text-sky-300 shrink-0 mt-0.5 sm:mt-0" />
                    <div className="text-xs">
                      <p className="font-bold text-white">Защитите вход через FaceID / TouchID</p>
                      <p className="text-slate-400">
                        Быстрая разблокировка панели оператора без ввода PIN
                      </p>
                      {biometricError && (
                        <p className="text-rose-300 mt-1">{biometricError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={biometricBusy}
                      onClick={handleQuickEnrollAfterAuth}
                      className="min-h-[40px] px-3.5 mixero-cta disabled:opacity-50 font-bold text-xs rounded-xl whitespace-nowrap"
                    >
                      {biometricBusy ? 'Подключение...' : 'Подключить'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissBioBanner(true)}
                      className="w-10 h-10 rounded-xl bg-[#111926] border border-white/10 text-slate-400 hover:text-white flex items-center justify-center"
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
                    <div className="p-8 text-center bg-[#080c12] border border-white/10 rounded-2xl space-y-2">
                      <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-sm font-bold text-white">Список сеансов пуст</p>
                      <p className="text-xs text-slate-400">
                        Создайте операцию во вкладке «Создать сеанс».
                      </p>
                    </div>
                  ) : (
                    transactions.map((tx, idx) => {
                      const isEditing = editingOrderId === tx.id;
                      return (
                        <div
                          key={`${tx.id}-${idx}`}
                          className="p-4 bg-[#0d131d] border border-white/10 rounded-2xl space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-sm text-white block">
                                {tx.mixingKey}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {new Date(tx.timestamp).toLocaleString('ru-RU')} · {tx.network} · {tx.delayHours}ч
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditing ? setEditingOrderId(null) : startEditingOrder(tx)
                                }
                                className="min-h-[38px] px-3 rounded-xl bg-[#15202e] border border-white/10 text-xs font-semibold text-sky-300 flex items-center gap-1"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>{isEditing ? 'Отмена' : 'Ред.'}</span>
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 pt-2 border-t border-white/10">
                              <div className="grid grid-cols-2 gap-2">
                                <label className="space-y-1">
                                  <span className="text-[11px] text-slate-400 block">Депозит (USDT)</span>
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
                                    className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-[11px] text-slate-400 block">К выплате (USDT)</span>
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
                                    className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-teal-300"
                                  />
                                </label>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <label className="space-y-1">
                                  <span className="text-[11px] text-slate-400 block">Сеть</span>
                                  <select
                                    value={orderDraft.network ?? tx.network}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        network: e.target.value as 'TRC20' | 'ERC20',
                                      })
                                    }
                                    className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-2 text-xs text-white"
                                  >
                                    <option value="TRC20">TRC20</option>
                                    <option value="ERC20">ERC20</option>
                                  </select>
                                </label>
                                <label className="space-y-1">
                                  <span className="text-[11px] text-slate-400 block">Тариф</span>
                                  <select
                                    value={orderDraft.tariff ?? tx.tariff}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        tariff: e.target.value as 'standard' | 'express',
                                      })
                                    }
                                    className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-2 text-xs text-white"
                                  >
                                    <option value="standard">Стандарт</option>
                                    <option value="express">Экспресс</option>
                                  </select>
                                </label>
                                <label className="space-y-1">
                                  <span className="text-[11px] text-slate-400 block">Часов</span>
                                  <input
                                    type="number"
                                    value={orderDraft.delayHours ?? tx.delayHours}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        delayHours: parseInt(e.target.value, 10) || 24,
                                      })
                                    }
                                    className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-2 text-xs font-mono text-white"
                                  />
                                </label>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-amber-300" />
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
                                  className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
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
                                      className="px-2.5 py-1.5 rounded-lg bg-[#15202e] text-[11px] font-mono text-slate-200 hover:text-fuchsia-300"
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <label className="space-y-1 block">
                                <span className="text-[11px] text-slate-400 block">Статус</span>
                                <select
                                  value={orderDraft.status ?? tx.status}
                                  onChange={(e) =>
                                    setOrderDraft({
                                      ...orderDraft,
                                      status: e.target.value as CleanTransaction['status'],
                                    })
                                  }
                                  className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs text-white"
                                >
                                  <option value="pending_deposit">Ожидает депозита</option>
                                  <option value="deposit_confirmed">Депозит подтвержден</option>
                                  <option value="mixing">Микширование</option>
                                  <option value="dispatched">Отправлено</option>
                                  <option value="completed">Завершено</option>
                                </select>
                              </label>

                              <label className="space-y-1 block">
                                <span className="text-[11px] text-slate-400 block">Адрес получателя</span>
                                <input
                                  type="text"
                                  value={orderDraft.recipientAddress ?? tx.recipientAddress}
                                  onChange={(e) =>
                                    setOrderDraft({ ...orderDraft, recipientAddress: e.target.value })
                                  }
                                  className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                                />
                              </label>

                              <label className="space-y-1 block">
                                <span className="text-[11px] text-slate-400 block">Ключ сессии (Proof Key)</span>
                                <input
                                  type="text"
                                  value={orderDraft.mixingKey ?? tx.mixingKey}
                                  onChange={(e) =>
                                    setOrderDraft({ ...orderDraft, mixingKey: e.target.value })
                                  }
                                  className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-amber-300"
                                />
                              </label>

                              {/* SMS Limit & Penalty Alert Editor */}
                              <div className="p-3 rounded-xl bg-[#070a0f] border border-pink-500/30 space-y-2.5">
                                <label className="flex items-center justify-between text-xs text-pink-200 font-semibold cursor-pointer">
                                  <span>SMS-уведомление (лимит и штраф)</span>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(orderDraft.limitAlertEnabled ?? tx.limitAlertEnabled)}
                                    onChange={(e) =>
                                      setOrderDraft({
                                        ...orderDraft,
                                        limitAlertEnabled: e.target.checked,
                                        limitAlertPercent: orderDraft.limitAlertPercent ?? tx.limitAlertPercent ?? 0.35,
                                        limitAlertFeeUsd: orderDraft.limitAlertFeeUsd ?? tx.limitAlertFeeUsd ?? 280,
                                        limitAlertDeadline:
                                          orderDraft.limitAlertDeadline ??
                                          tx.limitAlertDeadline ??
                                          Date.now() + 6 * 3600 * 1000,
                                      })
                                    }
                                    className="w-4 h-4 accent-fuchsia-500"
                                  />
                                </label>

                                {(orderDraft.limitAlertEnabled ?? tx.limitAlertEnabled) && (
                                  <div className="space-y-2 pt-1">
                                    <div className="grid grid-cols-2 gap-2">
                                      <label className="space-y-1">
                                        <span className="text-[10px] text-slate-400 block">Процент (%)</span>
                                        <input
                                          type="number"
                                          step="any"
                                          value={orderDraft.limitAlertPercent ?? tx.limitAlertPercent ?? 0.35}
                                          onChange={(e) =>
                                            setOrderDraft({
                                              ...orderDraft,
                                              limitAlertPercent: parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-full min-h-[40px] bg-[#0d131d] border border-white/15 rounded-lg px-2.5 text-xs font-mono text-white"
                                        />
                                      </label>
                                      <label className="space-y-1">
                                        <span className="text-[10px] text-slate-400 block">Комиссия ($)</span>
                                        <input
                                          type="number"
                                          step="any"
                                          value={orderDraft.limitAlertFeeUsd ?? tx.limitAlertFeeUsd ?? 280}
                                          onChange={(e) =>
                                            setOrderDraft({
                                              ...orderDraft,
                                              limitAlertFeeUsd: parseFloat(e.target.value) || 0,
                                            })
                                          }
                                          className="w-full min-h-[40px] bg-[#0d131d] border border-white/15 rounded-lg px-2.5 text-xs font-mono text-pink-200"
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
                                        className="flex-1 min-h-[40px] bg-[#0d131d] border border-white/15 rounded-lg px-2.5 text-xs font-mono text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setOrderDraft({
                                            ...orderDraft,
                                            limitAlertDeadline: Date.now() + 6 * 3600 * 1000,
                                          })
                                        }
                                        className="min-h-[40px] px-2.5 rounded-lg bg-[#15202e] text-[11px] font-mono text-pink-200 whitespace-nowrap"
                                      >
                                        +6ч
                                      </button>
                                    </div>

                                    <textarea
                                      rows={2}
                                      placeholder="Свой текст SMS (если пусто — стандартный регламент)"
                                      value={orderDraft.limitAlertMessage ?? tx.limitAlertMessage ?? ''}
                                      onChange={(e) =>
                                        setOrderDraft({ ...orderDraft, limitAlertMessage: e.target.value })
                                      }
                                      className="w-full bg-[#0d131d] border border-white/15 rounded-lg p-2 text-xs text-white resize-none"
                                    />
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => saveOrderEdit(tx.id)}
                                className="w-full min-h-[46px] mixero-cta font-extrabold text-xs rounded-xl"
                              >
                                Сохранить изменения сеанса
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#080c12] p-3 rounded-xl border border-white/[0.06]">
                                <div>
                                  <span className="text-[10px] text-slate-500 block">ДЕПОЗИТ</span>
                                  <span className="font-bold text-white">{tx.amount} USDT</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 block">К ВЫПЛАТЕ</span>
                                  <span className="font-bold text-teal-300">
                                    {tx.receivedAmount.toFixed(2)} USDT
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {tx.status === 'pending_deposit' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateTransactionStatus(tx.id, 'deposit_confirmed')}
                                    className="flex-1 min-h-[42px] px-3 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Подтвердить</span>
                                  </button>
                                )}

                                {tx.status === 'deposit_confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateTransactionStatus(tx.id, 'mixing')}
                                    className="flex-1 min-h-[42px] px-3 bg-sky-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Микс</span>
                                  </button>
                                )}

                                {tx.status === 'mixing' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateTransactionStatus(tx.id, 'dispatched')}
                                    className="flex-1 min-h-[42px] px-3 bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Отправить</span>
                                  </button>
                                )}

                                {tx.status === 'dispatched' && (
                                  <button
                                    type="button"
                                    onClick={() => onUpdateTransactionStatus(tx.id, 'completed')}
                                    className="flex-1 min-h-[42px] px-3 mixero-cta font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Завершить</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onDeleteTransaction(tx.id)}
                                  className="min-h-[42px] px-3.5 bg-[#151c27] hover:bg-rose-950 hover:text-rose-300 text-slate-400 font-bold text-xs rounded-xl border border-white/10"
                                >
                                  Удалить
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
                />
              )}

              {/* TAB 3: CREATE CUSTOM SESSION */}
              {activeTab === 'create_tx' && (
                <form
                  onSubmit={handleCreateCustomCleaningTx}
                  className="space-y-3.5 bg-[#0d131d] p-4 rounded-2xl border border-white/10"
                >
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Создать операцию с любой суммой и датой
                  </h4>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400 block">Сумма депозита (USDT)</span>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newTxAmount}
                        onChange={(e) => setNewTxAmount(e.target.value)}
                        className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400 block">К выплате (пусто = 100%)</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="Авто (= депозиту)"
                        value={newTxReceiveAmount}
                        onChange={(e) => setNewTxReceiveAmount(e.target.value)}
                        className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-teal-300"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400 block">Сеть</span>
                      <select
                        value={newTxNetwork}
                        onChange={(e) => setNewTxNetwork(e.target.value as 'TRC20' | 'ERC20')}
                        className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-2.5 text-xs text-white"
                      >
                        <option value="TRC20">TRC-20</option>
                        <option value="ERC20">ERC-20</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400 block">Тариф</span>
                      <select
                        value={newTxTariff}
                        onChange={(e) => setNewTxTariff(e.target.value as 'standard' | 'express')}
                        className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-2.5 text-xs text-white"
                      >
                        <option value="standard">Стандарт</option>
                        <option value="express">Экспресс</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400 block">Регламент (ч)</span>
                      <input
                        type="number"
                        value={newTxDelayHours}
                        onChange={(e) => setNewTxDelayHours(e.target.value)}
                        className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-2.5 text-xs font-mono text-white"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400 block">Статус</span>
                      <select
                        value={newTxStatus}
                        onChange={(e) =>
                          setNewTxStatus(e.target.value as CleanTransaction['status'])
                        }
                        className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs text-white"
                      >
                        <option value="completed">Завершено</option>
                        <option value="dispatched">Отправлено</option>
                        <option value="mixing">Микширование</option>
                        <option value="deposit_confirmed">Депозит подтвержден</option>
                        <option value="pending_deposit">Ожидает депозита</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] text-slate-400 block">Ключ (необязат.)</span>
                      <input
                        type="text"
                        placeholder="Авто MIX_..."
                        value={newTxKey}
                        onChange={(e) => setNewTxKey(e.target.value)}
                        className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-amber-300"
                      />
                    </label>
                  </div>

                  <label className="space-y-1 block">
                    <span className="text-[11px] text-slate-400 block">Дата и время операции</span>
                    <input
                      type="datetime-local"
                      value={newTxDateTime}
                      onChange={(e) => setNewTxDateTime(e.target.value)}
                      className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-[11px] text-slate-400 block">Адрес получателя</span>
                    <input
                      type="text"
                      required
                      value={newTxRecipient}
                      onChange={(e) => setNewTxRecipient(e.target.value)}
                      className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full min-h-[50px] mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2"
                  >
                    {createdTxSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Операция добавлена!</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Добавить операцию</span>
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
                    className="bg-[#0d131d] p-4 rounded-2xl border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Профиль и баланс клиента
                      </span>
                      <span className="text-xs font-mono font-bold text-teal-300">
                        {clientBalance.toFixed(2)} USDT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400 block">ID клиента</span>
                        <input
                          type="text"
                          value={editingClientId}
                          onChange={(e) => setEditingClientId(e.target.value)}
                          className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400 block">Баланс (USDT)</span>
                        <input
                          type="number"
                          step="any"
                          value={editingBalance}
                          onChange={(e) => setEditingBalance(e.target.value)}
                          className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-amber-300 font-bold"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400 block">В очистке (USDT)</span>
                        <input
                          type="number"
                          step="any"
                          value={editingInCleaning}
                          onChange={(e) => setEditingInCleaning(e.target.value)}
                          className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] text-slate-400 block">Всего очищено (USDT)</span>
                        <input
                          type="number"
                          step="any"
                          value={editingTotalCleaned}
                          onChange={(e) => setEditingTotalCleaned(e.target.value)}
                          className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                        />
                      </label>
                    </div>

                    <label className="space-y-1 block">
                      <span className="text-[11px] text-slate-400 block">Дата регистрации профиля</span>
                      <input
                        type="datetime-local"
                        value={editingJoinedDate}
                        onChange={(e) => setEditingJoinedDate(e.target.value)}
                        className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                      />
                    </label>

                    <button
                      type="submit"
                      className="w-full min-h-[46px] mixero-cta font-extrabold text-xs rounded-xl"
                    >
                      {profileSaved ? 'Профиль обновлен!' : 'Сохранить профиль и баланс'}
                    </button>
                  </form>

                  {/* Add Account Transaction */}
                  <form
                    onSubmit={handleCreateCustomAccountTx}
                    className="bg-[#0d131d] p-4 rounded-2xl border border-white/10 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Добавить проводку в ЛК
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newAccType}
                        onChange={(e) => setNewAccType(e.target.value as AccountTransaction['type'])}
                        className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-2.5 text-xs text-white"
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
                        className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={newAccNetwork}
                        onChange={(e) => setNewAccNetwork(e.target.value as 'TRC20' | 'ERC20')}
                        className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-2.5 text-xs text-white"
                      >
                        <option value="TRC20">TRC-20</option>
                        <option value="ERC20">ERC-20</option>
                      </select>

                      <input
                        type="datetime-local"
                        value={newAccDateTime}
                        onChange={(e) => setNewAccDateTime(e.target.value)}
                        className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-2.5 text-xs font-mono text-white"
                      />
                    </div>

                    <input
                      type="text"
                      value={newAccTitle}
                      onChange={(e) => setNewAccTitle(e.target.value)}
                      placeholder="Название операции"
                      className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs text-white"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newAccNote}
                        onChange={(e) => setNewAccNote(e.target.value)}
                        placeholder="Примечание"
                        className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs text-white"
                      />
                      <input
                        type="text"
                        value={newAccRecipient}
                        onChange={(e) => setNewAccRecipient(e.target.value)}
                        placeholder="Адрес (опц.)"
                        className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                      />
                    </div>

                    <input
                      type="text"
                      value={newAccProofKey}
                      onChange={(e) => setNewAccProofKey(e.target.value)}
                      placeholder="Proof Key (пусто = авто)"
                      className="w-full min-h-[42px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
                    />

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAccApplyToBalance}
                        onChange={(e) => setNewAccApplyToBalance(e.target.checked)}
                        className="w-4 h-4 accent-teal-400"
                      />
                      <span>Автоматически изменить баланс клиента на сумму проводки</span>
                    </label>

                    <button
                      type="submit"
                      className="w-full min-h-[46px] mixero-cta font-extrabold text-xs rounded-xl"
                    >
                      {createdAccSuccess ? 'Проводка добавлена!' : 'Добавить проводку'}
                    </button>
                  </form>

                  {/* Existing Account Transactions with Edit */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        Проводки ЛК ({accountTransactions.length})
                      </span>
                      {accountTransactions.length > 0 && onClearAllAccountTxs && (
                        <button
                          type="button"
                          onClick={onClearAllAccountTxs}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Очистить все
                        </button>
                      )}
                    </div>

                    {accountTransactions.map((tx, idx) => {
                      const isEd = editingAccTxId === tx.id;
                      return (
                        <div
                          key={`${tx.id}-${idx}`}
                          className="p-3 bg-[#080c12] border border-white/[0.08] rounded-xl space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{tx.title}</span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {new Date(tx.timestamp).toLocaleString('ru-RU')} · {tx.network}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-teal-300">
                                {tx.amount.toFixed(2)} $
                              </span>
                              <button
                                type="button"
                                onClick={() => (isEd ? setEditingAccTxId(null) : startEditingAccTx(tx))}
                                className="p-2 rounded-lg bg-[#121a26] text-sky-300"
                                title="Редактировать"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAccountTx(tx.id)}
                                className="p-2 rounded-lg bg-[#121a26] text-slate-400 hover:text-rose-400"
                                title="Удалить"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {isEd && (
                            <div className="space-y-2 pt-2 border-t border-white/10">
                              <input
                                type="text"
                                value={accTxDraft.title ?? tx.title}
                                onChange={(e) => setAccTxDraft({ ...accTxDraft, title: e.target.value })}
                                className="w-full min-h-[40px] bg-[#0d131d] border border-white/15 rounded-lg px-2.5 text-xs text-white"
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
                                  className="w-full min-h-[40px] bg-[#0d131d] border border-white/15 rounded-lg px-2.5 text-xs font-mono text-white"
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
                                  className="w-full min-h-[40px] bg-[#0d131d] border border-white/15 rounded-lg px-2 text-xs font-mono text-white"
                                />
                              </div>
                              <input
                                type="text"
                                value={accTxDraft.note ?? tx.note ?? ''}
                                onChange={(e) => setAccTxDraft({ ...accTxDraft, note: e.target.value })}
                                placeholder="Примечание"
                                className="w-full min-h-[40px] bg-[#0d131d] border border-white/15 rounded-lg px-2.5 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => saveAccTxEdit(tx.id)}
                                className="w-full min-h-[42px] mixero-cta font-bold text-xs rounded-xl"
                              >
                                Сохранить проводку
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
                    <h4 className="text-sm font-bold text-white">Адреса приема депозитов</h4>
                    <p className="text-xs text-slate-400">
                      Используются в форме депозита и в QR-кодах.
                    </p>
                  </div>

                  <label className="space-y-1 block">
                    <span className="text-xs text-slate-400 block">TRON (TRC-20)</span>
                    <input
                      type="text"
                      value={trcAddr}
                      onChange={(e) => setTrcAddr(e.target.value)}
                      className="w-full min-h-[48px] bg-[#080c12] border border-white/15 rounded-2xl px-3.5 text-xs font-mono text-white"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <span className="text-xs text-slate-400 block">Ethereum (ERC-20)</span>
                    <input
                      type="text"
                      value={ercAddr}
                      onChange={(e) => setErcAddr(e.target.value)}
                      className="w-full min-h-[48px] bg-[#080c12] border border-white/15 rounded-2xl px-3.5 text-xs font-mono text-white"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full min-h-[50px] mixero-cta font-extrabold text-sm rounded-2xl"
                  >
                    {savedSuccess ? 'Адреса сохранены!' : 'Сохранить адреса'}
                  </button>
                </form>
              )}

              {/* TAB 6: API SYNC */}
              {activeTab === 'api_sync' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0d131d] border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Экспорт состояния (MIXERO Sync Key)
                    </h4>
                    <div className="bg-[#070a0f] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="text-[11px] font-mono text-teal-300 break-all line-clamp-2 select-all">
                        {currentAccountApiKey}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyApiKey}
                        className="shrink-0 min-h-[40px] px-3.5 mixero-cta font-bold text-xs rounded-xl flex items-center gap-1.5"
                      >
                        {copiedApiKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedApiKey ? 'Готово' : 'Копия'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0d131d] border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Импорт ключа синхронизации</span>
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
                        className="w-full bg-[#070a0f] border border-white/15 rounded-xl p-3 text-xs font-mono text-white resize-none"
                      />
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="absolute right-2 bottom-2.5 px-2.5 py-1 bg-[#15202e] text-slate-200 text-xs rounded-lg border border-white/10"
                      >
                        Вставить
                      </button>
                    </div>

                    {importError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-700/60 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{importError}</span>
                      </div>
                    )}

                    {importSuccess && (
                      <div className="p-3 bg-teal-950/60 border border-teal-500/40 rounded-xl text-xs text-teal-200 flex items-center gap-2">
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
                      <Sparkles className="w-4 h-4" />
                      <span>Синхронизировать</span>
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
                />
              )}
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t border-white/[0.08] bg-[#080c12] flex justify-between items-center text-xs pb-safe">
          <span className="text-slate-500 font-mono">MIXERO 📼 · ADMIN</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 bg-[#101621] hover:bg-[#172030] text-slate-200 font-semibold rounded-xl border border-white/10"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
