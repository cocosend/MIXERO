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
  const extPct = protocolConfig?.extendedCyclePercent ?? 0.35;

  const statusText =
    status === 'completed'
      ? 'ВЫПОЛНЕНО'
      : status === 'dispatched'
      ? 'В ПУТИ'
      : status === 'mixing'
      ? 'В ПУЛЕ ОЧИСТКИ'
      : status === 'deposit_confirmed'
      ? 'ПОДТВЕРЖДЕНО'
      : 'ОЖИДАНИЕ';

  return (
    <div className={`w-full mixero-card rounded-3xl p-5 space-y-5 ${className}`}>
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="mixero-display text-[11px] font-bold text-[#F2FCFC]">
          ЭТАПЫ ПРОТОКОЛА
        </span>
        <span className="font-mono font-extrabold text-[#FF9838] whitespace-nowrap">
          {statusText}
          {delayHours ? ` · ${delayHours}ч` : ''}
        </span>
      </div>

      <div className="relative px-2">
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#0A3A40] -translate-y-1/2 z-0 overflow-hidden rounded-full">
          <div
            className="h-full transition-all duration-700 ease-out mixero-progress-fill"
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>

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
                      ? 'bg-[#022024] border-2 border-[#FF9436] text-[#FF9838] shadow-md'
                      : 'mixero-inset text-[#679B9F]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <IconComponent className={`w-4 h-4 ${isCurrent && step.id === 'mixing' ? 'animate-spin' : ''}`} />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-bold ${
                    isCurrent ? 'text-[#F2FCFC]' : isCompleted ? 'text-[#F2FCFC]' : 'text-[#679B9F]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[#96C8CB] leading-relaxed pt-3 border-t border-[#22A8AC]/28">
        <strong className="text-[#F2FCFC]">Определение цикла:</strong> Базовая маршрутизация длится {threshold}ч; при превышении {threshold}ч принудительно активируется глубокий цикл (+{extPct}%) через изолированные транзитные ноды.
      </p>
    </div>
  );
};
