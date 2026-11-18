# btc-race-24h-2

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/reonakisaragi4-bot/btc-race-24h-2/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/reonakisaragi4-bot/btc-race-24h-2/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Deep-dip swing bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades Coinbase Wrapped BTC against USDC minute by minute on 1-minute on-chain prices, starting with $1,000 of paper money. It waits for a real washout — the close at least 2.5% under the running high — buys the whole balance in one go, takes profit at +2% over cost, and stops out at −2.5% under cost. No deep-dip buys in the last 240 bars, and a small-dip fallback buy late in the day if the main rule never fired, so the entry always makes at least one trade.

Dev-window result (kit grade-local): net PnL +18.73 USDC, 2 trades, max drawdown 1.52%.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=cdrpe06y&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
