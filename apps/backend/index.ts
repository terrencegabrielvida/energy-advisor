import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import 'dotenv/config';

// MCP Tool definitions
interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface ToolCall {
  name: string;
  arguments: any;
}

interface ToolResult {
  content: any;
  isError?: boolean;
}

const app = express();
const port = 3001;
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Claude API Tools format
const claudeTools = [
  {
    name: "search_philippines_energy",
    description: "Search for Philippines energy-related information from the web",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for Philippines energy data" }
      },
      required: ["query"]
    }
  },
  {
    name: "query_qdrant_db", 
    description: "Query Qdrant vector database for relevant energy data",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Query to search in Qdrant database" }
      },
      required: ["query"]
    }
  },
  {
    name: "query_supabase_db",
    description: "Query Supabase database for Philippines energy sources",
    input_schema: {
      type: "object", 
      properties: {
        query: { type: "string", description: "Query to search in Supabase database" }
      },
      required: ["query"]
    }
  },
  {
    name: "store_energy_data",
    description: "Store new energy data in both Qdrant and Supabase databases",
    input_schema: {
      type: "object",
      properties: {
        data: { type: "array", description: "Array of energy data sources to store" },
        topics: { type: "array", description: "Related topics for the data" }
      },
      required: ["data", "topics"]
    }
  }
];

async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  try {
    switch (toolCall.name) {
      case "search_philippines_energy":
        const { searchEnergySites } = await import('../../packages/mcp-server-energy/src/services/searchService');
        const searchQuery = `${toolCall.arguments.query} Philippines energy`;
        const searchResults = await searchEnergySites(searchQuery);
        return {
          content: {
            results: searchResults,
            count: searchResults.length,
            query: searchQuery
          }
        };

      case "query_qdrant_db":
        const { queryQdrant } = await import('../../packages/mcp-server-energy/src/services/qdrantService');
        const qdrantResults = await queryQdrant(toolCall.arguments.query);
        return {
          content: {
            results: qdrantResults,
            count: qdrantResults.length
          }
        };

      case "query_supabase_db":
        const { data: supabaseData, error } = await supabase
          .from('energy_sources')
          .select('*')
          .or(`content.ilike.%${toolCall.arguments.query}%,content.ilike.%Philippines%,content.ilike.%Filipino%,content.ilike.%PH%`)
          .limit(10);
        
        if (error) {
          return { content: { error: error.message }, isError: true };
        }
        
        return {
          content: {
            results: supabaseData || [],
            count: (supabaseData || []).length
          }
        };

      case "store_energy_data":
        const { storeSearchResults } = await import('../../packages/mcp-server-energy/src/services/qdrantService');
        const { data, topics } = toolCall.arguments;
        
        // Store in Qdrant
        await storeSearchResults(data, topics);
        
        // Store in Supabase
        const supabaseInserts = data.map((result: any) => ({
          url: result.url,
          title: result.title,
          content: result.content || result.snippet,
          source: result.source,
          question_context: topics.join(', '),
          scraped_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('energy_sources')
          .insert(supabaseInserts);
        
        if (insertError) {
          return { content: { error: insertError.message }, isError: true };
        }
        
        return {
          content: {
            stored_count: data.length,
            message: "Successfully stored data in both Qdrant and Supabase"
          }
        };

      default:
        return {
          content: { error: `Unknown tool: ${toolCall.name}` },
          isError: true
        };
    }
  } catch (error) {
    return {
      content: { error: `Tool execution failed: ${error}` },
      isError: true
    };
  }
}

async function callClaudeWithTools(question: string): Promise<string> {
  const systemPrompt = `You are an AI agent specializing in Philippines energy market analysis. You have access to the following tools:

${claudeTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Your workflow should be:
1. First, check existing data sources using query_qdrant_db and query_supabase_db
2. If more information is needed, use search_philippines_energy to get fresh data
3. Store any new valuable data using store_energy_data
4. Provide comprehensive analysis with specific recommendations, forecasts, and insights

After gathering all necessary data, please provide your response in a conversational, expert manner. Include:

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

Format your response in a clear, conversational manner. If you have specific data points, present them with exact numbers. If you're making projections, include specific timelines and amounts.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      system: systemPrompt,
      tools: claudeTools,
      messages: [
        {
          role: "user",
          content: question
        }
      ]
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  
  // Handle tool calls and execute them
  let messages: any[] = [
    {
      role: "user",
      content: question
    }
  ];

  let currentResponse = data;
  let maxIterations = 10; // Prevent infinite loops
  let iteration = 0;

  while (currentResponse.content && iteration < maxIterations) {
    iteration++;
    
    // Add assistant response to conversation
    messages.push({
      role: "assistant", 
      content: currentResponse.content
    });

    // Check if there are tool calls to execute
    const toolCalls = currentResponse.content.filter((content: any) => content.type === "tool_use");
    
    if (toolCalls.length === 0) {
      // No more tool calls, return the text response
      const textContent = currentResponse.content.find((content: any) => content.type === "text");
      return textContent?.text || "No response generated.";
    }

    // Execute all tool calls and add results to conversation
    const toolResults = [];
    for (const toolCall of toolCalls) {
      const toolResult = await executeToolCall({
        name: toolCall.name,
        arguments: toolCall.input
      });
      
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolCall.id,
        content: JSON.stringify(toolResult.content),
        is_error: toolResult.isError || false
      });
    }

    // Add tool results to conversation
    messages.push({
      role: "user",
      content: toolResults
    });

    // Continue conversation with tool results
    const followUpResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        system: systemPrompt,
        tools: claudeTools,
        messages: messages
      }),
    });

    if (!followUpResponse.ok) {
      const errText = await followUpResponse.text();
      throw new Error(`Claude API follow-up error ${followUpResponse.status}: ${errText}`);
    }

    currentResponse = await followUpResponse.json();
  }

  // If we get here, either no content or max iterations reached
  const textContent = currentResponse.content?.find((content: any) => content.type === "text");
  return textContent?.text || "Analysis completed but no final response generated.";
}

async function ensureEnergySourcesTable() {
  try {
    const { error } = await supabase
      .from('energy_sources')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('relation "energy_sources" does not exist')) {
      console.log('Please create the energy_sources table in Supabase with columns: id, url, title, content, source, question_context, scraped_at');
    }
  } catch (error) {
    console.error('Error checking energy_sources table:', error);
  }
}

app.get('/health', (req: Request, res: Response) => {
  res.send('OK');
});

app.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('\n🔍 Starting AI Agent Analysis for:', question);
    console.log('🤖 Using MCP tools for comprehensive analysis...\n');

    // Use AI agent with MCP tools to handle the entire workflow
    const forecast = await callClaudeWithTools(question);

    const response = {
      question,
      forecast,
      sources: {
        message: "Sources dynamically determined by AI agent using MCP tools"
      }
    };

    console.log('\n✨ AI Agent Analysis complete!');
    res.json(response);
  } catch (error) {
    console.error('Error in AI agent analyze endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database table
ensureEnergySourcesTable();

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
