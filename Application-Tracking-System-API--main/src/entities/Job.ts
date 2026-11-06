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
import { User } from './User';
import { Application } from './Application';

export type JobStatus = 'open' | 'closed';

@Entity()
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Company, (company) => company.jobs, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ['open', 'closed'],
    default: 'open',
  })
  status!: JobStatus;

  @ManyToOne(() => User, (user) => user.createdJobs, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  created_by!: User;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => Application, (app) => app.job)
  applications!: Application[];
}