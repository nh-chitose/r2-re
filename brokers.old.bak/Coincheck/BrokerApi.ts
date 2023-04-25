import type {
  Transaction,
  LeveragePosition } from "./types";

import { setTimeout } from "timers";

import { Value } from "@sinclair/typebox/value";

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
import { hmac, nonce, safeQueryStringStringify } from "../../util";
import WebClient from "../webClient";

export default class BrokerApi {
  private static readonly CACHE_MS = 1000;
  private leveragePositionsCache?: LeveragePosition[];
  private readonly baseUrl = "https://coincheck.com";
  private readonly webClient: WebClient = new WebClient(this.baseUrl);

  constructor(private readonly key: string, private readonly secret: string) {}

  async getAccountsBalance(): Promise<AccountsBalanceResponse> {
    return new AccountsBalanceResponse();
  }

  async getLeverageBalance(): Promise<LeverageBalanceResponse> {
    return new LeverageBalanceResponse();
  }

  async getOpenOrders(): Promise<OpenOrdersResponse> {
    return new OpenOrdersResponse();
  }

  async getLeveragePositions(): Promise<LeveragePositionsResponse> {
    return new LeveragePositionsResponse();
  }

  async getAllOpenLeveragePositions(limit: number = 20): Promise<LeveragePosition[]> {
    if(this.leveragePositionsCache){
      return Value.Clone(this.leveragePositionsCache);
    }
    let result: LeveragePosition[] = [];
    let reply = await this.getLeveragePositions();
    while(reply.data !== undefined && reply.data.length > 0){
      result = [...result, ...reply.data];
      if(reply.data.length < limit){
        break;
      }
      reply = await this.getLeveragePositions();
    }
    this.leveragePositionsCache = result;
    setTimeout(() => this.leveragePositionsCache = undefined, BrokerApi.CACHE_MS);
    return result;
  }

  async getOrderBooks(): Promise<OrderBooksResponse> {
    return new OrderBooksResponse();
  }

  async newOrder(): Promise<NewOrderResponse> {
    return new NewOrderResponse();
  }

  async cancelOrder(): Promise<CancelOrderResponse> {
    return new CancelOrderResponse();
  }

  async getTransactions(): Promise<TransactionsResponse> {
    return new TransactionsResponse();
  }

  async getTransactionsWithStartDate(from: Date): Promise<Transaction[]> {
    let transactions: Transaction[] = [];
    let res: TransactionsResponse = await this.getTransactions();
    while(res.data.length > 0){
      const last = res.data[res.data.length - 1];
      transactions = transactions.concat(res.data.filter(x => from < x.created_at));
      if(from > last.created_at || res.pagination.limit > res.data.length){
        break;
      }
      res = await this.getTransactions();
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
