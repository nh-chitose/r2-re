import type { ChronoDB, TimeSeries } from "./chrono";
import type { ActivePairStore, OrderPair } from "./types";

import { EventEmitter } from "events";

import { reviveOrder } from "./orderImpl";


class EmittableActivePairStore extends EventEmitter implements ActivePairStore {
  timeSeries: TimeSeries<OrderPair>;

  constructor(chronoDB: ChronoDB) {
    super();
    this.timeSeries = chronoDB.getTimeSeries<OrderPair>(
      "ActivePair",
      orderPair => orderPair.map(o => reviveOrder(o)) as OrderPair
    );
  }

  get(key: string): Promise<OrderPair> {
    return this.timeSeries.get(key);
  }

  getAll(): Promise<{ key: string, value: OrderPair }[]> {
    return this.timeSeries.getAll();
  }

  put(value: OrderPair): Promise<string> {
    this.emit("change");
    return this.timeSeries.put(value);
  }

  del(key: string): Promise<void> {
    this.emit("change");
    return this.timeSeries.del(key);
  }

  delAll(): Promise<void> {
    this.emit("change");
    return this.timeSeries.delAll();
  }
}

export const getActivePairStore = (chronoDB: ChronoDB): ActivePairStore => new EmittableActivePairStore(chronoDB);
