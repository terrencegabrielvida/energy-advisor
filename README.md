# Claude RAG Starter Repo 🧠📊

## Overview
This repo provides a full RAG pipeline powered by **Anthropic Claude**, with:
- **Multi-agent connectors (MCP)** for browsing and DB access
- **Qdrant** for vector search
- **Supabase** for structured data storage
- Local **embeddings** using `@xenova/transformers`
- Claude 3 (Sonnet) LLM for answering questions

pnpm install
pnpm start:backend

open docker
pnpm start:qdrant on terminal

pnpm --filter ai-agent exec ts-node scripts/seed.ts
pnpm start:agent
