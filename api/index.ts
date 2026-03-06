import express from 'express';
import crypto from 'crypto';

const app = express();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use(express.json());

async function supabaseFetch(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    ...options
  });

  return res.json();
}

app.get('/api/expenses', async (req, res) => {
  const data = await supabaseFetch('expenses?select=*&order=date.desc');
  res.json(data);
});

app.post('/api/expenses', async (req, res) => {
  const { amount, category, description, date } = req.body;

  await supabaseFetch('expenses', {
    method: 'POST',
    body: JSON.stringify([
      {
        id: crypto.randomUUID(),
        amount,
        category,
        description,
        date,
        source: 'manual'
      }
    ])
  });

  res.json({ success: true });
});

export default app;
