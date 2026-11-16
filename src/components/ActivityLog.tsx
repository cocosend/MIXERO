import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText } from 'lucide-react';
import { CleanTransaction } from './MixerSection';
import { ReceiptData } from './ReceiptModal';

interface ActivityLogProps {
  transactions: CleanTransaction[];
  onViewReceipt?: (receipt: ReceiptData) => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ transactions, onViewReceipt }) => {
  const [now, setNow] = useState(Date.now());

  const hasActiveSession = transactions.some((tx) => tx.status !== 'completed');

  useEffect(() => {
    if (!hasActiveSession) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [hasActiveSession]);

  const formatElapsed = (timestamp: number) => {
    const diffSec = Math.max(0, Math.floor((now - (timestamp || now)) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}ч ${pad(minutes)}м ${pad(seconds)}с`;
    return `${pad(minutes)}м ${pad(seconds)}с`;
  };

  const getProgress = (tx: CleanTransaction) => {
    switch (tx.status) {
      case 'pending_deposit':
        return 8;
      case 'deposit_confirmed':
        return 28;
      case 'mixing': {
        if (tx.limitAlertEnabled) return 88;
        const elapsed = Math.max(0, Math.floor((now - tx.timestamp) / 1000));
        const total = (tx.delayHours || 24) * 3600;
        return Math.min(88, 30 + Math.floor((elapsed / total) * 58));
      }
      case 'dispatched':
        return 94;
      case 'completed':
        return 100;
      default:
        return 10;
    }
  };

  const getStatusLabel = (tx: CleanTransaction) => {
    if (tx.status === 'mixing' && tx.limitAlertEnabled) {
      return { text: 'ЛИМИТ 620Ч+ · 6Ч ОКНО', cls: 'bg-[#4A1218]/90 text-[#FF7878] border-[#F87171]/55' };
    }
    switch (tx.status) {
      case 'completed':
        return { text: 'ВЫПЛАЧЕНО', cls: 'bg-[#063E2A]/90 text-[#42F28B] border-[#22D96E]/50' };
      case 'dispatched':
        return { text: 'В ПУТИ', cls: 'bg-[#073B40]/90 text-[#FF9838] border-[#FF8C2E]/55' };
      case 'mixing':
        return { text: 'МИКШИРОВАНИЕ', cls: 'bg-[#022024] text-[#FF9838] border-[#FF9436]' };
      case 'deposit_confirmed':
        return { text: 'ПОДТВЕРЖДЕНО', cls: 'bg-[#03252A]/85 text-[#F2FCFC] border-[#22A8AC]/32' };
      default:
        return { text: 'ОЖИДАНИЕ', cls: 'bg-[#03252A]/85 text-[#96C8CB] border-[#22A8AC]/32' };
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-1 gap-2">
        <h2 className="mixero-display text-xs sm:text-sm font-bold text-[#F2FCFC]">
          АКТИВНЫЕ И ПРОШЛЫЕ СЕАНСЫ
        </h2>
        <span className="text-xs font-mono font-bold text-[#FF9838] shrink-0">
          NO-LOG · {transactions.length}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="mixero-card rounded-3xl p-8 text-center space-y-2.5">
          <ShieldCheck className="w-8 h-8 text-[#FF9838] mx-auto" />
          <h4 className="text-sm font-bold text-[#F2FCFC]">Список сеансов пуст</h4>
          <p className="text-xs text-[#96C8CB] max-w-xs mx-auto leading-relaxed">
            Создайте заявку во вкладке «Очистка», чтобы отследить прогресс.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx, idx) => {
            const progress = getProgress(tx);
            const dateObj = new Date(tx.timestamp || Date.now());
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const statusInfo = getStatusLabel(tx);

            const receiptPayload: ReceiptData = {
              id: tx.id,
              type: 'mixing',
              title: `Очистка USDT (${tx.network})`,
              amount: tx.amount,
              receivedAmount: tx.receivedAmount,
              feeAmount: Math.max(0, tx.amount - tx.receivedAmount),
              network: tx.network,
              timestamp: tx.timestamp,
              status: tx.status === 'completed' ? 'Завершено' : 'В обработке',
              recipientAddress: tx.recipientAddress,
              depositAddress: tx.depositAddress,
              proofKey: tx.mixingKey,
            };

            return (
              <div
                key={`${tx.id}-${idx}`}
                className="mixero-card rounded-3xl p-5 space-y-4 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-sm text-[#F2FCFC] block truncate">
                      {tx.mixingKey}
                    </span>
                    <span className="text-[11px] font-mono text-[#96C8CB]">
                      {tx.network} · {tx.delayHours || 24}ч · {formattedDate}
                    </span>
                  </div>

                  <span
                    className={`mixero-display font-bold text-[10px] px-2.5 py-1 rounded-lg border shrink-0 ${statusInfo.cls}`}
                  >
                    {statusInfo.text}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-[#96C8CB] font-mono font-semibold">
                    <span>В миксере: {formatElapsed(tx.timestamp)}</span>
                    <span className="text-[#F2FCFC] font-extrabold tabular-nums">{progress}%</span>
                  </div>
                  <div className="w-full mixero-inset h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-700 mixero-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#96C8CB] font-sans font-bold block">
                      Внесено
                    </span>
                    <span className="text-sm font-bold text-[#F2FCFC] tabular-nums">
                      {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wider text-[#96C8CB] font-sans font-bold block">
                      Чистая выплата
                    </span>
                    <span className="text-base font-black mixero-lock-digits tabular-nums">
                      {tx.receivedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                    </span>
                  </div>
                </div>

                {tx.limitAlertEnabled && tx.status !== 'completed' && (
                  <div className="mixero-sms-alert p-3.5 rounded-2xl text-xs text-[#F2FCFC] leading-relaxed">
                    <strong className="mixero-display text-[10px] text-[#FF7878] block mb-1">
                      SMS · ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ ПРОТОКОЛА
                    </strong>
                    Превышен лимит обработки. Для запуска нового круга обязательна комиссия{' '}
                    <strong className="font-mono font-extrabold">
                      {(tx.limitAlertFeeUsd ?? 280).toFixed(2)} $ ({tx.limitAlertPercent ?? 0.35}%)
                    </strong>
                    . Заявка активна <strong>6 часов</strong>, далее — аннуляция и штраф.
                  </div>
                )}

                {/* Footer & Receipt */}
                <div className="pt-3 border-t border-[#22A8AC]/28 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#96C8CB] truncate">
                    {tx.recipientAddress}
                  </span>

                  {onViewReceipt && (
                    <button
                      type="button"
                      onClick={() => onViewReceipt(receiptPayload)}
                      className="min-h-[44px] px-4 rounded-xl mixero-inset hover:border-[#FF9436] text-[#F2FCFC] font-bold text-xs flex items-center gap-1.5 transition active:scale-[0.97] shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FF9838]" />
                      <span>Квитанция</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
