import type {
  CancelOrderResponse,
  TradingAccountsResponse,
  CloseAllResponse,
  AccountBalanceResponse } from "./types";

import * as jwt from "jsonwebtoken";

import {
  SendOrderResponse,
  OrdersResponse,
  PriceLevelsResponse
} from "./types";
import { nonce, safeQueryStringStringify } from "../../util";
import WebClient from "../webClient";


export default class BrokerApi {
  private readonly baseUrl = "https://api.quoine.com";
  private readonly webClient: WebClient = new WebClient(this.baseUrl);

  constructor(private readonly key: string, private readonly secret: string) {}

  async sendOrder(): Promise<SendOrderResponse> {
    return new SendOrderResponse();
  }

  async cancelOrder(id: string): Promise<CancelOrderResponse> {
    const path = `/orders/${id}/cancel`;
    return this.put<CancelOrderResponse>(path);
  }

  async getOrders(): Promise<OrdersResponse> {
    return new OrdersResponse();
  }

  async getTradingAccounts(): Promise<TradingAccountsResponse> {
    const path = "/trading_accounts";
    const response = await this.get<TradingAccountsResponse>(path);
    return response;
  }

  async getAccountBalance(): Promise<AccountBalanceResponse> {
    const path = "/accounts/balance";
    const response = await this.get<AccountBalanceResponse>(path);
    return response;
  }

  async getPriceLevels(): Promise<PriceLevelsResponse> {
    return new PriceLevelsResponse();
  }

  async closeAll(): Promise<CloseAllResponse> {
    const path = "/trades/close_all";
    const response = await this.put<CloseAllResponse>(path);
    return response;
  }

  private async call<R>(path: string, method: string, body: string = ""): Promise<R> {
    const n = nonce();
    const payload = {
      path,
      nonce: n,
      token_id: this.key,
    };
    const sign = jwt.sign(payload, this.secret);
    const headers = {
      "Content-Type": "application/json",
      "X-Quoine-API-Version": "2",
      "X-Quoine-Auth": sign,
    };
    const init = { method, headers, body };
    return this.webClient.fetch<R>(path, init);
  }

  private async post<R, T>(path: string, requestBody: T): Promise<R> {
    const method = "POST";
    const body = JSON.stringify(requestBody);
    return this.call<R>(path, method, body);
  }

  private async get<R, T = never>(path: string, requestParam?: T): Promise<R> {
    const method = "GET";
    let pathWithParam = path;
    if(requestParam){
      const param = safeQueryStringStringify(requestParam);
      pathWithParam += `?${param}`;
    }
    return this.call<R>(pathWithParam, method);
  }

  private async put<R>(path: string): Promise<R> {
    const method = "PUT";
    return this.call<R>(path, method);
  }
}
