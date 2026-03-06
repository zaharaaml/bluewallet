import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const app = express();
const PORT = 3000;
const db = new Database("expenses.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount NUMBER,
    category TEXT,
    description TEXT,
    date TEXT,
    source TEXT DEFAULT 'manual'
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

app.use(express.json());

// API Routes
app.get("/api/expenses", (req, res) => {
  const expenses = db.prepare("SELECT * FROM expenses ORDER BY date DESC, id DESC").all();
  res.json(expenses);
});

app.post("/api/expenses", (req, res) => {
  const { id, amount, category, description, date, source } = req.body;
  db.prepare("INSERT INTO expenses (id, amount, category, description, date, source) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, amount, category, description, date, source || 'manual');
  res.json({ success: true });
});

app.delete("/api/expenses/:id", (req, res) => {
  db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// BCA Email Webhook (Simulated)
// This endpoint would be called by an email-to-webhook service (like SendGrid Inbound Parse or Zapier)
app.post("/api/webhook/bca", (req, res) => {
  const { body, subject } = req.body;
  
  // Basic Regex for BCA Transaction Emails
  // Example: "M-BCA: TRANSFER Rp. 50.000 ke 1234567890 TGL: 06/03"
  // Example: "TRANSAKSI KARTU DEBIT Rp 100.000 di TOKOPEDIA pada 06/03/26"
  
  let amount = 0;
  let description = "BCA Transaction";
  let date = new Date().toISOString().split('T')[0];

  // Try to find amount
  const amountMatch = body.match(/Rp\.?\s?([\d\.]+)/i);
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/\./g, ''));
  }

  // Try to find description
  if (body.includes("TRANSFER")) {
    description = "BCA Transfer Out";
  } else if (body.includes("KARTU DEBIT")) {
    const merchantMatch = body.match(/di\s+(.*?)\s+pada/i);
    description = merchantMatch ? `Debit: ${merchantMatch[1]}` : "BCA Debit Transaction";
  }

  if (amount > 0) {
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO expenses (id, amount, category, description, date, source) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, amount, 'Lainnya', description, date, 'email');
    
    console.log(`[BCA Webhook] Auto-added expense: ${description} - ${amount}`);
    res.json({ success: true, added: { description, amount } });
  } else {
    res.status(400).json({ error: "Could not parse transaction from email body" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
