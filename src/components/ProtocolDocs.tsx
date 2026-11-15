import React from 'react';
import { Shield, Lock, Zap, Clock, KeyRound } from 'lucide-react';
import { ProtocolConfig } from '../types/config';

interface ProtocolDocsProps {
  protocolConfig: ProtocolConfig;
}

export const ProtocolDocs: React.FC<ProtocolDocsProps> = ({ protocolConfig }) => {
  const sortedTiers = [...protocolConfig.feeTiers].sort((a, b) => {
    if (a.maxAmount === null) return 1;
    if (b.maxAmount === null) return -1;
    return a.maxAmount - b.maxAmount;
  });

  const formatTierRange = (idx: number) => {
    const tier = sortedTiers[idx];
    const prevMax = idx > 0 ? sortedTiers[idx - 1].maxAmount : 0;
    if (tier.maxAmount === null) {
      return `свыше ${(prevMax ?? 0).toLocaleString('ru-RU')} USDT`;
    }
    if (idx === 0) {
      return `до ${tier.maxAmount.toLocaleString('ru-RU')} USDT`;
    }
    return `${((prevMax ?? 0) + 1).toLocaleString('ru-RU')} – ${tier.maxAmount.toLocaleString('ru-RU')} USDT`;
  };

  return (
    <div className="w-full space-y-4 text-sm text-slate-300 font-sans">
      {/* Overview */}
      <div className="mixero-card rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-white font-bold text-base">
          <Shield className="w-5 h-5 text-sky-400" />
          <span>Протокол MIXERO 📼</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm">
          MIXERO — автономный сервис очистки ончейн-транзакций в сетях TRON (TRC-20) и Ethereum (ERC-20). Средства дробятся и маршрутизируются через независимые пулы ликвидности с разрывом графа связей.
        </p>
      </div>

      {/* Two Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="mixero-card rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
            <Lock className="w-4 h-4" />
            <span>Политика No-Logs</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Метаданные, IP и адреса не сохраняются на дисках. Память сессии обнуляется сразу после выплаты.
          </p>
        </div>

        <div className="mixero-card rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <KeyRound className="w-4 h-4" />
            <span>Ключ гарантии</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Криптографический ключ подтверждает владение депозитом без раскрытия личности отправителя.
          </p>
        </div>
      </div>

      {/* Time & Delays */}
      <div className="mixero-card rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <Clock className="w-4 h-4 text-teal-400" />
          <span>Регламент времени</span>
        </div>
        <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
          <p>
            • <strong className="text-white">Стандарт:</strong> от {protocolConfig.standardMinHours} до {protocolConfig.standardMaxHours} часов. При длительности свыше {protocolConfig.extendedCycleThresholdHours}ч действует глубокий цикл (+{protocolConfig.extendedCyclePercent}%).
          </p>
          <p>
            • <strong className="text-white">Экспресс:</strong> фиксированное окно {protocolConfig.expressDelayHours} часов с множителем сети ×{protocolConfig.expressNetworkMultiplier}
            {protocolConfig.expressExtraPercent > 0 ? ` и надбавкой +${protocolConfig.expressExtraPercent}%` : ''}.
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-xs text-amber-200 mt-2">
            Возможна вариативность <strong>{protocolConfig.blockchainBufferNote}</strong> из-за финальности блоков в сетях TRON и Ethereum.
          </div>
        </div>
      </div>

      {/* Dynamic Fee Table */}
      <div className="mixero-card rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Тарифная сетка</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Сеть: {protocolConfig.trc20NetworkFee} / {protocolConfig.erc20NetworkFee} USDT
          </span>
        </div>

        <div className="divide-y divide-white/[0.06] text-sm font-mono">
          {sortedTiers.map((tier, idx) => {
            const isBest = idx === sortedTiers.length - 1;
            return (
              <div key={tier.id} className="flex justify-between items-center py-2.5">
                <span className="text-slate-400 font-sans">
                  {formatTierRange(idx)}
                </span>
                <span className={`font-bold tabular-nums ${isBest ? 'mixero-fade-text text-base' : 'text-white'}`}>
                  {tier.percent}%{tier.label && isBest ? ` (${tier.label})` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
