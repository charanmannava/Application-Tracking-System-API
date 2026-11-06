export const VALID_TRANSITIONS: Record<string, string[]> = {
  Applied: ['Screening', 'Rejected'],
  Screening: ['Interview', 'Rejected'],
  Interview: ['Offer', 'Rejected'],
  Offer: ['Hired', 'Rejected'],
  Hired: [],
  Rejected: [],
};

export function validateTransition(currentStage: string, nextStage: string): boolean {
  return VALID_TRANSITIONS[currentStage]?.includes(nextStage) ?? false;
}

export function getAllowedNextStages(currentStage: string): string[] {
  return VALID_TRANSITIONS[currentStage] ?? [];
}
