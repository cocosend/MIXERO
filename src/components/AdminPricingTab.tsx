import React, { useState } from 'react';
import { Percent, Plus, Trash2, RotateCcw, CheckCircle2, Clock, Coins } from 'lucide-react';
import { ProtocolConfig, DEFAULT_PROTOCOL_CONFIG, FeeTier } from '../types/config';

interface AdminPricingTabProps {
  protocolConfig: ProtocolConfig;
  onUpdateProtocolConfig: (next: ProtocolConfig) => void;
}

export const AdminPricingTab: React.FC<AdminPricingTabProps> = ({
  protocolConfig,
  onUpdateProtocolConfig,
}) => {
  const [draft, setDraft] = useState<ProtocolConfig>(protocolConfig);
  const [presetsText, setPresetsText] = useState(protocolConfig.quickAmountPresets.join(', '));
  const [hourPresetsText, setHourPresetsText] = useState(protocolConfig.standardHourPresets.join(', '));
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmounts = presetsText
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    const parsedHours = hourPresetsText
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    const updated: ProtocolConfig = {
      ...draft,
      quickAmountPresets: parsedAmounts.length > 0 ? parsedAmounts : DEFAULT_PROTOCOL_CONFIG.quickAmountPresets,
      standardHourPresets: parsedHours.length > 0 ? parsedHours : DEFAULT_PROTOCOL_CONFIG.standardHourPresets,
    };
    onUpdateProtocolConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setDraft(DEFAULT_PROTOCOL_CONFIG);
    setPresetsText(DEFAULT_PROTOCOL_CONFIG.quickAmountPresets.join(', '));
    setHourPresetsText(DEFAULT_PROTOCOL_CONFIG.standardHourPresets.join(', '));
    onUpdateProtocolConfig(DEFAULT_PROTOCOL_CONFIG);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateTier = (id: string, patch: Partial<FeeTier>) => {
    setDraft((prev) => ({
      ...prev,
      feeTiers: prev.feeTiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const addTier = () => {
    const newTier: FeeTier = {
      id: `tier_${Date.now()}`,
      maxAmount: 15000,
      percent: 2.0,
      label: 'Новый уровень',
    };
    setDraft((prev) => ({
      ...prev,
      feeTiers: [...prev.feeTiers, newTier],
    }));
  };

  const removeTier = (id: string) => {
    if (draft.feeTiers.length <= 1) return;
    setDraft((prev) => ({
      ...prev,
      feeTiers: prev.feeTiers.filter((t) => t.id !== id),
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Network Fees & Express Settings */}
      <div className="bg-[#0d131d] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Coins className="w-4 h-4 text-teal-400" />
          <span>Стоимость сети и Экспресс-режим</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Сеть TRC-20 (USDT)</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.trc20NetworkFee}
              onChange={(e) => setDraft({ ...draft, trc20NetworkFee: parseFloat(e.target.value) || 0 })}
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Сеть ERC-20 (USDT)</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.erc20NetworkFee}
              onChange={(e) => setDraft({ ...draft, erc20NetworkFee: parseFloat(e.target.value) || 0 })}
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Экспресс ×сеть</span>
            <input
              type="number"
              step="any"
              min="1"
              value={draft.expressNetworkMultiplier}
              onChange={(e) =>
                setDraft({ ...draft, expressNetworkMultiplier: parseFloat(e.target.value) || 1 })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Экспресс +%</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.expressExtraPercent}
              onChange={(e) =>
                setDraft({ ...draft, expressExtraPercent: parseFloat(e.target.value) || 0 })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Экспресс (ч)</span>
            <input
              type="number"
              step="1"
              min="1"
              value={draft.expressDelayHours}
              onChange={(e) =>
                setDraft({ ...draft, expressDelayHours: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
        </div>
      </div>

      {/* Fee Tiers (Percentages by Volume) */}
      <div className="bg-[#0d131d] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Percent className="w-4 h-4 text-amber-300" />
            <span>Проценты комиссии по объёму</span>
          </div>
          <button
            type="button"
            onClick={addTier}
            className="min-h-[36px] px-3 rounded-xl bg-[#15202e] hover:bg-[#1d2b3d] border border-teal-400/30 text-teal-300 text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ступень</span>
          </button>
        </div>

        <div className="space-y-2">
          {draft.feeTiers.map((tier) => (
            <div
              key={tier.id}
              className="grid grid-cols-12 gap-2 items-center bg-[#070a0f] p-2.5 rounded-xl border border-white/[0.07]"
            >
              <div className="col-span-5">
                <span className="text-[10px] text-slate-500 block">Порог до (пусто = ∞)</span>
                <input
                  type="number"
                  step="any"
                  placeholder="Без лимита"
                  value={tier.maxAmount === null ? '' : tier.maxAmount}
                  onChange={(e) =>
                    updateTier(tier.id, {
                      maxAmount: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full min-h-[38px] bg-[#0d131d] border border-white/10 rounded-lg px-2.5 text-xs font-mono text-white"
                />
              </div>

              <div className="col-span-3">
                <span className="text-[10px] text-slate-500 block">Ставка %</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={tier.percent}
                  onChange={(e) =>
                    updateTier(tier.id, { percent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full min-h-[38px] bg-[#0d131d] border border-white/10 rounded-lg px-2.5 text-xs font-mono text-amber-300 font-bold"
                />
              </div>

              <div className="col-span-3">
                <span className="text-[10px] text-slate-500 block">Метка</span>
                <input
                  type="text"
                  value={tier.label || ''}
                  onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                  className="w-full min-h-[38px] bg-[#0d131d] border border-white/10 rounded-lg px-2 text-xs text-slate-200"
                />
              </div>

              <div className="col-span-1 flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => removeTier(tier.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400"
                  title="Удалить уровень"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time, Deep Cycle & Limits */}
      <div className="bg-[#0d131d] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <Clock className="w-4 h-4 text-sky-400" />
          <span>Лимиты, часы и глубокий цикл</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Мин. сумма (USDT)</span>
            <input
              type="number"
              step="any"
              min="1"
              value={draft.minAmount}
              onChange={(e) => setDraft({ ...draft, minAmount: parseFloat(e.target.value) || 1 })}
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Макс. сумма (USDT)</span>
            <input
              type="number"
              step="any"
              min="1"
              value={draft.maxAmount}
              onChange={(e) => setDraft({ ...draft, maxAmount: parseFloat(e.target.value) || 100000 })}
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Стандарт мин (ч)</span>
            <input
              type="number"
              min="1"
              value={draft.standardMinHours}
              onChange={(e) =>
                setDraft({ ...draft, standardMinHours: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Стандарт макс (ч)</span>
            <input
              type="number"
              min="1"
              value={draft.standardMaxHours}
              onChange={(e) =>
                setDraft({ ...draft, standardMaxHours: parseInt(e.target.value, 10) || 72 })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Шаг (ч)</span>
            <input
              type="number"
              min="1"
              value={draft.standardStepHours}
              onChange={(e) =>
                setDraft({ ...draft, standardStepHours: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Порог доп. цикла (ч)</span>
            <input
              type="number"
              min="1"
              value={draft.extendedCycleThresholdHours}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  extendedCycleThresholdHours: parseInt(e.target.value, 10) || 24,
                })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Доп. цикл (%)</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.extendedCyclePercent}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  extendedCyclePercent: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Мин. доп. сбор ($)</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.extendedCycleMinFee}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  extendedCycleMinFee: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-sm font-mono text-white"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Пресеты сумм (через запятую)</span>
            <input
              type="text"
              value={presetsText}
              onChange={(e) => setPresetsText(e.target.value)}
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Пресеты часов (через запятую)</span>
            <input
              type="text"
              value={hourPresetsText}
              onChange={(e) => setHourPresetsText(e.target.value)}
              className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs font-mono text-white"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <span className="text-[11px] text-slate-400 block">Примечание буфера блокчейна</span>
          <input
            type="text"
            value={draft.blockchainBufferNote}
            onChange={(e) => setDraft({ ...draft, blockchainBufferNote: e.target.value })}
            className="w-full min-h-[44px] bg-[#070a0f] border border-white/15 rounded-xl px-3 text-xs text-white"
          />
        </label>
      </div>

      {/* Save / Reset Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="min-h-[48px] px-4 rounded-2xl bg-[#101621] hover:bg-[#172030] border border-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Сброс</span>
        </button>

        <button
          type="submit"
          className="flex-1 min-h-[48px] px-4 mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Цены и проценты сохранены!</span>
            </>
          ) : (
            <span>Применить ко всему приложению</span>
          )}
        </button>
      </div>
    </form>
  );
};
