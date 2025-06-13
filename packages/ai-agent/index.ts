import fetch from "node-fetch";
import { QdrantClient } from "@qdrant/js-client-rest";
import { embedText } from "../data-core/embedding";
import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
});

interface MCPSearchResult {
  sources: {
    websites: Array<{
      title: string;
      url: string;
    }>;
  };
}

async function searchMCP(question: string): Promise<MCPSearchResult | null> {
  try {
    const response = await fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      console.log('MCP server not available, proceeding without context');
      return null;
    }

    const data = await response.json() as MCPSearchResult;
    return data;
  } catch (error) {
    console.log('MCP server not available, proceeding without context');
    return null;
  }
}

async function askClaude(question: string, context?: string): Promise<string> {
  let finalContext = context;
  
  if (!finalContext) {
    const searchResults = await searchMCP(question);
    if (searchResults) {
      finalContext = searchResults.sources.websites
        .map((site: any) => `${site.title}\n${site.url}`)
        .join('\n\n');
    }
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an energy sector expert AI assistant specializing in the Philippine energy market. Your task is to provide specific, data-driven insights and recommendations based on the following question${finalContext ? ' and available data' : ''}.

      Question: ${question}
      
      ${finalContext ? `Context from websites and database:
      ${finalContext}` : ''}
      
      Please provide your response in a conversational, expert manner. Include:

      1. Specific Recommendations
         - Clear, actionable location or solution recommendations
         - Exact metrics and numbers (e.g., "50 pesos per meter", "100MW demand")
         - Specific timeframes for forecasts
         - Concrete price points and ROI projections

      2. Market Analysis
         - Current supply and demand situation
         - Specific price points and trends
         - Recent developments and their exact impacts
         - Historical data comparisons

      3. Technical Assessment
         - Specific infrastructure details
         - Exact capacity numbers
         - Technical requirements
         - Grid connection specifics

      4. Financial Analysis
         - Precise cost estimates in Philippine Peso
         - Specific ROI projections
         - Breakeven timelines
         - Available financial hedges or contracts

      5. Risk Factors
         - Specific challenges with exact numbers
         - Market volatility metrics
         - Regulatory considerations
         - Environmental impact data

      Important Guidelines:
      - Be specific with numbers, dates, and locations
      - Use exact Philippine Peso amounts
      - Provide concrete timelines
      - Include specific company names and projects
      - Reference actual market prices and trends
      - Use real historical data for comparisons
      - Be conversational but professional
      - Offer to provide more detailed information
      - Include specific sources for key data points
      - Focus on actionable insights

      Format your response in a clear, conversational manner. If you have specific data points, present them with exact numbers. If you're making projections, include specific timelines and amounts.`,
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
  
  // Get vector for user input
  const vector = await embedText(userInput);
  
  // Search Qdrant with a higher similarity threshold
  const hits = await qdrant.search("energy-docs", {
    vector,
    limit: 5,
    with_payload: true,
    score_threshold: 0.7  // Only include results with high similarity
  });

  // Only use context if we have relevant results
  const context = hits.length > 0 ? hits
    .map((h) => (typeof h.payload?.text === "string" ? h.payload.text : ""))
    .filter(Boolean)
    .join("\n---\n") : '';

  const answer = await askClaude(userInput, context);
  console.log("\n🔹 User Input:\n", userInput);
  console.log("\n🔹 Claude Response:\n", answer);
}

runAgent().catch((err) => {
  console.error("❌ Agent failed:", err);
});
