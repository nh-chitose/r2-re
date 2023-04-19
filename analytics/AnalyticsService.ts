import type { AnalyticsConfigType } from "../src/config";
import type { SpreadStat } from "../src/types";

import { getLogger } from "../src/logger";

import { reportServicePubUrl, reportServiceRepUrl, configStoreSocketUrl } from "../src/constants";
import { SnapshotRequester, ConfigRequester } from "../src/messages";
import ZmqSubscriber from "../src/zmq/ZmqSubscriber";

export interface SpreadStatHandlerPlugin {
  handle: (spreadStat: SpreadStat) => any;
}

export default class AnalyticsService {
  private config: AnalyticsConfigType;
  private isHandling: boolean;
  private readonly logger = getLogger(this.constructor.name);
  private readonly pluginDir = `${process.cwd()}/plugins`;
  private readonly streamSubscriber: ZmqSubscriber;
  private readonly snapshotRequester: SnapshotRequester;
  private readonly configRequester: ConfigRequester;
  private spreadStatHandler: SpreadStatHandlerPlugin;

  constructor() {
    this.configRequester = new ConfigRequester(configStoreSocketUrl);
    this.snapshotRequester = new SnapshotRequester(reportServiceRepUrl);
    this.streamSubscriber = new ZmqSubscriber(reportServicePubUrl);
  }

  async start(): Promise<void> {
    this.logger.debug("Starting AnalyticsService");
    this.config = await this.getConfig();
    const snapshotMessage = await this.snapshotRequester.request({ type: "spreadStatSnapshot" });
    if(!snapshotMessage.success || snapshotMessage.data === undefined){
      throw new Error("Failed to initial snapshot message.");
    }
    this.spreadStatHandler = await this.getSpreadStatHandler(snapshotMessage.data);
    this.streamSubscriber.subscribe<SpreadStat>("spreadStat", message => this.handleStream(message));
    process.on("message", message => {
      if(message === "stop"){
        this.logger.info("Analysis process received stop message.");
        this.stop().catch(this.logger.error);
      }
    });
    this.logger.debug("Started.");
  }

  async stop(): Promise<void> {
    this.logger.debug("Stopping AnalyticsService...");
    try{
      this.streamSubscriber.unsubscribe("spreadStat");
      this.streamSubscriber.dispose();
      this.snapshotRequester.dispose();
      this.configRequester.dispose();
    } catch(ex){
      this.logger.warn(ex.message);
      this.logger.debug(ex.stack);
    }
    this.logger.debug("Stopped.");
  }

  private async getConfig(): Promise<AnalyticsConfigType> {
    const reply = await this.configRequester.request({ type: "get" });
    if(!reply.success || reply.data === undefined){
      throw new Error("Analytics failed to get the config.");
    }
    return reply.data.analytics;
  }

  private async getSpreadStatHandler(snapshot: SpreadStat[]): Promise<SpreadStatHandlerPlugin> {
    const SpreadStatHandler = await import(`${this.pluginDir}/${this.config.plugin}`);
    return new SpreadStatHandler(snapshot);
  }

  private async handleStream(spreadStat: SpreadStat | undefined): Promise<void> {
    if(this.isHandling){
      return;
    }
    try{
      this.isHandling = true;
      this.logger.debug("Received spread-stat message.");
      if(spreadStat){
        const config = await this.spreadStatHandler.handle(spreadStat);
        if(config){
          this.logger.debug(`Sending to config store... ${JSON.stringify(config)}`);
          const reply = await this.configRequester.request({ type: "set", data: config });
          this.logger.debug(`Reply from config store: ${JSON.stringify(reply)}`);
        }
      }
    } catch(ex){
      this.logger.warn(`${ex.message}`);
      this.logger.debug(ex.stack);
    } finally{
      this.isHandling = false;
    }
  }
}
