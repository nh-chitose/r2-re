import type {
  SpreadAnalysisResult,
  Quote,
  OrderPair,
  OrderType } from "./types";

import { EventEmitter } from "events";

import { injectable, inject } from "inversify";

import BrokerAdapterRouter from "./brokerAdapterRouter";
import { findBrokerConfig } from "./config/configLoader";
import t from "./i18n";
import { getLogger } from "./logger";
import OrderImpl from "./orderImpl";
import * as OrderUtil from "./orderUtil";
import { calcProfit } from "./pnl";
import SingleLegHandler from "./singleLegHandler";
import symbols from "./symbols";
import {
  ConfigStore,
  ActivePairStore
} from "./types";
import { delay, formatQuote, round, sumBy } from "./util";

@injectable()
export default class PairTrader extends EventEmitter {
  private readonly logger = getLogger(this.constructor.name);

  constructor(
    @inject(symbols.ConfigStore) private readonly configStore: ConfigStore,
    private readonly brokerAdapterRouter: BrokerAdapterRouter,
    @inject(symbols.ActivePairStore) private readonly activePairStore: ActivePairStore,
    private readonly singleLegHandler: SingleLegHandler
  ) {
    super();
  }

  set status(value: string) {
    this.emit("status", value);
  }

  async trade(spreadAnalysisResult: SpreadAnalysisResult, closable: boolean): Promise<void> {
    const { bid, ask, targetVolume } = spreadAnalysisResult;
    const sendTasks = [ask, bid].map(q => this.sendOrder(q, targetVolume, "limit"));
    const orders = await Promise.all(sendTasks);
    this.status = "Sent";
    await this.checkOrderState(orders, closable);
  }

  private async checkOrderState(orders: OrderImpl[], closable: boolean): Promise<void> {
    const { config } = this.configStore;
    for(let i = 1; i <= config.maxRetryCount; i++){
      await delay(config.orderStatusCheckInterval);
      this.logger.info(t`OrderCheckAttempt`, i);
      this.logger.info(t`CheckingIfBothLegsAreDoneOrNot`);
      try{
        const refreshTasks = orders.map(o => this.brokerAdapterRouter.refresh(o));
        await Promise.all(refreshTasks);
      } catch(ex){
        this.logger.warn(ex.message);
        this.logger.debug(ex.stack);
      }

      this.printOrderSummary(orders);

      if(orders.every(o => o.filled)){
        this.logger.info(t`BothLegsAreSuccessfullyFilled`);
        if(closable){
          this.status = "Closed";
        }else{
          this.status = "Filled";
          if(orders[0].size === orders[1].size){
            this.logger.debug(`Putting pair ${JSON.stringify(orders)}.`);
            await this.activePairStore.put(orders as OrderPair);
          }
        }
        this.printProfit(orders);
        break;
      }

      if(i === config.maxRetryCount){
        this.status = "MaxRetryCount breached";
        this.logger.warn(t`MaxRetryCountReachedCancellingThePendingOrders`);
        const cancelTasks = orders.filter(o => !o.filled).map(o => this.brokerAdapterRouter.cancel(o));
        await Promise.all(cancelTasks);
        if(
          orders.some(o => !o.filled)
          && sumBy(orders, o => o.filledSize * (o.side === "buy" ? -1 : 1)) !== 0
        ){
          const subOrders = await this.singleLegHandler.handle(orders as OrderPair, closable);
          if(subOrders.length !== 0 && subOrders.every(o => o.filled)){
            this.printProfit(orders.concat(subOrders));
          }
        }
        break;
      }
    }
  }

  private async sendOrder(quote: Quote, targetVolume: number, orderType: OrderType): Promise<OrderImpl> {
    this.logger.info(t`SendingOrderTargettingQuote`, formatQuote(quote));
    const brokerConfig = findBrokerConfig(quote.broker);
    const { config } = this.configStore;
    const { cashMarginType, leverageLevel } = brokerConfig;
    const orderSide = quote.side === "Ask" ? "buy" : "sell";
    const orderPrice
     = quote.side === "Ask" && config.acceptablePriceRange !== undefined
       ? round(quote.price * (1 + config.acceptablePriceRange / 100))
       : quote.side === "Bid" && config.acceptablePriceRange !== undefined
         ? round(quote.price * (1 - config.acceptablePriceRange / 100))
         : quote.price;
    const order = new OrderImpl({
      symbol: this.configStore.config.symbol,
      broker: quote.broker,
      side: orderSide,
      size: targetVolume,
      price: orderPrice,
      cashMarginType,
      type: orderType,
      leverageLevel,
    });
    await this.brokerAdapterRouter.send(order);
    return order;
  }

  private printOrderSummary(orders: OrderImpl[]) {
    orders.forEach(o => {
      if(o.filled){
        this.logger.info(OrderUtil.toExecSummary(o));
      }else{
        this.logger.warn(OrderUtil.toExecSummary(o));
      }
    });
  }

  private printProfit(orders: OrderImpl[]): void {
    const { profit, commission } = calcProfit(orders);
    this.logger.info(t`ProfitIs`, round(profit));
    if(commission !== 0){
      this.logger.info(t`CommissionIs`, round(commission));
    }
  }
} /* istanbul ignore next */
