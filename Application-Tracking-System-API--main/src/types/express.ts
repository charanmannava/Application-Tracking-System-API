import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        company_id?: string | null;
      };
    }
  }
}

export {};
