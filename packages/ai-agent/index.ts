import fetch from "node-fetch";
import { QdrantClient } from "@qdrant/js-client-rest";
import { embedText } from "../data-core/embedding";
import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
});

async function askClaude(question: string, context: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229", // you can switch to claude-3-sonnet-20240229 if needed
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an energy advisor. Use the context below to answer the user’s question.\n\nContext:\n${context}\n\nQuestion:\n${question}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    content?: { text: string }[];
  };

  return data?.content?.[0]?.text ?? "No answer received.";
}

async function runAgent() {
  const userInput = "I want to find the best location in Visayas for a 100MW lithium battery. Where should I be looking to buy land?";
  const vector = await embedText(userInput);

  const hits = await qdrant.search("energy-docs", {
    vector,
    limit: 5,
    with_payload: true,
  });

  const context = hits
    .map((h) => (typeof h.payload?.text === "string" ? h.payload.text : ""))
    .filter(Boolean)
    .join("\n---\n");

  const answer = await askClaude(userInput, context);
  console.log("\n🔹 User Input:\n", userInput);

  console.log("\n🔹 Claude Response:\n", answer);
}

runAgent().catch((err) => {
  console.error("❌ Agent failed:", err);
});
