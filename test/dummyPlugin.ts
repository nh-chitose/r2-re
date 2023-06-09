const ss = require("simple-statistics");

const precision = 3;

class SimpleSpreadStatHandler {
  async handle(spreadStat) {
    if(spreadStat.pattern === 1){
      return { someconfig: 1 };
    }
    if(spreadStat.pattern === 2){
      throw new Error();
    }
    return undefined;
  }
}

module.exports = SimpleSpreadStatHandler;
