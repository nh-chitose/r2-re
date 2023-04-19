import type { FormedConfigRootType } from "./configLoader";
import type { ConfigRequest, ConfigResponse } from "../messages";
import type { ConfigStore } from "../types";

import "reflect-metadata";
import { EventEmitter } from "events";
import * as fs from "fs";
import { setTimeout } from "timers";
import { promisify } from "util";

import { injectable } from "inversify";
import _ from "lodash";

import { getConfig } from "./configLoader";
import { ConfigValidator } from "./configValidator";
import { configStoreSocketUrl } from "../constants";
import { getLogger } from "../logger";
import { ConfigResponder } from "../messages";

const writeFile = promisify(fs.writeFile);

@injectable()
export class JsonConfigStore extends EventEmitter implements ConfigStore {
  private readonly logger = getLogger(this.constructor.name);
  private timer: NodeJS.Timer;
  private readonly responder: ConfigResponder;
  private readonly TTL = 5 * 1000;
  private cache?: FormedConfigRootType;

  constructor(private readonly configValidator: ConfigValidator) {
    super();
    this.responder = new ConfigResponder(configStoreSocketUrl, (request, respond) =>
      this.requestHandler(request, respond)
    );
  }

  get config(): FormedConfigRootType {
    if(this.cache){
      return this.cache;
    }
    const config = getConfig();
    this.configValidator.validate(config);
    this.updateCache(config);
    return config;
  }

  async set(config: FormedConfigRootType) {
    this.configValidator.validate(config);
    await writeFile(`${process.cwd()}/config.json`, JSON.stringify(config, undefined, 2));
    this.updateCache(config);
  }

  close() {
    this.responder.dispose();
  }

  private async requestHandler(request: ConfigRequest | undefined, respond: (response: ConfigResponse) => void) {
    if(request === undefined){
      this.logger.debug("Invalid message received.");
      respond({ success: false, reason: "invalid message" });
      return;
    }
    switch(request.type){
      case "set":
        try{
          const newConfig = request.data;
          await this.set(_.merge({}, getConfig(), newConfig));
          respond({ success: true });
          this.logger.debug(`Config updated with ${JSON.stringify(newConfig)}`);
        } catch(ex){
          respond({ success: false, reason: "invalid config" });
          this.logger.warn(`Failed to update config. Error: ${ex.message}`);
          this.logger.debug(ex.stack);
        }
        break;
      case "get":
        respond({ success: true, data: getConfig() });
        break;
      default:
        this.logger.warn(`ConfigStore received an invalid message. Message: ${request}`);
        respond({ success: false, reason: "invalid message type" });
        break;
    }
  }

  private updateCache(config: FormedConfigRootType) {
    this.cache = config;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.cache = undefined, this.TTL);
    this.emit("configUpdated", config);
  }
} /* istanbul ignore next */
