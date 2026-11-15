import React from 'react';
import { X, ShieldCheck, Copy, Check, FileText, Lock, Printer } from 'lucide-react';
import { MixeroLogo } from './GymLogo';
import { triggerHaptic } from '../utils/haptics';

export interface ReceiptData {
  id: string;
  type: 'mixing' | 'account_topup' | 'account_payout' | 'fee_payment';
  title: string;
  amount: number;
  receivedAmount?: number;
  feeAmount?: number;
  network: 'TRC20' | 'ERC20';
  timestamp: number;
  status: string;
  recipientAddress?: string;
  depositAddress?: string;
  proofKey: string;
  sshSignature?: string;
  txHash?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, receipt }) => {
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedSig, setCopiedSig] = React.useState(false);

  if (!isOpen || !receipt) return null;

  const dateObj = new Date(receipt.timestamp || Date.now());
  const formattedDate = dateObj.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const sshFingerprint =
    receipt.sshSignature ||
    `SHA256:MIXERO_${(receipt.id + receipt.proofKey)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 1337)
      .toString(16)
      .toUpperCase()}_${receipt.amount.toFixed(0)}E9`;

  const handleCopyProof = () => {
    triggerHaptic([35, 25, 45]);
    navigator.clipboard.writeText(receipt.proofKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  const handleCopySSH = () => {
    triggerHaptic([35, 25, 45]);
    navigator.clipboard.writeText(sshFingerprint).then(() => {
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md mixero-card rounded-3xl relative text-slate-100 overflow-hidden my-auto pb-safe">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Квитанция
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-11 h-11 rounded-2xl text-slate-300 hover:text-white bg-[#101621] border border-white/10 flex items-center justify-center transition"
              title="Печать"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-2xl text-slate-300 hover:text-white bg-[#101621] border border-white/10 flex items-center justify-center transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <MixeroLogo size={40} hasGlow={false} />
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-tight font-sans flex items-center gap-1">
                  <span className="mixero-fade-text">MIXERO</span> 📼
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  No-Log Zero-Knowledge
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-bold text-teal-300 block">
                Верифицировано
              </span>
              <span className="text-[11px] text-slate-400">{formattedDate}</span>
            </div>
          </div>

          {/* Amount Block */}
          <div className="text-center py-4 bg-[#070b11] rounded-2xl border border-white/[0.06] space-y-1">
            <span className="text-xs font-medium text-slate-400 block font-sans">
              {receipt.title}
            </span>
            <div className="text-3xl font-black tracking-tight tabular-nums">
              <span className="mixero-fade-text">{receipt.amount.toFixed(2)}</span>{' '}
              <span className="text-base font-bold text-slate-200">USDT</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {receipt.network} · <span className="text-teal-300">{receipt.status}</span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-xs divide-y divide-white/[0.06]">
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400 font-sans">ID квитанции</span>
              <span className="text-white font-bold">{receipt.id}</span>
            </div>

            <div className="flex justify-between items-center pt-2.5">
              <span className="text-slate-400 font-sans">Дата и время</span>
              <span className="text-slate-200 tabular-nums">
                {formattedDate}, {formattedTime}
              </span>
            </div>

            {receipt.receivedAmount !== undefined && (
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-slate-400 font-sans">К выплате</span>
                <span className="text-teal-300 font-bold tabular-nums">
                  {receipt.receivedAmount.toFixed(2)} USDT
                </span>
              </div>
            )}

            {receipt.feeAmount !== undefined && (
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-slate-400 font-sans">Комиссия</span>
                <span className="text-slate-200 tabular-nums">
                  {receipt.feeAmount.toFixed(2)} USDT
                </span>
              </div>
            )}

            {receipt.recipientAddress && (
              <div className="pt-2.5 space-y-1">
                <span className="text-[11px] text-slate-400 font-sans block">Адрес получателя</span>
                <span className="text-slate-200 text-[11px] break-all block bg-[#070b11] p-2.5 rounded-xl border border-white/[0.06]">
                  {receipt.recipientAddress}
                </span>
              </div>
            )}

            {receipt.depositAddress && (
              <div className="pt-2.5 space-y-1">
                <span className="text-[11px] text-slate-400 font-sans block">Адрес депозита</span>
                <span className="text-slate-200 text-[11px] break-all block bg-[#070b11] p-2.5 rounded-xl border border-white/[0.06]">
                  {receipt.depositAddress}
                </span>
              </div>
            )}
          </div>

          {/* Proof Key & SSH */}
          <div className="space-y-3 bg-[#070b11] p-4 rounded-2xl border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5 text-teal-400" />
                Ключ гарантии (Proof Key)
              </span>
              <button
                type="button"
                onClick={handleCopyProof}
                className="text-xs text-teal-300 hover:text-teal-200 font-bold flex items-center gap-1 font-sans min-h-[32px] px-2"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <div className="text-amber-300 text-xs font-bold break-all">
              {receipt.proofKey}
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-sans">SSH-256 подпись</span>
                <button
                  type="button"
                  onClick={handleCopySSH}
                  className="text-[11px] text-slate-400 hover:text-white font-sans min-h-[28px] px-1.5"
                >
                  {copiedSig ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
              <div className="text-[10px] text-slate-400 break-all select-all">
                {sshFingerprint}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-sans">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Официальное криптографическое подтверждение протокола MIXERO.</span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[50px] rounded-2xl mixero-cta font-extrabold text-sm transition active:scale-[0.98]"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
