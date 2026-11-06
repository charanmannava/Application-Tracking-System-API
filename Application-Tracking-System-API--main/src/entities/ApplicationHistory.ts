import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from './Application';
import { User } from './User';

@Entity()
export class ApplicationHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Application, (app) => app.history, { nullable: false })
  @JoinColumn({ name: 'application_id' })
  application!: Application;

  @Column({ type: 'varchar', nullable: true })
  previous_stage!: string | null;

  @Column({ type: 'varchar' })
  new_stage!: string;

  @ManyToOne(() => User, (user) => user.historyChanges, { nullable: false })
  @JoinColumn({ name: 'changed_by' })
  changed_by!: User;

  @CreateDateColumn()
  changed_at!: Date;
}