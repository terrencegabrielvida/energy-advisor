#!/usr/bin/env python3
"""
Lightweight monitoring server without heavy dependencies
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

class LightweightMonitor:
    def __init__(self):
        """Initialize lightweight monitoring"""
        self.db_path = "monitoring/traces.db"
        self.init_database()
        print("✅ Lightweight monitoring initialized")
    
    def init_database(self):
        """Initialize local SQLite database for traces"""
        os.makedirs("monitoring", exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS traces (
                id TEXT PRIMARY KEY,
                timestamp TEXT,
                question TEXT,
                tools_used TEXT,
                sources_count INTEGER,
                response_length INTEGER,
                latency_ms INTEGER,
                error TEXT,
                metadata TEXT
            )
        """)
        
        conn.commit()
        conn.close()
    
    def log_trace(self, trace_data):
        """Log AI agent trace data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO traces 
            (id, timestamp, question, tools_used, sources_count, 
             response_length, latency_ms, error, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            trace_data.get('trace_id', datetime.now().isoformat()),
            trace_data.get('timestamp', datetime.now().isoformat()),
            trace_data.get('question', ''),
            json.dumps(trace_data.get('tools_used', [])),
            trace_data.get('sources_count', 0),
            trace_data.get('response_length', 0),
            trace_data.get('latency_ms', 0),
            trace_data.get('error', ''),
            json.dumps(trace_data.get('metadata', {}))
        ))
        
        conn.commit()
        conn.close()
        
        print(f"📊 Logged trace: {trace_data.get('trace_id', 'unknown')}")
    
    def get_metrics(self):
        """Get monitoring metrics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get basic metrics
        cursor.execute("SELECT COUNT(*) FROM traces")
        total_requests = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(latency_ms) FROM traces WHERE latency_ms > 0")
        avg_latency = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM traces WHERE error != ''")
        error_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(sources_count) FROM traces WHERE sources_count > 0")
        avg_sources = cursor.fetchone()[0] or 0
        
        # Get recent traces
        cursor.execute("""
            SELECT question, tools_used, sources_count, latency_ms 
            FROM traces 
            ORDER BY timestamp DESC 
            LIMIT 5
        """)
        
        recent_traces = []
        for row in cursor.fetchall():
            recent_traces.append({
                'question': row[0][:50] + '...' if len(row[0]) > 50 else row[0],
                'tools_used': json.loads(row[1]) if row[1] else [],
                'sources_count': row[2],
                'latency_ms': row[3]
            })
        
        conn.close()
        
        return {
            'total_requests': total_requests,
            'avg_latency_ms': round(avg_latency, 2),
            'error_rate': round(error_count / max(total_requests, 1) * 100, 2),
            'avg_sources_used': round(avg_sources, 2),
            'recent_traces': recent_traces,
            'monitoring_type': 'lightweight'
        }

# Global monitor instance
monitor = LightweightMonitor()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'type': 'lightweight_monitoring'})

@app.route('/log_trace', methods=['POST'])
def log_trace():
    """Log AI agent trace data"""
    try:
        trace_data = request.get_json()
        monitor.log_trace(trace_data)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get monitoring metrics"""
    try:
        metrics = monitor.get_metrics()
        return jsonify(metrics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dashboard', methods=['GET'])
def dashboard():
    """Get dashboard data"""
    try:
        metrics = monitor.get_metrics()
        return jsonify({
            'api_url': 'http://localhost:6007',
            'status': 'running',
            'metrics': metrics
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🌟 Starting Lightweight Energy Advisor Monitoring...")
    print("🔗 API Server at http://localhost:6007")
    print("📊 Simple dashboard at http://localhost:6007/dashboard")
    
    app.run(host='0.0.0.0', port=6007, debug=True)