"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rbac_1 = require("../src/middleware/rbac");
describe('rbac middleware', () => {
    it('allows an authorized role through', () => {
        const req = { user: { role: 'recruiter' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        (0, rbac_1.requireRoles)(['recruiter'])(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
    it('blocks an unauthorized role', () => {
        const req = { user: { role: 'candidate' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        (0, rbac_1.requireRoles)(['recruiter'])(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
