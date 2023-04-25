import type { BrokerConfigType } from "./config";
import type { BrokerMap, BrokerPosition } from "./types";

import { EventEmitter } from "events";

import Decimal from "decimal.js";
import { injectable, inject } from "inversify";

import BrokerAdapterRouter from "./brokerAdapterRouter";
import BrokerStabilityTracker from "./brokerStabilityTracker";
import t from "./i18n";
import { getLogger } from "./logger";
import symbols from "./symbols";
import { ConfigStore } from "./types";
import { hr, eRound, splitSymbol, padEnd, padStart, round, sumBy, max } from "./util";


@injectable()
export default class PositionService extends EventEmitter {
  private readonly logger = getLogger(this.constructor.name);
  private timer: any;
  private isRefreshing: boolean;
  private _positionMap: BrokerMap<BrokerPosition>;

  constructor(
    @inject(symbols.ConfigStore) private readonly configStore: ConfigStore,
    private readonly brokerAdapterRouter: BrokerAdapterRouter,
    private readonly brokerStabilityTracker: BrokerStabilityTracker
  ) {
    super();
  }

  async start(): Promise<void> {
    this.logger.debug("Starting PositionService...");
    this.timer = setInterval(() => this.refresh(), this.configStore.config.positionRefreshInterval);
    await this.refresh();
    this.logger.debug("Started PositionService.");
  }

  async stop(): Promise<void> {
    this.logger.debug("Stopping PositionService...");
    if(this.timer){
      clearInterval(this.timer);
    }
    this.logger.debug("Stopped PositionService.");
  }

  print(): void {
    const { baseCcy } = splitSymbol(this.configStore.config.symbol);
    const isOk = (b: boolean) => b ? "OK" : "NG";
    const formatBrokerPosition = (brokerPosition: BrokerPosition) =>
      `${padEnd(brokerPosition.broker, 10)}: ${padStart(round(brokerPosition.baseCcyPosition, 3), 6)} ${baseCcy}, `
      + `${t`LongAllowed`}: ${isOk(brokerPosition.longAllowed)}, `
      + `${t`ShortAllowed`}: ${isOk(brokerPosition.shortAllowed)}`;

    this.logger.info(`${hr(21)}POSITION${hr(21)}`);
    if(this.configStore.config.demoMode){
      this.logger.info(t`ThisIsDemoModeYouHaveDummyBalances`);
    }
    this.logger.info(`Net Exposure: ${round(this.netExposure, 3)} ${baseCcy}`);
    Object.values(this.positionMap).forEach((position) => {
      const stability = this.brokerStabilityTracker.stability(position.broker);
      this.logger.info(`${formatBrokerPosition(position)} (Stability: ${stability})`);
    });
    this.logger.info(hr(50));
  }

  get netExposure() {
    return eRound(sumBy(Object.values(this.positionMap), (p: BrokerPosition) => p.baseCcyPosition));
  }

  get positionMap() {
    return this._positionMap;
  }

  private async refresh(): Promise<void> {
    this.logger.debug("Refreshing positions...");
    if(this.isRefreshing){
      this.logger.debug("Already refreshing.");
      return;
    }
    try{
      this.isRefreshing = true;
      const config = this.configStore.config;
      const brokerConfigs = config.brokers.filter(b => b.enabled);
      const promises = brokerConfigs.map(brokerConfig => this.getBrokerPosition(brokerConfig, config.minSize));
      const brokerPositions = await Promise.all(promises);
      this._positionMap = Object.fromEntries(
        brokerPositions
          .map((p: BrokerPosition) => [p.broker, p])
      );
      this.emit("positionUpdated", this.positionMap);
    } catch(ex){
      this.logger.error(ex.message);
      this.logger.debug(ex.stack);
    } finally{
      this.isRefreshing = false;
      this.logger.debug("Finished refresh.");
    }
  }

  private async getBrokerPosition(brokerConfig: BrokerConfigType, minSize: number): Promise<BrokerPosition> {
    const { baseCcy } = splitSymbol(this.configStore.config.symbol);
    const positions = await this.brokerAdapterRouter.getBtcPositions(brokerConfig.broker);
    const baseCcyPosition = positions.get(baseCcy);
    if(baseCcyPosition === undefined){
      throw new Error(`Unable to find base ccy position in ${brokerConfig.broker}. ${JSON.stringify([...positions])}`);
    }
    const allowedLongSize = max([
      0,
      new Decimal(brokerConfig.maxLongPosition).minus(baseCcyPosition)
        .toNumber(),
    ]);
    const allowedShortSize = max([
      0,
      new Decimal(brokerConfig.maxShortPosition).plus(baseCcyPosition)
        .toNumber(),
    ]);
    const isStable = this.brokerStabilityTracker.isStable(brokerConfig.broker);
    return {
      broker: brokerConfig.broker,
      baseCcyPosition,
      allowedLongSize,
      allowedShortSize,
      longAllowed: new Decimal(allowedLongSize).gte(minSize) && isStable,
      shortAllowed: new Decimal(allowedShortSize).gte(minSize) && isStable,
    };
  }
} /* istanbul ignore next */
