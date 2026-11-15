import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { DepositAddressCard } from './DepositAddressCard';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  customAddresses: { trc20: string; erc20: string };
  onSuccessTopUp: (amount: number, network: 'TRC20' | 'ERC20') => void;
  quickPresets?: number[];
  initialAmount?: number;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  customAddresses,
  onSuccessTopUp,
  quickPresets = [100, 280, 500, 1000],
  initialAmount,
}) => {
  const [network, setNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [amount, setAmount] = useState(() =>
    initialAmount && initialAmount > 0 ? initialAmount.toString() : '280'
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && initialAmount && initialAmount > 0) {
      setAmount(initialAmount.toString());
    }
  }, [isOpen, initialAmount]);

  if (!isOpen) return null;

  const targetAddress =
    network === 'TRC20'
      ? customAddresses.trc20 || 'TNwS3upnJmFADuCEVy24z8g2F79eV6pv79'
      : customAddresses.erc20 || '0x71C7656EC7ab88b098defB751B7401B5f6d1476B';

  const handleConfirmTopUp = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setCompletedSuccess(true);
      onSuccessTopUp(amt, network);

      setTimeout(() => {
        setCompletedSuccess(false);
        onClose();
      }, 1300);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md mixero-card rounded-3xl p-5 sm:p-6 relative text-slate-100 my-auto pb-safe">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl mixero-cta flex items-center justify-center font-bold">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Пополнение комиссий
              </h3>
              <p className="text-xs text-slate-400">
                0% вычетов из основной суммы выплаты
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-2xl text-slate-400 hover:text-white bg-[#101621] border border-white/10 flex items-center justify-center transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-teal-500/20 border border-teal-400 text-teal-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-extrabold text-white">Баланс пополнен</h4>
            <p className="text-sm text-teal-300 font-mono">
              +{parseFloat(amount).toFixed(2)} USDT зачислено
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Network */}
            <div className="grid grid-cols-2 gap-2 bg-[#080c12] p-1.5 rounded-2xl border border-white/[0.07]">
              <button
                type="button"
                onClick={() => setNetwork('TRC20')}
                className={`min-h-[48px] px-3 rounded-xl font-bold text-sm transition-all ${
                  network === 'TRC20'
                    ? 'bg-[#162030] text-white border border-teal-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TRON · TRC-20
              </button>
              <button
                type="button"
                onClick={() => setNetwork('ERC20')}
                className={`min-h-[48px] px-3 rounded-xl font-bold text-sm transition-all ${
                  network === 'ERC20'
                    ? 'bg-[#162030] text-white border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ethereum · ERC-20
              </button>
            </div>

            {/* QR */}
            <div className="flex justify-center py-1">
              <QRCodeDisplay value={targetAddress} size={132} />
            </div>

            <DepositAddressCard
              address={targetAddress}
              network={network}
              label="Адрес кошелька пула"
            />

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 block">
                Сумма пополнения (USDT)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full min-h-[52px] bg-[#080c12] border border-white/10 rounded-2xl px-4 text-lg font-bold font-mono text-white focus:outline-none focus:border-teal-400 pr-16"
                />
                <span className="absolute right-4 font-bold text-xs text-amber-300 font-mono">
                  USDT
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {quickPresets.slice(0, 4).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="min-h-[44px] bg-[#101621] border border-white/10 hover:border-teal-400/40 rounded-xl text-xs font-mono font-bold text-slate-200 transition active:scale-[0.97]"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed pt-1">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                Баланс профиля покрывает комиссии протокола, чтобы получатель получил ровно 100% суммы.
              </span>
            </div>

            <button
              type="button"
              disabled={isSimulating || !amount || parseFloat(amount) <= 0}
              onClick={handleConfirmTopUp}
              className="w-full min-h-[54px] mixero-cta disabled:opacity-40 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              {isSimulating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Проверка транзакции...</span>
                </>
              ) : (
                <span>Подтвердить пополнение</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
