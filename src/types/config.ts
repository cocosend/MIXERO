export interface FeeTier {
  id: string;
  maxAmount: number | null; // null = infinity (свыше предыдущего порога)
  percent: number;
  label?: string;
}

export interface ProtocolConfig {
  // Сетевые комиссии (базовые)
  trc20NetworkFee: number;
  erc20NetworkFee: number;

  // Экспресс тариф
  expressNetworkMultiplier: number; // множитель к себестоимости сети (по умолчанию 2)
  expressExtraPercent: number; // доп. процент к комиссии сервиса (по умолчанию 0)
  expressDelayHours: number; // время экспресса в часах (по умолчанию 10)

  // Стандартный тариф
  standardMinHours: number; // минимум часов (по умолчанию 24)
  standardMaxHours: number; // максимум часов (по умолчанию 72)
  standardStepHours: number; // шаг слайдера (по умолчанию 2)
  standardHourPresets: number[]; // пресеты [24, 36, 48, 72]

  // Глубокий цикл (24-36ч)
  extendedCycleThresholdHours: number; // порог включения доп. цикла (по умолчанию 24)
  extendedCyclePercent: number; // доп. процент за глубокий цикл (по умолчанию 0.25)
  extendedCycleMinFee: number; // минимальный доп. сбор в USDT (по умолчанию 0.5)

  // Лимиты и пресеты сумм
  minAmount: number;
  maxAmount: number;
  quickAmountPresets: number[];

  // Сетка процентов по объёму
  feeTiers: FeeTier[];

  // Примечание к регламенту (можно менять в админке)
  blockchainBufferNote: string;
}

export const DEFAULT_PROTOCOL_CONFIG: ProtocolConfig = {
  trc20NetworkFee: 2.5,
  erc20NetworkFee: 18.0,
  expressNetworkMultiplier: 2,
  expressExtraPercent: 0,
  expressDelayHours: 10,
  standardMinHours: 24,
  standardMaxHours: 72,
  standardStepHours: 2,
  standardHourPresets: [24, 36, 48, 72],
  extendedCycleThresholdHours: 24,
  extendedCyclePercent: 0.25,
  extendedCycleMinFee: 0.5,
  minAmount: 20,
  maxAmount: 100000,
  quickAmountPresets: [50, 100, 500, 1000, 5000],
  feeTiers: [
    { id: 'tier_1', maxAmount: 1000, percent: 5.0, label: 'Базовый' },
    { id: 'tier_2', maxAmount: 10000, percent: 3.5, label: 'Средний' },
    { id: 'tier_3', maxAmount: 25000, percent: 2.5, label: 'Про' },
    { id: 'tier_4', maxAmount: 50000, percent: 1.5, label: 'Премиум' },
    { id: 'tier_5', maxAmount: null, percent: 0.5, label: 'VIP' },
  ],
  blockchainBufferNote: '±3–7 часов',
};

export function getServiceFeePercent(amount: number, config: ProtocolConfig, tariff: 'standard' | 'express'): number {
  const sortedTiers = [...config.feeTiers].sort((a, b) => {
    if (a.maxAmount === null) return 1;
    if (b.maxAmount === null) return -1;
    return a.maxAmount - b.maxAmount;
  });

  const basePercent = (() => {
    if (!amount || isNaN(amount) || amount <= 0) {
      return sortedTiers[0]?.percent ?? 5.0;
    }
    for (const tier of sortedTiers) {
      if (tier.maxAmount === null || amount <= tier.maxAmount) {
        return tier.percent;
      }
    }
    return sortedTiers[sortedTiers.length - 1]?.percent ?? 0.5;
  })();

  return tariff === 'express' ? basePercent + (config.expressExtraPercent || 0) : basePercent;
}

export function calculateProtocolFees(
  amount: number,
  network: 'TRC20' | 'ERC20',
  tariff: 'standard' | 'express',
  config: ProtocolConfig
) {
  const serviceFeePercent = getServiceFeePercent(amount, config, tariff);
  const baseNetworkFee = network === 'TRC20' ? config.trc20NetworkFee : config.erc20NetworkFee;
  const networkFee = tariff === 'express' ? baseNetworkFee * config.expressNetworkMultiplier : baseNetworkFee;
  const validAmount = isNaN(amount) || amount <= 0 ? 0 : amount;
  const serviceFeeAmount = (validAmount * serviceFeePercent) / 100;
  const totalFee = serviceFeeAmount + networkFee;

  return {
    serviceFeePercent,
    baseNetworkFee,
    networkFee,
    serviceFeeAmount,
    totalFee,
  };
}
