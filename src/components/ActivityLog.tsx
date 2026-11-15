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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      return { text: 'Лимит 620ч+ · 6ч окно', cls: 'text-pink-300' };
    }
    switch (tx.status) {
      case 'completed':
        return { text: 'Выплачено', cls: 'text-fuchsia-200' };
      case 'dispatched':
        return { text: 'В пути', cls: 'text-violet-200' };
      case 'mixing':
        return { text: 'Микширование', cls: 'text-pink-300' };
      case 'deposit_confirmed':
        return { text: 'Подтверждено', cls: 'text-fuchsia-200' };
      default:
        return { text: 'Ожидание', cls: 'text-purple-200' };
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-white">Активные и прошлые сеансы</h2>
        <span className="text-xs font-mono text-fuchsia-100/75">
          No-Log · {transactions.length}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="mixero-card rounded-3xl p-8 text-center space-y-2.5">
          <ShieldCheck className="w-8 h-8 text-fuchsia-300 mx-auto" />
          <h4 className="text-sm font-bold text-white">Список сеансов пуст</h4>
          <p className="text-xs text-purple-200/75 max-w-xs mx-auto leading-relaxed">
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
                  <div>
                    <span className="font-mono font-bold text-sm text-white block">
                      {tx.mixingKey}
                    </span>
                    <span className="text-[11px] font-mono text-purple-200/70">
                      {tx.network} · {tx.delayHours || 24}ч · {formattedDate}
                    </span>
                  </div>

                  <span className={`font-mono font-bold text-xs ${statusInfo.cls}`}>
                    {statusInfo.text}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-purple-200/75 font-mono">
                    <span>В миксере: {formatElapsed(tx.timestamp)}</span>
                    <span className="text-pink-200 font-bold tabular-nums">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#090222] h-2 rounded-full overflow-hidden border border-fuchsia-300/20">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #ff26f0 0%, #9b35ff 55%, #4f46ff 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
                  <div>
                    <span className="text-[11px] text-purple-200/70 font-sans block">Внесено</span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-purple-200/70 font-sans block">Чистая выплата</span>
                    <span className="text-sm font-bold text-fuchsia-200 tabular-nums">
                      {tx.receivedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                </div>

                {tx.limitAlertEnabled && tx.status !== 'completed' && (
                  <div className="p-3 rounded-2xl bg-pink-950/45 border border-pink-400/35 text-[11px] text-pink-100 leading-snug">
                    SMS: превышен лимит обработки — комиссия нового круга{' '}
                    <strong className="font-mono">
                      {(tx.limitAlertFeeUsd ?? 280).toFixed(2)} $ ({tx.limitAlertPercent ?? 0.35}%)
                    </strong>
                    . Активна 6ч, далее аннуляция и штраф.
                  </div>
                )}

                {/* Footer & Receipt */}
                <div className="pt-3 border-t border-fuchsia-300/15 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-purple-200/75 truncate">
                    {tx.recipientAddress}
                  </span>

                  {onViewReceipt && (
                    <button
                      type="button"
                      onClick={() => onViewReceipt(receiptPayload)}
                      className="min-h-[44px] px-4 rounded-xl bg-[#16054a]/85 hover:bg-[#23086e] border border-fuchsia-300/25 text-white font-semibold text-xs flex items-center gap-1.5 transition active:scale-[0.97] shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-fuchsia-300" />
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
