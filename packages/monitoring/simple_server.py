#!/usr/bin/env python3
"""
Simple monitoring server test
"""

try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    print("✅ Flask imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install Flask: pip install flask flask-cors")
    exit(1)

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'Simple monitoring server running'})

@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'Flask server is working!'})

if __name__ == '__main__':
    print("🚀 Starting simple monitoring server...")
    print("📍 Server will be at: http://localhost:6007")
    app.run(host='0.0.0.0', port=6007, debug=True)