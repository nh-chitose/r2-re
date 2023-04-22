import { getActivePairStore } from "../src/activePairLevelStore";
import { getChronoDB } from "../src/chrono";

(async () => {
  const store = getActivePairStore(getChronoDB());
  console.log("Removing active pair cache...");
  await store.delAll();
  console.log("Done");
})();
