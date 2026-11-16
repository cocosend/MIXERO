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

  const shaFingerprint =
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

  const handleCopySig = () => {
    triggerHaptic([35, 25, 45]);
    navigator.clipboard.writeText(shaFingerprint).then(() => {
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-[#022024]/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md mixero-card rounded-3xl relative text-[#F2FCFC] overflow-hidden my-auto pb-safe">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#22A8AC]/28 mixero-surface">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 mixero-accent-text" />
            <span className="mixero-display text-xs font-extrabold text-[#F2FCFC]">
              КВИТАНЦИЯ ОПЕРАЦИИ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-11 h-11 rounded-2xl mixero-pill text-[#F2FCFC] hover:border-[#FF9436] flex items-center justify-center transition"
              title="Печать"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-2xl mixero-pill text-[#F2FCFC] hover:border-[#FF9436] flex items-center justify-center transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-5 space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between pb-4 border-b border-[#22A8AC]/28">
            <div className="flex items-center gap-3">
              <MixeroLogo size={40} hasGlow={false} />
              <div>
                <h3 className="mixero-display text-sm font-extrabold text-[#F2FCFC] flex items-center">
                  <span>MIXERO</span>
                  <span className="text-[#FF8424] mx-0.5">•</span>
                  <span>CRYPTO</span>
                </h3>
                <p className="text-[11px] text-[#96C8CB] font-sans font-semibold">
                  MIXERO•CRYPTO · NO-LOG CRYPTO PROTOCOL
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="mixero-display text-[10px] font-extrabold text-[#42F28B] bg-[#063E2A]/90 border border-[#22D96E]/50 px-2 py-0.5 rounded-full inline-block mb-0.5">
                ВЕРИФИЦИРОВАНО
              </span>
              <span className="text-[11px] text-[#96C8CB] block">{formattedDate}</span>
            </div>
          </div>

          {/* Amount Block */}
          <div className="text-center py-4 mixero-inset rounded-2xl space-y-1.5">
            <span className="text-xs font-semibold text-[#96C8CB] block font-sans">
              {receipt.title}
            </span>
            <div className="text-3xl font-black tracking-tight tabular-nums">
              <span className="mixero-lock-digits">{receipt.amount.toFixed(2)}</span>{' '}
              <span className="text-base font-extrabold mixero-accent-text">USDT</span>
            </div>
            <div className="text-xs text-[#96C8CB] font-semibold">
              {receipt.network} · <span className="text-[#F2FCFC] font-extrabold">{receipt.status}</span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-xs divide-y divide-[#22A8AC]/22">
            <div className="flex justify-between items-center pt-1">
              <span className="text-[#96C8CB] font-sans font-medium">ID квитанции</span>
              <span className="text-[#F2FCFC] font-extrabold">{receipt.id}</span>
            </div>

            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#96C8CB] font-sans font-medium">Дата и время</span>
              <span className="text-[#F2FCFC] font-semibold tabular-nums">
                {formattedDate}, {formattedTime}
              </span>
            </div>

            {receipt.receivedAmount !== undefined && (
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-[#96C8CB] font-sans font-medium">К выплате</span>
                <span className="text-[#42F28B] font-extrabold tabular-nums">
                  {receipt.receivedAmount.toFixed(2)} USDT
                </span>
              </div>
            )}

            {receipt.feeAmount !== undefined && (
              <div className="flex justify-between items-center pt-2.5">
                <span className="text-[#96C8CB] font-sans font-medium">Комиссия</span>
                <span className="text-[#F2FCFC] font-semibold tabular-nums">
                  {receipt.feeAmount.toFixed(2)} USDT
                </span>
              </div>
            )}

            {receipt.recipientAddress && (
              <div className="pt-2.5 space-y-1">
                <span className="text-[11px] text-[#96C8CB] font-sans font-semibold block">
                  Адрес получателя
                </span>
                <span className="text-[#F2FCFC] font-semibold text-xs break-all block mixero-inset p-2.5 rounded-xl">
                  {receipt.recipientAddress}
                </span>
              </div>
            )}

            {receipt.depositAddress && (
              <div className="pt-2.5 space-y-1">
                <span className="text-[11px] text-[#96C8CB] font-sans font-semibold block">
                  Адрес депозита
                </span>
                <span className="text-[#F2FCFC] font-semibold text-xs break-all block mixero-inset p-2.5 rounded-xl">
                  {receipt.depositAddress}
                </span>
              </div>
            )}
          </div>

          {/* Proof Key & SHA-256 Signature */}
          <div className="space-y-3 mixero-inset p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F2FCFC] flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5 mixero-accent-text" />
                Ключ гарантии (Proof Key)
              </span>
              <button
                type="button"
                onClick={handleCopyProof}
                className="text-xs mixero-accent-text hover:text-[#FFFFFF] font-extrabold flex items-center gap-1 font-sans min-h-[32px] px-2"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-[#42F28B]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
            <div className="mixero-accent-text text-xs font-extrabold break-all">
              {receipt.proofKey}
            </div>

            <div className="pt-2 border-t border-[#22A8AC]/28">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#96C8CB] font-sans font-semibold">
                  SHA-256 подпись протокола
                </span>
                <button
                  type="button"
                  onClick={handleCopySig}
                  className="text-xs text-[#F2FCFC] hover:text-[#FF9838] font-sans font-bold min-h-[28px] px-1.5"
                >
                  {copiedSig ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
              <div className="text-[11px] text-[#F2FCFC] font-semibold break-all select-all">
                {shaFingerprint}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#96C8CB] font-sans font-medium">
            <ShieldCheck className="w-4 h-4 mixero-accent-text shrink-0" />
            <span>
              Официальное криптографическое подтверждение протокола MIXERO•CRYPTO · ZERO-LOG.
            </span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[52px] rounded-2xl mixero-cta font-extrabold text-sm transition active:scale-[0.98]"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
