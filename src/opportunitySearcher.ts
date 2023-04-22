import type {
  SpreadAnalysisResult,
  Quote,
  OrderPair,
  PairWithSummary,
  PairSummary
} from "./types";

import { EventEmitter } from "events";

import { injectable, inject } from "inversify";

import { LOT_MIN_DECIMAL_PLACE } from "./constants";
import t from "./i18n";
import LimitCheckerFactory from "./limitCheckerFactory";
import { getLogger } from "./logger";
import * as OrderUtil from "./orderUtil";
import { calcProfit } from "./pnl";
import PositionService from "./positionService";
import SpreadAnalyzer from "./spreadAnalyzer";
import symbols from "./symbols";
import {
  ConfigStore,
  ActivePairStore
} from "./types";
import { padEnd, formatQuote, round, mean } from "./util";

@injectable()
export default class OppotunitySearcher extends EventEmitter {
  private readonly logger = getLogger(this.constructor.name);

  constructor(
    @inject(symbols.ConfigStore) private readonly configStore: ConfigStore,
    private readonly positionService: PositionService,
    private readonly spreadAnalyzer: SpreadAnalyzer,
    private readonly limitCheckerFactory: LimitCheckerFactory,
    @inject(symbols.ActivePairStore) private readonly activePairStore: ActivePairStore
  ) {
    super();
  }

  set status(value: string) {
    this.emit("status", value);
  }

  async search(
    quotes: Quote[]
  ): Promise<{ found: false } | { found: true, spreadAnalysisResult: SpreadAnalysisResult, closable: boolean }> {
    this.logger.info(t`LookingForOpportunity`);
    const { closable, key: closablePairKey, exitAnalysisResult } = await this.findClosable(quotes);
    if(closable){
      this.logger.info(t`FoundClosableOrders`);
      const spreadAnalysisResult = exitAnalysisResult;
      this.logger.debug(`Deleting key ${closablePairKey}.`);
      await this.activePairStore.del(closablePairKey);
      return { found: true, spreadAnalysisResult, closable };
    }

    try{
      const spreadAnalysisResult = await this.spreadAnalyzer.analyze(quotes, this.positionService.positionMap);
      this.printSpreadAnalysisResult(spreadAnalysisResult);
      this.emit("spreadAnalysisDone", spreadAnalysisResult);
      const limitCheckResult = this.limitCheckerFactory.create(spreadAnalysisResult).check();
      if(!limitCheckResult.success){
        this.status = limitCheckResult.reason;
        this.logger.info(limitCheckResult.message);
        this.emit("limitCheckDone", limitCheckResult);
        return { found: false };
      }
      this.logger.info(t`FoundArbitrageOppotunity`);
      this.emit("limitCheckDone", { ...limitCheckResult, message: t`FoundArbitrageOppotunity` });
      return { found: true, spreadAnalysisResult, closable };
    } catch(ex){
      this.status = "Spread analysis failed";
      this.logger.warn(t`FailedToGetASpreadAnalysisResult`, ex.message);
      this.logger.debug(ex.stack);
      return { found: false };
    }
  }

  private async findClosable(
    quotes: Quote[]
  ): Promise<{ closable: boolean, key?: string, exitAnalysisResult?: SpreadAnalysisResult }> {
    const { minExitTargetProfit, minExitTargetProfitPercent, exitNetProfitRatio } = this.configStore.config;
    if([minExitTargetProfit, minExitTargetProfitPercent, exitNetProfitRatio].every(d => d === undefined)){
      return { closable: false };
    }
    const activePairsMap = await this.activePairStore.getAll();
    if(activePairsMap.length > 0){
      this.logger.info(t`OpenPairs`);
      const pairsWithSummary = await Promise.all(
        activePairsMap.map(async (kv): Promise<PairWithSummary> => {
          const { key, value: pair } = kv;
          try{
            const exitAnalysisResult = await this.spreadAnalyzer.analyze(
              quotes,
              this.positionService.positionMap,
              pair
            );
            return { key, pair, pairSummary: this.getPairSummary(pair, exitAnalysisResult), exitAnalysisResult };
          } catch(ex){
            this.logger.debug(ex.message);
            return { key, pair, pairSummary: this.getPairSummary(pair) };
          }
        })
      );
      this.emit("activePairRefresh", pairsWithSummary);
      pairsWithSummary.forEach(x => this.logger.info(this.formatPairSummary(x.pair, x.pairSummary)));
      for(const pairWithSummary of pairsWithSummary.filter(x => x.exitAnalysisResult !== undefined)){
        const limitChecker = this.limitCheckerFactory.create(
          pairWithSummary.exitAnalysisResult,
          pairWithSummary.pair
        );
        if(limitChecker.check().success){
          return { closable: true, key: pairWithSummary.key, exitAnalysisResult: pairWithSummary.exitAnalysisResult };
        }
      }
    }
    return { closable: false };
  }

  private getPairSummary(pair: OrderPair, exitAnalysisResult?: SpreadAnalysisResult): PairSummary {
    const entryProfit = calcProfit(pair).profit;
    const buyLeg = pair.find(o => o.side === "Buy");
    const sellLeg = pair.find(o => o.side === "Sell");
    const midNotional = mean([buyLeg.averageFilledPrice, sellLeg.averageFilledPrice]) * buyLeg.filledSize;
    const entryProfitRatio = round(entryProfit / midNotional * 100, LOT_MIN_DECIMAL_PLACE);
    let currentExitCost;
    let currentExitCostRatio;
    let currentExitNetProfitRatio;
    if(exitAnalysisResult){
      currentExitCost = -exitAnalysisResult.targetProfit;
      currentExitCostRatio = round(currentExitCost / midNotional * 100, LOT_MIN_DECIMAL_PLACE);
      currentExitNetProfitRatio = round(
        (entryProfit + exitAnalysisResult.targetProfit) / entryProfit * 100,
        LOT_MIN_DECIMAL_PLACE
      );
    }
    return {
      entryProfit,
      entryProfitRatio,
      currentExitCost,
      currentExitCostRatio,
      currentExitNetProfitRatio,
    };
  }

  private formatPairSummary(pair: OrderPair, pairSummary: PairSummary) {
    const { entryProfit, entryProfitRatio, currentExitCost } = pairSummary;
    const entryProfitString = `Entry PL: ${round(entryProfit)} JPY (${entryProfitRatio}%)`;
    if(currentExitCost){
      const currentExitCostText = `Current exit cost: ${round(currentExitCost)} JPY`;
      return `[${[
        OrderUtil.toShortString(pair[0]),
        OrderUtil.toShortString(pair[1]),
        entryProfitString,
        currentExitCostText,
      ].join(", ")}]`;
    }
    return `[${[OrderUtil.toShortString(pair[0]), OrderUtil.toShortString(pair[1]), entryProfitString].join(", ")}]`;
  }

  private printSpreadAnalysisResult(result: SpreadAnalysisResult) {
    const columnWidth = 17;
    this.logger.info("%s: %s", padEnd(t`BestAsk`, columnWidth), formatQuote(result.ask));
    this.logger.info("%s: %s", padEnd(t`BestBid`, columnWidth), formatQuote(result.bid));
    this.logger.info("%s: %s", padEnd(t`Spread`, columnWidth), -result.invertedSpread);
    this.logger.info("%s: %s", padEnd(t`AvailableVolume`, columnWidth), result.availableVolume);
    this.logger.info("%s: %s", padEnd(t`TargetVolume`, columnWidth), result.targetVolume);
    this.logger.info(
      "%s: %s (%s%%)",
      padEnd(t`ExpectedProfit`, columnWidth),
      result.targetProfit,
      result.profitPercentAgainstNotional
    );
  }
} /* istanbul ignore next */
