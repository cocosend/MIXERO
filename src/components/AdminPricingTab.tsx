import React, { useState } from 'react';
import { Percent, Plus, Trash2, RotateCcw, CheckCircle2, Clock, Coins, Fingerprint } from 'lucide-react';
import { ProtocolConfig, DEFAULT_PROTOCOL_CONFIG, FeeTier } from '../types/config';

interface AdminPricingTabProps {
  protocolConfig: ProtocolConfig;
  onUpdateProtocolConfig: (next: ProtocolConfig) => void;
  authorizeMutation: (actionLabel: string, mutationFn: () => void | Promise<void>) => void;
}

export const AdminPricingTab: React.FC<AdminPricingTabProps> = ({
  protocolConfig,
  onUpdateProtocolConfig,
  authorizeMutation,
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

    authorizeMutation('Изменение цен, процентов и лимитов протокола', () => {
      onUpdateProtocolConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleReset = () => {
    authorizeMutation('Сброс тарифов и параметров протокола', () => {
      setDraft(DEFAULT_PROTOCOL_CONFIG);
      setPresetsText(DEFAULT_PROTOCOL_CONFIG.quickAmountPresets.join(', '));
      setHourPresetsText(DEFAULT_PROTOCOL_CONFIG.standardHourPresets.join(', '));
      onUpdateProtocolConfig(DEFAULT_PROTOCOL_CONFIG);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
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
      <div className="mixero-surface rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#F2FCFC] mixero-display">
          <Coins className="w-4 h-4 mixero-accent-text shrink-0" />
          <span>СТОИМОСТЬ СЕТИ И ЭКСПРЕСС</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Сеть TRC-20 (USDT)</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.trc20NetworkFee}
              onChange={(e) => setDraft({ ...draft, trc20NetworkFee: parseFloat(e.target.value) || 0 })}
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Сеть ERC-20 (USDT)</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.erc20NetworkFee}
              onChange={(e) => setDraft({ ...draft, erc20NetworkFee: parseFloat(e.target.value) || 0 })}
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Экспресс ×сеть</span>
            <input
              type="number"
              step="any"
              min="1"
              value={draft.expressNetworkMultiplier}
              onChange={(e) =>
                setDraft({ ...draft, expressNetworkMultiplier: parseFloat(e.target.value) || 1 })
              }
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Экспресс +%</span>
            <input
              type="number"
              step="any"
              min="0"
              value={draft.expressExtraPercent}
              onChange={(e) =>
                setDraft({ ...draft, expressExtraPercent: parseFloat(e.target.value) || 0 })
              }
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Экспресс (ч)</span>
            <input
              type="number"
              step="1"
              min="1"
              value={draft.expressDelayHours}
              onChange={(e) =>
                setDraft({ ...draft, expressDelayHours: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
        </div>
      </div>

      {/* Fee Tiers (Percentages by Volume) */}
      <div className="mixero-surface rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#F2FCFC] mixero-display">
            <Percent className="w-4 h-4 mixero-accent-text shrink-0" />
            <span>ПРОЦЕНТЫ ПО ОБЪЁМУ</span>
          </div>
          <button
            type="button"
            onClick={addTier}
            className="min-h-[38px] px-3 rounded-xl mixero-pill border-[#FF8C2E]/55 text-[#F2FCFC] hover:bg-[#08474D] text-xs font-extrabold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ступень</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {draft.feeTiers.map((tier) => (
            <div
              key={tier.id}
              className="grid grid-cols-12 gap-2 items-center mixero-inset p-3 rounded-xl"
            >
              <div className="col-span-5 space-y-1">
                <span className="text-[11px] text-[#96C8CB] font-semibold block">Порог до (пусто = ∞)</span>
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
                  className="w-full min-h-[40px] mixero-input rounded-lg px-2.5 text-sm font-mono font-bold"
                />
              </div>

              <div className="col-span-3 space-y-1">
                <span className="text-[11px] text-[#96C8CB] font-semibold block">Ставка %</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={tier.percent}
                  onChange={(e) =>
                    updateTier(tier.id, { percent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full min-h-[40px] mixero-input rounded-lg px-2.5 text-sm font-mono mixero-accent-text font-extrabold"
                />
              </div>

              <div className="col-span-3 space-y-1">
                <span className="text-[11px] text-[#96C8CB] font-semibold block">Метка</span>
                <input
                  type="text"
                  value={tier.label || ''}
                  onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                  className="w-full min-h-[40px] mixero-input rounded-lg px-2 text-xs text-[#F2FCFC] font-semibold"
                />
              </div>

              <div className="col-span-1 flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => removeTier(tier.id)}
                  className="p-2 text-[#96C8CB] hover:text-[#FF7878]"
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
      <div className="mixero-surface rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#F2FCFC] mixero-display">
          <Clock className="w-4 h-4 mixero-accent-text shrink-0" />
          <span>ЛИМИТЫ, ЧАСЫ И ЦИКЛ</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Мин. сумма (USDT)</span>
            <input
              type="number"
              step="any"
              min="1"
              value={draft.minAmount}
              onChange={(e) => setDraft({ ...draft, minAmount: parseFloat(e.target.value) || 1 })}
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Макс. сумма (USDT)</span>
            <input
              type="number"
              step="any"
              min="1"
              value={draft.maxAmount}
              onChange={(e) => setDraft({ ...draft, maxAmount: parseFloat(e.target.value) || 100000 })}
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Стандарт мин (ч)</span>
            <input
              type="number"
              min="1"
              value={draft.standardMinHours}
              onChange={(e) =>
                setDraft({ ...draft, standardMinHours: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Стандарт макс (ч)</span>
            <input
              type="number"
              min="1"
              value={draft.standardMaxHours}
              onChange={(e) =>
                setDraft({ ...draft, standardMaxHours: parseInt(e.target.value, 10) || 72 })
              }
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Шаг (ч)</span>
            <input
              type="number"
              min="1"
              value={draft.standardStepHours}
              onChange={(e) =>
                setDraft({ ...draft, standardStepHours: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Порог доп. (ч)</span>
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
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Доп. цикл (%)</span>
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
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Мин. сбор ($)</span>
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
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Пресеты сумм (через запятую)</span>
            <input
              type="text"
              value={presetsText}
              onChange={(e) => setPresetsText(e.target.value)}
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-[#96C8CB] font-semibold block">Пресеты часов (через запятую)</span>
            <input
              type="text"
              value={hourPresetsText}
              onChange={(e) => setHourPresetsText(e.target.value)}
              className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-mono font-bold"
            />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="text-xs text-[#96C8CB] font-semibold block">Примечание буфера блокчейна</span>
          <input
            type="text"
            value={draft.blockchainBufferNote}
            onChange={(e) => setDraft({ ...draft, blockchainBufferNote: e.target.value })}
            className="w-full min-h-[46px] mixero-input rounded-xl px-3 text-sm font-medium"
          />
        </label>
      </div>

      {/* Save / Reset Actions */}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={handleReset}
          className="min-h-[50px] px-4 rounded-2xl mixero-pill text-[#F2FCFC] hover:border-[#FF9436] text-sm font-extrabold flex items-center gap-1.5 shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Сброс</span>
        </button>

        <button
          type="submit"
          className="flex-1 min-h-[50px] px-4 mixero-cta font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Цены и проценты сохранены!</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4" />
              <span>Подтвердить WebAuthn и применить</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
