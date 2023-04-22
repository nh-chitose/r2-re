import CoincheckApi from "../src/Coincheck/BrokerApi";
import { findBrokerConfig } from "../src/config/configLoader";

async function main() {
  const ccConfig = findBrokerConfig("Coincheck");
  const ccApi = new CoincheckApi(ccConfig.key, ccConfig.secret);
  const positions = await ccApi.getAllOpenLeveragePositions();
  for(const position of positions){
    const request = {
      pair: "btc_jpy",
      order_type: position.side === "buy" ? "close_long" : "close_short",
      amount: position.amount,
      position_id: position.id,
    };
    console.log(`Closing position id ${position.id}...`);
    const reply = await ccApi.newOrder(request as any);
    if(!reply.success){
      console.log(reply);
    }else{
      console.log("Close order was sent.");
    }
  }
}

main();
