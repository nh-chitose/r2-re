import type BrokerApi from "./BrokerApi";
import type { CashMarginTypeStrategy } from "./types";


export default class NetOutStrategy implements CashMarginTypeStrategy {
  constructor(private readonly brokerApi: BrokerApi) {}

  async getBtcPosition(): Promise<number> {
    const accounts = await this.brokerApi.getTradingAccounts();
    const account = accounts.find(b => b.currency_pair_code === "BTCJPY");
    if(!account){
      throw new Error("Unable to find the account.");
    }
    return account.position;
  }
}
