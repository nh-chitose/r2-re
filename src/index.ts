import type { BrokerAdapter, ConfigStore } from "./types";
import type { Container } from "inversify";

import { exec } from "child_process";

import Arbitrager from "./arbitrager";
import BrokerStabilityTracker from "./brokerStabilityTracker";
import { closeChronoDB } from "./chrono";
import container from "./container.config";
import t from "./i18n";
import { getLogger } from "./logger";
import "reflect-metadata";
import PositionService from "./positionService";
import QuoteAggregator from "./quoteAggregator";
import ReportService from "./reportService";
import symbols from "./symbols";
import * as Util from "./util";
import WebGateway from "./webGateway";

process.title = "r2app";

export default class AppRoot {
  private readonly logger = getLogger(this.constructor.name);
  private services: { start: () => Promise<void>, stop: () => Promise<void> }[];
  private maintenanceTickCount = 0;

  constructor(private readonly ioc: Container) {
  // Set main tick
    setTimeout(() => {
      this.maintenanceTick();
      setInterval(this.maintenanceTick.bind(this), 1 * 60 * 1000);
    }, 10 * 1000);
    this.logger.info("Interval jobs set up successfully");
  }

  async start(): Promise<void> {
    try{
      this.logger.info(t`StartingTheService`);
      await this.bindBrokers();
      this.services = [
        this.ioc.get(QuoteAggregator),
        this.ioc.get(PositionService),
        this.ioc.get(Arbitrager),
        this.ioc.get(ReportService),
        this.ioc.get(BrokerStabilityTracker),
        this.ioc.get(WebGateway),
      ];
      for(const service of this.services){
        await service.start();
      }
      this.logger.info(t`SuccessfullyStartedTheService`);
    } catch(ex){
      this.logger.error(ex.message);
      this.logger.debug(ex.stack);
    }
  }

  async stop(): Promise<void> {
    try{
      this.logger.info(t`StoppingTheService`);
      for(const service of this.services.slice().reverse()){
        await service.stop();
      }
      await closeChronoDB();
      this.logger.info(t`SuccessfullyStoppedTheService`);
    } catch(ex){
      this.logger.error(ex.message);
      this.logger.debug(ex.stack);
    }
  }

  private async bindBrokers(): Promise<void> {
    const configStore = this.ioc.get<ConfigStore>(symbols.ConfigStore);
    const brokerConfigs = configStore.config.brokers;
    const bindTasks = brokerConfigs.map(async brokerConfig => {
      const brokerName = brokerConfig.broker;
      if(!brokerConfig.enabled){
        this.logger.trace(`${brokerName} is not enabled.`);
        return;
      }
      const brokerModule = await this.tryImport(`./brokers/${brokerName}`);
      if(brokerModule === undefined){
        this.logger.fatal(`Unable to find ${brokerName} package. Stopped app.`);
        exec(`pkill ${process.title}`);
        process.exit(1);
      }
      const brokerAdapter = brokerModule.create(brokerConfig);
      this.ioc.bind<BrokerAdapter>(symbols.BrokerAdapter).toConstantValue(brokerAdapter);
    });
    await Promise.all(bindTasks);
  }

  private async tryImport(path: string): Promise<any> {
    try{
      const module = await import(path);
      if(module.create === undefined){
        return undefined;
      }
      return module;
    } catch(ex){
      return undefined;
    }
  }
  /**
  * ボットのデータ整理等のメンテナンスをするためのメインループ。約一分間隔で呼ばれます。
  */
  protected maintenanceTick(){
    this.maintenanceTickCount++;
    this.logger.debug(`[Tick] #${this.maintenanceTickCount}`);
    // 4分ごとに主要情報を出力
    if(this.maintenanceTickCount % 4 === 1) this.logGeneralInfo();
  }
  
  /**
  *  定期ログを実行します
  */
  logGeneralInfo(){
    const memory = Util.getMemoryInfo();
    this.logger.trace(
      `[Tick] Free:${Math.floor(memory.free)}MB; Total:${Math.floor(memory.total)}MB; Usage:${memory.usage}%`
    );
    const nMem = process.memoryUsage();
    const rss = Util.getMBytes(nMem.rss);
    const ext = Util.getMBytes(nMem.external);
    this.logger.trace(
      `[Tick] Memory RSS: ${rss}MB, Heap total: ${Util.getMBytes(nMem.heapTotal)}MB, Total: ${Util.getPercentage(rss + ext, memory.total)}%`
    );
  }
}

const app = new AppRoot(container);
// eslint-disable-next-line @typescript-eslint/no-floating-promises
app.start();

const logger = getLogger("Process");

function exit(code: number = 0) {
  exec(`pkill ${process.title}`);
  process.exit(code);
}

process.on("SIGINT", async () => {
  logger.info("SIGINT received. Stopping...");
  await app.stop();
  logger.info("Stopped app.");
  exit(1);
});

process.on("unhandledRejection", async (reason) => {
  logger.fatal(reason);
  await app.stop();
  logger.info("Stopped app.");
  exit(1);
});
