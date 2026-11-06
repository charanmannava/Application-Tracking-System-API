import 'reflect-metadata';
import './types/express';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { AppDataSource } from './config/data-source';
import { Company } from './entities/Company';
import { User } from './entities/User';
import { Job } from './entities/Job';
import { Application } from './entities/Application';
import { ApplicationHistory } from './entities/ApplicationHistory';
import { authenticateToken } from './middleware/auth';
import { requireRoles } from './middleware/rbac';
import { signToken } from './middleware/auth';
import { validateTransition } from './services/stateMachine';
import { enqueueNotification } from './queue/notifications';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

function sanitizeUser(user?: User | null) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company?.id ?? null,
    created_at: user.created_at,
  };
}

function sanitizeCompany(company?: Company | null) {
  if (!company) return null;
  return {
    id: company.id,
    name: company.name,
    created_at: company.created_at,
  };
}

function sanitizeJob(job?: Job | null) {
  if (!job) return null;
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    status: job.status,
    created_at: job.created_at,
    company: sanitizeCompany(job.company),
    created_by: sanitizeUser(job.created_by),
  };
}

function sanitizeApplication(application?: Application | null) {
  if (!application) return null;
  return {
    id: application.id,
    stage: application.stage,
    resume_url: application.resume_url,
    created_at: application.created_at,
    updated_at: application.updated_at,
    job: sanitizeJob(application.job),
    candidate: sanitizeUser(application.candidate),
  };
}

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role, company_id } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password, and role are required' });
    }

    if (!['candidate', 'recruiter', 'hiring_manager'].includes(role)) {
      return res.status(400).json({ error: 'invalid role' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    if (role !== 'candidate' && !company_id) {
      return res.status(400).json({ error: 'company_id is required for recruiters and hiring managers' });
    }

    let company: Company | null = null;
    if (company_id) {
      const companyRepo = AppDataSource.getRepository(Company);
      company = await companyRepo.findOneBy({ id: company_id });
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = userRepo.create({ email, password_hash, role, company });
    const saved = await userRepo.save(user);

    return res.status(201).json({ id: saved.id, email: saved.email, role: saved.role });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email }, relations: { company: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, role: user.role, company_id: user.company?.id ?? null });
    return res.json({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.use('/api', authenticateToken);

app.get('/api/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await AppDataSource.getRepository(Job).find({ relations: { company: true, created_by: true } });
    return res.json(jobs.map(sanitizeJob));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

app.post('/api/jobs', requireRoles(['recruiter']), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.company_id) {
      return res.status(403).json({ error: 'Recruiter must belong to a company' });
    }

    const { title, description, status = 'open' } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    const companyRepo = AppDataSource.getRepository(Company);
    const company = await companyRepo.findOneBy({ id: user.company_id });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const createdBy = await userRepo.findOneBy({ id: user.id });
    if (!createdBy) {
      return res.status(404).json({ error: 'User not found' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const job = jobRepo.create({
      title,
      description,
      status,
      company,
      created_by: createdBy,
    });

    const saved = await jobRepo.save(job);
    return res.status(201).json(sanitizeJob(saved));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create job' });
  }
});

app.get('/api/jobs/:id', async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.id);
    const job = await AppDataSource.getRepository(Job).findOne({
      where: { id: jobId },
      relations: { company: true, created_by: true },
    });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json(sanitizeJob(job));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
});

app.put('/api/jobs/:id', requireRoles(['recruiter']), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.company_id) {
      return res.status(403).json({ error: 'Recruiter must belong to a company' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const jobId = String(req.params.id);
    const job = await jobRepo.findOne({ where: { id: jobId }, relations: { company: true } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.company.id !== user.company_id) {
      return res.status(403).json({ error: 'Forbidden: job belongs to another company' });
    }

    const { title, description, status } = req.body;
    if (title) job.title = title;
    if (description) job.description = description;
    if (status) job.status = status;

    const updated = await jobRepo.save(job);
    return res.json(sanitizeJob(updated));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update job' });
  }
});

app.delete('/api/jobs/:id', requireRoles(['recruiter']), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user?.company_id) {
      return res.status(403).json({ error: 'Recruiter must belong to a company' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const jobId = String(req.params.id);
    const job = await jobRepo.findOne({ where: { id: jobId }, relations: { company: true } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.company.id !== user.company_id) {
      return res.status(403).json({ error: 'Forbidden: job belongs to another company' });
    }

    await jobRepo.remove(job);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete job' });
  }
});

app.post('/api/jobs/:jobId/applications', async (req: Request, res: Response) => {
  let queryRunner = AppDataSource.createQueryRunner();
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can apply' });
    }

    const jobRepo = AppDataSource.getRepository(Job);
    const jobId = String(req.params.jobId);
    const job = await jobRepo.findOne({ where: { id: jobId }, relations: { company: true, created_by: true } });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.status !== 'open') {
      return res.status(400).json({ error: 'Job is closed' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const candidate = await userRepo.findOneBy({ id: req.user.id });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const application = queryRunner.manager.create(Application, {
        job,
        candidate,
        stage: 'Applied',
        resume_url: req.body.resume_url ?? null,
      });
      const savedApplication = await queryRunner.manager.save(application);

      const historyRepo = queryRunner.manager.getRepository(ApplicationHistory);
      await historyRepo.save(
        historyRepo.create({
          application: savedApplication,
          previous_stage: null,
          new_stage: 'Applied',
          changed_by: candidate,
        }),
      );

      await queryRunner.commitTransaction();

      await enqueueNotification('send_application_received_email', {
        to: candidate.email,
        subject: `Application Received: ${job.title}`,
        body: `Thank you for applying to ${job.title}.`,
      });

      const recruiterEmail = job.created_by?.email ?? 'recruiter@example.com';
      await enqueueNotification('send_new_applicant_email', {
        to: recruiterEmail,
        subject: `New Applicant: ${job.title}`,
        body: `A new candidate applied to ${job.title}.`,
      });

      return res.status(201).json(sanitizeApplication(savedApplication));
    } catch (innerError) {
      await queryRunner.rollbackTransaction();
      throw innerError;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Application submission failed' });
  }
});

app.put('/api/applications/:applicationId/stage', requireRoles(['recruiter', 'hiring_manager']), async (req: Request, res: Response) => {
  try {
    const { stage } = req.body;
    if (!stage) {
      return res.status(400).json({ error: 'stage is required' });
    }

    const applicationRepo = AppDataSource.getRepository(Application);
    const applicationId = String(req.params.applicationId);
    const application = await applicationRepo.findOne({
      where: { id: applicationId },
      relations: { job: { company: true }, candidate: true },
    });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (req.user?.company_id !== application.job.company.id) {
      return res.status(403).json({ error: 'Forbidden: application belongs to another company' });
    }

    if (!validateTransition(application.stage, stage)) {
      return res.status(400).json({ error: 'Invalid state transition' });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const currentApplication = await queryRunner.manager.findOne(Application, {
        where: { id: String(req.params.applicationId) },
        relations: { job: { company: true }, candidate: true },
      });
      if (!currentApplication) {
        throw new Error('Application not found');
      }

      currentApplication.stage = stage;
      await queryRunner.manager.save(currentApplication);

      const historyRepo = queryRunner.manager.getRepository(ApplicationHistory);
      await historyRepo.save(
        historyRepo.create({
          application: currentApplication,
          previous_stage: application.stage,
          new_stage: stage,
          changed_by: { id: req.user!.id } as User,
        }),
      );

      await queryRunner.commitTransaction();

      await enqueueNotification('send_stage_update_email', {
        to: application.candidate.email,
        subject: `Stage Updated: ${stage}`,
        body: `Your application is now at ${stage}.`,
      });

      return res.json({ id: currentApplication.id, stage });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update application stage' });
  }
});

app.get('/api/applications/me', async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can access their applications' });
    }

    const applications = await AppDataSource.getRepository(Application).find({
      where: { candidate: { id: req.user.id } } as any,
      relations: { job: true, candidate: true },
    });
    return res.json(applications.map(sanitizeApplication));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

app.get('/api/applications/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = String(req.params.applicationId);
    const application = await AppDataSource.getRepository(Application).findOne({
      where: { id: applicationId },
      relations: { job: { company: true }, candidate: true },
    });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const isOwner = req.user?.role === 'candidate' && application.candidate.id === req.user.id;
    const isCompanyStaff = ['recruiter', 'hiring_manager'].includes(req.user?.role ?? '') && req.user?.company_id === application.job.company.id;
    if (!isOwner && !isCompanyStaff) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(sanitizeApplication(application));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch application' });
  }
});

app.get('/api/jobs/:jobId/applications', async (req: Request, res: Response) => {
  try {
    if (!['recruiter', 'hiring_manager'].includes(req.user?.role ?? '')) {
      return res.status(403).json({ error: 'Only company staff can view applications' });
    }

    const jobId = String(req.params.jobId);
    const job = await AppDataSource.getRepository(Job).findOne({
      where: { id: jobId },
      relations: { company: true },
    });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.company.id !== req.user?.company_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const stageFilter = req.query.stage as string | undefined;
    const applications = await AppDataSource.getRepository(Application).find({
      where: stageFilter ? ({ job: { id: String(req.params.jobId) }, stage: stageFilter } as any) : ({ job: { id: String(req.params.jobId) } } as any),
      relations: { candidate: true, job: true },
    });
    return res.json(applications.map(sanitizeApplication));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch job applications' });
  }
});

const port = Number(process.env.PORT) || 3000;

AppDataSource.initialize()
  .then(async () => {
    await AppDataSource.runMigrations();
    app.listen(port, () => {
      console.log(`ATS API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed', error);
    process.exit(1);
  });
