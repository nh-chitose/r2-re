export interface Quote {
  broker: Broker;
  side: QuoteSide;
  price: number;
  volume: number;
}

export interface Execution {
  broker: Broker;
  brokerOrderId: string;
  cashMarginType: CashMarginType;
  size: number;
  price: number;
  execTime: Date;
  side: OrderSide;
  symbol: string;
}

export interface Order {
  broker: Broker;
  side: OrderSide;
  size: number;
  price: number;
  cashMarginType: CashMarginType;
  type: OrderType;
  leverageLevel?: number;
  id: string;
  symbol: string;
  timeInForce: TimeInForce;
  brokerOrderId: string;
  status: OrderStatus;
  filledSize: number;
  creationTime: Date;
  sentTime: Date;
  lastUpdated: Date;
  executions: Execution[];
}

export type OrderSide = "buy" | "sell";

export type TimeInForce =
  | "GTC"
  | "IOC"
  | "FOK"
  | "PO";

export type CashMarginType = "Cash" | "MarginOpen" | "NetOut";

export type QuoteSide = "Ask" | "Bid";

export type OrderType = "market" | "limit";

export type OrderStatus =
  | "open"
  | "closed"
  | "canceled"
  | "rejected"
  | "expired"
  | "executed";
  
export type Broker = string;
