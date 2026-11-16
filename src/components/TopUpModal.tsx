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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-[#022024]/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md mixero-card rounded-3xl p-5 sm:p-6 relative text-[#F2FCFC] my-auto pb-safe">
        <div className="flex items-center justify-between pb-4 border-b border-[#22A8AC]/28">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl mixero-cta flex items-center justify-center font-bold">
              <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="mixero-display text-xs sm:text-sm font-extrabold text-[#F2FCFC]">
                ПОПОЛНЕНИЕ РЕЗЕРВА
              </h3>
              <p className="text-xs text-[#96C8CB] font-medium">
                0% вычетов из основной суммы выплаты
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-2xl text-[#F2FCFC] hover:border-[#FF9436] mixero-pill flex items-center justify-center transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedSuccess ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#063E2A]/90 border border-[#22D96E]/50 text-[#42F28B] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="mixero-display text-base font-extrabold text-[#F2FCFC]">
              РЕЗЕРВ ПОПОЛНЕН
            </h4>
            <p className="text-sm text-[#42F28B] font-mono font-extrabold">
              +{parseFloat(amount).toFixed(2)} USDT зачислено
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Network */}
            <div className="grid grid-cols-2 gap-2 mixero-inset p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setNetwork('TRC20')}
                className={`min-h-[48px] px-3 rounded-xl font-extrabold text-sm transition-all ${
                  network === 'TRC20'
                    ? 'mixero-cta text-[#140800]'
                    : 'text-[#96C8CB] hover:text-[#FFFFFF]'
                }`}
              >
                TRON · TRC-20
              </button>
              <button
                type="button"
                onClick={() => setNetwork('ERC20')}
                className={`min-h-[48px] px-3 rounded-xl font-extrabold text-sm transition-all ${
                  network === 'ERC20'
                    ? 'mixero-secondary-btn text-white'
                    : 'text-[#96C8CB] hover:text-[#FFFFFF]'
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
              label="Адрес кошелька пула (Reserve)"
            />

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#F2FCFC] block">
                Сумма пополнения (USDT)
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="280"
                  className="w-full min-h-[52px] mixero-input rounded-2xl px-4 text-lg font-black font-mono pr-16"
                />
                <span className="absolute right-4 font-extrabold text-xs mixero-accent-text font-mono">
                  USDT
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {quickPresets.slice(0, 4).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="min-h-[44px] mixero-pill hover:border-[#FF9436] hover:bg-[#08474D] rounded-xl text-xs font-mono font-extrabold text-[#F2FCFC] transition active:scale-[0.97]"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-[#96C8CB] leading-relaxed pt-1 font-medium">
              <ShieldCheck className="w-4 h-4 mixero-accent-text shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#F2FCFC]">Определение:</strong> резервный баланс покрывает комиссии пула и завершающие циклы, чтобы получатель получил ровно 100% основной суммы.
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
                  <div className="w-4 h-4 border-2 border-[#FF9436] border-t-transparent rounded-full animate-spin" />
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
