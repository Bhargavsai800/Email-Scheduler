import { esClient } from '../config/elasticsearch';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

export interface EmailDocument {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | Date;
  sentAt?: string | Date | null;
  error?: string | null;
  previewUrl?: string | null;
  bullJobId?: string | null;
  userId?: string | null;
  senderId?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface SearchEmailsParams {
  query?: string;
  status?: string;
  recipient?: string;
  fromDate?: string;
  toDate?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  source: 'elasticsearch' | 'database_fallback';
  data: T[];
}

export class SearchService {
  private indexName = config.elasticsearch.index;
  private isIndexInitialized = false;

  /**
   * Initializes the Elasticsearch index with appropriate field mappings if it does not exist.
   */
  public async ensureEmailIndex(): Promise<void> {
    if (this.isIndexInitialized) return;

    try {
      const exists = await esClient.indices.exists({ index: this.indexName });
      if (!exists) {
        logger.info(`Creating Elasticsearch index [${this.indexName}] with mappings...`);
        await esClient.indices.create({
          index: this.indexName,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              recipient: { type: 'keyword' },
              subject: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword', ignore_above: 256 },
                },
              },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              error: { type: 'text' },
              previewUrl: { type: 'keyword' },
              bullJobId: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        });
        logger.info(`Elasticsearch index [${this.indexName}] created successfully.`);
      }
      this.isIndexInitialized = true;
    } catch (error) {
      logger.warn(
        `Elasticsearch index check notice (ES may be offline): ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Indexes a newly created email document into Elasticsearch.
   */
  public async indexEmail(email: EmailDocument): Promise<void> {
    try {
      await this.ensureEmailIndex();
      await esClient.index({
        index: this.indexName,
        id: email.id,
        document: {
          ...email,
          scheduledAt: new Date(email.scheduledAt).toISOString(),
          sentAt: email.sentAt ? new Date(email.sentAt).toISOString() : null,
          createdAt: new Date(email.createdAt).toISOString(),
          updatedAt: email.updatedAt ? new Date(email.updatedAt).toISOString() : new Date().toISOString(),
        },
      });
      logger.info(`[Elasticsearch] Indexed email document [${email.id}]`);
    } catch (error) {
      logger.warn(
        `[Elasticsearch] Failed to index email [${email.id}] (ES may be offline): ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Updates an existing email document in Elasticsearch (e.g. status transition to PROCESSING, SENT, FAILED).
   */
  public async updateEmailIndex(emailId: string, partial: Partial<EmailDocument>): Promise<void> {
    try {
      const docUpdates: Record<string, unknown> = {
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      if (partial.sentAt) docUpdates.sentAt = new Date(partial.sentAt).toISOString();
      if (partial.scheduledAt) docUpdates.scheduledAt = new Date(partial.scheduledAt).toISOString();

      await esClient.update({
        index: this.indexName,
        id: emailId,
        doc: docUpdates,
        doc_as_upsert: true,
      });
      logger.info(`[Elasticsearch] Updated document [${emailId}] status: ${partial.status || 'updated'}`);
    } catch (error) {
      logger.warn(
        `[Elasticsearch] Failed to update email [${emailId}] (ES may be offline): ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  /**
   * Deletes an email document from Elasticsearch.
   */
  public async deleteEmailIndex(emailId: string): Promise<void> {
    try {
      await esClient.delete({
        index: this.indexName,
        id: emailId,
      });
    } catch (error) {
      logger.warn(`[Elasticsearch] Delete notice for [${emailId}]: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Searches indexed emails using Elasticsearch Query DSL with full-text search, exact filtering, and pagination.
   * If Elasticsearch is unreachable, falls back seamlessly to PostgreSQL.
   */
  public async searchEmails(params: SearchEmailsParams): Promise<SearchResult<EmailDocument>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const from = (page - 1) * limit;

    // 1. Attempt Elasticsearch Query
    try {
      const mustClauses: unknown[] = [];
      const filterClauses: unknown[] = [];

      // Full-text search across subject (boosted 2x) and body
      if (params.query && params.query.trim().length > 0) {
        mustClauses.push({
          multi_match: {
            query: params.query.trim(),
            fields: ['subject^2', 'body', 'recipient'],
            fuzziness: 'AUTO',
          },
        });
      } else {
        mustClauses.push({ match_all: {} });
      }

      // Exact keyword filters
      if (params.userId && params.userId.trim().length > 0) {
        filterClauses.push({
          term: { userId: params.userId.trim() },
        });
      }

      if (params.status && params.status.trim().length > 0) {
        filterClauses.push({
          term: { status: params.status.toUpperCase() },
        });
      }

      if (params.recipient && params.recipient.trim().length > 0) {
        filterClauses.push({
          term: { recipient: params.recipient.toLowerCase().trim() },
        });
      }

      // Date range filters
      if (params.fromDate || params.toDate) {
        const rangeClause: Record<string, unknown> = {};
        if (params.fromDate) rangeClause.gte = params.fromDate;
        if (params.toDate) rangeClause.lte = params.toDate;
        filterClauses.push({
          range: { scheduledAt: rangeClause },
        });
      }

      const response = await esClient.search({
        index: this.indexName,
        from,
        size: limit,
        query: {
          bool: {
            must: mustClauses as any,
            filter: filterClauses as any,
          },
        },
        sort: [{ scheduledAt: { order: 'desc' } }],
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const data = response.hits.hits.map((hit) => hit._source as EmailDocument);

      return {
        total: totalHits,
        page,
        limit,
        totalPages: Math.ceil(totalHits / limit) || 1,
        source: 'elasticsearch',
        data,
      };
    } catch (esError) {
      logger.warn(
        `Elasticsearch search failed or offline. Falling back to PostgreSQL query: ${
          esError instanceof Error ? esError.message : esError
        }`
      );
    }

    // 2. Database Fallback (PostgreSQL via Prisma)
    try {
      const whereClause: Record<string, unknown> = {};

      if (params.userId) {
        whereClause.userId = params.userId;
      }

      if (params.status) {
        whereClause.status = params.status.toUpperCase();
      }

      if (params.recipient) {
        whereClause.recipient = { contains: params.recipient, mode: 'insensitive' };
      }

      if (params.query) {
        whereClause.OR = [
          { subject: { contains: params.query, mode: 'insensitive' } },
          { body: { contains: params.query, mode: 'insensitive' } },
          { recipient: { contains: params.query, mode: 'insensitive' } },
        ];
      }

      const [total, dbEmails] = await Promise.all([
        prisma.email.count({ where: whereClause }),
        prisma.email.findMany({
          where: whereClause,
          skip: from,
          take: limit,
          orderBy: { scheduledAt: 'desc' },
        }),
      ]);

      const data: EmailDocument[] = dbEmails.map((e) => ({
        id: e.id,
        recipient: e.recipient,
        subject: e.subject,
        body: e.body,
        status: e.status,
        scheduledAt: e.scheduledAt.toISOString(),
        sentAt: e.sentAt ? e.sentAt.toISOString() : null,
        error: e.error,
        previewUrl: e.previewUrl,
        bullJobId: e.bullJobId,
        userId: e.userId,
        senderId: e.senderId,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));

      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        source: 'database_fallback',
        data,
      };
    } catch (dbErr) {
      logger.error('Database fallback search failed:', dbErr);
      return {
        total: 0,
        page,
        limit,
        totalPages: 1,
        source: 'database_fallback',
        data: [],
      };
    }
  }
}

export const searchService = new SearchService();
