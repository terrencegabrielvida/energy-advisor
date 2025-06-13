import dotenv from 'dotenv';
import * as path from 'path';
import { config } from 'dotenv';
import { searchEnergySites } from './searchService';
config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is required in .env file');
}

interface AnalysisInput {
  question: string;
  relevantSites?: Array<{
    url: string;
    title: string;
    snippet: string;
    content?: string;
  }>;
  qdrantResults?: any[];
}

export async function analyzeWithClaude(input: AnalysisInput): Promise<string> {
  try {
    let websiteContext = '';
    let qdrantContext = '';

    // If no sites provided, search the web
    if (!input.relevantSites || input.relevantSites.length === 0) {
      console.log('No sites provided, searching the web...');
      const searchResults = await searchEnergySites(input.question);
      websiteContext = searchResults
        .map(site => `
          Source: ${site.url}
          Title: ${site.title}
          Content: ${site.content || site.snippet}
        `)
        .join('\n\n');
    } else {
      websiteContext = input.relevantSites
        .map(site => `
          Source: ${site.url}
          Title: ${site.title}
          Content: ${site.content || site.snippet}
        `)
        .join('\n\n');
    }

    if (input.qdrantResults && input.qdrantResults.length > 0) {
      // Only include Qdrant results with high similarity score
      const relevantResults = input.qdrantResults.filter(result => result.score >= 0.7);
      
      if (relevantResults.length > 0) {
        qdrantContext = relevantResults
          .map(result => `
            Historical Data:
            ${result.content}
            Source: ${result.source}
            Topics: ${result.topics.join(', ')}
          `)
          .join('\n\n');
      }
    }

    const context = `${websiteContext}${qdrantContext ? `\n\nHistorical Context and Additional Data:\n${qdrantContext}` : ''}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `You are an energy sector expert AI assistant specializing in the Philippine energy market. Your task is to provide specific, data-driven insights and recommendations based on the following question and available data.

      Question: ${input.question}
      
      Context from websites and database:
      ${context}
      
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

      Format your response in a clear, conversational manner. If you have specific data points, present them with exact numbers. If you're making projections, include specific timelines and amounts.`
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
  } catch (error) {
    console.error('Error in Claude analysis:', error);
    throw error;
  }
} 