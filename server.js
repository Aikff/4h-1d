import express from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// ===== STATIC SITE =====
app.use(express.static(path.join(process.cwd(), "public")));

// ===== UPTIMEROBOT HEALTH CHECK =====
app.get("/health", (req, res) => {
  res.send("OK");
});

// ===== API (ÖRNEK) =====
app.get("/signals", (req, res) => {
  res.json({
    btc: "LONG",
    eth: "SHORT",
    time: new Date().toISOString()
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
