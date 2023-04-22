import type { Quote, DepthLine, BrokerPosition, BrokerMap, ConfigRoot } from "../types";

class DepthTable {
  private readonly depthSize = 100;
  private bestTradableBid: Quote;
  private bestTradableAsk: Quote;

  constructor(
    private readonly quotes: Quote[],
    private readonly positionMap: BrokerMap<BrokerPosition>,
    private readonly config: ConfigRoot
  ) {}

  build(): DepthLine[] {
    const asks = this.quotes.filter(q => q.side === "Ask");
    const bids = this.quotes.filter(q => q.side === "Bid");
    this.bestTradableAsk = asks
      .filter(q => this.isTradable(q))
      .sort((a, b) => a.price - b.price)[0];
    this.bestTradableBid = bids
      .filter(q => this.isTradable(q))
      .sort((a, b) => b.price - a.price)[0];
    const byPriceMap = new Map<number, Quote[]>();
    this.quotes.forEach(quote => {
      if(byPriceMap.has(quote.price)){
        byPriceMap.get(quote.price).push(quote);
      }else{
        byPriceMap.set(quote.price, [quote]);
      }
    });
    const depthLines = [...byPriceMap.values()]
      .map((quotes: Quote[]) => quotes.reduce(this.depthReducer.bind(this), this.blankDepthLine()))
      .sort((a, b) => b.priceCell.value - a.priceCell.value);
    const middlePart = depthLines.filter(l => l.priceCell.value >= this.bestTradableAsk.price && l.priceCell.value <= this.bestTradableBid.price);
    const whiskerSize = Math.floor((this.depthSize - middlePart.length) / 2);
    const residual = (this.depthSize - middlePart.length) % 2;
    const upperPart = depthLines
      .filter(l => l.priceCell.value > this.bestTradableBid.price)
      .slice(-whiskerSize);
    const bottomPart = depthLines
      .filter(l => l.priceCell.value < this.bestTradableAsk.price)
      .slice(0, whiskerSize + residual);
    if(middlePart.length <= this.depthSize){
      return [...upperPart, ...middlePart, ...bottomPart];
    }
    return [
      ...middlePart.slice(0, this.depthSize / 2),
      this.blankDepthLine(),
      ...middlePart.slice(-this.depthSize / 2),
    ];
  }

  private isTradable(quote: Quote) {
    return this.allowedByPosition(quote) && this.largerThanMinSize(quote);
  }

  private largerThanMinSize(quote: Quote) {
    return quote.volume >= this.config.minSize * Math.floor(100 / this.config.maxTargetVolumePercent);
  }

  private allowedByPosition(quote: Quote) {
    const position = this.positionMap[quote.broker];
    return quote.side === "Ask" ? position.longAllowed : position.shortAllowed;
  }

  private depthReducer(depthLine: DepthLine, q: Quote): DepthLine {
    depthLine.priceCell.value = q.price;
    const tradable = this.isTradable(q);
    if(q.side === "Ask"){
      depthLine.askBrokerCells.push({ value: q.broker, tradable });
      depthLine.askSizeCells.push({ value: q.volume, tradable });
      depthLine.isBestAsk = depthLine.isBestAsk || q === this.bestTradableAsk;
      depthLine.priceCell.askTradable = depthLine.priceCell.askTradable || tradable;
    }else{
      depthLine.bidBrokerCells.push({ value: q.broker, tradable });
      depthLine.bidSizeCells.push({ value: q.volume, tradable });
      depthLine.isBestBid = depthLine.isBestBid || q === this.bestTradableBid;
      depthLine.priceCell.bidTradable = depthLine.priceCell.bidTradable || tradable;
    }
    return depthLine;
  }

  private blankDepthLine(): DepthLine {
    return {
      askBrokerCells: [],
      askSizeCells: [],
      priceCell: { value: NaN, askTradable: false, bidTradable: false },
      bidSizeCells: [],
      bidBrokerCells: [],
      isBestAsk: false,
      isBestBid: false,
    };
  }
}

export function buildDepthTable(quotes: Quote[], positionMap: BrokerMap<BrokerPosition>, config: ConfigRoot) {
  return new DepthTable(quotes, positionMap, config).build();
}
