import 'reflect-metadata';
import dotenv from 'dotenv';
import { startWorker } from './queue/notifications';

dotenv.config();

startWorker().catch((error) => {
  console.error('Worker failed to start', error);
  process.exit(1);
});
