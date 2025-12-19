import express from "express";
import axios from "axios";
import cron from "node-cron";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const BINANCE = "https://fapi.binance.com";

let signals = []; // sadece aktif sinyaller tutulur

/* ------------------ YARDIMCI ------------------ */

function sma(values, period = 32) {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

async function getSymbols() {
  const { data } = await axios.get(`${BINANCE}/fapi/v1/exchangeInfo`);
  return data.symbols
    .filter(s =>
      s.contractType === "PERPETUAL" &&
      s.status === "TRADING" &&
      s.quoteAsset === "USDT"
    )
    .map(s => s.symbol);
}

async function getCloses(symbol, interval) {
  const { data } = await axios.get(
    `${BINANCE}/fapi/v1/klines`,
    { params: { symbol, interval, limit: 33 } }
  );
  return data.map(k => Number(k[4]));
}

async function scan() {
  console.log("Scanning...");
  const symbols = await getSymbols();
  const result = [];

  for (const symbol of symbols) {
    for (const tf of ["4h", "1d"]) {
      const closes = await getCloses(symbol, tf);
      if (closes.length < 33) continue;

      const prev = closes.slice(0, -1);
      const lastClose = closes.at(-1);
      const prevClose = prev.at(-1);

      const prevMA = sma(prev);
      const lastMA = sma(closes);

      if (prevClose < prevMA && lastClose > lastMA)
        result.push({ symbol, tf, signal: "LONG" });

      if (prevClose > prevMA && lastClose < lastMA)
        result.push({ symbol, tf, signal: "SHORT" });
    }
  }

  signals = result; // overwrite → RAM şişmez
}

/* ------------------ CRON ------------------ */
/*
  30 dakikada bir:
  - Render free için güvenli
  - Ban riski düşük
*/
cron.schedule("*/30 * * * *", scan);

/* ------------------ API ------------------ */

app.get("/signals", (req, res) => {
  res.json(signals);
});

/* ------------------ FRONTEND ------------------ */

app.use(express.static(path.join(process.cwd(), "public")));

/* ------------------ START ------------------ */

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
  scan(); // ilk açılışta bir kez
});

