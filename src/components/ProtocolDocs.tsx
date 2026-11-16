import React from 'react';
import { Shield, Lock, Zap, Clock, KeyRound, Cpu, AlertTriangle, BookOpen } from 'lucide-react';
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
    <div className="w-full space-y-4 text-sm text-[#F2FCFC] font-sans">
      {/* Protocol Architecture Overview */}
      <div className="mixero-card rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-[#F2FCFC] font-extrabold">
            <Cpu className="w-5 h-5 mixero-accent-text shrink-0" />
            <span className="mixero-display text-sm">АРХИТЕКТУРА ПРОТОКОЛА MIXERO•CRYPTO</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#022024] text-[#FF9838] font-mono text-[10px] font-extrabold shrink-0">
            ZERO-LOG · RAM
          </span>
        </div>
        <p className="text-[#96C8CB] leading-relaxed text-sm font-medium">
          <strong className="text-[#F2FCFC]">Определение протокола:</strong> MIXERO•CRYPTO — автономный детерминированный протокол очистки USDT (TRC-20 / ERC-20) с изолированной маршрутизацией. Средства дробятся и проходят через независимые пулы ликвидности с полным разрывом графа ончейн-связей.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="mixero-inset rounded-xl p-2.5 text-center">
            <span className="block text-[10px] font-extrabold text-[#96C8CB] uppercase">Контур</span>
            <span className="font-mono font-black text-xs text-[#F2FCFC]">Zero-Deduct</span>
          </div>
          <div className="mixero-inset rounded-xl p-2.5 text-center">
            <span className="block text-[10px] font-extrabold text-[#96C8CB] uppercase">Память</span>
            <span className="font-mono font-black text-xs text-[#F2FCFC]">Zero-Log RAM</span>
          </div>
          <div className="mixero-inset rounded-xl p-2.5 text-center">
            <span className="block text-[10px] font-extrabold text-[#96C8CB] uppercase">Подпись</span>
            <span className="font-mono font-black text-xs text-[#F2FCFC]">SHA-256</span>
          </div>
        </div>
      </div>

      {/* Detailed Definitions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="mixero-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#F2FCFC] font-extrabold">
            <Lock className="w-4 h-4 mixero-accent-text shrink-0" />
            <span className="mixero-display text-xs">ОПРЕДЕЛЕНИЕ NO-LOGS</span>
          </div>
          <p className="text-xs text-[#96C8CB] leading-relaxed font-medium">
            IP-адреса, отпечатки браузера и связки кошельков <strong className="text-[#F2FCFC]">никогда не записываются на диск</strong>. После завершения цикла буферы сессии принудительно очищаются из оперативной памяти.
          </p>
        </div>

        <div className="mixero-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#F2FCFC] font-extrabold">
            <KeyRound className="w-4 h-4 mixero-accent-text shrink-0" />
            <span className="mixero-display text-xs">ОПРЕДЕЛЕНИЕ PROOF KEY</span>
          </div>
          <p className="text-xs text-[#96C8CB] leading-relaxed font-medium">
            Криптографический токен сессии с подписью <strong className="text-[#F2FCFC]">SHA-256</strong>. Является единственным юридически-техническим доказательством права на выплату без раскрытия отправителя.
          </p>
        </div>
      </div>

      {/* Glossary Card */}
      <div className="mixero-card rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-[#F2FCFC] font-extrabold">
          <BookOpen className="w-4 h-4 mixero-accent-text shrink-0" />
          <span className="mixero-display text-xs">ГЛОССАРИЙ И ТЕРМИНЫ ЯДРА</span>
        </div>
        <div className="space-y-2.5 text-xs text-[#96C8CB] leading-relaxed">
          <div className="mixero-inset rounded-xl p-3">
            <strong className="text-[#F2FCFC] block mb-0.5">• Резервный баланс комиссий:</strong>
            отдельный служебный счёт для оплаты сетевого газа и комиссии протокола, гарантирующий <strong className="text-[#F2FCFC]">100% чистую выплату</strong> без вычета из основной суммы.
          </div>
          <div className="mixero-inset rounded-xl p-3">
            <strong className="text-[#F2FCFC] block mb-0.5">• Завершающий круг очистки:</strong>
            финальная фаза ротации ликвидности при превышении лимита пула, устраняющая любые остаточные эвристические кластеры перед отправкой на чистый кошелёк.
          </div>
        </div>
      </div>

      {/* Mandatory Rules & Sanctions */}
      <div className="mixero-card rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#F2FCFC] font-extrabold">
          <Clock className="w-4 h-4 mixero-accent-text shrink-0" />
          <span className="mixero-display text-sm">РЕГЛАМЕНТ ВРЕМЕНИ И САНКЦИИ</span>
        </div>
        <div className="space-y-2 text-sm text-[#96C8CB] leading-relaxed font-medium">
          <p>
            • <strong className="text-[#F2FCFC]">Стандарт:</strong> от {protocolConfig.standardMinHours} до {protocolConfig.standardMaxHours} часов. При длительности свыше {protocolConfig.extendedCycleThresholdHours}ч активируется глубокий цикл (+{protocolConfig.extendedCyclePercent}%).
          </p>
          <p>
            • <strong className="text-[#F2FCFC]">Экспресс:</strong> фиксированное окно {protocolConfig.expressDelayHours} часов с множителем сети ×{protocolConfig.expressNetworkMultiplier}
            {protocolConfig.expressExtraPercent > 0 ? ` и надбавкой +${protocolConfig.expressExtraPercent}%` : ''}.
          </p>

          <div className="p-4 rounded-2xl mixero-sms-alert text-xs text-[#F2FCFC] mt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 font-extrabold uppercase tracking-wide text-[#FF7878]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>ВЫНУЖДЕННОЕ ПРАВИЛО ЗАВЕРШЕНИЯ И СРОКА (6 ЧАСОВ)</span>
            </div>
            <p className="leading-relaxed">
              При срабатывании лимита на время обработки заявки активация завершающего круга очистки (<strong className="font-mono">0.35%</strong>) является <strong>обязательной в течение 6 часов</strong>. В случае просрочки оплаты наступает автоматическая <strong>аннуляция сеанса и начисление штрафа</strong> за просроченный период вноса.
            </p>
            <p className="text-[11px] text-[#96C8CB] pt-1 border-t border-[#FF8C2E]/55/30">
              Допуск финальности блокчейна: <strong className="text-[#F2FCFC]">{protocolConfig.blockchainBufferNote}</strong> (TRON / Ethereum).
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Fee Table */}
      <div className="mixero-card rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#F2FCFC] font-extrabold">
            <Zap className="w-4 h-4 mixero-accent-text shrink-0" />
            <span className="mixero-display text-sm">ТАРИФНАЯ СЕТКА</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#96C8CB] shrink-0">
            Сеть: {protocolConfig.trc20NetworkFee} / {protocolConfig.erc20NetworkFee} USDT
          </span>
        </div>

        <div className="divide-y divide-[#22A8AC]/22 text-sm font-mono">
          {sortedTiers.map((tier, idx) => {
            const isBest = idx === sortedTiers.length - 1;
            return (
              <div key={tier.id} className="flex justify-between items-center py-2.5">
                <span className="text-[#96C8CB] font-sans font-semibold">
                  {formatTierRange(idx)}
                </span>
                <span
                  className={`font-extrabold tabular-nums ${
                    isBest
                      ? 'bg-[#FF8424] text-[#140800] px-2.5 py-0.5 rounded-lg border border-[#FFB36B] text-sm'
                      : 'text-[#F2FCFC]'
                  }`}
                >
                  {tier.percent}%{tier.label && isBest ? ` (${tier.label})` : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Guarantee Footer */}
      <div className="mixero-surface rounded-2xl p-4 flex items-center gap-3 text-xs text-[#96C8CB]">
        <Shield className="w-5 h-5 mixero-accent-text shrink-0" />
        <span>
          Все расчёты комиссий и хеширование Proof Key выполняются локально и детерминированно согласно стандарту безопасности MIXERO•CRYPTO Zero-Log.
        </span>
      </div>
    </div>
  );
};
