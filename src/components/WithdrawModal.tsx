import React, { useState } from 'react';
import { X, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccessWithdraw: (amount: number, network: 'TRC20' | 'ERC20', targetAddress: string) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  balance,
  onSuccessWithdraw,
}) => {
  const [network, setNetwork] = useState<'TRC20' | 'ERC20'>('TRC20');
  const [amount, setAmount] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Введите корректную сумму');
      return;
    }
    if (amt > balance) {
      setErrorMsg(`Доступно: ${balance.toFixed(2)} USDT`);
      return;
    }
    if (!targetAddress.trim()) {
      setErrorMsg('Укажите адрес получателя');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsProcessing(false);
      setSuccess(true);
      onSuccessWithdraw(amt, network, targetAddress.trim());

      setTimeout(() => {
        setSuccess(false);
        setAmount('');
        setTargetAddress('');
        onClose();
      }, 1300);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md mixero-card rounded-3xl p-5 sm:p-6 relative text-slate-100 pb-safe">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-teal-400 text-slate-950 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Вывод средств
              </h3>
              <p className="text-xs text-slate-400">
                Доступно: {balance.toFixed(2)} USDT
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

        {success ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-teal-500/20 border border-teal-400 text-teal-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-extrabold text-white">Перевод отправлен</h4>
            <p className="text-sm text-teal-300 font-mono">
              -{parseFloat(amount).toFixed(2)} USDT
            </p>
          </div>
        ) : (
          <form onSubmit={handleWithdraw} className="space-y-4 pt-4">
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 block">
                Адрес кошелька получения
              </label>
              <input
                type="text"
                required
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder={network === 'TRC20' ? 'T...' : '0x...'}
                className="w-full min-h-[52px] bg-[#080c12] border border-white/10 rounded-2xl px-4 text-sm font-mono text-white focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Сумма вывода</span>
                <button
                  type="button"
                  onClick={() => setAmount(balance.toString())}
                  className="text-amber-300 hover:text-amber-200 font-mono font-bold min-h-[32px] px-1"
                >
                  Макс: {balance.toFixed(2)}
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[52px] bg-[#080c12] border border-white/10 rounded-2xl px-4 text-lg font-bold font-mono text-white focus:outline-none focus:border-teal-400 pr-16"
                />
                <span className="absolute right-4 font-bold text-xs text-amber-300 font-mono">
                  USDT
                </span>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
              className="w-full min-h-[54px] mixero-cta disabled:opacity-40 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  <span>Вывести средства</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
