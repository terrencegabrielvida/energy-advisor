#!/usr/bin/env python3
"""
RAGAS evaluation for Energy Advisor AI Agent
Free evaluation using local models (no API keys)
"""

from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy, 
    context_precision,
    context_recall
)
from datasets import Dataset
import pandas as pd
from sentence_transformers import SentenceTransformer
import json
import sqlite3
from typing import List, Dict, Any
import os

class EnergyAdvisorEvaluator:
    def __init__(self):
        """Initialize RAGAS evaluator with local models"""
        print("🔧 Initializing RAGAS evaluator with local models...")
        
        # Use local sentence transformer model (no API key)
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Setup local evaluation database
        self.db_path = "monitoring/evaluations.db"
        self.init_database()
        
        print("✅ RAGAS evaluator ready!")
    
    def init_database(self):
        """Initialize evaluation database"""
        os.makedirs("monitoring", exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                timestamp TEXT,
                question TEXT,
                answer TEXT,
                contexts TEXT,
                ground_truth TEXT,
                faithfulness_score REAL,
                relevancy_score REAL,
                precision_score REAL,
                recall_score REAL,
                overall_score REAL
            )
        """)
        
        conn.commit()
        conn.close()
    
    def prepare_evaluation_dataset(self, qa_pairs: List[Dict[str, Any]]) -> Dataset:
        """Prepare dataset for RAGAS evaluation"""
        
        data = {
            'question': [],
            'answer': [],
            'contexts': [],
            'ground_truth': []
        }
        
        for qa in qa_pairs:
            data['question'].append(qa['question'])
            data['answer'].append(qa['answer'])
            data['contexts'].append(qa.get('contexts', []))
            data['ground_truth'].append(qa.get('ground_truth', qa['answer']))
        
        return Dataset.from_dict(data)
    
    def evaluate_responses(self, qa_pairs: List[Dict[str, Any]]) -> Dict[str, float]:
        """Evaluate AI responses using RAGAS metrics"""
        
        if not qa_pairs:
            return {'error': 'No QA pairs to evaluate'}
        
        try:
            # Prepare dataset
            dataset = self.prepare_evaluation_dataset(qa_pairs)
            
            # Run evaluation with local models
            # Note: This uses free local evaluation
            result = evaluate(
                dataset,
                metrics=[
                    faithfulness,
                    answer_relevancy,
                    context_precision,
                    context_recall,
                ],
                # Use local embeddings instead of OpenAI
                embeddings=self.embedding_model,
                llm=None  # Use built-in evaluation logic
            )
            
            # Store results
            self.store_evaluation_results(qa_pairs, result)
            
            return {
                'faithfulness': float(result['faithfulness']),
                'answer_relevancy': float(result['answer_relevancy']),
                'context_precision': float(result['context_precision']),
                'context_recall': float(result['context_recall']),
                'overall_score': float(sum([
                    result['faithfulness'],
                    result['answer_relevancy'],
                    result['context_precision'],
                    result['context_recall']
                ]) / 4)
            }
            
        except Exception as e:
            print(f"❌ Evaluation error: {e}")
            return {'error': str(e)}
    
    def store_evaluation_results(self, qa_pairs: List[Dict], result: Dict):
        """Store evaluation results in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for i, qa in enumerate(qa_pairs):
            cursor.execute("""
                INSERT INTO evaluations 
                (id, timestamp, question, answer, contexts, ground_truth,
                 faithfulness_score, relevancy_score, precision_score, 
                 recall_score, overall_score)
                VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                f"eval_{i}_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}",
                qa['question'],
                qa['answer'],
                json.dumps(qa.get('contexts', [])),
                qa.get('ground_truth', ''),
                float(result.get('faithfulness', 0)),
                float(result.get('answer_relevancy', 0)),
                float(result.get('context_precision', 0)),
                float(result.get('context_recall', 0)),
                float(sum([
                    result.get('faithfulness', 0),
                    result.get('answer_relevancy', 0),
                    result.get('context_precision', 0),
                    result.get('context_recall', 0)
                ]) / 4)
            ))
        
        conn.commit()
        conn.close()
    
    def get_evaluation_history(self, limit: int = 10) -> List[Dict]:
        """Get recent evaluation results"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM evaluations 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
        
        columns = [desc[0] for desc in cursor.description]
        results = []
        
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))
        
        conn.close()
        return results
    
    def get_evaluation_metrics(self) -> Dict[str, float]:
        """Get average evaluation metrics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                AVG(faithfulness_score) as avg_faithfulness,
                AVG(relevancy_score) as avg_relevancy,
                AVG(precision_score) as avg_precision,
                AVG(recall_score) as avg_recall,
                AVG(overall_score) as avg_overall,
                COUNT(*) as total_evaluations
            FROM evaluations
        """)
        
        result = cursor.fetchone()
        conn.close()
        
        return {
            'avg_faithfulness': round(result[0] or 0, 3),
            'avg_relevancy': round(result[1] or 0, 3),
            'avg_precision': round(result[2] or 0, 3),
            'avg_recall': round(result[3] or 0, 3),
            'avg_overall': round(result[4] or 0, 3),
            'total_evaluations': result[5] or 0
        }

# Global evaluator instance
evaluator = None

def init_evaluator():
    """Initialize global evaluator instance"""
    global evaluator
    if evaluator is None:
        evaluator = EnergyAdvisorEvaluator()
    return evaluator

def evaluate_qa_batch(qa_pairs: List[Dict[str, Any]]) -> Dict[str, float]:
    """Evaluate a batch of QA pairs"""
    global evaluator
    if evaluator is None:
        evaluator = init_evaluator()
    return evaluator.evaluate_responses(qa_pairs)

def get_evaluation_summary():
    """Get evaluation metrics summary"""
    global evaluator
    if evaluator is None:
        evaluator = init_evaluator()
    return evaluator.get_evaluation_metrics()

# Sample Philippine energy QA pairs for testing
SAMPLE_ENERGY_QA = [
    {
        'question': 'What are the solar energy opportunities in Cebu?',
        'answer': 'Cebu offers excellent solar opportunities with 200+ sunny days annually. Average installation costs are PHP 45,000 per kW. Top locations include Cordova, Lapu-Lapu, and Bogo City with optimal solar irradiance.',
        'contexts': [
            'Cebu receives 5.5 kWh/m²/day solar irradiance on average',
            'Solar installations in Cebu grew 150% in 2024',
            'Land costs in Cebu range PHP 500-800 per sqm for solar farms'
        ],
        'ground_truth': 'Cebu has high solar potential with good irradiance levels and growing solar market.'
    },
    {
        'question': 'What are the wind energy prospects in Ilocos Norte?',
        'answer': 'Ilocos Norte has the highest wind energy potential in Philippines with average wind speeds of 7-9 m/s. Bangui Wind Farm demonstrates commercial viability. New projects target 500MW additional capacity by 2026.',
        'contexts': [
            'Ilocos Norte wind speeds consistently above 6 m/s',
            'Bangui Wind Farm generates 33MW successfully since 2005',
            'Government targets 2,378MW wind capacity nationally by 2030'
        ],
        'ground_truth': 'Ilocos Norte leads Philippines wind energy with proven commercial success and high wind resources.'
    }
]

if __name__ == "__main__":
    # Test evaluation with sample data
    evaluator = init_evaluator()
    
    print("🧪 Testing RAGAS evaluation with sample data...")
    results = evaluate_qa_batch(SAMPLE_ENERGY_QA)
    
    print("📊 Evaluation Results:")
    for metric, score in results.items():
        print(f"  {metric}: {score}")
    
    print("\n📈 Evaluation Summary:")
    summary = get_evaluation_summary()
    for metric, value in summary.items():
        print(f"  {metric}: {value}")