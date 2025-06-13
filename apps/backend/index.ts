import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { analyzeWithClaude } from '../../packages/mcp-server-energy/src/services/claudeService';
import 'dotenv/config'; // ← loads .env
import 'dotenv/config';

const app = express();
const port = 3001;
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

app.get('/health', (req: Request, res: Response) => {
  res.send('OK');
});

app.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const answer = await analyzeWithClaude({ question });
    res.json({ answer });
  } catch (error) {
    console.error('Error in analyze endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
