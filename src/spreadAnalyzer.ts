import type OrderImpl from "./orderImpl";
import type {
  SpreadAnalysisResult,
  BrokerMap,
  Quote,
  BrokerPosition,
  OrderPair,
  SpreadStat
} from "./types";

import Decimal from "decimal.js";
import { injectable, inject } from "inversify";

import { findBrokerConfig } from "./config/configLoader";
import { LOT_MIN_DECIMAL_PLACE } from "./constants";
import t from "./i18n";
import { getLogger } from "./logger";
import { calcCommission } from "./pnl";
import symbols from "./symbols";
import { ConfigStore } from "./types";
import { min, floor, round, mean, sumBy, sortArrayBy, groupBy } from "./util";


@injectable()
export default class SpreadAnalyzer {
  private readonly logger = getLogger(this.constructor.name);

  constructor(@inject(symbols.ConfigStore) private readonly configStore: ConfigStore) {}

  async analyze(
    quotes: Quote[],
    positionMap: BrokerMap<BrokerPosition>,
    closingPair?: OrderPair
  ): Promise<SpreadAnalysisResult> {
    if(closingPair && closingPair[0].size !== closingPair[1].size){
      throw new Error("Invalid closing pair.");
    }
    const { config } = this.configStore;
    if(Object.keys(positionMap || {}).length === 0){
      throw new Error("Position map is empty.");
    }
    let filteredQuotes = sortArrayBy(
      quotes
        .filter(q => this.isAllowedByCurrentPosition(q, positionMap[q.broker]))
        .filter(q => new Decimal(q.volume).gte(
          (closingPair ? closingPair[0].size : config.minSize)
            * floor(config.maxTargetVolumePercent !== undefined
              ? 100 / config.maxTargetVolumePercent
              : 1))),
      "price"
    );
    if(closingPair){
      const isOppositeSide = (o: OrderImpl, q: Quote) =>
        q.side === (o.side === "buy" ? "Bid" : "Ask");
      const isSameBroker = (o: OrderImpl, q: Quote) => o.broker === q.broker;
      filteredQuotes = filteredQuotes
        .filter(
          q =>
            (isSameBroker(closingPair[0], q) && isOppositeSide(closingPair[0], q))
            || (isSameBroker(closingPair[1], q) && isOppositeSide(closingPair[1], q))
        )
        .filter(q => new Decimal(q.volume).gte(closingPair[0].size));
    }
    const { ask, bid } = this.getBest(filteredQuotes);
    if(bid === undefined){
      this.logger.warn(t`NoBestBidWasFound`);
    }else if(ask === undefined){
      this.logger.warn(t`NoBestAskWasFound`);
    }

    const invertedSpread = bid.price - ask.price;
    const availableVolume = floor(min([bid.volume, ask.volume]), LOT_MIN_DECIMAL_PLACE);
    const allowedShortSize = positionMap[bid.broker].allowedShortSize;
    const allowedLongSize = positionMap[ask.broker].allowedLongSize;
    let targetVolume = min([availableVolume, config.maxSize, allowedShortSize, allowedLongSize]);
    targetVolume = floor(targetVolume, LOT_MIN_DECIMAL_PLACE);
    if(closingPair){
      targetVolume = closingPair[0].size;
    }
    const commission = this.calculateTotalCommission([bid, ask], targetVolume);
    const targetProfit = round(invertedSpread * targetVolume - commission);
    const midNotional = mean([ask.price, bid.price]) * targetVolume;
    const profitPercentAgainstNotional = round(targetProfit / midNotional * 100, LOT_MIN_DECIMAL_PLACE);
    const spreadAnalysisResult = {
      bid,
      ask,
      invertedSpread,
      availableVolume,
      targetVolume,
      targetProfit,
      profitPercentAgainstNotional,
    };
    this.logger.debug("Analysis done.");
    return spreadAnalysisResult;
  }

  async getSpreadStat(quotes: Quote[]): Promise<SpreadStat | undefined> {
    const { config } = this.configStore;
    const filteredQuotes = sortArrayBy(
      quotes
        .filter(q => new Decimal(q.volume).gte(config.minSize)),
      "price"
    );
    const asks = filteredQuotes.filter(q => q.side === "Ask");
    const bids = filteredQuotes.filter(q => q.side === "Bid");
    if(asks.length === 0 || bids.length === 0){
      return undefined;
    }
    const groupedByBroker = groupBy(filteredQuotes, q => q.broker);
    const byBroker = Object.fromEntries(
      Object.keys(groupedByBroker)
        .map(key => {
          const qs = groupedByBroker[key];
          const { ask, bid } = this.getBest(qs);
          const spread = ask && bid ? ask.price - bid.price : undefined;
          return [key, { ask, bid, spread }];
        })
    );
    const flattened = Object.values(byBroker)
      .flatMap((v) => [v.ask, v.bid])
      .filter(q => q !== undefined);
    const { ask: bestAsk, bid: bestBid } = this.getBest(flattened) as { ask: Quote, bid: Quote };
    const { ask: worstAsk, bid: worstBid } = this.getWorst(flattened) as { ask: Quote, bid: Quote };
    const bestCase = this.getEstimate(bestAsk, bestBid);
    const worstCase = this.getEstimate(worstAsk, worstBid);
    return {
      timestamp: Date.now(),
      byBroker,
      bestCase,
      worstCase,
    };
  }

  private getEstimate(ask: Quote, bid: Quote): SpreadAnalysisResult {
    const invertedSpread = bid.price - ask.price;
    const availableVolume = floor(min([bid.volume, ask.volume]), LOT_MIN_DECIMAL_PLACE);
    let targetVolume = min([availableVolume, this.configStore.config.maxSize]);
    targetVolume = floor(targetVolume, LOT_MIN_DECIMAL_PLACE);
    const commission = this.calculateTotalCommission([bid, ask], targetVolume);
    const targetProfit = round(invertedSpread * targetVolume - commission);
    const midNotional = mean([ask.price, bid.price]) * targetVolume;
    const profitPercentAgainstNotional = round(targetProfit / midNotional * 100, LOT_MIN_DECIMAL_PLACE);
    return {
      ask,
      bid,
      invertedSpread,
      availableVolume,
      targetVolume,
      targetProfit,
      profitPercentAgainstNotional,
    };
  }

  private getBest(quotes: Quote[]) {
    const ordered = sortArrayBy(quotes, "price");
    const ask = ordered
      .filter(q => q.side === "Ask")
      .at(0);
    const bid = ordered
      .filter(q => q.side === "Bid")
      .at(-1);
    return { ask, bid };
  }

  private getWorst(quotes: Quote[]) {
    const ordered = sortArrayBy(quotes, "price");
    const ask = ordered
      .filter(q => q.side === "Ask")
      .at(-1);
    const bid = ordered
      .filter(q => q.side === "Bid")
      .at(0);
    return { ask, bid };
  }

  private calculateTotalCommission(quotes: Quote[], targetVolume: number): number {
    return sumBy(quotes, q => {
      const brokerConfig = findBrokerConfig(q.broker);
      return calcCommission(q.price, targetVolume, brokerConfig.commissionPercent);
    });
  }

  private isAllowedByCurrentPosition(q: Quote, pos: BrokerPosition): boolean {
    return q.side === "Bid"
      ? pos.shortAllowed
      : pos.longAllowed;
  }
} /* istanbul ignore next */
