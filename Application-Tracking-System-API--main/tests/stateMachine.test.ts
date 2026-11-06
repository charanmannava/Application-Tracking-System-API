import { getAllowedNextStages, validateTransition } from '../src/services/stateMachine';

describe('application state machine', () => {
  it('allows the standard linear progression', () => {
    expect(validateTransition('Applied', 'Screening')).toBe(true);
    expect(validateTransition('Screening', 'Interview')).toBe(true);
    expect(validateTransition('Interview', 'Offer')).toBe(true);
    expect(validateTransition('Offer', 'Hired')).toBe(true);
  });

  it('allows rejection from any non-terminal stage', () => {
    expect(validateTransition('Applied', 'Rejected')).toBe(true);
    expect(validateTransition('Interview', 'Rejected')).toBe(true);
    expect(validateTransition('Offer', 'Rejected')).toBe(true);
  });

  it('rejects invalid transitions such as skipping stages or moving backwards', () => {
    expect(validateTransition('Applied', 'Offer')).toBe(false);
    expect(validateTransition('Interview', 'Screening')).toBe(false);
    expect(validateTransition('Hired', 'Offer')).toBe(false);
    expect(validateTransition('Rejected', 'Applied')).toBe(false);
  });

  it('returns the valid follow-up states for each current stage', () => {
    expect(getAllowedNextStages('Applied')).toEqual(['Screening', 'Rejected']);
    expect(getAllowedNextStages('Offer')).toEqual(['Hired', 'Rejected']);
    expect(getAllowedNextStages('Hired')).toEqual([]);
    expect(getAllowedNextStages('Rejected')).toEqual([]);
  });
});
