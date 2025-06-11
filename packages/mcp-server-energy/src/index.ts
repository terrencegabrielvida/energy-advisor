import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchEnergySites } from './services/searchService';
import { analyzeWithClaude } from './services/claudeService';
import { queryQdrant, storeSearchResults } from './services/qdrantService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    console.log('\n🔍 Searching for relevant energy sources...');
    const relevantSites = await searchEnergySites(question);
    
    console.log('\n📊 Sources found:');
    relevantSites.forEach((site, index) => {
      console.log(`\n${index + 1}. ${site.title}`);
      console.log(`   URL: ${site.url}`);
      console.log(`   Source: ${site.source}`);
    });
    
    // Extract topics from the question for better context
    const topics = question.toLowerCase().split(' ').filter((word: string) => 
      word.length > 3 && !['what', 'when', 'where', 'which', 'that', 'this', 'with'].includes(word)
    );

    // Store the search results in Qdrant for future use
    if (relevantSites.length > 0) {
      await storeSearchResults(relevantSites, topics);
    }

    console.log('\n🔎 Querying Qdrant for additional context...');
    const qdrantResults = await queryQdrant(question);
    
    console.log('\n🤖 Analyzing with Claude...');
    const analysis = await analyzeWithClaude({
      question,
      relevantSites,
      qdrantResults
    });

    const response = {
      question,
      forecast: analysis,
      sources: {
        websites: relevantSites.map(site => ({
          title: site.title,
          url: site.url,
          source: site.source
        }))
      }
    };

    console.log('\n✨ Analysis complete!');
    res.json(response);
  } catch (error) {
    console.error('Error in analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 MCP Energy Server running on port ${port}`);
  console.log('📝 Send a POST request to /analyze with your energy-related question');
}); 