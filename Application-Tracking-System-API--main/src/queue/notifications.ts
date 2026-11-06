import { Queue, Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';

const queueName = 'notifications';
const logPath = path.resolve(process.cwd(), 'mock_emails.log');

function getConnection(): any {
  const queueUrl = process.env.QUEUE_URL || 'redis://127.0.0.1:6379';
  const parsed = new URL(queueUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export async function enqueueNotification(name: string, data: Record<string, unknown>): Promise<void> {
  const queue = new Queue(queueName, { connection: getConnection() as any });
  try {
    await queue.add(name, data, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
  } catch (error) {
    console.error('Failed to enqueue notification', error);
    throw error;
  } finally {
    await queue.close();
  }
}

export async function startWorker(): Promise<void> {
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const payload = job.data as Record<string, unknown>;
      const to = String(payload.to ?? 'unknown@example.com');
      const subject = String(payload.subject ?? 'ATS Notification');
      const body = String(payload.body ?? '');
      const line = JSON.stringify({ timestamp: new Date().toISOString(), to, subject, body });
      fs.appendFileSync(logPath, `${line}\n`);
      console.log(`Processed ${job.name}: ${line}`);
    },
    { connection: getConnection() as any, autorun: true },
  );

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.name} failed`, err);
  });
}
