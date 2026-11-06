import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { Job } from './Job';

@Entity()
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => User, (user) => user.company)
  users!: User[];

  @OneToMany(() => Job, (job) => job.company)
  jobs!: Job[];
}