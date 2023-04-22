import type { Order } from "./types";

export function sumBy<T>(arr: T[], func: (item: T) => number){
  return arr.reduce((acc, item) => acc + func(item), 0);
}

export function getAverageFilledPrice(order: Order) {
  return order.executions.length === 0
    ? 0
    : sumBy(order.executions, x => x.size * x.price) / sumBy(order.executions, x => x.size);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function revive<T, K>(T: Function, o: K): T {
  const newObject = Object.create(T.prototype);
  return Object.assign(newObject, o) as T;
}

export function floor(num: number, precision?: number){
  const modifier = 10 ** precision;
  return Math.floor(num * modifier) / modifier;
}

export function round(num: number, precision?: number){
  const modifier = 10 ** precision;
  return Math.round(num * modifier) / modifier;
}
export function eRound(n: number): number {
  return round(n, 10);
}

export function splitSymbol(symbol: string): { baseCcy: string, quoteCcy: string } {
  const [baseCcy, quoteCcy] = symbol.split("/");
  return { baseCcy, quoteCcy };
}

export function groupBy<T extends { [key in U]: V }, U extends keyof T, V>(array: T[], key: U){
  const keyMap = new Map<V, T[]>();
  array.forEach(item => {
    if(keyMap.has(item[key])){
      keyMap.get(item[key]).push(item);
    }else{
      keyMap.set(item[key], [item]);
    }
  });
  return Object.fromEntries(keyMap.entries());
}
