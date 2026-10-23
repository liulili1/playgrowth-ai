export const systemStage = 'bootstrap' as const;

export type UserRole = 'OWNER' | 'OPERATOR' | 'TEACHER' | 'FRONT_DESK' | 'GUARDIAN';

export type Permission =
  | 'dashboard:read'
  | 'campaign:create'
  | 'campaign:update'
  | 'approval:review'
  | 'rental:operate'
  | 'agent:run';

const permissionsByRole: Record<UserRole, readonly Permission[]> = {
  OWNER: ['dashboard:read', 'campaign:create', 'campaign:update', 'approval:review', 'rental:operate', 'agent:run'],
  OPERATOR: ['dashboard:read', 'campaign:create', 'campaign:update', 'agent:run'],
  TEACHER: [],
  FRONT_DESK: ['rental:operate'],
  GUARDIAN: [],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return permissionsByRole[role].includes(permission);
}

export type { DateRange, GrowthEvent } from '@playgrowth/contracts';

import type { DateRange, GrowthEvent } from '@playgrowth/contracts';

const dayStart = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();
const dayEnd = (date: string) => new Date(`${date}T23:59:59.999Z`).getTime();

export function eventsInRange(events: readonly GrowthEvent[], range: DateRange) {
  const from = dayStart(range.from);
  const to = dayEnd(range.to);
  return events.filter((event) => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return occurredAt >= from && occurredAt <= to;
  });
}

export function previousPeriod(range: DateRange): DateRange {
  const from = dayStart(range.from);
  const to = dayStart(range.to);
  const durationInDays = Math.floor((to - from) / 86_400_000) + 1;
  const previousTo = new Date(from - 86_400_000);
  const previousFrom = new Date(previousTo.getTime() - (durationInDays - 1) * 86_400_000);
  const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

  return { from: toDateOnly(previousFrom), to: toDateOnly(previousTo) };
}

export function countEvents(events: readonly GrowthEvent[], eventType: GrowthEvent['eventType']) {
  return events.filter((event) => event.eventType === eventType).length;
}

export function sumPaymentCents(events: readonly GrowthEvent[]) {
  return events
    .filter((event) => event.eventType === 'PAYMENT_PAID')
    .reduce((sum, event) => sum + Number(event.payload.amountCents ?? 0), 0);
}

export function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function percentageChange(current: number, previous: number) {
  return previous === 0 ? 0 : ((current - previous) / previous) * 100;
}

export function activeRentalCount(events: readonly GrowthEvent[], asOf: string) {
  const cutoff = dayEnd(asOf);
  const activeRentalIds = new Set<string>();

  for (const event of events
    .filter((item) => new Date(item.occurredAt).getTime() <= cutoff)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) {
    if (event.eventType === 'RENTAL_STARTED') activeRentalIds.add(event.subjectId);
    if (event.eventType === 'RENTAL_RETURNED') activeRentalIds.delete(event.subjectId);
  }

  return activeRentalIds.size;
}
