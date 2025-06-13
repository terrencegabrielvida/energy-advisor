#!/usr/bin/env python3
"""
Monitoring API server for Energy Advisor
Integrates Phoenix monitoring and RAGAS evaluation
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import threading
import time

# Import our monitoring modules
from phoenix_monitor import init_monitor, log_ai_trace, get_monitoring_metrics
from ragas_evaluator import init_evaluator, evaluate_qa_batch, get_evaluation_summary

app = Flask(__name__)
CORS(app)

# Initialize monitoring services
print("🚀 Initializing monitoring services...")
monitor = init_monitor()
evaluator = init_evaluator()
print("✅ Monitoring services ready!")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'phoenix_url': monitor.session.url})

@app.route('/log_trace', methods=['POST'])
def log_trace():
    """Log AI agent trace data"""
    try:
        trace_data = request.get_json()
        log_ai_trace(trace_data)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/evaluate', methods=['POST'])
def evaluate():
    """Evaluate AI responses using RAGAS"""
    try:
        data = request.get_json()
        qa_pairs = data.get('qa_pairs', [])
        
        if not qa_pairs:
            return jsonify({'error': 'No QA pairs provided'}), 400
        
        results = evaluate_qa_batch(qa_pairs)
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get combined monitoring and evaluation metrics"""
    try:
        monitoring_metrics = get_monitoring_metrics()
        evaluation_metrics = get_evaluation_summary()
        
        return jsonify({
            'monitoring': monitoring_metrics,
            'evaluation': evaluation_metrics,
            'phoenix_dashboard': monitor.session.url
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dashboard', methods=['GET'])
def dashboard():
    """Get dashboard data"""
    return jsonify({
        'phoenix_url': monitor.session.url,
        'api_url': 'http://localhost:6007',
        'status': 'running'
    })

if __name__ == '__main__':
    print("🌟 Starting Energy Advisor Monitoring Server...")
    print("📊 Phoenix Dashboard will be available at the URL shown above")
    print("🔗 API Server starting on http://localhost:6007")
    
    app.run(host='0.0.0.0', port=6007, debug=True)