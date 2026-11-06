import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Job } from './Job';
import { User } from './User';
import { ApplicationHistory } from './ApplicationHistory';

export type ApplicationStage =
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected';

@Entity()
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Job, (job) => job.applications, { nullable: false })
  @JoinColumn({ name: 'job_id' })
  job!: Job;

  @ManyToOne(() => User, (user) => user.applications, { nullable: false })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: User;

  @Column({ type: 'varchar', default: 'Applied' })
  stage!: ApplicationStage;

  @Column({ type: 'varchar', nullable: true })
  resume_url!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => ApplicationHistory, (h) => h.application)
  history!: ApplicationHistory[];
}