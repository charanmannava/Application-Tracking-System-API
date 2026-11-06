import { requireRoles } from '../src/middleware/rbac';

describe('rbac middleware', () => {
  it('allows an authorized role through', () => {
    const req: any = { user: { role: 'recruiter' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireRoles(['recruiter'])(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks an unauthorized role', () => {
    const req: any = { user: { role: 'candidate' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireRoles(['recruiter'])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
