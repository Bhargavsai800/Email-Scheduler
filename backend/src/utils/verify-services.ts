import { prisma } from '../config/db';
import { redisClient } from '../config/redis';
import { emailQueue, checkBullMQHealth } from '../queues/email.queue';
import { config } from '../config/env';

interface CheckResult {
  service: string;
  target: string;
  status: 'PASSED' | 'FAILED';
  details: string;
  latencyMs?: number;
}

async function runVerification() {
  console.log('\n======================================================');
  console.log('       STAGE 1 COMPREHENSIVE VERIFICATION SUITE       ');
  console.log('======================================================\n');

  const results: CheckResult[] = [];

  // 1. PostgreSQL Check
  const pgStart = Date.now();
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out (1500ms)')), 1500)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    results.push({
      service: 'PostgreSQL Database',
      target: config.databaseUrl.replace(/:[^:]*@/, ':****@'),
      status: 'PASSED',
      latencyMs: Date.now() - pgStart,
      details: 'SELECT 1 query executed successfully',
    });
  } catch (err) {
    results.push({
      service: 'PostgreSQL Database',
      target: 'localhost:5432',
      status: 'FAILED',
      latencyMs: Date.now() - pgStart,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Redis Check
  const redisStart = Date.now();
  try {
    const timeout = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out (1500ms)')), 1500)
    );
    const pingPromise = redisClient.ping();
    const res = await Promise.race([pingPromise, timeout]);
    results.push({
      service: 'Redis In-Memory Store',
      target: `${config.redis.host}:${config.redis.port}`,
      status: res === 'PONG' ? 'PASSED' : 'FAILED',
      latencyMs: Date.now() - redisStart,
      details: `PING response: ${res}`,
    });
  } catch (err) {
    results.push({
      service: 'Redis In-Memory Store',
      target: `${config.redis.host}:${config.redis.port}`,
      status: 'FAILED',
      latencyMs: Date.now() - redisStart,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Elasticsearch Check
  const esStart = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const esRes = await fetch(config.elasticsearchNode, { signal: controller.signal });
    clearTimeout(timer);
    if (esRes.ok) {
      const data = await esRes.json();
      results.push({
        service: 'Elasticsearch Search Node',
        target: config.elasticsearchNode,
        status: 'PASSED',
        latencyMs: Date.now() - esStart,
        details: `Cluster: ${data.cluster_name}, Version: ${data.version?.number}`,
      });
    } else {
      results.push({
        service: 'Elasticsearch Search Node',
        target: config.elasticsearchNode,
        status: 'FAILED',
        latencyMs: Date.now() - esStart,
        details: `HTTP status: ${esRes.status} ${esRes.statusText}`,
      });
    }
  } catch (err) {
    results.push({
      service: 'Elasticsearch Search Node',
      target: config.elasticsearchNode,
      status: 'FAILED',
      latencyMs: Date.now() - esStart,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 4. BullMQ Queue Check
  const bullStart = Date.now();
  try {
    const bullCheck = await checkBullMQHealth();
    results.push({
      service: 'BullMQ Queue to Redis',
      target: `Queue: ${config.emailQueueName}`,
      status: bullCheck.status === 'healthy' ? 'PASSED' : 'FAILED',
      latencyMs: Date.now() - bullStart,
      details: bullCheck.status === 'healthy' ? 'Connected and operational' : (bullCheck.error || 'Connection offline'),
    });
  } catch (err) {
    results.push({
      service: 'BullMQ Queue to Redis',
      target: `Queue: ${config.emailQueueName}`,
      status: 'FAILED',
      latencyMs: Date.now() - bullStart,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 5. Backend HTTP Health Endpoint Check
  const healthStart = Date.now();
  try {
    const res = await fetch(`http://localhost:${config.port}/api/health`);
    const json = await res.json();
    results.push({
      service: 'Backend API Health Endpoint',
      target: `http://localhost:${config.port}/api/health`,
      status: res.status === 200 ? 'PASSED' : 'FAILED',
      latencyMs: Date.now() - healthStart,
      details: `HTTP ${res.status}, status="${json.status}", uptime=${json.uptimeSeconds}s`,
    });
  } catch (err) {
    results.push({
      service: 'Backend API Health Endpoint',
      target: `http://localhost:${config.port}/api/health`,
      status: 'FAILED',
      latencyMs: Date.now() - healthStart,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 6. Frontend Dev Server Check
  const feStart = Date.now();
  try {
    const res = await fetch('http://localhost:5173');
    const text = await res.text();
    const isHtml = text.includes('<!doctype html>') || text.includes('<html');
    results.push({
      service: 'Frontend Web Application',
      target: 'http://localhost:5173',
      status: res.status === 200 && isHtml ? 'PASSED' : 'FAILED',
      latencyMs: Date.now() - feStart,
      details: `HTTP ${res.status} HTML entry delivered`,
    });
  } catch (err) {
    results.push({
      service: 'Frontend Web Application',
      target: 'http://localhost:5173',
      status: 'FAILED',
      latencyMs: Date.now() - feStart,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // Print Formatted Report Table
  console.table(
    results.map((r) => ({
      'Test Service': r.service,
      'Target / Endpoint': r.target,
      'Result': r.status,
      'Latency (ms)': r.latencyMs ?? 'N/A',
      'Details': r.details.length > 50 ? r.details.slice(0, 47) + '...' : r.details,
    }))
  );

  console.log('\n======================================================');
  console.log(` Summary: ${results.filter((r) => r.status === 'PASSED').length}/${results.length} checks passed`);
  console.log('======================================================\n');

  // Disconnect clients to exit cleanly
  await prisma.$disconnect().catch(() => {});
  await redisClient.quit().catch(() => {});
  await emailQueue.close().catch(() => {});
  process.exit(0);
}

runVerification();
