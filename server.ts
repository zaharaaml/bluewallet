import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use(express.json());

async function supabaseFetch(endpoint, options = {}) {
  console.log("masuk sini supabaseFetch");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  return data;
}

// =======================
// API Routes
// =======================

app.get("/api/expenses", async (req, res) => {
  console.log("masuk sini get");
  try {
    const expenses = await supabaseFetch(
      "expenses?select=*&order=date.desc"
    );
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", async (req, res) => {
  try {
    const { amount, category, description, date, source } = req.body;

    const id = crypto.randomUUID();

    await supabaseFetch("expenses", {
      method: "POST",
      body: JSON.stringify([
        {
          id,
          amount,
          category,
          description,
          date,
          source: source || "manual",
        },
      ]),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    await supabaseFetch(`expenses?id=eq.${req.params.id}`, {
      method: "DELETE",
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// BCA Email Webhook
// =======================

app.post("/api/webhook/bca", async (req, res) => {
  const { body } = req.body;

  let amount = 0;
  let description = "BCA Transaction";
  let date = new Date().toISOString().split("T")[0];

  const amountMatch = body.match(/Rp\.?\s?([\d\.]+)/i);

  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/\./g, ""));
  }

  if (body.includes("TRANSFER")) {
    description = "BCA Transfer Out";
  } else if (body.includes("KARTU DEBIT")) {
    const merchantMatch = body.match(/di\s+(.*?)\s+pada/i);
    description = merchantMatch
      ? `Debit: ${merchantMatch[1]}`
      : "BCA Debit Transaction";
  }

  if (amount > 0) {
    const id = crypto.randomUUID();

    await supabaseFetch("expenses", {
      method: "POST",
      body: JSON.stringify([
        {
          id,
          amount,
          category: "Lainnya",
          description,
          date,
          source: "email",
        },
      ]),
    });

    console.log(`[BCA Webhook] Auto-added expense: ${description} - ${amount}`);

    res.json({
      success: true,
      added: { description, amount },
    });
  } else {
    res.status(400).json({
      error: "Could not parse transaction from email body",
    });
  }
});

// =======================
// Vite Dev Server
// =======================

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
