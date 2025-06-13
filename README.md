# Energy Advisor 🤖⚡

An AI-powered energy market analysis and advisory system for the Philippines, providing real-time insights, forecasts, and recommendations.

## Features

- **Real-time Market Analysis**
  - Live energy market data
  - Supply and demand tracking
  - Price trend analysis
  - Grid status monitoring

- **Intelligent Forecasting**
  - Short-term (6-12 months) predictions
  - Medium-term (1-3 years) projections
  - Long-term (3-5 years) trends
  - ROI and financial projections

- **Comprehensive Data Sources**
  - Web search integration
  - Historical data analysis
  - Real-time market feeds
  - Regulatory updates

- **Expert Recommendations**
  - Location-specific insights
  - Technical assessments
  - Financial analysis
  - Risk evaluations

## Tech Stack

- **AI & ML**
  - Anthropic Claude 3 (Opus) for analysis
  - Local embeddings with `@xenova/transformers`
  - Qdrant for vector search
  - Multi-agent system for data gathering

- **Backend**
  - Node.js with TypeScript
  - Express.js server
  - Puppeteer for web scraping
  - Axios for API calls

- **Data Storage**
  - Qdrant for vector storage
  - Supabase for structured data
  - Local caching system

## Getting Started

1. **Prerequisites**
   ```bash
   Node.js >= 18
   pnpm >= 8
   Docker
   ```

2. **Installation**
   ```bash
   # Install dependencies
   pnpm install

   # Start the backend server
   pnpm start:backend

   # Start Qdrant (requires Docker)
   pnpm start:qdrant

   # Seed the database
   pnpm --filter ai-agent exec ts-node scripts/seed.ts

   # Start the AI agent
   pnpm start:agent
   ```

3. **Environment Setup**
   Create a `.env` file with:
   ```
   ANTHROPIC_API_KEY=your_api_key
   QDRANT_URL=http://localhost:6333
   ```

## Usage

1. **Basic Query**
   ```bash
   curl -X POST http://localhost:3000/analyze \
     -H "Content-Type: application/json" \
     -d '{"question": "What's the best location for a 100MW battery in Visayas?"}'
   ```

2. **Detailed Analysis**
   The system will provide:
   - Specific location recommendations
   - Market analysis with exact numbers
   - Technical requirements
   - Financial projections
   - Risk assessment

## Development

- **Project Structure**
  ```
  packages/
  ├── ai-agent/         # AI analysis and response generation
  ├── mcp-server-energy/# Web search and data gathering
  ├── data-core/        # Data processing and embeddings
  └── shared/          # Shared types and utilities
  ```

- **Adding New Features**
  1. Create a new branch
  2. Implement changes
  3. Add tests
  4. Submit PR

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
