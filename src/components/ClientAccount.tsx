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
        {/* Identity Row */}
        <div className="flex items-center justify-between pb-4 border-b border-[#22A8AC]/28 relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <MixeroLogo size={40} hasGlow={false} />
            <div className="min-w-0">
              <span className="text-sm font-mono font-bold text-[#F2FCFC] block truncate">
                {profile.clientId}
              </span>
              <span className="mixero-display text-[10px] font-bold text-[#96C8CB] block">
                АНОНИМНЫЙ СЧЁТ · NO-LOG
              </span>
            </div>
          </div>

          <span className="mixero-display text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#073B40]/90 border border-[#FF8C2E]/55 text-[#FF9838] shrink-0 whitespace-nowrap">
            0% ВЫЧЕТОВ
          </span>
        </div>

        {/* Balance Display */}
        <div className="space-y-2 relative z-10">
          <span className="mixero-display text-[11px] font-bold text-[#96C8CB] block">
            РЕЗЕРВНЫЙ БАЛАНС ДЛЯ КОМИССИЙ
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-5xl font-black font-mono tabular-nums mixero-lock-digits leading-none">
              {profile.balance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-sm font-extrabold text-[#FF9838] font-mono">USDT</span>
          </div>
          <p className="text-xs text-[#96C8CB] leading-relaxed pt-1">
            <strong className="text-[#F2FCFC]">Определение:</strong> Выделенный резерв для раздельной оплаты сетевых сборов. Гарантирует, что конечный адрес получит ровно 100% суммы очистки без удержаний.
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
              className="min-h-[52px] px-4 mixero-pill disabled:opacity-45 text-[#F2FCFC] hover:border-[#FF9436] font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <ArrowUpRight className="w-4 h-4 text-[#F2FCFC]" />
              <span>Вывести</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToMixer}
              className="min-h-[52px] px-4 mixero-secondary-btn font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4 text-[#FF9838]" />
              <span>Очистить</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="mixero-display text-xs sm:text-sm font-bold text-[#F2FCFC]">
            ИСТОРИЯ И КВИТАНЦИИ
          </h3>
          <span className="text-xs font-mono font-extrabold text-[#FF9838] tabular-nums">
            {transactions.length}
          </span>
        </div>

        {/* Clean Segmented Filter */}
        <div className="flex items-center gap-1.5 p-1.5 mixero-card rounded-2xl overflow-x-auto no-scrollbar">
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
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                filterType === f.id
                  ? 'mixero-cta'
                  : 'text-[#96C8CB] hover:text-[#FFFFFF] hover:bg-[#03252A]/85'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="mixero-card rounded-3xl p-8 text-center space-y-2">
            <Clock className="w-7 h-7 text-[#FF9838] mx-auto" />
            <p className="text-sm font-bold text-[#F2FCFC]">Операций пока нет</p>
            <p className="text-xs text-[#96C8CB] max-w-xs mx-auto">
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
                          tx.type === 'topup' || tx.type === 'payout'
                            ? 'bg-[#073B40]/90 text-[#F2FCFC] border-[#FF8C2E]/55'
                            : tx.type === 'withdrawal'
                            ? 'bg-[#022024] text-[#FF9838] border-[#FF9436]'
                            : 'bg-[#03252A]/85 text-[#FF7878] border-[#22A8AC]/32'
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
                        <span className="text-sm font-bold text-[#F2FCFC] block truncate">
                          {displayTitle}
                        </span>
                        <span className="text-xs text-[#96C8CB] font-mono block">
                          {formattedDate}, {formattedTime} · {tx.network}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-mono font-extrabold tabular-nums block ${
                          isPositive
                            ? 'text-[#42F28B]'
                            : tx.type === 'fee_payment'
                            ? 'text-[#FF7878]'
                            : 'text-[#F2FCFC]'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {absAmount.toFixed(2)} $
                      </span>
                      <span className="text-[11px] font-semibold text-[#96C8CB]">
                        {tx.status === 'completed'
                          ? 'Успешно'
                          : tx.status === 'processing'
                          ? 'В обработке'
                          : 'Ожидание'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#22A8AC]/28 gap-2">
                    <span className="text-xs text-[#96C8CB] font-mono truncate">
                      {tx.note || tx.id}
                    </span>

                    <button
                      type="button"
                      onClick={() => onViewReceipt(receiptPayload)}
                      className="min-h-[40px] px-3.5 rounded-xl mixero-inset hover:border-[#FF9436] text-[#F2FCFC] text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-[0.97]"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FF9838]" />
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
