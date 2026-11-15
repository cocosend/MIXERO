import React, { useState, useEffect } from 'react';
import { Check, Zap, MessageSquareWarning, Clock, ShieldAlert } from 'lucide-react';
import { CleanTransaction } from './MixerSection';
import { ProtocolConfig } from '../types/config';

interface LiveTrackingCardProps {
  transaction: CleanTransaction;
  className?: string;
  userBalance?: number;
  onPayFinalFee?: (amount: number, txId?: string) => void;
  onOpenTopUp?: (suggestedAmount?: number) => void;
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
  const [now, setNow] = useState(() => Date.now());
  const [isFeePaidLocally, setIsFeePaidLocally] = useState(false);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, Math.floor((now - (transaction.timestamp || now)) / 1000));

  const formatElapsed = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) return `${hours}ч ${pad(minutes)}м ${pad(seconds)}с`;
    return `${pad(minutes)}м ${pad(seconds)}с`;
  };

  const formatCountdown = (msLeft: number) => {
    if (msLeft <= 0) return '00:00:00';
    const totalSec = Math.floor(msLeft / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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
  const extendedPercent =
    transaction.limitAlertPercent ?? protocolConfig?.extendedCyclePercent ?? 0.35;
  const extendedMinFee = protocolConfig?.extendedCycleMinFee ?? 0.5;
  const isInExtendedWindow =
    Boolean(transaction.limitAlertEnabled) || elapsedHours >= thresholdHours;

  const additionalFeeAmount =
    transaction.limitAlertFeeUsd !== undefined
      ? transaction.limitAlertFeeUsd
      : Math.max(extendedMinFee, (transaction.amount * extendedPercent) / 100);

  const hasEnoughForFinalFee = userBalance >= additionalFeeAmount;
  const deficitForFinalFee = Math.max(0, additionalFeeAmount - userBalance);

  const deadlineMs = transaction.limitAlertDeadline ?? now + 6 * 3600 * 1000;
  const deadlineRemainingMs = Math.max(0, deadlineMs - now);

  const handlePayAdditionalFee = () => {
    if (!hasEnoughForFinalFee) {
      if (onOpenTopUp) onOpenTopUp(Number(deficitForFinalFee.toFixed(2)));
      return;
    }
    if (onPayFinalFee) {
      onPayFinalFee(additionalFeeAmount, transaction.id);
    }
    setIsFeePaidLocally(true);
  };

  const formatRemaining = (sec: number) => {
    if (transaction.status === 'completed') return 'Завершено';
    if (transaction.limitAlertEnabled) {
      return deadlineRemainingMs > 0 ? formatCountdown(deadlineRemainingMs) : 'Просрочено';
    }
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
        if (transaction.limitAlertEnabled) return 88;
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
        if (transaction.limitAlertEnabled) {
          return 'Превышен лимит · 620ч+';
        }
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

  const formattedPayout = transaction.receivedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={`w-full mixero-card rounded-3xl p-5 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-fuchsia-300/15">
        <div>
          <span className="text-[11px] font-mono text-fuchsia-200/75 block">
            Вывод · {transaction.network}
          </span>
          <span className="text-sm font-mono font-bold text-white">
            {transaction.mixingKey}
          </span>
        </div>
        <div className="text-right">
          <span
            className={`text-xs font-bold block ${
              transaction.limitAlertEnabled && !isFeePaidLocally
                ? 'text-pink-300'
                : 'text-fuchsia-200'
            }`}
          >
            {stageTitle}
          </span>
          <span className="text-[11px] font-mono text-purple-200/70 tabular-nums">
            {formattedCreationDate}, {formattedCreationTime}
          </span>
        </div>
      </div>

      {/* 3-Column Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div>
          <span className="text-[11px] text-purple-200/70 block font-sans">В миксере</span>
          <span className="text-sm font-bold text-white tabular-nums">
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
        <div className="border-x border-fuchsia-300/15 px-1">
          <span className="text-[11px] text-purple-200/70 block font-sans">
            {transaction.limitAlertEnabled ? 'Активна ещё' : 'Осталось'}
          </span>
          <span
            className={`text-sm font-bold tabular-nums ${
              transaction.limitAlertEnabled ? 'text-pink-300' : 'text-white'
            }`}
          >
            {formatRemaining(remainingSeconds)}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-purple-200/70 block font-sans">К выплате</span>
          <span className="text-sm font-extrabold text-fuchsia-200 tabular-nums">
            {formattedPayout} $
          </span>
        </div>
      </div>

      {/* Saturated Magenta-Violet Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-purple-100/80">Прогресс очистки</span>
          <span className="font-mono font-bold text-pink-200 tabular-nums">{progress}%</span>
        </div>
        <div className="w-full bg-[#090222] h-2.5 rounded-full overflow-hidden border border-fuchsia-300/20">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #ff26f0 0%, #9b35ff 55%, #4f46ff 100%)',
            }}
          />
        </div>
      </div>

      {/* SMS Protocol Limit & Penalty Alert */}
      {transaction.status !== 'completed' && transaction.limitAlertEnabled && !isFeePaidLocally && (
        <div className="mixero-sms-alert rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-pink-400/20">
            <div className="flex items-center gap-2 text-xs font-extrabold text-pink-200 uppercase tracking-wide">
              <MessageSquareWarning className="w-4 h-4 text-pink-300 shrink-0" />
              <span>SMS · Превышен лимит</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-200 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{formatCountdown(deadlineRemainingMs)}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-purple-50">
            <p>
              {transaction.limitAlertMessage || (
                <>
                  Превышен лимит времени обработки заявки (в миксере{' '}
                  <strong className="text-white font-mono">
                    {Math.floor(elapsedHours)} ч
                  </strong>
                  ). Для старта нового круга очистки и полноценного завершения финального этапа
                  требуется оплата комиссии{' '}
                  <strong className="text-pink-200 font-mono">
                    {extendedPercent}% — {additionalFeeAmount.toFixed(2)} $
                  </strong>
                  .
                </>
              )}
            </p>

            <div className="flex items-start gap-2 pt-1 text-[11px] text-amber-200 font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>
                Заявка активна в течение <strong>6 часов</strong>. В случае неоплаты —{' '}
                <strong className="text-rose-200">
                  аннуляция заявки и штраф за просроченный период взноса
                </strong>
                .
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-pink-400/20 font-mono">
            <span className="text-purple-200/80 font-sans">Комиссия нового круга</span>
            <span className="text-sm font-extrabold text-white tabular-nums">
              {additionalFeeAmount.toFixed(2)} USDT ({extendedPercent}%)
            </span>
          </div>

          <button
            type="button"
            onClick={handlePayAdditionalFee}
            className="w-full min-h-[54px] px-4 mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            {hasEnoughForFinalFee ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Запустить финальный круг ({additionalFeeAmount.toFixed(2)} $)</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>
                  Оплатить комиссию {additionalFeeAmount.toFixed(2)} $ (пополнить +{deficitForFinalFee.toFixed(2)} $)
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Standard Final Fee Action (when limitAlertEnabled is not active) */}
      {transaction.status !== 'completed' && !transaction.limitAlertEnabled && (
        <div className="pt-3 border-t border-fuchsia-300/15 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-100 flex items-center gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5 text-fuchsia-300" />
              Финальный сбор ({extendedPercent}%)
            </span>
            <span className="font-mono font-bold text-fuchsia-200 tabular-nums">
              {isFeePaidLocally ? 'Оплачено' : `${additionalFeeAmount.toFixed(2)} USDT`}
            </span>
          </div>

          {!isFeePaidLocally && (
            <button
              type="button"
              onClick={handlePayAdditionalFee}
              className="w-full min-h-[50px] px-4 mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {hasEnoughForFinalFee
                  ? `Завершить передачу (${additionalFeeAmount.toFixed(2)} USDT)`
                  : `Пополнить баланс (+${deficitForFinalFee.toFixed(2)} USDT)`}
              </span>
            </button>
          )}
        </div>
      )}

      {isFeePaidLocally && (
        <div className="p-3.5 rounded-2xl bg-fuchsia-950/50 border border-fuchsia-400/40 text-xs text-fuchsia-100 flex items-center gap-2">
          <Check className="w-4 h-4 text-fuchsia-300 shrink-0" />
          <span>Комиссия нового круга ({additionalFeeAmount.toFixed(2)} $) оплачена. Финальный этап запущен.</span>
        </div>
      )}

      {/* Recipient Footer */}
      <div className="flex items-center justify-between gap-2 text-xs font-mono text-purple-200/75 pt-1">
        <span className="font-sans shrink-0">Кошелек вывода</span>
        <span className="text-white font-semibold truncate">
          {transaction.recipientAddress}
        </span>
      </div>
    </div>
  );
};
