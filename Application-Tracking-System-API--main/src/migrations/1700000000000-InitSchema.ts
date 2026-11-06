import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE "company" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_company_name" UNIQUE ("name"),
        CONSTRAINT "PK_company" PRIMARY KEY ("id")
      );

      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "role" character varying NOT NULL,
        "company_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE SET NULL,
        CONSTRAINT "CK_user_role" CHECK ("role" IN ('candidate', 'recruiter', 'hiring_manager'))
      );

      CREATE TABLE "job" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_id" uuid NOT NULL,
        "title" character varying NOT NULL,
        "description" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'open',
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_job" PRIMARY KEY ("id"),
        CONSTRAINT "FK_job_company" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_job_created_by" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT,
        CONSTRAINT "CK_job_status" CHECK ("status" IN ('open', 'closed'))
      );

      CREATE TABLE "application" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" uuid NOT NULL,
        "candidate_id" uuid NOT NULL,
        "stage" character varying NOT NULL DEFAULT 'Applied',
        "resume_url" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application" PRIMARY KEY ("id"),
        CONSTRAINT "FK_application_job" FOREIGN KEY ("job_id") REFERENCES "job"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_application_candidate" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE
      );

      CREATE TABLE "application_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "application_id" uuid NOT NULL,
        "previous_stage" character varying,
        "new_stage" character varying NOT NULL,
        "changed_by" uuid NOT NULL,
        "changed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_application_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_application_history_application" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_application_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "user"("id") ON DELETE RESTRICT
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "application_history";
      DROP TABLE IF EXISTS "application";
      DROP TABLE IF EXISTS "job";
      DROP TABLE IF EXISTS "user";
      DROP TABLE IF EXISTS "company";
    `);
  }
}
