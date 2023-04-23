import type { Execution, Order, Broker, QuoteSide, Quote } from "./types";

import * as crypto from "crypto";
import os from "os";
import * as querystring from "querystring";

/**
 * 配列の数学系
 */

export function max(nums: number[]){
  if(nums.length) return Math.max.apply(undefined, nums);
  else return undefined;
}

export function min(nums: number[]){
  if(nums.length) return Math.min.apply(undefined, nums);
  else return undefined;
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

export function mean(arr: number[]){
  return arr.reduce((acc: number, num: number) => acc + num, 0) / arr.length;
}

export function sumBy<T>(arr: T[], func: (item: T) => number){
  return arr.reduce((acc, item) => acc + func(item), 0);
}

/**
 * 配列の数学系ここまで
 */

export function sortArrayBy<T extends { [key in U]: number }, U extends keyof T>(array: T[], key: U){
  return [...array].sort((a, b) => a[key] - b[key]);
}

export function groupBy<T, V>(array: T[], key: ((item: T) => V)): { [key: string]: T[] };
export function groupBy<T extends { [key in U]: V }, U extends keyof T, V>(array: T[], key: U): { [key: string]: T[] };
export function groupBy<T extends { [key in U]: V }, U extends keyof T, V>(array: T[], key: U | ((item: T) => V)){
  const keyMap = new Map<V, T[]>();
  array.forEach(item => {
    const _key = typeof key === "function" ? key(item) : item[key];
    if(keyMap.has(_key)){
      keyMap.get(_key).push(item);
    }else{
      keyMap.set(_key, [item]);
    }
  });
  return Object.fromEntries(keyMap.entries()) as { [key: string]: T[] };
}

interface ToStringable {
  toString: () => string;
}

export function padStart(s: ToStringable, n: number): string {
  return s.toString().padStart(n);
}

export function padEnd(s: ToStringable, n: number): string {
  return s.toString().padEnd(n);
}

/**
 * @param の数だけハイフンを出力します
 */
export function hr(width: number): string {
  let str = "";
  for(let i = 0; i < width; i++){
    str += "-";
  }
  return str;
}

export function almostEqual(a: number, b: number, tolerancePercent: number): boolean {
  return Math.sign(a) === Math.sign(b) && Math.abs(a - b) <= Math.abs(b) * (tolerancePercent / 100);
}

export function delay(time: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, time));
}

export function hmac(secret: string, text: string, algo: string = "sha256"): string {
  return crypto
    .createHmac(algo, secret)
    .update(text)
    .digest("hex");
}

export const nonce: () => string = (function() {
  let prev = 0;
  return function() {
    const n = Date.now();
    if(n <= prev){
      prev += 1;
      return prev.toString();
    }
    prev = n;
    return prev.toString();
  };
}());

export function safeQueryStringStringify(o: any) {
  const noUndefinedFields = Object.assign({}, o);
  Object.keys(o).forEach(key => {
    if(o[key] === undefined){
      delete noUndefinedFields[key];
    }
  });
  return querystring.stringify(noUndefinedFields);
}

export function toExecution(order: Order): Partial<Execution> {
  return {
    broker: order.broker,
    brokerOrderId: order.brokerOrderId,
    cashMarginType: order.cashMarginType,
    side: order.side,
    symbol: order.symbol,
  };
}

export function toQuote(broker: Broker, side: QuoteSide, price: number, volume: number) {
  return { broker, side, price, volume };
}

export function splitSymbol(symbol: string): { baseCcy: string, quoteCcy: string } {
  const [baseCcy, quoteCcy] = symbol.split("/");
  return { baseCcy, quoteCcy };
}

export function formatQuote(quote: Quote) {
  return (
    `${padEnd(quote.broker, 10)} ${quote.side} `
    + `${padStart(quote.price.toLocaleString(), 7)} ${round(quote.volume, 3)}`
  );
}
export function getPercentage(part: number, total: number){
  return Math.round(part / total * 100 * 100) / 100;
}

/**
 * メモリ使用情報
 */
type MemoryUsageInfo = { free: number, total: number, used: number, usage: number };

/**
  * メモリ使用情報を取得します
  * @returns メモリ使用情報
  */
export function getMemoryInfo(): MemoryUsageInfo{
  const free = getMBytes(os.freemem());
  const total = getMBytes(os.totalmem());
  const used = total - free;
  const usage = getPercentage(used, total);
  return {
    free,
    total,
    used,
    usage,
  };
}

/**
  * 指定されたバイト数をメガバイトに変換します
  * @param bytes 指定されたバイト
  * @returns 返還後のメガバイト数
  */
export function getMBytes(bytes: number){
  return Math.round(bytes / 1024/*KB*/ / 1024/*MB*/ * 100) / 100;
}
