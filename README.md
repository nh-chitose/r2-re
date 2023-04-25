> :warning:現在レガシーであるコアエンジンを使用して、リファクタリングの実施中で正常な動作は保証できません。PRは大歓迎しております。

> :warning:We're now refactoring the app with legacy core engine. So it won't perform correctly. PRs are always welcomed.

# R2-re Bitcoin Arbitrager

Originally forked from [@bitrinjani/r2](https://github.com/bitrinjani/r2)

![GitHub package.json version](https://img.shields.io/github/package-json/v/nh-chitose/r2-re)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/nh-chitose/r2-re/ccxt)
[![CodeQL](https://github.com/nh-chitose/r2-re/actions/workflows/codeql.yml/badge.svg)](https://github.com/nh-chitose/r2-re/actions/workflows/codeql.yml)
[![CI](https://github.com/nh-chitose/r2-re/actions/workflows/test.yml/badge.svg)](https://github.com/nh-chitose/r2-re/actions/workflows/test.yml)
![GitHub](https://img.shields.io/github/license/nh-chitose/r2-re)
![GitHub Repo stars](https://img.shields.io/github/stars/nh-chitose/r2-re?style=social)

R2-reはNode.jsとTypeScriptで製作されたビットコインの自動裁定取引システムです

R2-re Bitcoin Arbitrager is an automatic arbitrage trading system powered by Node.js + TypeScript.

__現在プレリリースバージョンを公開中です。実際の取引は行われないテストモードで利益のイメージをつかんで頂けます。__

:warning: 以下の画面等はは古いNode.jsで正常に動作していたときのもので、現在は依存関係のインストールが出来ないためオリジナル版は動作しません！ :warning:

## Web UI モード

※現在有効ではありません

Web UI mode is for browser clients.

![webui](webui.png)

## コンソールモード

LinuxのようなCUI環境で使えるモード。もちろんWindowsでも使えます。

![Screenshot](screenshot.gif)

## 使い方

1. [Node.js](https://nodejs.org) (v16.6.0より新しいもの)をインストールする。
2. このレポジトリをクローンする。

  ```bash
    git clone https://github.com/nh-chitose/r2-re.git
  ```

3. `npm install` で依存関係をインストールする。

```bash
cd r2-re
npm install
```

4. フォルダにある `config.json.sample` を `config.json` へ名前変更する。

* __プレリリース版必須設定__: `demoMode` と `debug` を必ず `true` にする。

5. `.env` ファイルの `token` と `secret` にあなたの API keys (tokens) と secrets をセットしてください。 Set `enabled` to `false` for exchanges you do not use.

* __プレリリース版では設定不要__: デモモードで動かす場合にはこの設定は不要です。

// 6番目・8番目にあるWeb UIモードは現在動作していないので `false` をセットしておいてください。

6. To run R2-re in Web UI mode, set `webGateway.enabled` to true. By default, R2-re starts in Console mode.

7. `npm run start` でアプリを開始する。

```bash
npm run start
```

8. Open http://127.0.0.1:8720 in Chrome.

### 動作環境

R2-reはNode.jsが動作するOSであれば動きます。

例えば:

* Windows
* Mac OS
* Linux

などが利用可能です。

Web UI works on the latest version of Google Chrome.

#### 対応取引所

R2-reは以下の取引所に対応しております。

|取引所|現金決済|差金決済|
|----|------|-----------|
|bitFlyer|✔️|*|
|bitbank.cc|️️️✔️||
|BTCBox|✔️||
|Coincheck|✔️||
|Zaif|✔️||

\*将来的にもしかしたらサポートするかもしれません

## アルゴリズム

1. Every 1.5 seconds, R2-re downloads quotes from exchanges.
1. Filters out quotes that are not usable for arbitrage. For example, if `maxShortPosition` config is 0 and the current position is 0 for a broker, the ask quotes for the broker will be filtered out.
1. Calculates the best ask and the best bid from the filtered quotes and checks if the expected profit is larger than the configured minimum value, `minTargetProfitPercent`. If there is no arbitrage opportunity, R2-re waits for the next iteration.
1. R2 concurrently sends a buy leg and a sell leg to each broker that offered the best price.
1. R2 checks whether the legs are filled or not for the configured period, say 30 seconds.
1. If the both legs are filled, shows the profit. If one of the legs are not fully filled, R2-re tries to send a cover order in order to balance the position. The covering behavior is configurable in `onSingleLeg` config.

After the spread has became smaller than the configured value, `exitNetProfitRatio`, R2-re tries to close the pair.

## 設計概要

* Concurrency: All API calls to exchanges are concurrently sent/handled.
* ️Dynamic configuration: User can dynamically update the configuration based on spread statistics by a simple js script, like setting `minTargetProfitPercent` to μ + σ every few seconds.

![diagram](diagram.png)

## 設定

トークンやシークレットといった機密情報以外の設定は `config.json` で設定できます。

### 全般設定

|項目名|設定値|説明|
|----|------|-----------|
|language|"ja" or "en"|UI language. Japanese or English.|
|demoMode|true or false|If it's true, the arbitrager analyzes spreads but doesn't send any real trade.|
|priceMergeSize|number|Merges small quotes into the specified price ladder before analyzing arbitrage opportunity.|
|maxSize|number|Maximum BTC size to be sent to brokers.|
|minSize|number|Minimum BTC size to be sent to brokers.|
|minTargetProfitPercent|number|Minimum target profit in percent against notional (= inverted spread %). Profit percentage against notional is calculated by `100 * expected profit / (MID price * volume)`.|
|maxTargetProfit|number|[Optional] Max target profit. This is a safe-guard for abnormal quotes. If the expected profit is larger than this, R2 won't attempt arbitrage.|
|maxTargetProfitPercent|number|[Optional] Max target profit in percent.|
|exitNetProfitRatio|number|R2 attempts to close open pairs when the spread has decreased by this percentage. For example, when the open profit of an open pair is 200 JPY and exitNetProfitRatio is 20(%), R2 closes the pair once the closing cost has became 160.|
|maxTargetVolumePercent|number|[Optional]  In order to execute orders as fast as possible and avoid slippage, R2 checks the volume of the quotes from the exchanges and makes sure the target volume consumes less than this percentage of the volume of the target quote before executing the order|
|acceptablePriceRange|number|[Optional] Allows execution with price that is disadvantageous by the set value(%) from target price. (Like a market order.)|
|iterationInterval|Millisecond|Time lapse in milliseconds of an iteration. When it's set to 3000, the quotes fetch and the spreads analysis for all the brokers are done every 3 seconds|
|positionRefreshInterval|Millisecond|Time lapse in milliseconds of position data refresh. Position data is used to check max exposure and long/short availability for each broker.|
|sleepAfterSend|Millisecond|Time lapse in milliseconds after one arbitrage is done.|
|maxNetExposure|number|Maximum total net exposure. If net exposure qty is larger than this value, Arbitrager stops.| 
|maxRetryCount|number|Maximum retry count to check if arbitrage orders are filled or not. If the orders are not filled after the retries, Arbitrager tries to cancel the orders and continues.|
|orderStatusCheckInterval|Millisecond|Time lapse in milliseconds to check if arbitrage orders are filled or not.|
|stabilityTracker|-|See stabilityTracker config below|
|onSingleLeg|-|See onSingleLeg config below|
|analytics|-|See [ANALYTICS_PLUGIN.md](https://github.com/nh-chitose/r2-re/blob/master/docs/ANALYTICS_PLUGIN.md)|
|webGateway|-|See webGateway config details below|

#### webGateway 設定の詳細

Default config:

```sh
  "webGateway": {
    "enabled": false,
    "host": "127.0.0.1",
    "openBrowser": true
  },
```

* enabled: true for Web UI mode, false for console mode.
* host: Web server IP that accepts HTTP client connections. By default, it's localhost.
* openBrowser: If true, the application opens a browser window. In non-GUI environment, this config needs to be false. 

Web UI URL is http://127.0.0.1:8720 by default. TCP port 8720 and 8721 need to be opened.

#### stabilityTracker の設定の詳細

R2-re automatically disables trading activities on unstable brokers.

* Each broker has its stability index on a scale of one to ten.
* The initial stability index is 10.
* The stability index is decremented each time a broker API call fails.
* The stability index is incremented every time `recoveryInterval` milliseconds has passed.
* R2-re disables brokers which has smaller stability index than `threshold` value.

By default, a broker which has failed three API calls within 5 minutes would be disabled for trading for at most 5 minutes.

Default configuration:

```json
...
  "stabilityTracker": {
    "threshold": 8,
    "recoveryInterval": 300000 
  },
...
```

#### onSingleLeg 設定の詳細

The onSingleLeg config specifies what action should be taken when only one leg is filled.

```json:config.json
...
  "onSingleLeg": {
    "action": "Reverse",
    "actionOnExit": "Proceed",
    "options": {
      "limitMovePercent": 5,
      "ttl": 3000
    }
  },
...
````

* action: Action to be taken when only one leg is opened.

    * Cancel: Cancel the unfilled order.
    * Reverse: After canceling the unfilled order, R2 sends a limit order to the opposite side of the filled order. The limit price depends on limitMovePercent config.
    * Proceed: After canceling the unfilled order, R2 sends another order to the same side of the unfilled order. The limit price depends on limitMovePercent config.
* actionOnExit: Action to be taken when only one leg is closed. Cancel, Reverse, or Proceed.
* options
    * limitMovePercent: Set the limit price created by the action to the price worse than the original order by limitMovePercent %.
    * ttl: Time to Live of the limit order created by the action。

### 取引所設定

|項目名|設定値|説明|
|----|------|-----------|
|broker|Bitflyer, Quoine or Coincheck|Broker name|
|enabled|true or false|Enable the broker for arbitrage|
|maxLongPosition|number|Maximum long position allowed for the broker. R2 won't send orders to the broker if current long position is larger than this value.|
|maxShortPosition|number|Maximum short position allowed for the broker. R2 won't send orders to the broker if current short position is larger than this value.|
|cashMarginType|Cash, MarginOpen, NetOut|Arbitrage order type. Not all options are supported for each exchange. See the table below.|
|commissionPercent|number|Comission percentage for each trade. Commission JPY amount is calculated by `target price * target volume * (commissionPercent / 100)`. Arbitrager calculates expected profit by `inversed spread * volume - commission JPY amount`.|  
|noTradePeriods|list of ["starttime", "endtime"]|See noTradePeriods section below|

#### 対応している取引区分

|取引所|対応区分|
|--------|----------------|
|Bitflyer|Cash|
|Bitbankcc|Cash|
|Btcbox|Cash|
|Coincheck|Cash|
|Zaif|Cash|

1. The arbitrager finds leverage positions with the following conditions.
  * The opposite side of the sending order
  * Almost same amount as the sending order. 'Almost same' here means within 1% difference
2. If the positions are found, the arbitrager closes the oldest one.
3. If not found, the arbitrager opens a new position.

Please note this implementation doesn't close multiple positions by one order.

### noTradePeriods 設定

The noTradePeriods config specifies the periods when the quotes from the exchange must be ignored. The config is useful for scheduled maintenance periods, e.g. 4:00-4:15 in bitFlyer.

* 例: Exclude bitFlyer from trading activities between 4:00 am to 4:15 am.

```json
    {
      "broker": "Bitflyer",
...
      "noTradePeriods": [["04:00", "04:15"]]
    },
```

* 例: Excludes multiple periods

```json
    {
      "broker": "Bitflyer",
...
      "noTradePeriods": [["04:00", "04:15"], ["9:00", "9:30"]]
    },
```

### ログ通知設定 (Slack, LINE)

R2-re can send notification messages to Slack and LINE when it detects the configured keywords in the output logs.
※現在この機能は無効ですが `config.json` の必須項目になっているので `false` をセットしていないと動きません。

* 例

```json
// config.json
{
...
  "logging": {
    "slack": {
      "enabled": false,
      "channel": "#ch1",
      "username": "abc",
      "keywords": ["error", "profit"]
    },
    "line": {
      "enabled": false,
      "keywords": ["error", "profit"]
    }
  }
}
```

#### Slack 通知

|Name|Values|Description|
|----|------|-----------|
|enabled|true or false|Enable notification|
|channel|string|Slack channel name|
|username|string|Slack user name|
|keywords|string[]|Keyword list|

#### LINE 通知

|Name|Values|Description|
|----|------|-----------|
|enabled|true or false|Enable notification|
|keywords|string[]|Keyword list|

### ログファイル

全てのログは `logs` フォルダに保管されます。

|ファイル名|説明|
|---------|-----------|
|info.log|コンソール表示とほぼ同様の標準的なログ|
|error.log|ERROR/FATALレベルのエラーについてのみのログ|
|debug.log|デバッグモードで動作時の全てのログ|

## 便利ツール

※現在動作しません

Several utility scripts are available to close positions, show balances and clear cache.

See [TOOLS.md](https://github.com/nh-chitose/r2-re/blob/master/docs/TOOLS.md)

## 動作テスト

`test` script runs [mocha](https://mochajs.org/).

```sh
npm run test
```

## ライセンス

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 免責事項

USE THE SOFTWARE AT YOUR OWN RISK. YOU ARE RESPONSIBLE FOR YOUR OWN MONEY. THE AUTHOR HAS NO RESPONSIBILITY FOR YOUR TRADING RESULTS.
