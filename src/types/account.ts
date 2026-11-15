export type AccountTxType = 'topup' | 'fee_payment' | 'payout' | 'withdrawal';

export interface AccountTransaction {
  id: string;
  type: AccountTxType;
  title: string;
  amount: number;
  network: 'TRC20' | 'ERC20';
  timestamp: number;
  status: 'completed' | 'processing' | 'pending';
  txHash?: string;
  note?: string;
  proofKey?: string;
  sshSignature?: string;
  recipientAddress?: string;
}

export interface ClientProfile {
  clientId: string;
  balance: number;
  inCleaning: number;
  totalCleaned: number;
  joinedDate: number;
}
