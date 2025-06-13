#!/usr/bin/env python3
"""
Phoenix monitoring setup for Energy Advisor AI Agent
Free monitoring without API keys
"""

import phoenix as px
from phoenix.trace import using_project
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Any
import os

class EnergyAdvisorMonitor:
    def __init__(self, project_name="energy-advisor"):
        """Initialize Phoenix monitoring"""
        self.project_name = project_name
        
        # Start Phoenix session (local, no API key)
        self.session = px.launch_app(port=6006)
        print(f"🔍 Phoenix monitoring started at: {self.session.url}")
        
        # Setup SQLite for local trace storage
        self.db_path = "monitoring/traces.db"
        self.init_database()
    
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
    
    def log_trace(self, trace_data: Dict[str, Any]):
        """Log AI agent trace data"""
        
        with using_project(self.project_name):
            trace_id = trace_data.get('trace_id', datetime.now().isoformat())
            
            # Store in SQLite for persistence
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO traces 
                (id, timestamp, question, tools_used, sources_count, 
                 response_length, latency_ms, error, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trace_id,
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
            
            print(f"📊 Logged trace: {trace_id}")
    
    def get_metrics(self) -> Dict[str, Any]:
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
        
        conn.close()
        
        return {
            'total_requests': total_requests,
            'avg_latency_ms': round(avg_latency, 2),
            'error_rate': round(error_count / max(total_requests, 1) * 100, 2),
            'avg_sources_used': round(avg_sources, 2),
            'phoenix_url': self.session.url
        }

# Global monitor instance
monitor = None

def init_monitor():
    """Initialize global monitor instance"""
    global monitor
    if monitor is None:
        monitor = EnergyAdvisorMonitor()
    return monitor

def log_ai_trace(trace_data: Dict[str, Any]):
    """Log AI agent trace"""
    global monitor
    if monitor is None:
        monitor = init_monitor()
    monitor.log_trace(trace_data)

def get_monitoring_metrics():
    """Get current monitoring metrics"""
    global monitor
    if monitor is None:
        monitor = init_monitor()
    return monitor.get_metrics()

if __name__ == "__main__":
    # Start Phoenix monitoring server
    monitor = init_monitor()
    print("Phoenix monitoring running...")
    print(f"Dashboard: {monitor.session.url}")
    
    # Keep server running
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down monitoring...")