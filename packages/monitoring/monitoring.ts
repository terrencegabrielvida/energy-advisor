import { performance } from 'perf_hooks';

interface TraceData {
  trace_id: string;
  timestamp: string;
  question: string;
  tools_used: string[];
  sources_count: number;
  response_length: number;
  latency_ms: number;
  error?: string;
  metadata?: any;
}

interface QAPair {
  question: string;
  answer: string;
  contexts?: string[];
  ground_truth?: string;
}

class MonitoringService {
  private localMode = true; // Use local logging only
  
  async logTrace(traceData: TraceData): Promise<void> {
    // Local console logging
    console.log('📊 Trace:', {
      id: traceData.trace_id,
      question: traceData.question.substring(0, 50) + '...',
      tools: traceData.tools_used,
      sources: traceData.sources_count,
      latency: traceData.latency_ms + 'ms'
    });
    
    // Try to send to Python server if available (optional)
    try {
      const response = await fetch('http://localhost:6007/log_trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traceData)
      });
      if (response.ok) {
        console.log('✅ Trace logged to monitoring server');
      }
    } catch (error) {
      // Silently ignore if monitoring server is not available
    }
  }
  
  async evaluateResponse(qaPair: QAPair): Promise<any> {
    console.log('📝 Evaluation request:', {
      question: qaPair.question.substring(0, 50) + '...',
      answer_length: qaPair.answer.length,
      contexts_count: qaPair.contexts?.length || 0
    });
    return null; // Simplified for now
  }
  
  async getMetrics(): Promise<any> {
    try {
      const response = await fetch('http://localhost:6007/metrics');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Monitoring server not available
    }
    
    return {
      message: 'Local monitoring mode',
      suggestion: 'Start monitoring server: python3 packages/monitoring/lightweight_server.py',
      status: 'traces logged to console'
    };
  }
}

// Monitoring wrapper for AI agent calls
export class AIAgentMonitor {
  private monitoring = new MonitoringService();
  private traceId: string;
  private startTime: number;
  private toolsUsed: string[] = [];
  
  constructor(question: string) {
    this.traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTime = performance.now();
    
    console.log(`🔍 Starting trace: ${this.traceId}`);
  }
  
  addToolUsage(toolName: string): void {
    this.toolsUsed.push(toolName);
  }
  
  async finishTrace(
    question: string,
    answer: string,
    sourcesCount: number,
    error?: string,
    contexts?: string[]
  ): Promise<void> {
    const endTime = performance.now();
    const latency = Math.round(endTime - this.startTime);
    
    // Log trace data
    const traceData: TraceData = {
      trace_id: this.traceId,
      timestamp: new Date().toISOString(),
      question,
      tools_used: this.toolsUsed,
      sources_count: sourcesCount,
      response_length: answer.length,
      latency_ms: latency,
      error,
      metadata: {
        trace_id: this.traceId,
        tools_count: this.toolsUsed.length
      }
    };
    
    await this.monitoring.logTrace(traceData);
    
    // Evaluate response quality if no error
    if (!error && contexts) {
      const qaPair: QAPair = {
        question,
        answer,
        contexts,
        ground_truth: answer // Could be improved with actual ground truth
      };
      
      await this.monitoring.evaluateResponse(qaPair);
    }
    
    console.log(`✅ Trace completed: ${this.traceId} (${latency}ms)`);
  }
}

export { MonitoringService };