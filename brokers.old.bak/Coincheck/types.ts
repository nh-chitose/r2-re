import type { Order } from "../../types";

export class AccountsBalanceResponse {
  success: boolean;
  jpy: number;
  btc: number;
  usd: number;
  cny: number;
  eth: number;
  etc: number;
  dao: number;
  lsk: number;
  fct: number;
  xmr: number;
  rep: number;
  xrp: number;
  zec: number;
  xem: number;
  ltc: number;
  dash: number;
  bch: number;
  jpy_reserved: number;
  btc_reserved: number;
  usd_reserved: number;
  cny_reserved: number;
  eth_reserved: number;
  etc_reserved: number;
  dao_reserved: number;
  lsk_reserved: number;
  fct_reserved: number;
  xmr_reserved: number;
  rep_reserved: number;
  xrp_reserved: number;
  zec_reserved: number;
  xem_reserved: number;
  ltc_reserved: number;
  dash_reserved: number;
  bch_reserved: number;
  jpy_lend_in_use: number;
  btc_lend_in_use: number;
  usd_lend_in_use: number;
  cny_lend_in_use: number;
  eth_lend_in_use: number;
  etc_lend_in_use: number;
  dao_lend_in_use: number;
  lsk_lend_in_use: number;
  fct_lend_in_use: number;
  xmr_lend_in_use: number;
  rep_lend_in_use: number;
  xrp_lend_in_use: number;
  zec_lend_in_use: number;
  xem_lend_in_use: number;
  ltc_lend_in_use: number;
  dash_lend_in_use: number;
  bch_lend_in_use: number;
  jpy_lent: number;
  btc_lent: number;
  usd_lent: number;
  cny_lent: number;
  eth_lent: number;
  etc_lent: number;
  dao_lent: number;
  lsk_lent: number;
  fct_lent: number;
  xmr_lent: number;
  rep_lent: number;
  xrp_lent: number;
  zec_lent: number;
  xem_lent: number;
  ltc_lent: number;
  dash_lent: number;
  bch_lent: number;
  jpy_debt: number;
  btc_debt: number;
  usd_debt: number;
  cny_debt: number;
  eth_debt: number;
  etc_debt: number;
  dao_debt: number;
  lsk_debt: number;
  fct_debt: number;
  xmr_debt: number;
  rep_debt: number;
  xrp_debt: number;
  zec_debt: number;
  xem_debt: number;
  ltc_debt: number;
  dash_debt: number;
  bch_debt: number;
}

export class Margin {
  jpy: number;
}

export class MarginAvailable {
  jpy: number;
}

export class LeverageBalanceResponse {
  success: boolean;
  margin: Margin;
  margin_available: MarginAvailable;
  margin_level: number;
}

export class Pagination {
  limit: number;
  order: "desc" | "asc";
  starting_after: string;
  ending_before: string;
}

export interface LeveragePositionsRequest extends Partial<Pagination> {
  status?: "open" | "closed";
}

export class NewOrder {
  id: string;
  side: string;
  rate?: number;
  amount?: number;
  pending_amount: number;
  status: string;
  created_at: Date;
}

export class CloseOrder {
  id: string;
  side: string;
  rate: number;
  amount: number;
  pending_amount: number;
  status: string;
  created_at: Date;
}

export class LeveragePosition {
  id: string;
  pair: string;
  status: string;
  created_at: Date;
  closed_at?: any;
  open_rate: number;
  closed_rate?: number;
  amount: number;
  all_amount: number;
  side: string;
  pl: number;
  new_order: NewOrder;
  close_orders: CloseOrder[];
}

export class LeveragePositionsResponse {
  success: boolean;
  data: LeveragePosition[];
  pagination: Pagination;
}

export class OrderBooksResponse {
  asks: number[][];
  bids: number[][];
}

export interface NewOrderRequest {
  pair: string;
  order_type: string;
  rate?: number;
  amount?: number;
  market_buy_amount?: number;
  position_id?: number;
  stop_loss_rate?: number;
}

export class NewOrderResponse {
  success: boolean;
  id: string;
  rate: number;
  amount: number;
  order_type: string;
  stop_loss_rate?: number;
  market_buy_amount?: number;
  pair: string;
  created_at: Date;
}

export class CancelOrderResponse {
  success: boolean;
  id: string;
}

export class OpenOrder {
  id: string;
  order_type: string;
  rate?: number;
  pair: string;
  pending_amount: number;
  pending_market_buy_amount: number;
  stop_loss_rate: number;
  created_at: Date;
}

export class OpenOrdersResponse {
  success: boolean;
  orders: OpenOrder[];
}

export class Funds {
  btc: number;
  jpy: number;
}

export class Transaction {
  id: string;
  order_id: string;
  created_at: Date;
  funds: Funds;
  pair: string;
  rate: number;
  fee_currency: number;
  fee: number;
  liquidity: number;
  side: string;
}

export class TransactionsResponse {
  success: boolean;
  pagination: Pagination;
  data: Transaction[];
}

export interface CashMarginTypeStrategy {
  send: (order: Order) => Promise<void>;
  getBtcPosition: () => Promise<number>;
}
