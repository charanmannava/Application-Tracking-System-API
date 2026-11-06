"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stateMachine_1 = require("../src/services/stateMachine");
describe('application state machine', () => {
    it('allows the standard linear progression', () => {
        expect((0, stateMachine_1.validateTransition)('Applied', 'Screening')).toBe(true);
        expect((0, stateMachine_1.validateTransition)('Screening', 'Interview')).toBe(true);
        expect((0, stateMachine_1.validateTransition)('Interview', 'Offer')).toBe(true);
        expect((0, stateMachine_1.validateTransition)('Offer', 'Hired')).toBe(true);
    });
    it('allows rejection from any non-terminal stage', () => {
        expect((0, stateMachine_1.validateTransition)('Applied', 'Rejected')).toBe(true);
        expect((0, stateMachine_1.validateTransition)('Interview', 'Rejected')).toBe(true);
        expect((0, stateMachine_1.validateTransition)('Offer', 'Rejected')).toBe(true);
    });
    it('rejects invalid transitions such as skipping stages or moving backwards', () => {
        expect((0, stateMachine_1.validateTransition)('Applied', 'Offer')).toBe(false);
        expect((0, stateMachine_1.validateTransition)('Interview', 'Screening')).toBe(false);
        expect((0, stateMachine_1.validateTransition)('Hired', 'Offer')).toBe(false);
        expect((0, stateMachine_1.validateTransition)('Rejected', 'Applied')).toBe(false);
    });
    it('returns the valid follow-up states for each current stage', () => {
        expect((0, stateMachine_1.getAllowedNextStages)('Applied')).toEqual(['Screening', 'Rejected']);
        expect((0, stateMachine_1.getAllowedNextStages)('Offer')).toEqual(['Hired', 'Rejected']);
        expect((0, stateMachine_1.getAllowedNextStages)('Hired')).toEqual([]);
        expect((0, stateMachine_1.getAllowedNextStages)('Rejected')).toEqual([]);
    });
});
