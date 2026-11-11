import { registerAs } from '@nestjs/config';

const num = (name: string, fallback: number) => {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

/** Configuration for the Orders module. */
export const ordersConfig = {
  /**
   * ONLINE orders still unpaid and not yet accepted this many minutes after placement are cancelled by the system and
   * their reserved stock is released ("failed or expired payments"). 0 disables the rule.
   */
  paymentHoldMinutes: num('ORDER_PAYMENT_HOLD_MINUTES', 60),
  /** SLA target for a workspace to accept a new order, used by the operations overview. */
  slaAcceptMinutes: num('ORDER_SLA_ACCEPT_MINUTES', 15),
};

export type OrdersConfig = typeof ordersConfig;

export default registerAs('orders', () => ordersConfig);
