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
    if (hours > 0) return `${pad(hours)}ч ${pad(minutes)}м ${pad(seconds)}с`;
    return `${pad(minutes)}м ${pad(seconds)}с`;
  };

  const getProgress = (status: CleanTransaction['status'], timestamp: number, delayHours: number) => {
    switch (status) {
      case 'pending_deposit':
        return 8;
      case 'deposit_confirmed':
        return 28;
      case 'mixing': {
        const elapsed = Math.max(0, Math.floor((now - timestamp) / 1000));
        const total = (delayHours || 24) * 3600;
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

  const getStatusLabel = (status: CleanTransaction['status']) => {
    switch (status) {
      case 'completed':
        return { text: 'Выплачено', cls: 'text-teal-300' };
      case 'dispatched':
        return { text: 'В пути', cls: 'text-sky-300' };
      case 'mixing':
        return { text: 'Микширование', cls: 'text-amber-300' };
      case 'deposit_confirmed':
        return { text: 'Подтверждено', cls: 'text-teal-300' };
      default:
        return { text: 'Ожидание', cls: 'text-slate-300' };
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-white">Активные и прошлые сеансы</h2>
        <span className="text-xs font-mono text-slate-400">
          No-Log · {transactions.length}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="mixero-card rounded-3xl p-8 text-center space-y-2.5">
          <ShieldCheck className="w-8 h-8 text-teal-400 mx-auto" />
          <h4 className="text-sm font-bold text-white">Список сеансов пуст</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Создайте заявку во вкладке «Очистка», чтобы отследить прогресс.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx, idx) => {
            const progress = getProgress(tx.status, tx.timestamp, tx.delayHours);
            const dateObj = new Date(tx.timestamp || Date.now());
            const formattedDate = dateObj.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const statusInfo = getStatusLabel(tx.status);

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
                    <span className="text-[11px] font-mono text-slate-400">
                      {tx.network} · {tx.delayHours || 24}ч · {formattedDate}
                    </span>
                  </div>

                  <span className={`font-mono font-bold text-xs ${statusInfo.cls}`}>
                    {statusInfo.text}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Прошло: {formatElapsed(tx.timestamp)}</span>
                    <span className="text-teal-300 font-bold tabular-nums">{progress}%</span>
                  </div>
                  <div className="w-full bg-[#06090e] h-2 rounded-full overflow-hidden border border-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #38bdf8 0%, #2dd4bf 55%, #fbbf24 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
                  <div>
                    <span className="text-[11px] text-slate-400 font-sans block">Внесено</span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {tx.amount.toFixed(2)} USDT
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-sans block">Чистая выплата</span>
                    <span className="text-sm font-bold text-amber-300 tabular-nums">
                      {tx.receivedAmount.toFixed(2)} USDT
                    </span>
                  </div>
                </div>

                {/* Footer & Receipt */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    {tx.recipientAddress.slice(0, 8)}...{tx.recipientAddress.slice(-6)}
                  </span>

                  {onViewReceipt && (
                    <button
                      type="button"
                      onClick={() => onViewReceipt(receiptPayload)}
                      className="min-h-[44px] px-4 rounded-xl bg-[#101621] hover:bg-[#172030] border border-white/10 text-slate-100 font-semibold text-xs flex items-center gap-1.5 transition active:scale-[0.97] shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-400" />
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
