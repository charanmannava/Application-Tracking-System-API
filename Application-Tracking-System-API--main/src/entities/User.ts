import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from './Company';
import { Application } from './Application';
import { ApplicationHistory } from './ApplicationHistory';
import { Job } from './Job';

export type UserRole = 'candidate' | 'recruiter' | 'hiring_manager';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  password_hash!: string;

  @Column({
    type: 'enum',
    enum: ['candidate', 'recruiter', 'hiring_manager'],
  })
  role!: UserRole;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company | null;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => Application, (app) => app.candidate)
  applications!: Application[];

  @OneToMany(() => Job, (job) => job.created_by)
  createdJobs!: Job[];

  @OneToMany(() => ApplicationHistory, (h) => h.changed_by)
  historyChanges!: ApplicationHistory[];
}