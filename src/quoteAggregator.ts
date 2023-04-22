import type { BrokerConfigType } from "./config";
import type { Broker, Quote } from "./types";

import { AwaitableEventEmitter } from "@bitr/awaitable-event-emitter";
import { injectable, inject } from "inversify";
import { DateTime, Interval } from "luxon";

import BrokerAdapterRouter from "./brokerAdapterRouter";
import { getLogger } from "./logger";
import symbols from "./symbols";
import { ConfigStore } from "./types";
import { groupBy, sumBy } from "./util";

@injectable()
export default class QuoteAggregator extends AwaitableEventEmitter {
  private readonly logger = getLogger(this.constructor.name);
  private timer: any;
  private isRunning: boolean;
  private quotes: Quote[] = [];

  constructor(
    @inject(symbols.ConfigStore) private readonly configStore: ConfigStore,
    private readonly brokerAdapterRouter: BrokerAdapterRouter
  ) {
    super();
  }

  async start(): Promise<void> {
    this.logger.debug("Starting Quote Aggregator...");
    const { iterationInterval } = this.configStore.config;
    this.timer = setInterval(this.aggregate.bind(this), iterationInterval);
    this.logger.debug(`Iteration interval is set to ${iterationInterval}`);
    await this.aggregate();
    this.logger.debug("Started Quote Aggregator.");
  }

  async stop(): Promise<void> {
    this.logger.debug("Stopping Quote Aggregator...");
    if(this.timer){
      clearInterval(this.timer);
    }
    this.logger.debug("Stopped Quote Aggregator.");
  }

  private async aggregate(): Promise<void> {
    if(this.isRunning){
      this.logger.debug("Aggregator is already running. Skipped iteration.");
      return;
    }
    try{
      this.isRunning = true;
      this.logger.debug("Aggregating quotes...");
      const enabledBrokers = this.getEnabledBrokers();
      const fetchTasks = enabledBrokers.map(x => this.brokerAdapterRouter.fetchQuotes(x));
      const quotesMap = await Promise.all(fetchTasks);
      const allQuotes = quotesMap.flatMap(d => d);
      await this.setQuotes(this.fold(allQuotes, this.configStore.config.priceMergeSize));
      this.logger.debug("Aggregated.");
    } catch(ex){
      this.logger.error(ex.message);
      this.logger.debug(ex.stack);
    } finally{
      this.isRunning = false;
    }
  }

  private async setQuotes(value: Quote[]): Promise<void> {
    this.quotes = value;
    this.logger.debug("New quotes have been set.");
    this.logger.debug("Calling onQuoteUpdated...");
    await this.emitParallel("quoteUpdated", this.quotes);
    this.logger.debug("onQuoteUpdated done.");
  }

  private getEnabledBrokers(): Broker[] {
    return this.configStore.config.brokers
      .filter(b => b.enabled)
      .filter(b => this.timeFilter(b))
      .map(b => b.broker);
  }

  private timeFilter(brokerConfig: BrokerConfigType): boolean {
    if(brokerConfig.noTradePeriods.length === 0){
      return true;
    }
    const current = DateTime.local();
    const outOfPeriod = (period: any) => {
      const interval = Interval.fromISO(`${period[0]}/${period[1]}`);
      if(!interval.isValid){
        this.logger.warn("Invalid noTradePeriods. Ignoring the config.");
        return true;
      }
      return !interval.contains(current);
    };
    return brokerConfig.noTradePeriods.every(outOfPeriod);
  }

  private fold(quotes: Quote[], step: number): Quote[] {
    const grouped = groupBy(quotes, q => {
      const price = q.side === "Ask" ? Math.ceil(q.price / step) * step : Math.floor(q.price / step) * step;
      return [price, q.broker, q.side].join("#");
    });
    return Object.keys(grouped).map(key => {
      const value = grouped[key];
      return {
        broker: value[0].broker,
        side: value[0].side,
        price: Number(key.substring(0, key.indexOf("#"))),
        volume: sumBy(value, q => q.volume),
      };
    });
  }
} /* istanbul ignore next */
