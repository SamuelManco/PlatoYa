export const ALLOWED_COOK_TRANSITIONS = {
  PENDIENTE: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["DELIVERED"],
  DELIVERED: [],
};

export function canCookTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_COOK_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}