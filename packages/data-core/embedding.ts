import { pipeline } from '@xenova/transformers';

process.env.TRANSFORMERS_BACKEND = 'wasm';
process.env.TRANSFORMERS_CACHE = './cache';

let embedder: any;

export async function embedText(text: string): Promise<number[]> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
