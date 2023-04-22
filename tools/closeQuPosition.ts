import QuoineApi from "../src/Quoine/BrokerApi";
import { findBrokerConfig } from "../src/config/configLoader";

async function main() {
  const quConfig = findBrokerConfig("Quoine");
  const quApi = new QuoineApi(quConfig.key, quConfig.secret);

  // quoine margin balance
  try{
    console.log("Closing all in Quoine...");
    await quApi.closeAll();
    console.log("Done.");
  } catch(ex){
    console.log(ex);
  }
}

main();
