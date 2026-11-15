import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { TransactionProgressIndicator } from './TransactionProgressIndicator';
import { LiveTrackingCard } from './LiveTrackingCard';
import { ReceiptData } from './ReceiptModal';
import { DepositAddressCard } from './DepositAddressCard';
import { triggerHaptic } from '../utils/haptics';
import { ProtocolConfig, calculateProtocolFees } from '../types/config';

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
}

interface MixerSectionProps {
  onAddTransaction?: (tx: CleanTransaction) => void;
  customAddresses: { trc20: string; erc20: string };
  activeUserTx?: CleanTransaction | null;
  userBalance?: number;
  onPayFeeWithBalance?: (feeAmount: number) => void;
  onOpenTopUp?: () => void;
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
      if (onOpenTopUp) onOpenTopUp();
      return;
    }

    if (onPayFeeWithBalance) {
      onPayFeeWithBalance(feeBreakdown.totalFee);
    }

    setStep('processing');
    setProcessingStage(1);

    setTimeout(() => setProcessingStage(2), 500);
    setTimeout(() => setProcessingStage(3), 1000);
    setTimeout(() => {
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
  };

  const handleResetSession = () => {
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
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-bold text-white">
              Активная сессия #{activeUserTx.id.slice(0, 10)}
            </span>
            {onViewReceipt && (
              <button
                type="button"
                onClick={() => onViewReceipt(currentReceipt)}
                className="min-h-[44px] px-4 rounded-2xl bg-[#101621] hover:bg-[#172030] border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition"
              >
                <FileText className="w-4 h-4 text-teal-400" />
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
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <span className="text-sm font-bold text-white">Реквизиты депозита</span>
                <span className="text-sm font-mono font-bold text-amber-300 tabular-nums">
                  {activeUserTx.amount} USDT · {activeUserTx.network}
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
                <span className="text-xs font-medium text-slate-400 block px-1">
                  Сеть перевода
                </span>
                <div className="grid grid-cols-2 gap-2 bg-[#080c12] border border-white/[0.08] p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setNetwork('TRC20')}
                    className={`min-h-[50px] px-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      network === 'TRC20'
                        ? 'bg-[#15202e] text-white border border-teal-400/45 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>TRON · TRC-20</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNetwork('ERC20')}
                    className={`min-h-[50px] px-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      network === 'ERC20'
                        ? 'bg-[#15202e] text-white border border-sky-400/45 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Ethereum · ERC-20</span>
                  </button>
                </div>
              </div>

              {/* Recipient Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-medium text-slate-400">
                    Чистый адрес получателя
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleConnectWallet}
                      className="min-h-[36px] text-xs text-sky-300 hover:text-sky-200 font-semibold flex items-center gap-1"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{isWalletConnected ? 'Привязан' : 'Кошелек'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePasteAddress}
                      className="min-h-[36px] text-xs text-teal-300 hover:text-teal-200 font-semibold"
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
                  className="w-full min-h-[54px] bg-[#080c12] border border-white/10 rounded-2xl px-4 text-sm font-mono text-white focus:outline-none focus:border-teal-400 transition select-text"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-medium text-slate-400">
                    Сумма очистки
                  </label>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
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
                    className="w-full min-h-[56px] bg-[#080c12] border border-white/10 rounded-2xl px-4 text-xl font-bold font-mono text-white focus:outline-none focus:border-teal-400 pr-20 tabular-nums"
                  />
                  <span className="absolute right-4 font-bold text-xs text-amber-300 font-mono">
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
                      className="min-h-[44px] rounded-xl bg-[#101621] border border-white/10 hover:border-teal-400/40 text-xs font-mono font-bold text-slate-200 transition active:scale-[0.96]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tariff Selection */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-400 block px-1">
                  Режим очистки
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTariff('standard')}
                    className={`text-left p-4 rounded-2xl border transition-all min-h-[86px] ${
                      tariff === 'standard'
                        ? 'bg-gradient-to-br from-sky-950/60 via-teal-950/50 to-[#0c121b] border-teal-400/60'
                        : 'bg-[#0b1018] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">Стандарт</span>
                      <span className="text-sm font-mono font-extrabold text-teal-300 tabular-nums">
                        {standardDelay}ч
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">
                      От {protocolConfig.standardMinHours}ч · базовая сеть
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTariff('express')}
                    className={`text-left p-4 rounded-2xl border transition-all min-h-[86px] ${
                      tariff === 'express'
                        ? 'bg-gradient-to-br from-amber-950/50 via-teal-950/40 to-[#0c121b] border-amber-400/60'
                        : 'bg-[#0b1018] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">Экспресс</span>
                      <span className="text-sm font-mono font-extrabold text-amber-300 tabular-nums">
                        {protocolConfig.expressDelayHours}ч
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-snug">
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
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-teal-400" />
                      Задержка пула
                    </span>
                    <span className="font-bold text-amber-300 font-mono text-sm tabular-nums">
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
                        className={`min-h-[44px] rounded-xl text-xs font-mono font-bold transition border ${
                          standardDelay === hours
                            ? 'bg-[#162230] border-teal-400/60 text-teal-300'
                            : 'bg-[#0a0e16] border-white/10 text-slate-400 hover:text-white'
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
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-sans">Баланс комиссий</span>
                  <span className={`font-bold tabular-nums ${hasEnoughBalance ? 'text-teal-300' : 'text-amber-300'}`}>
                    {userBalance.toFixed(2)} USDT · {hasEnoughBalance ? 'готов' : `не хватает ${deficitAmount.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-sans">
                    Сбор ({feeBreakdown.serviceFeePercent}% + {feeBreakdown.networkFee.toFixed(2)} сеть)
                  </span>
                  <span className="text-slate-200 font-semibold tabular-nums">
                    {feeBreakdown.totalFee.toFixed(2)} USDT
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/[0.07]">
                  <div>
                    <span className="font-bold text-white text-sm font-sans block">
                      К получению
                    </span>
                    <span className="text-[11px] text-teal-300 font-sans">
                      100% без удержаний
                    </span>
                  </div>
                  <span className="text-2xl font-black tabular-nums mixero-fade-text">
                    {calculatedReceiveAmount.toFixed(2)} USDT
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
                  onClick={() => onOpenTopUp && onOpenTopUp()}
                  className="w-full min-h-[56px] px-5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-extrabold text-base rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Пополнить комиссии (+{deficitAmount.toFixed(2)} $)</span>
                </button>
              )}
            </form>
          )}

          {step === 'processing' && (
            <div className="mixero-card rounded-3xl p-8 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-full border-2 border-white/10 border-t-teal-400 animate-spin" />
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">
                  {processingStage === 1 && 'Подготовка пула ликвидности...'}
                  {processingStage === 2 && 'Разрыв ончейн-связей...'}
                  {processingStage === 3 && 'Генерация ключа гарантии...'}
                </h3>
                <p className="text-xs text-slate-400">
                  Выделение изолированного адреса без сохранения логов
                </p>
              </div>
              <div className="w-full bg-[#06090e] rounded-full h-2 overflow-hidden border border-white/[0.07]">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: processingStage === 1 ? '35%' : processingStage === 2 ? '70%' : '100%',
                    background: 'linear-gradient(90deg, #38bdf8 0%, #2dd4bf 55%, #fbbf24 100%)',
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
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <span className="text-sm font-bold text-white block">Реквизиты перевода</span>
                    <span className="text-xs text-slate-400">
                      {tariff === 'express' ? `Экспресс (${activeDelay}ч)` : `Стандарт (${activeDelay}ч)`} · {network}
                    </span>
                  </div>
                  {onViewReceipt && (
                    <button
                      type="button"
                      onClick={() => onViewReceipt(currentReceipt)}
                      className="min-h-[44px] px-3.5 rounded-xl bg-[#101621] border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4 text-teal-400" />
                      <span>Квитанция</span>
                    </button>
                  )}
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Отправьте ровно <strong className="text-amber-300 font-mono">{amount} USDT</strong> одним переводом:
                </p>

                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="min-h-[40px] mb-2 text-xs font-semibold text-slate-400 hover:text-teal-300 flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-teal-400" />
                    <span>{showQr ? 'Скрыть QR-код' : 'Показать QR-код'}</span>
                  </button>

                  {showQr && <QRCodeDisplay value={depositAddress} size={150} />}
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
                  className="w-full text-left bg-[#080c12] border border-white/10 hover:border-teal-400/40 rounded-2xl p-4 min-h-[56px] flex justify-between items-center transition"
                >
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      Ключ гарантии (Proof Key)
                    </span>
                    <span className="font-mono font-bold text-sm text-amber-300">
                      {mixingKey}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#111824] border border-white/10 flex items-center justify-center text-slate-200">
                    {copiedField === 'key' ? (
                      <Check className="w-4 h-4 text-teal-300" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetSession}
                className="w-full min-h-[52px] bg-[#101621] hover:bg-[#172030] border border-white/10 text-slate-200 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4 text-teal-400" />
                <span>Новый расчет</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
