import React, { useState, useEffect } from 'react';
import { Check, Zap } from 'lucide-react';
import { CleanTransaction } from './MixerSection';
import { ProtocolConfig } from '../types/config';

interface LiveTrackingCardProps {
  transaction: CleanTransaction;
  className?: string;
  userBalance?: number;
  onPayFinalFee?: (amount: number) => void;
  onOpenTopUp?: () => void;
  protocolConfig?: ProtocolConfig;
}

export const LiveTrackingCard: React.FC<LiveTrackingCardProps> = ({
  transaction,
  className = '',
  userBalance = 0,
  onPayFinalFee,
  onOpenTopUp,
  protocolConfig,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFeePaidLocally, setIsFeePaidLocally] = useState(false);

  useEffect(() => {
    const updateElapsed = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - (transaction.timestamp || now)) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [transaction.timestamp]);

  const formatElapsed = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) return `${pad(hours)}ч ${pad(minutes)}м ${pad(seconds)}с`;
    return `${pad(minutes)}м ${pad(seconds)}с`;
  };

  const createdDate = new Date(transaction.timestamp || Date.now());
  const formattedCreationTime = createdDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedCreationDate = createdDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });

  const totalTargetSeconds = (transaction.delayHours || 24) * 3600;
  const remainingSeconds = Math.max(0, totalTargetSeconds - elapsedSeconds);
  const elapsedHours = elapsedSeconds / 3600;
  const thresholdHours = protocolConfig?.extendedCycleThresholdHours ?? 24;
  const extendedPercent = protocolConfig?.extendedCyclePercent ?? 0.25;
  const extendedMinFee = protocolConfig?.extendedCycleMinFee ?? 0.5;
  const isInExtendedWindow = elapsedHours >= thresholdHours;

  const additionalFeeAmount = Math.max(extendedMinFee, (transaction.amount * extendedPercent) / 100);
  const hasEnoughForFinalFee = userBalance >= additionalFeeAmount;

  const handlePayAdditionalFee = () => {
    if (!hasEnoughForFinalFee) {
      if (onOpenTopUp) onOpenTopUp();
      return;
    }
    if (onPayFinalFee) {
      onPayFinalFee(additionalFeeAmount);
    }
    setIsFeePaidLocally(true);
  };

  const formatRemaining = (sec: number) => {
    if (transaction.status === 'completed') return 'Завершено';
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours > 0) return `~${hours}ч ${minutes}м`;
    return `~${minutes}м`;
  };

  const getProgressPercentage = (): number => {
    switch (transaction.status) {
      case 'pending_deposit':
        return 8;
      case 'deposit_confirmed':
        return 28;
      case 'mixing': {
        const timeRatio = Math.min(1, elapsedSeconds / (totalTargetSeconds || 86400));
        return Math.min(88, 30 + Math.floor(timeRatio * 58));
      }
      case 'dispatched':
        return 94;
      case 'completed':
        return 100;
      default:
        return 10;
    }
  };

  const progress = getProgressPercentage();

  const stageTitle = (() => {
    switch (transaction.status) {
      case 'pending_deposit':
        return 'Ожидание входящего перевода';
      case 'deposit_confirmed':
        return 'Депозит подтвержден в сети';
      case 'mixing':
        return isInExtendedWindow
          ? `Глубокий цикл (${thresholdHours}ч+)`
          : 'Активное микширование пула';
      case 'dispatched':
        return 'Чистые USDT отправлены';
      case 'completed':
        return 'Операция завершена на 100%';
      default:
        return 'Обработка сессии';
    }
  })();

  return (
    <div className={`w-full mixero-card rounded-3xl p-5 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
        <div>
          <span className="text-[11px] font-mono text-slate-400 block">
            Сессия · {transaction.network}
          </span>
          <span className="text-sm font-mono font-bold text-white">
            {transaction.mixingKey}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-teal-300 block">
            {stageTitle}
          </span>
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {formattedCreationDate}, {formattedCreationTime}
          </span>
        </div>
      </div>

      {/* 3-Column Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div>
          <span className="text-[11px] text-slate-400 block font-sans">Прошло</span>
          <span className="text-sm font-bold text-sky-300 tabular-nums">
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
        <div className="border-x border-white/[0.07]">
          <span className="text-[11px] text-slate-400 block font-sans">Осталось</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {formatRemaining(remainingSeconds)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-400 block font-sans">К выплате</span>
          <span className="text-sm font-bold text-amber-300 tabular-nums">
            {transaction.receivedAmount.toFixed(2)} $
          </span>
        </div>
      </div>

      {/* Neon Fade Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Прогресс очистки</span>
          <span className="font-mono font-bold text-teal-300 tabular-nums">{progress}%</span>
        </div>
        <div className="w-full bg-[#06090e] h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #38bdf8 0%, #2dd4bf 55%, #fbbf24 100%)',
            }}
          />
        </div>
      </div>

      {/* Final Payout Action */}
      {transaction.status !== 'completed' && (
        <div className="pt-3 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Финальный сбор ({extendedPercent}%)
            </span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {isFeePaidLocally ? 'Оплачено' : `${additionalFeeAmount.toFixed(2)} USDT`}
            </span>
          </div>

          {!isFeePaidLocally && (
            hasEnoughForFinalFee ? (
              <button
                type="button"
                onClick={handlePayAdditionalFee}
                className="w-full min-h-[50px] px-4 mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Завершить передачу ({additionalFeeAmount.toFixed(2)} USDT)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenTopUp}
                className="w-full min-h-[50px] px-4 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <span>Пополнить баланс (+{(additionalFeeAmount - userBalance).toFixed(2)} USDT)</span>
              </button>
            )
          )}
        </div>
      )}

      {/* Recipient Footer */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
        <span>Получатель</span>
        <span className="text-slate-200">
          {transaction.recipientAddress.slice(0, 8)}...{transaction.recipientAddress.slice(-6)}
        </span>
      </div>
    </div>
  );
};
