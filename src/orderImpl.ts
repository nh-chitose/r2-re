import type {
  OrderSide,
  CashMarginType,
  OrderType,
  Broker,
  Order,
  Execution,
  TimeInForce,
  OrderStatus } from "./types";

import { v4 as uuid } from "uuid";

import { eRound, sumBy } from "./util";

export interface OrderInit {
  symbol: string;
  broker: Broker;
  side: OrderSide;
  size: number;
  price: number;
  cashMarginType: CashMarginType;
  type: OrderType;
  leverageLevel: number;
}

// eslint-disable-next-line @typescript-eslint/ban-types
function revive<T, K>(t: Function, o: K): T {
  const newObject = Object.create(t.prototype);
  return Object.assign(newObject, o) as T;
}

export default class OrderImpl implements Order {
  constructor(init: OrderInit) {
    Object.assign(this, init);
  }

  broker: Broker;
  side: OrderSide;
  size: number;
  price: number;
  cashMarginType: CashMarginType;
  type: OrderType;
  leverageLevel: number;
  id: string = uuid();
  symbol: string;
  timeInForce: TimeInForce = "PO";
  brokerOrderId: string;
  status: OrderStatus = "open";
  filledSize = 0;
  creationTime: Date = new Date();
  sentTime: Date;
  lastUpdated: Date;
  executions: Execution[] = [];

  get pendingSize(): number {
    return eRound(this.size - this.filledSize);
  }

  get averageFilledPrice(): number {
    return this.executions.length === 0
      ? 0
      : eRound(sumBy(this.executions, x => x.size * x.price) / sumBy(this.executions, x => x.size));
  }

  get filled(): boolean {
    return this.status === "executed";
  }

  get filledNotional(): number {
    return this.averageFilledPrice * this.filledSize;
  }
}

export function reviveOrder(o: Order): OrderImpl {
  const r = revive<OrderImpl, Order>(OrderImpl, o);
  r.creationTime = new Date(r.creationTime);
  r.sentTime = new Date(r.sentTime);
  return r;
}
