const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const cors = require("cors");
const { RSI, ATR } = require("technicalindicators");

const app = express();

// ✅ IMPORTANT FOR RENDER
const PORT = process.env.PORT || 5000;

// ✅ CORS FIX (LOCAL + VERCEL)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://stock-filter-t8jp.vercel.app/"
    ],
    credentials: true
  })
);

app.use(express.json());

// ─── STOCK LIST ─────────────────────────
const stocks = [
  "RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","ICICIBANK.NS",
  "SBIN.NS","AXISBANK.NS","KOTAKBANK.NS","BAJFINANCE.NS","ITC.NS",
  "LT.NS","ASIANPAINT.NS","MARUTI.NS","TITAN.NS","WIPRO.NS"
];

// ─── STATE ─────────────────────────
let latestSignals = [];
let currentInterval = "1m";

const intervalRanges = {
  "1m": "1d",
  "5m": "5d",
  "15m": "5d",
  "1h": "1mo"
};

// ─── FETCH DATA ─────────────────────────
async function getStockData(symbol, interval) {
  try {
    const range = intervalRanges[interval] || "1d";

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });

    const result = res.data.chart.result;
    if (!result || !result[0]) return null;

    const q = result[0].indicators.quote[0];

    return {
      close: q.close.filter(v => v !== null),
      high: q.high.filter(v => v !== null),
      low: q.low.filter(v => v !== null)
    };
  } catch {
    return null;
  }
}

// ─── SUPER TREND ─────────────────────────
function calculateSupertrend(high, low, close) {
  const atr = ATR.calculate({ period: 10, high, low, close });

  return atr.map((val, i) => {
    const hl2 = (high[i] + low[i]) / 2;
    return {
      upperBand: hl2 + val,
      lowerBand: hl2 - val
    };
  });
}

// ─── STRATEGY ─────────────────────────
function checkStrategy(data) {
  const { close, high, low } = data;
  if (close.length < 20) return null;

  const rsi = RSI.calculate({ period: 14, values: close });
  const st = calculateSupertrend(high, low, close);

  const latestRSI = rsi.at(-1);
  const latest = close.at(-1);
  const prev = close.at(-2);

  const latestST = st.at(-1);
  const prevST = st.at(-2);

  let signals = [];

  if (latestRSI > 70) signals.push("🔴 RSI Overbought");
  if (latestRSI < 30) signals.push("🟢 RSI Oversold");

  if (prev > prevST.lowerBand && latest < latestST.lowerBand)
    signals.push("🔴 Supertrend SELL");

  if (prev < prevST.upperBand && latest > latestST.upperBand)
    signals.push("🟢 Supertrend BUY");

  return signals.length ? signals : null;
}

// ─── SCANNER ─────────────────────────
async function scanMarket() {
  console.log("🔍 Scanning...");

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

  console.log(`✅ ${latestSignals.length} signals found`);
}

// Run immediately
scanMarket();

// Run every minute
cron.schedule("10 * * * * *", scanMarket);

// ─── ROUTES ─────────────────────────
app.get("/signals", (req, res) => {
  res.json(latestSignals);
});

app.post("/set-interval", (req, res) => {
  const { interval } = req.body;

  if (intervalRanges[interval]) {
    currentInterval = interval;
    scanMarket();
    res.json({ interval });
  } else {
    res.status(400).json({ error: "Invalid interval" });
  }
});
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ─── START SERVER ─────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});