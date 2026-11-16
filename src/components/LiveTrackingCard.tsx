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
    setIsFeePaidLocally(false);
  }, [transaction.id, transaction.limitAlertEnabled]);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    if (transaction.status === 'completed') return;
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [transaction.status]);

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
    if (transaction.status === 'completed') return 'ЗАВЕРШЕНО';
    if (transaction.limitAlertEnabled) {
      return deadlineRemainingMs > 0 ? formatCountdown(deadlineRemainingMs) : 'ПРОСРОЧЕНО';
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
        return 'ОЖИДАНИЕ ДЕПОЗИТА';
      case 'deposit_confirmed':
        return 'ДЕПОЗИТ ПОДТВЕРЖДЁН';
      case 'mixing':
        if (transaction.limitAlertEnabled) {
          return 'ПРЕВЫШЕН ЛИМИТ · 620Ч+';
        }
        return isInExtendedWindow
          ? `ГЛУБОКИЙ ЦИКЛ · ${thresholdHours}Ч+`
          : 'АКТИВНОЕ МИКШИРОВАНИЕ';
      case 'dispatched':
        return 'USDT ОТПРАВЛЕНЫ';
      case 'completed':
        return 'ЗАВЕРШЕНО НА 100%';
      default:
        return 'ОБРАБОТКА СЕССИИ';
    }
  })();

  const formattedPayout = transaction.receivedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className={`w-full mixero-card rounded-3xl p-5 space-y-5 ${className}`}>
      {/* Top-10 App Store Hero Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#22A8AC]/28 gap-2">
        <div className="min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#FF9838] font-extrabold block">
            ЧИСТЫЙ ВЫВОД · {transaction.network}
          </span>
          <span className="text-sm font-mono font-bold text-[#F2FCFC] block truncate">
            {transaction.mixingKey}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#022024] text-white">
            <span className="w-2 h-2 rounded-full mixero-live-dot shrink-0" />
            <span className="mixero-display text-[10px] font-bold text-[#FF9838] whitespace-nowrap">
              {stageTitle}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#96C8CB] font-semibold tabular-nums block mt-1">
            {formattedCreationDate}, {formattedCreationTime}
          </span>
        </div>
      </div>

      {/* Sharp App Store Crypto Asset Amount */}
      <div className="text-center py-1 space-y-1.5">
        <span className="mixero-display text-[11px] font-bold text-[#96C8CB] block">
          ЧИСТЫЙ ВЫВОД БЕЗ УДЕРЖАНИЙ (100%)
        </span>
        <div className="text-4xl sm:text-5xl font-black font-mono tabular-nums mixero-lock-digits leading-none">
          {formattedPayout} $
        </div>
      </div>

      {/* 3-Column Sharp Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono mixero-inset rounded-2xl p-3.5">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#96C8CB] block font-sans font-bold">
            В миксере
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-[#F2FCFC] tabular-nums">
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
        <div className="border-x border-[#22A8AC]/32 px-1">
          <span className="text-[11px] uppercase tracking-wider text-[#96C8CB] block font-sans font-bold">
            {transaction.limitAlertEnabled ? 'Активна ещё' : 'Осталось'}
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-[#FF7878] tabular-nums">
            {formatRemaining(remainingSeconds)}
          </span>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-[#96C8CB] block font-sans font-bold">
            Прогресс
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-[#F2FCFC] tabular-nums">
            {progress}%
          </span>
        </div>
      </div>

      {/* Sharp Progress Bar */}
      <div className="w-full mixero-inset h-3 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out mixero-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Detailed Mandatory Protocol SMS Alert */}
      {transaction.status !== 'completed' && transaction.limitAlertEnabled && !isFeePaidLocally && (
        <div className="mixero-sms-alert rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F87171]/40">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#F2FCFC] mixero-display">
              <MessageSquareWarning className="w-4 h-4 text-[#FF7878] shrink-0" />
              <span>SMS · ОБЯЗАТЕЛЬНОЕ УСЛОВИЕ</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#022024] text-xs font-mono font-bold text-[#FF9838] tabular-nums shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#FF9838]" />
              <span>{formatCountdown(deadlineRemainingMs)}</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs leading-relaxed text-[#F2FCFC]">
            {transaction.limitAlertMessage ? (
              <p className="font-medium">{transaction.limitAlertMessage}</p>
            ) : (
              <div className="space-y-2">
                <p>
                  <strong className="mixero-display text-[10px] text-[#FF9838] mr-1.5">
                    ОПРЕДЕЛЕНИЕ СТАТУСА:
                  </strong>
                  Превышен регламентный лимит цикла обработки заявки — средства находятся в пуле{' '}
                  <strong className="font-mono font-extrabold">
                    {Math.floor(elapsedHours)} ч
                  </strong>
                  .
                </p>
                <p>
                  <strong className="mixero-display text-[10px] text-[#F2FCFC] mr-1.5">
                    ВЫНУЖДЕННОЕ ДЕЙСТВИЕ:
                  </strong>
                  Для старта нового круга очистки и полного завершения финального этапа{' '}
                  <strong>необходима обязательная оплата комиссии</strong>{' '}
                  <strong className="font-mono font-extrabold bg-[#FF8424] text-[#140800] px-1.5 py-0.5 rounded border border-[#FFB36B]">
                    {extendedPercent}% — {additionalFeeAmount.toFixed(2)} $
                  </strong>
                  .
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#24090D]/80 border border-[#F87171]/45 text-xs text-[#FFF0F0] font-medium">
              <ShieldAlert className="w-4 h-4 text-[#FF7878] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#FF7878] uppercase text-[11px] font-extrabold">
                  СРОК 6 ЧАСОВ · САНКЦИЯ:
                </strong>{' '}
                Заявка активна строго <strong>6 часов</strong>. При неуплате в срок наступает{' '}
                <strong className="text-[#FF7878] underline decoration-[#FF6B6B]/40">
                  автоматическая аннуляция заявки и штраф за просроченный период взноса
                </strong>
                .
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2.5 border-t border-[#F87171]/40 font-mono">
            <span className="text-[#96C8CB] font-sans font-bold">Комиссия нового круга</span>
            <span className="text-sm font-extrabold text-[#F2FCFC] tabular-nums">
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

      {/* Standard Final Fee Action */}
      {transaction.status !== 'completed' && !transaction.limitAlertEnabled && (
        <div className="pt-3 border-t border-[#22A8AC]/28 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#F2FCFC] flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5 text-[#FF9838]" />
              Обязательный финальный сбор ({extendedPercent}%)
            </span>
            <span className="font-mono font-extrabold text-[#FF9838] tabular-nums">
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
        <div className="p-3.5 rounded-2xl mixero-inset text-xs text-[#F2FCFC] font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-[#42F28B] shrink-0" />
          <span>Комиссия нового круга ({additionalFeeAmount.toFixed(2)} $) оплачена. Финальный этап запущен.</span>
        </div>
      )}

      {/* Recipient Footer */}
      <div className="flex items-center justify-between gap-2 text-xs font-mono text-[#96C8CB] pt-1">
        <span className="font-sans uppercase text-[11px] font-bold tracking-wider shrink-0 text-[#F2FCFC]">
          Кошелёк вывода
        </span>
        <span className="text-[#F2FCFC] font-bold truncate">
          {transaction.recipientAddress}
        </span>
      </div>
    </div>
  );
};
