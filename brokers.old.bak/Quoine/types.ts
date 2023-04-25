export interface BrokerOrder {
  order_type: string;
  product_id: string;
  side: string;
  quantity: number;
  price: number;
  leverage_level?: number;
  order_direction?: string;
}

export interface SendOrderRequest {
  order: BrokerOrder;
}

export class SendOrderResponse {
  id: string;
  order_type: string;
  quantity: string;
  disc_quantity: string;
  iceberg_total_quantity: string;
  side: string;
  filled_quantity: string;
  price: number;
  created_at: number;
  updated_at: number;
  status: string;
  leverage_level: number;
  source_exchange: string;
  product_id: string;
  product_code: string;
  funding_currency: string;
  crypto_account_id?: any;
  currency_pair_code: string;
  average_price: string;
  target: string;
  order_fee: string;
  source_action: string;
  unwound_trade_id?: any;
  trade_id?: any;
}

export type CancelOrderResponse = any;

export class Execution {
  id: string;
  quantity: string;
  price: string;
  taker_side: string;
  created_at: number;
  my_side: string;
}

export class OrdersResponse {
  id: string;
  order_type: string;
  quantity: string;
  disc_quantity: string;
  iceberg_total_quantity: string;
  side: string;
  filled_quantity: string;
  price: number;
  created_at: number;
  updated_at: number;
  status: string;
  leverage_level: number;
  source_exchange: string;
  product_id: string;
  product_code: string;
  funding_currency: string;
  crypto_account_id?: any;
  currency_pair_code: string;
  average_price: string;
  target: string;
  order_fee: string;
  source_action: string;
  unwound_trade_id?: any;
  trade_id: string;
  settings?: any;
  trailing_stop_type: boolean;
  trailing_stop_value: boolean;

  executions: Execution[];
  stop_triggered_time?: any;
}

export class TradingAccount {
  id: string;
  leverage_level: number;
  max_leverage_level: number;
  current_leverage_level: number;
  pnl: string;
  equity: string;
  margin: number;
  free_margin: number;
  trader_id: string;
  status: string;
  product_code: string;
  currency_pair_code: string;
  position: number;
  balance: number;
  created_at: number;
  updated_at: number;
  pusher_channel: string;
  margin_percent: string;
  product_id: string;
  funding_currency: string;
}

export type TradingAccountsResponse = TradingAccount[];
export class PriceLevelsResponse {
  buy_price_levels: number[][];
  sell_price_levels: number[][];
}

export type CloseAllResponse = ClosingTrade[];
export class ClosingTrade {
  id: number;
  currency_pair_code: string;
  status: string;
  side: string;
  margin_used: number;
  open_quantity: number;
  close_quantity: number;
  quantity: number;
  leverage_level: number;
  product_code: string;
  product_id: number;
  open_price: number;
  close_price: number;
  trader_id: number;
  open_pnl: number;
  close_pnl: number;
  pnl: number;
  stop_loss: number;
  take_profit: number;
  funding_currency: string;
  created_at: number;
  updated_at: number;
  total_interest: number;
}

export class AccountBalance {
  currency: string;
  balance: number;
}

export type AccountBalanceResponse = AccountBalance[];

export interface CashMarginTypeStrategy {
  getBtcPosition: () => Promise<number>;
}
