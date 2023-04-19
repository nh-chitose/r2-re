import type { Quote } from "./types";

import { injectable, inject } from "inversify";

import { fatalErrors } from "./constants";
import t from "./i18n";
import { getLogger } from "./logger";
import OpportunitySearcher from "./opportunitySearcher";
import PairTrader from "./pairTrader";
import PositionService from "./positionService";
import QuoteAggregator from "./quoteAggregator";
import symbols from "./symbols";
import { ConfigStore } from "./types";
import { hr, delay } from "./util";

@injectable()
export default class Arbitrager {
  private readonly logger = getLogger(this.constructor.name);
  private shouldStop: boolean = false;
  status: string = "Init";
  private handlerRef: (quotes: Quote[]) => Promise<void>;

  constructor(
    private readonly quoteAggregator: QuoteAggregator,
    @inject(symbols.ConfigStore) private readonly configStore: ConfigStore,
    private readonly positionService: PositionService,
    private readonly opportunitySearcher: OpportunitySearcher,
    private readonly pairTrader: PairTrader
  ) {
    this.opportunitySearcher.on("status", x => this.status = x);
    this.pairTrader.on("status", x => this.status = x);
  }

  async start(): Promise<void> {
    this.status = "Starting";
    this.logger.info(t`StartingArbitrager`);
    this.handlerRef = this.quoteUpdated.bind(this);
    this.quoteAggregator.on("quoteUpdated", this.handlerRef);
    this.status = "Started";
    this.logger.info(t`StartedArbitrager`);
  }

  async stop(): Promise<void> {
    this.status = "Stopping";
    this.logger.info("Stopping Arbitrager...");
    this.quoteAggregator.removeListener("quoteUpdated", this.handlerRef);
    this.logger.info("Stopped Arbitrager.");
    this.status = "Stopped";
    this.shouldStop = true;
  }

  private async quoteUpdated(quotes: Quote[]): Promise<void> {
    if(this.shouldStop){
      await this.stop();
      return;
    }
    this.positionService.print();
    this.logger.info(`${hr(20)}ARBITRAGER${hr(20)}`);
    await this.arbitrage(quotes);
    this.logger.info(hr(50));
  }

  private async arbitrage(quotes: Quote[]): Promise<void> {
    this.status = "Arbitraging";
    const searchResult = await this.opportunitySearcher.search(quotes);
    if(!searchResult.found){
      return;
    }

    try{
      await this.pairTrader.trade(searchResult.spreadAnalysisResult, searchResult.closable);
    } catch(ex){
      this.status = "Order send/refresh failed";
      this.logger.error(ex.message);
      this.logger.debug(ex.stack);
      if(fatalErrors.some(keyword => keyword.includes(ex.message || keyword))){
        this.shouldStop = true;
      }
    }

    this.logger.info(t`SleepingAfterSend`, this.configStore.config.sleepAfterSend);
    await delay(this.configStore.config.sleepAfterSend);
  }
} /* istanbul ignore next */
