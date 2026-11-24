import { PaymentStatus } from '../common/enum/payment-status.enum.js';

// State Machine pattern: the allowed payment transitions live in one table,
// so the service never needs `if` chains to decide whether a change is valid.
// COMPLETED and FAILED are terminal: a late or replayed event can't reopen them.
const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  [PaymentStatus.PENDING]: [
    PaymentStatus.PROCESSING,
    PaymentStatus.COMPLETED,
    PaymentStatus.FAILED,
  ],
  [PaymentStatus.PROCESSING]: [PaymentStatus.COMPLETED, PaymentStatus.FAILED],
  [PaymentStatus.COMPLETED]: [],
  [PaymentStatus.FAILED]: [],
};

export class PaymentStateMachine {
  canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
    return TRANSITIONS[from].includes(to);
  }
}
