import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
import { SearchResult } from './searchService';

dotenv.config();

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333'
});

const COLLECTION_NAME = 'energy_collection';

// Create a default vector of the correct size
const DEFAULT_VECTOR = new Array(1536).fill(0);

interface StoredData {
  url: string;
  title: string;
  content: string;
  source: string;
  timestamp: number;
  topics: string[];
}

async function ensureCollectionExists() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });
      console.log(`Created collection: ${COLLECTION_NAME}`);
      
      // Add a default point to the collection
      await qdrantClient.upsert(COLLECTION_NAME, {
        points: [{
          id: 1,
          vector: DEFAULT_VECTOR,
          payload: {
            text: "Default energy data point",
            type: "placeholder"
          }
        }]
      });
    }
  } catch (error) {
    console.error('Error ensuring collection exists:', error);
    throw error;
  }
}

export async function storeSearchResults(results: SearchResult[], topics: string[]): Promise<void> {
  try {
    await ensureCollectionExists();
    
    const points = results.map((result, index) => ({
      id: Date.now() + index, // Use timestamp + index as unique ID
      vector: DEFAULT_VECTOR, // We'll implement proper vectorization later
      payload: {
        url: result.url,
        title: result.title,
        content: result.content || result.snippet,
        source: result.source,
        timestamp: Date.now(),
        topics
      }
    }));

    await qdrantClient.upsert(COLLECTION_NAME, {
      points
    });
    
    console.log(`Stored ${points.length} results in Qdrant`);
  } catch (error) {
    console.error('Error storing search results:', error);
  }
}

export async function queryQdrant(query: string): Promise<StoredData[]> {
  try {
    await ensureCollectionExists();
    
    const searchResponse = await qdrantClient.search(COLLECTION_NAME, {
      vector: DEFAULT_VECTOR, // We'll implement proper vectorization later
      limit: 5,
      with_payload: true,
      with_vector: false
    });

    return searchResponse
      .filter(result => result.payload !== null && result.payload !== undefined)
      .map(result => ({
        url: result.payload!.url as string,
        title: result.payload!.title as string,
        content: result.payload!.content as string,
        source: result.payload!.source as string,
        timestamp: result.payload!.timestamp as number,
        topics: result.payload!.topics as string[]
      }));
  } catch (error) {
    console.error('Error querying Qdrant:', error);
    return [];
  }
} 