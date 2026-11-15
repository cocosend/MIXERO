import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  Clock,
  Send,
  FileText,
} from 'lucide-react';
import { ClientProfile, AccountTransaction } from '../types/account';
import { MixeroLogo } from './GymLogo';
import { ReceiptData } from './ReceiptModal';

interface ClientAccountProps {
  profile: ClientProfile;
  transactions: AccountTransaction[];
  onOpenTopUp: () => void;
  onOpenWithdraw: () => void;
  onNavigateToMixer: () => void;
  onViewReceipt: (receipt: ReceiptData) => void;
}

export const ClientAccount: React.FC<ClientAccountProps> = ({
  profile,
  transactions,
  onOpenTopUp,
  onOpenWithdraw,
  onNavigateToMixer,
  onViewReceipt,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    return tx.type === filterType;
  });

  return (
    <div className="w-full space-y-5 font-sans">
      {/* Balance Hero Card */}
      <div className="mixero-card rounded-3xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #2dd4bf 0%, #38bdf8 45%, #fbbf24 100%)',
          }}
        />

        {/* Identity Row */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] relative z-10">
          <div className="flex items-center gap-3">
            <MixeroLogo size={38} hasGlow={false} />
            <div>
              <span className="text-sm font-mono font-bold text-white block">
                {profile.clientId}
              </span>
              <span className="text-xs text-slate-400">
                Анонимный счет · No-Log
              </span>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold text-teal-300">
            0% вычетов
          </span>
        </div>

        {/* Balance Display */}
        <div className="space-y-1.5 relative z-10">
          <span className="text-xs font-medium text-slate-400 block">
            Баланс для оплаты комиссий
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-4xl font-black font-mono tracking-tight tabular-nums mixero-fade-text">
              {profile.balance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-sm font-bold text-slate-300 font-mono">USDT</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            Покрывает сборы протокола, чтобы получатель получал ровно 100% суммы без удержаний.
          </p>
        </div>

        {/* Large iPhone-Friendly Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 relative z-10">
          <button
            type="button"
            onClick={onOpenTopUp}
            className="min-h-[52px] px-4 mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
            <span>Пополнить</span>
          </button>

          <div className="grid grid-cols-2 sm:contents gap-2.5">
            <button
              type="button"
              onClick={onOpenWithdraw}
              disabled={profile.balance <= 0}
              className="min-h-[52px] px-4 bg-[#101621] hover:bg-[#161f2e] disabled:opacity-40 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98] border border-white/10"
            >
              <ArrowUpRight className="w-4 h-4 text-sky-400" />
              <span>Вывести</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToMixer}
              className="min-h-[52px] px-4 bg-[#101621] hover:bg-[#161f2e] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98] border border-white/10"
            >
              <RefreshCw className="w-4 h-4 text-teal-400" />
              <span>Очистить</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-white">История и квитанции</h3>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {transactions.length}
          </span>
        </div>

        {/* Clean Segmented Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-[#080c12] border border-white/[0.07] rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Все' },
            { id: 'topup', label: 'Пополнения' },
            { id: 'fee_payment', label: 'Комиссии' },
            { id: 'payout', label: 'Выплаты' },
            { id: 'withdrawal', label: 'Выводы' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                filterType === f.id
                  ? 'bg-[#162030] text-white border border-teal-400/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="mixero-card rounded-3xl p-8 text-center space-y-2">
            <Clock className="w-7 h-7 text-slate-500 mx-auto" />
            <p className="text-sm font-bold text-white">Операций пока нет</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Здесь появятся ваши пополнения, списания комиссий и чистые выплаты.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((tx, idx) => {
              const date = new Date(tx.timestamp);
              const formattedDate = date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
              });
              const formattedTime = date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isPositive = tx.type === 'topup' || tx.type === 'payout';
              const absAmount = Math.abs(tx.amount);

              const displayTitle =
                tx.type === 'fee_payment' &&
                (tx.title.includes('Пополнение') || tx.title === 'Оплата комиссии сети')
                  ? 'Списание комиссии протокола'
                  : tx.title.includes('Пополнение баланса')
                  ? 'Оплата комиссий сети'
                  : tx.title;

              const receiptPayload: ReceiptData = {
                id: tx.id,
                type:
                  tx.type === 'topup'
                    ? 'account_topup'
                    : tx.type === 'payout'
                    ? 'account_payout'
                    : 'fee_payment',
                title: displayTitle,
                amount: absAmount,
                network: tx.network,
                timestamp: tx.timestamp,
                status: tx.status === 'completed' ? 'Завершено' : 'В обработке',
                recipientAddress: tx.recipientAddress,
                proofKey: tx.proofKey || `MIXERO_${tx.id}`,
                sshSignature: tx.sshSignature,
                txHash: tx.txHash,
              };

              return (
                <div
                  key={`${tx.id}-${idx}`}
                  className="mixero-card rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          tx.type === 'topup'
                            ? 'bg-teal-500/15 text-teal-300 border-teal-400/25'
                            : tx.type === 'payout'
                            ? 'bg-sky-500/15 text-sky-300 border-sky-400/25'
                            : tx.type === 'withdrawal'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/25'
                            : 'bg-amber-500/15 text-amber-300 border-amber-400/25'
                        }`}
                      >
                        {tx.type === 'topup' ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : tx.type === 'withdrawal' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : tx.type === 'payout' ? (
                          <Send className="w-4 h-4" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white block truncate">
                          {displayTitle}
                        </span>
                        <span className="text-xs text-slate-400 font-mono block">
                          {formattedDate}, {formattedTime} · {tx.network}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-mono font-extrabold tabular-nums block ${
                          isPositive
                            ? 'text-teal-300'
                            : tx.type === 'fee_payment'
                            ? 'text-amber-300'
                            : 'text-slate-200'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {absAmount.toFixed(2)} $
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {tx.status === 'completed'
                          ? 'Успешно'
                          : tx.status === 'processing'
                          ? 'В обработке'
                          : 'Ожидание'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06] gap-2">
                    <span className="text-xs text-slate-400 font-mono truncate">
                      {tx.note || tx.id}
                    </span>

                    <button
                      type="button"
                      onClick={() => onViewReceipt(receiptPayload)}
                      className="min-h-[40px] px-3.5 rounded-xl bg-[#101621] hover:bg-[#172030] border border-white/10 text-slate-100 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition active:scale-[0.97]"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
                      <span>Квитанция</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
