// 1. "as const" se TS ko pata chalta hai ki ye keys fix hain
const VALID_TRANSITIONS = {
  SALES_ORDER: {
    DRAFT: ['APPROVED', 'CANCELLED'],
    APPROVED: ['SHIPPED', 'CLOSED'],
    SHIPPED: ['CLOSED']
  }
} as const;

// 2. Types nikaalein taaki indexing safe ho jaye
type EntityType = keyof typeof VALID_TRANSITIONS;

export const validateTransition = (entity: string, current: string, next: string) => {
  // Check karein ki kya entity VALID_TRANSITIONS mein hai
  if (!(entity in VALID_TRANSITIONS)) {
    throw new Error(`Entity ${entity} does not exist in state machine.`);
  }

  // Type casting karein taaki TS index signature ka error na de
  const entityTransitions = (VALID_TRANSITIONS as any)[entity];
  const allowedTransitions = entityTransitions[current];

  if (!allowedTransitions || !allowedTransitions.includes(next)) {
    throw new Error(`Invalid Status Change: ${current} to ${next} is not allowed for ${entity}.`);
  }
};