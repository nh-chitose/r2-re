import type OrderImpl from "./orderImpl";

import { findBrokerConfig } from "./config/configLoader";
import { sumBy } from "./util";

export function calcCommission(price: number, volume: number, commissionPercent: number): number {
  return commissionPercent !== undefined ? price * volume * (commissionPercent / 100) : 0;
}

export function calcProfit(orders: OrderImpl[]): { profit: number, commission: number } {
  const commission = sumBy(orders, o => {
    const brokerConfig = findBrokerConfig(o.broker);
    return calcCommission(o.averageFilledPrice, o.filledSize, brokerConfig.commissionPercent);
  });
  const profit = sumBy(orders, o => (o.side === "sell" ? 1 : -1) * o.filledNotional) - commission;
  return { profit, commission };
}
