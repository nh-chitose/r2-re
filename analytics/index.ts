import { getLogger } from "../src/logger";

import AnalyticsService from "./AnalyticsService";

const logger = getLogger("analytics");
let analyticsService: AnalyticsService;

async function main() {
  try{
    analyticsService = new AnalyticsService();
    await analyticsService.start();
  } catch(ex){
    logger.error(`Analytics Service failed. ${ex.message}`);
    logger.debug(ex.stack);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    analyticsService.stop();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
