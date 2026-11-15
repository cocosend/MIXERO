import React from 'react';
import { Clock, RefreshCw, Send, CheckCircle2, Check } from 'lucide-react';
import { ProtocolConfig } from '../types/config';

export type TransactionStep = 'pending_deposit' | 'deposit_confirmed' | 'mixing' | 'dispatched' | 'completed';

interface TransactionProgressIndicatorProps {
  status: TransactionStep;
  delayHours?: number;
  protocolConfig?: ProtocolConfig;
  className?: string;
}

interface StepConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepConfig[] = [
  { id: 'pending', label: 'Депозит', icon: Clock },
  { id: 'mixing', label: 'Микширование', icon: RefreshCw },
  { id: 'dispatched', label: 'Отправка', icon: Send },
  { id: 'completed', label: 'Доставлено', icon: CheckCircle2 },
];

export const TransactionProgressIndicator: React.FC<TransactionProgressIndicatorProps> = ({
  status,
  delayHours,
  protocolConfig,
  className = '',
}) => {
  const getStepIndex = (st: TransactionStep): number => {
    switch (st) {
      case 'pending_deposit':
        return 0;
      case 'deposit_confirmed':
      case 'mixing':
        return 1;
      case 'dispatched':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const progressPercent = (currentIndex / (STEPS.length - 1)) * 100;
  const threshold = protocolConfig?.extendedCycleThresholdHours ?? 24;
  const extPct = protocolConfig?.extendedCyclePercent ?? 0.25;

  const statusText =
    status === 'completed'
      ? 'Выполнено'
      : status === 'dispatched'
      ? 'В пути'
      : status === 'mixing'
      ? 'В пуле'
      : status === 'deposit_confirmed'
      ? 'Подтверждено'
      : 'Ожидание';

  return (
    <div className={`w-full mixero-card rounded-3xl p-5 space-y-5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300">Этапы операции</span>
        <span className="font-mono font-bold text-teal-300">
          {statusText}
          {delayHours ? ` · ${delayHours}ч` : ''}
        </span>
      </div>

      <div className="relative px-2">
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-white/10 -translate-y-1/2 z-0" />
        <div
          className="absolute top-4 left-6 h-0.5 -translate-y-1/2 z-0 transition-all duration-700 ease-out"
          style={{
            width: `calc(${progressPercent}% * (1 - 48px / 100%))`,
            background: 'linear-gradient(90deg, #38bdf8 0%, #2dd4bf 55%, #fbbf24 100%)',
          }}
        />

        <div className="relative z-10 flex justify-between items-start">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex || (idx === 3 && status === 'completed');
            const isCurrent = idx === currentIndex && !(idx === 3 && status === 'completed');
            const IconComponent = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center text-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'mixero-cta font-bold'
                      : isCurrent
                      ? 'bg-[#0a0e16] border-2 border-teal-400 text-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.35)]'
                      : 'bg-[#0a0e16] border border-white/10 text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <IconComponent className={`w-4 h-4 ${isCurrent && step.id === 'mixing' ? 'animate-spin' : ''}`} />
                  )}
                </div>
                <span
                  className={`mt-2 text-[11px] font-semibold ${
                    isCurrent ? 'text-teal-300' : isCompleted ? 'text-slate-100' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed pt-3 border-t border-white/[0.06]">
        Базовый цикл длится {threshold}ч; при выборе глубокой очистки свыше {threshold}ч добавляется сбор +{extPct}% за транзитные ноды.
      </p>
    </div>
  );
};
