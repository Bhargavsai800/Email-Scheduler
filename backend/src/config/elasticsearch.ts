import { Client } from '@elastic/elasticsearch';
import { config } from './env';
import { logger } from '../utils/logger';

// Client options
const clientOptions: {
  node: string;
  auth?: { username: string; password: string };
  maxRetries: number;
  requestTimeout: number;
} = {
  node: config.elasticsearch.url,
  maxRetries: 2,
  requestTimeout: 2000, // 2-second timeout prevents worker/API hangs if ES is offline
};

if (config.elasticsearch.username && config.elasticsearch.password) {
  clientOptions.auth = {
    username: config.elasticsearch.username,
    password: config.elasticsearch.password,
  };
}

// Singleton Elasticsearch Client
export const esClient = new Client(clientOptions);

export interface ElasticsearchHealthCheck {
  status: 'healthy' | 'unreachable';
  clusterName?: string;
  version?: string;
  error?: string;
}

export async function checkElasticsearchHealth(): Promise<ElasticsearchHealthCheck> {
  try {
    const info = await esClient.info();
    return {
      status: 'healthy',
      clusterName: info.cluster_name,
      version: info.version?.number,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown Elasticsearch error';
    logger.debug('Elasticsearch health check notice:', errorMsg);
    return {
      status: 'unreachable',
      error: errorMsg,
    };
  }
}

export async function closeElasticsearchClient(): Promise<void> {
  try {
    await esClient.close();
    logger.info('Elasticsearch client closed.');
  } catch (err) {
    logger.warn('Error closing Elasticsearch client:', err);
  }
}
