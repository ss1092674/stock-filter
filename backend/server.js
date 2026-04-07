



const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const { RSI, ATR } = require("technicalindicators");

const app = express();
const PORT = 5000;

// ✅ Manual CORS — works with all Express versions
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Respond immediately to preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

// ─── Stocks to scan ───────────────────────────────────────
const stocks = [
   "RELIANCE.NS",
  "TCS.NS",
  "INFY.NS",
  "HDFCBANK.NS",
  "ICICIBANK.NS",
  "SBIN.NS",
  "AXISBANK.NS",
  "KOTAKBANK.NS",
  "BAJFINANCE.NS",
  "BAJAJFINSV.NS",

  "ITC.NS",
  "LT.NS",
  "ASIANPAINT.NS",
  "MARUTI.NS",
  "TITAN.NS",
  "ULTRACEMCO.NS",
  "SUNPHARMA.NS",
  "NESTLEIND.NS",
  "HINDUNILVR.NS",
  "WIPRO.NS",

  "TATASTEEL.NS",
  "HINDALCO.NS",
  "JSWSTEEL.NS",
  "COALINDIA.NS",
  "ONGC.NS",
  "BPCL.NS",
  "IOC.NS",
  "GAIL.NS",
  "POWERGRID.NS",
  "NTPC.NS",

  "ADANIENT.NS",
  "ADANIPORTS.NS",
  "ADANIPOWER.NS",
  "ADANIGREEN.NS",
  "ADANITRANS.NS",

  "YESBANK.NS",
  "IDFCFIRSTB.NS",
  "PNB.NS",
  "BANKBARODA.NS",
  "CANBK.NS",

  "SUZLON.NS",
  "IDEA.NS",
  "IRFC.NS",
  "IREDA.NS",
  "ZOMATO.NS",
  "PAYTM.NS",
  "DELHIVERY.NS",
  "NYKAA.NS",
  "JUBLFOOD.NS",
  "ASHOKLEY.NS"
];

// Store latest signals in memory
let latestSignals = [];

// Current interval
let currentInterval = '1m';

// Interval to range mapping
const intervalRanges = {
  '1m': '1d',
  '5m': '5d',
  '15m': '5d',
  '1h': '1mo'
};

// ─── Fetch stock data from Yahoo Finance ──────────────────
async function getStockData(symbol, interval) {
  try {
    const range = intervalRanges[interval] || '1d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });

    const result = res.data.chart.result;
    if (!result || !result[0]) return null;

    const quotes = result[0].indicators.quote[0];

    return {
      close: quotes.close.filter(v => v !== null),
      high:  quotes.high.filter(v => v !== null),
      low:   quotes.low.filter(v => v !== null)
    };
  } catch {
    return null;
  }
}

// ─── Supertrend calculation ───────────────────────────────
function calculateSupertrend(high, low, close) {
  const atr = ATR.calculate({ period: 10, high, low, close });
  const multiplier = 1;

  return atr.map((atrVal, i) => {
    const hl2 = (high[i] + low[i]) / 2;
    return {
      upperBand: hl2 + multiplier * atrVal,
      lowerBand: hl2 - multiplier * atrVal
    };
  });
}

// ─── Strategy: RSI + Supertrend ───────────────────────────
function checkStrategy(data) {
  const { close, high, low } = data;
  if (close.length < 20) return null;

  const rsi = RSI.calculate({ period: 14, values: close });
  const st  = calculateSupertrend(high, low, close);

  const latestPrice = close.at(-1);
  const prevPrice   = close.at(-2);
  const latestRSI   = rsi.at(-1);
  const latestST    = st.at(-1);
  const prevST      = st.at(-2);

  if (!latestST || !prevST) return null;

  const signals = [];

  if (latestRSI > 70) {
    signals.push("⚠️ RSI Overbought (Watch Sell)");
  }

  if (prevPrice > prevST.lowerBand && latestPrice < latestST.lowerBand) {
    signals.push("🔴 Supertrend SELL");
  }

  if (latestRSI < 30) {
    signals.push("⚠️ RSI Oversold (Watch Buy)");
  }

  if (prevPrice < prevST.upperBand && latestPrice > latestST.upperBand) {
    signals.push("🟢 Supertrend BUY");
  }

  return signals.length ? signals : null;
}

// ─── Market scanner ───────────────────────────────────────
async function scanMarket() {
  console.log("🔍 Scanning market...");

  const results = await Promise.all(
    stocks.map(async (stock) => {
      const data = await getStockData(stock, currentInterval);
      if (!data) return null;

      const signals = checkStrategy(data);
      if (signals) return { stock, signals };

      return null;
    })
  );

  latestSignals = results.filter(Boolean);
  console.log(`✅ Scan complete — ${latestSignals.length} signal(s) found`);
}

// Run once on startup
scanMarket().catch(err => console.error("Initial scan failed:", err.message));

// Re-scan every minute at :10 seconds
cron.schedule("10 * * * * *", scanMarket);

// ─── Routes ───────────────────────────────────────────────

app.get("/signals", (req, res) => {
  res.json(latestSignals);
});

// Watchlist (in-memory)
let watchlist = ["RELIANCE.NS", "TCS.NS", "INFY.NS"];

app.get("/watchlist", (req, res) => {
  res.json(watchlist);
});

app.post("/watchlist", (req, res) => {
  const { stock } = req.body;
  if (!stock) return res.status(400).json({ error: "Stock symbol is required" });

  const normalized = stock.trim().toUpperCase();
  if (!watchlist.includes(normalized)) {
    watchlist.push(normalized);
  }

  res.json(watchlist);
});

app.delete("/watchlist/:stock", (req, res) => {
  const stock = req.params.stock.trim().toUpperCase();
  watchlist = watchlist.filter(item => item !== stock);
  res.json(watchlist);
});

// Set interval
app.post("/set-interval", (req, res) => {
  const { interval } = req.body;
  if (intervalRanges[interval]) {
    currentInterval = interval;
    res.json({ interval: currentInterval });
    // Trigger immediate scan
    scanMarket();
  } else {
    res.status(400).json({ error: "Invalid interval" });
  }
});

// ─── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("⏳ Market scanner active — runs every 60s");
});
