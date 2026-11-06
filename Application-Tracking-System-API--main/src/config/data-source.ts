import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Company } from '../entities/Company';
import { User } from '../entities/User';
import { Job } from '../entities/Job';
import { Application } from '../entities/Application';
import { ApplicationHistory } from '../entities/ApplicationHistory';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'ats_user',
  password: process.env.DB_PASSWORD || 'securepassword',
  database: process.env.DB_NAME || (isTest ? 'ats_db_test' : 'ats_db'),
  entities: [Company, User, Job, Application, ApplicationHistory],
  synchronize: false,
  logging: false,
  migrations: ['src/migrations/*.ts'],
});