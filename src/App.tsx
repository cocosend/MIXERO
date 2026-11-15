import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MixerSection, CleanTransaction } from './components/MixerSection';
import { ActivityLog } from './components/ActivityLog';
import { ProtocolDocs } from './components/ProtocolDocs';
import { ClientAccount } from './components/ClientAccount';
import { TopUpModal } from './components/TopUpModal';
import { WithdrawModal } from './components/WithdrawModal';
import { ReceiptModal, ReceiptData } from './components/ReceiptModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { Layers, History, BookOpen, Key, Wallet } from 'lucide-react';
import { ClientProfile, AccountTransaction } from './types/account';
import { ProtocolConfig, DEFAULT_PROTOCOL_CONFIG } from './types/config';
import { FullAccountSyncPayload } from './utils/apiKeySync';

const INITIAL_PROFILE: ClientProfile = {
  clientId: 'CLIENT-7140',
  balance: 342.5,
  inCleaning: 1500.0,
  totalCleaned: 3500.0,
  joinedDate: Date.now() - 86400000 * 4,
};

const INITIAL_CLEAN_TRANSACTIONS: CleanTransaction[] = [
  {
    id: 'MIX_TX_8924A',
    network: 'TRC20',
    tariff: 'standard',
    amount: 1500.0,
    receivedAmount: 1500.0,
    recipientAddress: 'TNwS3upnJmFADuCEVy24z8g2F79eV6pv79',
    depositAddress: 'TNwS3upnJmFADuCEVy24z8g2F79eV6pv79',
    mixingKey: 'MIX_8924A_VAULT',
    delayHours: 24,
    timestamp: Date.now() - 3600000 * 6,
    status: 'mixing',
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
    timestamp: Date.now() - 86400000 * 2,
    status: 'completed',
  },
];

const INITIAL_ACCOUNT_TRANSACTIONS: AccountTransaction[] = [
  {
    id: 'TX_TOP_9941',
    type: 'topup',
    title: 'Оплата комиссий сети',
    amount: 420.0,
    network: 'TRC20',
    timestamp: Date.now() - 3600000 * 8,
    status: 'completed',
    txHash: '7a9c8f2e4d1b305e7c8a9f2e4d1b305e7c8a9f2e4d1b305e7c8a9f2e4d1b305e',
    proofKey: 'PROOF_TOP_9941',
    sshSignature: 'SHA256:MIXERO_9941_TOPUP_VERIFIED',
    note: 'Зачисление на счет комиссий через TRON шлюз',
  },
  {
    id: 'TX_FEE_8924',
    type: 'fee_payment',
    title: 'Оплата комиссии протокола (1500 USDT)',
    amount: -77.5,
    network: 'TRC20',
    timestamp: Date.now() - 3600000 * 6,
    status: 'completed',
    proofKey: 'PROOF_FEE_8924',
    sshSignature: 'SHA256:MIXERO_8924_FEE_PAID',
    note: 'Списание комиссии за сеанс MIX_8924A_VAULT',
  },
  {
    id: 'TX_PAY_7102',
    type: 'payout',
    title: 'Финальная выплата на чистый адрес',
    amount: 3500.0,
    network: 'TRC20',
    timestamp: Date.now() - 86400000 * 2,
    status: 'completed',
    txHash: '3f8e1a9c7b2d504e6a8b1f3e7c2d504e6a8b1f3e7c2d504e6a8b1f3e7c2d504e',
    recipientAddress: 'TYDzsXDvGg5x8bFhJ98vKw71jKmPqRst89',
    proofKey: 'PROOF_PAY_7102',
    sshSignature: 'SHA256:MIXERO_7102_CLEAN_PAYOUT_VERIFIED',
    note: '100% сумма доставлена без ончейн-следов',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'mixer' | 'account' | 'activity' | 'docs'>('mixer');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [adminClickCount, setAdminClickCount] = useState(0);

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
    try {
      const saved = localStorage.getItem('mixero_protocol_config');
      if (saved) {
        return { ...DEFAULT_PROTOCOL_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // Ignored
    }
    return DEFAULT_PROTOCOL_CONFIG;
  });

  // Client Profile
  const [profile, setProfile] = useState<ClientProfile>(() => {
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
    return INITIAL_PROFILE;
  });

  // Account Transactions
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>(() => {
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
            if (item && item.id && !item.id.startsWith('TX_INIT_')) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                cleaned.push(item);
              }
            }
          }
          return cleaned;
        }
      }
    } catch {
      // Ignored
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
      note: 'Зачисление на счет комиссий',
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
      title: 'Вывод на внешний кошелек',
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

  const handlePayFeeWithBalance = (feeAmount: number) => {
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
      title: 'Списание комиссии протокола',
      amount: -feeAmount,
      network: 'TRC20',
      timestamp: Date.now(),
      status: 'completed',
      txHash: `0x${Math.random().toString(16).slice(2, 10)}...`,
      note: 'Списание комиссии за сеанс очистки',
      proofKey,
      sshSignature: sshSig,
    };

    setAccountTransactions((prev) => [feeTx, ...prev]);
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
    <div className="min-h-screen flex flex-col bg-[#06090e] text-slate-100 relative overflow-x-hidden">
      {/* Subtle Neon Fade Ambient Backdrop (Sky -> Teal -> Warm Gold) */}
      <div
        className="fixed -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[340px] rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(120deg, #38bdf8 0%, #2dd4bf 50%, #fbbf24 100%)',
        }}
      />

      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col px-4 sm:px-6 pt-safe pb-24 sm:pb-8 relative z-10">
        <Header
          onOpenPWAInstall={() => setIsInstallModalOpen(true)}
          onSecretAdminClick={handleSecretAdminClick}
          adminClickCount={adminClickCount}
          balance={profile.balance}
          onOpenAccount={() => handleTabChange('account')}
        />

        {/* Desktop / Tablet Top Navigation */}
        <nav className="hidden sm:flex my-4 items-center gap-1.5 p-1.5 bg-[#0a0e16] border border-white/[0.07] rounded-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`flex-1 min-h-[44px] px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-[#15202e] text-white border border-teal-400/35'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-teal-300' : 'text-slate-400'}`} />
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
              onOpenTopUp={() => setIsTopUpModalOpen(true)}
              onViewReceipt={handleViewReceipt}
              protocolConfig={protocolConfig}
            />
          )}

          {activeTab === 'account' && (
            <ClientAccount
              profile={profile}
              transactions={accountTransactions}
              onOpenTopUp={() => setIsTopUpModalOpen(true)}
              onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
              onNavigateToMixer={() => handleTabChange('mixer')}
              onViewReceipt={handleViewReceipt}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityLog transactions={transactions} onViewReceipt={handleViewReceipt} />
          )}

          {activeTab === 'docs' && <ProtocolDocs protocolConfig={protocolConfig} />}
        </main>

        {/* Minimal Footer */}
        <footer className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>MIXERO 📼 · Zero-Knowledge No-Log Protocol</span>
          <button
            type="button"
            onClick={() => setIsAdminModalOpen(true)}
            className="min-h-[40px] px-3 text-slate-400 hover:text-teal-300 flex items-center gap-1.5 transition"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Панель управления</span>
          </button>
        </footer>
      </div>

      {/* Mobile Fixed Thumb-Zone Bottom Bar (iPhone-optimized) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080c12]/90 backdrop-blur-xl border-t border-white/[0.08] pb-safe">
        <div className="grid grid-cols-4 items-center px-2 pt-1.5 pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition ${
                  active ? 'text-teal-300' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <TopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        customAddresses={customAddresses}
        onSuccessTopUp={handleSuccessTopUp}
        quickPresets={protocolConfig.quickAmountPresets}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        balance={profile.balance}
        onSuccessWithdraw={handleSuccessWithdraw}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={activeReceipt}
      />

      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

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
    </div>
  );
}
