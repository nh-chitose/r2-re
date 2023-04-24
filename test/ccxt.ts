import ccxt from "ccxt";
import "dotenv/config";

import { toQuote } from "../src/util";
// eslint-disable-next-line new-cap
const base = new ccxt.coincheck({ apiKey: process.env.COINCHECK_TOKEN,
  secret: process.env.COINCHECK_SECRET });
async function ccxtCall() {
  const result = (await base.fetchBalance()).info.btc;
  console.log(result);
}

ccxtCall();
