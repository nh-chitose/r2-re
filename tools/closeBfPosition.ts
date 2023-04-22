import BitflyerApi from "../src/Bitflyer/BrokerApi";
import { findBrokerConfig } from "../src/config/configLoader";
import { floor } from "../src/util";

async function main() {
  const bfConfig = findBrokerConfig("Bitflyer");
  const bfApi = new BitflyerApi(bfConfig.key, bfConfig.secret);
  const bfBalance = await bfApi.getBalance();
  const bfBtc = (bfBalance.find(x => x.currency_code === "BTC")).available;
  const request = {
    product_code: "BTC_JPY",
    child_order_type: "MARKET",
    side: "SELL",
    size: floor(bfBtc, 4),
  };
  try{
    console.log(`Selling ${bfBtc}...`);
    const response = await bfApi.sendChildOrder(request);
    console.log(response);
  } catch(ex){
    console.log(ex.message);
  }
}

main();
