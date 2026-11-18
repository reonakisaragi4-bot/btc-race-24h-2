// Deep-dip swing bot for the cbBTC 24h race (agent-fun/bars-replay/v1).
//
// What the dev window taught us: this market falls hard early, then
// recovers in one broad wave, then drifts sideways and slides into the
// close. One-minute wiggles are only a few bps while a full round trip
// costs ~26 bps in fees, slippage and pool impact, so chasing every
// wiggle bleeds. The only trade worth paying the toll for is a big one:
//
//   - Wait for a real washout: the close at least 2.5% under the highest
//     close seen so far. Then buy the whole cash balance in one go.
//   - Take the profit at +2% over what the position cost. A 2% wave
//     clears the ~0.26% toll several times over; smaller targets get
//     eaten by noise and by the toll itself.
//   - A hard stop 2.5% under cost caps the damage if the washout was
//     the start of a cliff instead of a dip. After a stop, stay out.
//   - No deep-dip buys in the last 240 bars: a position opened that
//     late has no time to reach its target before the forced final sale.
//
// One guardrail problem remains: on a calm or rising day the price may
// never wash out 2.5%, and an entry with zero trades ranks below every
// entry that traded. So if nothing has been bought by bar 1200, a
// fallback arms: buy the next 0.5% dip, or buy outright at bar 1380 at
// the latest. It only ever fires on a day the main rule sat out, so it
// cannot touch the main rule's profit on a day like the dev window.
//
// Everything is deterministic: no clock, no environment, no randomness.
// Decisions use only the bars the harness sent.
//
// Dev-window result (kit grade-local, --driver process): net PnL
// +18.73 USDC, 2 trades, max drawdown 1.52%.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// Bars of closes before the bot trusts its running high.
const ARM_BARS = 20;
// Deep-dip entry: close this many bps under the running high.
const DIP_BPS = 250;
// Take profit: position value this many bps over its cost.
const TAKE_PROFIT_BPS = 200;
// Hard stop: position value this many bps under its cost.
const STOP_BPS = 250;
// No deep-dip buys once this many closes have been seen.
const NO_BUY_AFTER_BARS = 1200;
// Fallback entry once the main rule has sat out this long.
const FALLBACK_ARM_BARS = 1200;
// Fallback dip size, in bps under the running high.
const FALLBACK_DIP_BPS = 50;
// Fallback buys outright at this bar at the latest.
const FALLBACK_LAST_BAR = 1380;
// Every order caps slippage this far past the close it was decided on.
const MAX_SLIPPAGE_BPS = 100;
// Bars to wait before retrying a buy the market refused.
const RETRY_AFTER_BARS = 3;

const closes: number[] = [];
let runningHigh = 0;
let lastBuyAttemptBar = -1;
let heldOnce = false;
let stoppedOut = false;

function heldQty(state: BarsState): bigint {
  const p = state.positions.get(SYMBOL);
  return p === undefined ? 0n : p.qty;
}

await runBars({
  onBatch(state: BarsState) {
    const bar = state.latest.get(SYMBOL);
    if (bar !== undefined) {
      const close = Number(bar.c);
      closes.push(close);
      if (close > runningHigh) runningHigh = close;
    }
    if (state.warmingUp) return [];
    if (bar === undefined) return [];

    const qty = heldQty(state);
    if (qty > 0n) heldOnce = true;

    if (qty > 0n) {
      // Holding: take profit, or stop out. Nothing else to do.
      const pos = state.positions.get(SYMBOL)!;
      const value = state.value(SYMBOL, qty);
      const cost = pos.cost;
      const takeProfitAt = (cost * BigInt(10000 + TAKE_PROFIT_BPS)) / 10000n;
      const stopAt = (cost * BigInt(10000 - STOP_BPS)) / 10000n;
      if (value >= takeProfitAt || value <= stopAt) {
        if (value <= stopAt) stoppedOut = true;
        const sell: SellInput = {
          side: 'sell',
          symbol: SYMBOL,
          qty,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        };
        return [sell];
      }
      return [];
    }

    if (stoppedOut) return [];
    if (closes.length < ARM_BARS) return [];

    const seen = closes.length;
    const close = Number(bar.c);
    const belowHighBps =
      runningHigh > 0 ? ((runningHigh - close) * 10000) / runningHigh : 0;

    let wantBuy = false;
    if (seen < NO_BUY_AFTER_BARS) {
      // Main rule: a genuine washout off the running high.
      wantBuy = belowHighBps >= DIP_BPS;
    } else if (!heldOnce) {
      // Fallback: the main rule never fired all day. Trade something,
      // so the entry meets the race's at-least-one-trade guardrail.
      wantBuy =
        belowHighBps >= FALLBACK_DIP_BPS || seen >= FALLBACK_LAST_BAR;
    }
    if (!wantBuy) return [];

    // A refused buy is retried a few bars later, not every bar.
    if (lastBuyAttemptBar >= 0 && seen - lastBuyAttemptBar < RETRY_AFTER_BARS) {
      return [];
    }

    const room = state.weightRoom(SYMBOL);
    const spend = room < state.cash ? room : state.cash;
    if (spend <= 0n) return [];
    lastBuyAttemptBar = seen;
    const buy: BuyInput = {
      side: 'buy',
      symbol: SYMBOL,
      notional_quote_units: spend,
      max_slippage_bps: MAX_SLIPPAGE_BPS,
    };
    return [buy];
  },
});
