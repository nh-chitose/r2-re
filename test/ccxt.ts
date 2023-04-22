import ccxt from "ccxt";

import { toQuote } from "../src/util";
// eslint-disable-next-line new-cap
const base = new ccxt.coincheck({});
async function ccxtCall() {
  const result = await base.fetchBalance();
  console.log(result);
}

ccxtCall();
