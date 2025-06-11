import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
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

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
