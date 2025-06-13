# 🔍 Energy Advisor Monitoring

Simple, lightweight monitoring for your Philippines energy AI agent.

## 🚀 Quick Setup

### Option 1: Console Monitoring (Default - No Setup Required)

Your backend already includes built-in console monitoring. Just start your backend:

```bash
cd apps/backend
pnpm dev
```

**Test it:**
```bash
curl -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"question": "What are solar opportunities in Cebu?"}'
```

You'll see trace logs in your console:
```
🔍 Analyzing: What are solar opportunities in Cebu?
📊 Trace: {
  id: 'trace_1749806789_abc123',
  question: 'What are solar opportunities in Cebu?...',
  tools: ['query_qdrant_db', 'search_philippines_energy'],
  sources: 5,
  latency: '3421ms'
}
✅ Analysis complete
```

### Option 2: Web Dashboard (Optional)

For a simple web dashboard, start the lightweight monitoring server:

```bash
cd packages/monitoring
python3 lightweight_server.py
```

This provides:
- **Health Check**: http://localhost:6007/health
- **Metrics API**: http://localhost:6007/metrics
- **Dashboard**: http://localhost:6007/dashboard

## 📊 What You Get

### ✅ Currently Working
- **Console Traces** - Real-time logging of AI agent calls
- **Performance Metrics** - Response times and latency tracking
- **Tool Usage** - Which MCP tools are being used
- **Source Tracking** - URLs and titles of scraped sources
- **Error Tracking** - Failed requests and errors

### ⚠️ Advanced Features (Requires Setup)
- **Phoenix Dashboard** - Visual trace interface (requires fixing dependencies)
- **RAGAS Evaluation** - Quality metrics (faithfulness, relevancy, etc.)

## 🔗 Available Endpoints

### Backend Endpoints
- `POST /analyze` - AI agent analysis with monitoring
- `GET /metrics` - Get monitoring metrics  
- `GET /health` - Health check

### Optional Monitoring Server (if started)
- `GET /health` - Monitor server status
- `GET /metrics` - Detailed metrics
- `GET /dashboard` - Simple dashboard

## 📈 Monitoring Data

### Console Output Example
```
📊 Trace: {
  id: 'trace_1749806789_abc123',
  question: 'What are solar opportunities in Cebu?...',
  tools: ['query_supabase_db', 'search_philippines_energy', 'store_energy_data'],
  sources: 8,
  latency: '2847ms'
}
```

### Metrics API Example
```json
{
  "message": "Local monitoring mode",
  "suggestion": "Start monitoring server: python3 packages/monitoring/lightweight_server.py",
  "status": "traces logged to console"
}
```

## 🛠 Advanced Setup (Optional)

If you want full Phoenix + RAGAS evaluation:

```bash
# Fix dependency issues first
pip3 install "numpy<2"
pip3 install arize-phoenix ragas sentence-transformers

# Set environment variables
export PHOENIX_PORT=6006
export GRPC_PORT=4318

# Start full monitoring
python3 server.py
```

## 🎯 Benefits

✅ **Zero Setup** - Console monitoring works out of the box  
✅ **No Dependencies** - No Python packages required for basic monitoring  
✅ **Real-time** - See traces as they happen  
✅ **Lightweight** - Minimal performance impact  
✅ **Source Transparency** - See exactly what sources are used  
✅ **Tool Analytics** - Track which MCP tools are most used  

## 🔍 Current Status

- **Console Monitoring**: ✅ Working
- **Web Dashboard**: ⚡ Optional (lightweight_server.py)
- **Phoenix Dashboard**: ⚠️ Requires dependency fixes
- **RAGAS Evaluation**: ⚠️ Requires full setup

Perfect for monitoring your Philippines energy AI agent without complexity! 🇵🇭⚡