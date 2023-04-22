import type {
  LeveragePositionsRequest,
  NewOrderRequest,
  Pagination,
  Transaction } from "./types";

import { setTimeout } from "timers";

import {
  LeveragePosition,
  CloseOrder,
  NewOrder } from "./types";
import {
  AccountsBalanceResponse,
  LeveragePositionsResponse,
  OrderBooksResponse,
  NewOrderResponse,
  CancelOrderResponse,
  OpenOrdersResponse,
  TransactionsResponse,
  LeverageBalanceResponse
} from "./types";
import { hmac, nonce, safeQueryStringStringify } from "../util";
import WebClient from "../webClient";

export default class BrokerApi {
  private static readonly CACHE_MS = 1000;
  private leveragePositionsCache?: LeveragePosition[];
  private readonly baseUrl = "https://coincheck.com";
  private readonly webClient: WebClient = new WebClient(this.baseUrl);

  constructor(private readonly key: string, private readonly secret: string) {}

  async getAccountsBalance(): Promise<AccountsBalanceResponse> {
    const path = "/api/accounts/balance";
    return new AccountsBalanceResponse(await this.get<AccountsBalanceResponse>(path));
  }

  async getLeverageBalance(): Promise<LeverageBalanceResponse> {
    const path = "/api/accounts/leverage_balance";
    return new LeverageBalanceResponse(await this.get<LeverageBalanceResponse>(path));
  }

  async getOpenOrders(): Promise<OpenOrdersResponse> {
    const path = "/api/exchange/orders/opens";
    return new OpenOrdersResponse(await this.get<OpenOrdersResponse>(path));
  }

  async getLeveragePositions(request?: LeveragePositionsRequest): Promise<LeveragePositionsResponse> {
    const path = "/api/exchange/leverage/positions";
    return new LeveragePositionsResponse(
      await this.get<LeveragePositionsResponse, LeveragePositionsRequest>(path, request)
    );
  }

  async getAllOpenLeveragePositions(limit: number = 20): Promise<LeveragePosition[]> {
    if(this.leveragePositionsCache){
      return this.leveragePositionsCache.map(d => Object.assign(new LeveragePosition({}), d, {
        close_orders: d.close_orders.map(order => Object.assign(new CloseOrder({}), order, {
          created_at: new Date(order.created_at.toString()),
        })),
        created_at: new Date(d.created_at.toString()),
        new_order: Object.assign(new NewOrder({}), {
          ...d.new_order,
          created_at: new Date(d.created_at.toString()),
        }),
      }));
    }
    let result: LeveragePosition[] = [];
    const request: LeveragePositionsRequest = { limit, status: "open", order: "desc" };
    let reply = await this.getLeveragePositions(request);
    while(reply.data !== undefined && reply.data.length > 0){
      result = [...result, ...reply.data];
      if(reply.data.length < limit){
        break;
      }
      const last = reply.data[reply.data.length - 1];
      reply = await this.getLeveragePositions({ ...request, starting_after: last.id });
    }
    this.leveragePositionsCache = result;
    setTimeout(() => this.leveragePositionsCache = undefined, BrokerApi.CACHE_MS);
    return result;
  }

  async getOrderBooks(): Promise<OrderBooksResponse> {
    const path = "/api/order_books";
    return new OrderBooksResponse(await this.webClient.fetch<OrderBooksResponse>(path, undefined, false));
  }

  async newOrder(request: NewOrderRequest): Promise<NewOrderResponse> {
    const path = "/api/exchange/orders";
    return new NewOrderResponse(await this.post<NewOrderResponse, NewOrderRequest>(path, request));
  }

  async cancelOrder(orderId: string): Promise<CancelOrderResponse> {
    const path = `/api/exchange/orders/${orderId}`;
    return new CancelOrderResponse(await this.delete<CancelOrderResponse>(path));
  }

  async getTransactions(pagination: Partial<Pagination>): Promise<TransactionsResponse> {
    const path = "/api/exchange/orders/transactions_pagination";
    return new TransactionsResponse(await this.get<TransactionsResponse, Partial<Pagination>>(path, pagination));
  }

  async getTransactionsWithStartDate(from: Date): Promise<Transaction[]> {
    let transactions: Transaction[] = [];
    const pagination = { order: "desc", limit: 20 } as Partial<Pagination>;
    let res: TransactionsResponse = await this.getTransactions(pagination);
    while(res.data.length > 0){
      const last = res.data[res.data.length - 1];
      transactions = transactions.concat(res.data.filter(x => from < x.created_at));
      if(from > last.created_at || res.pagination.limit > res.data.length){
        break;
      }
      const lastId = last.id;
      res = await this.getTransactions({ ...pagination, starting_after: lastId });
    }
    return transactions;
  }

  private call<R>(path: string, method: string, body: string = ""): Promise<R> {
    const n = nonce();
    const url = this.baseUrl + path;
    const message = n + url + body;
    const sign = hmac(this.secret, message);
    const headers = {
      "ACCESS-KEY": this.key,
      "ACCESS-NONCE": n,
      "ACCESS-SIGNATURE": sign,
    };
    const init = { method, headers, body };
    return this.webClient.fetch<R>(path, init);
  }

  private post<R, T>(path: string, requestBody: T): Promise<R> {
    const method = "POST";
    const body = safeQueryStringStringify(requestBody);
    return this.call<R>(path, method, body);
  }

  private get<R, T = never>(path: string, requestParam?: T): Promise<R> {
    const method = "GET";
    let pathWithParam = path;
    if(requestParam){
      const param = safeQueryStringStringify(requestParam);
      pathWithParam += `?${param}`;
    }
    return this.call<R>(pathWithParam, method);
  }

  private delete<R>(path: string): Promise<R> {
    const method = "DELETE";
    return this.call<R>(path, method);
  }
}
