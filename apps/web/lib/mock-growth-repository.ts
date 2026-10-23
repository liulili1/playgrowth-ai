import {
  AttributionSummarySchema,
  DashboardOverviewSchema,
  GrowthEventListSchema,
  ImportBatchSchema,
  type DateRange,
  type GrowthEvent,
  type GrowthEventType,
  type ImportBatch,
  type MockImportRequest,
} from '@playgrowth/contracts';
import {
  activeRentalCount,
  countEvents,
  eventsInRange,
  percentageChange,
  previousPeriod,
  ratio,
  sumPaymentCents,
} from '@playgrowth/domain';

export const DEFAULT_MOCK_RANGE: DateRange = { from: '2026-10-20', to: '2026-10-26' };
export const MOCK_STORE_ID = 'store-guanghe-001';
export const MOCK_CAMPAIGN_ID = 'campaign-weekend-challenge-001';

type EventOptions = {
  campaignId?: string | null;
  attributedCount?: number;
  payload?: (index: number) => Record<string, unknown>;
};

function eventTime(day: string, index: number) {
  const hour = 9 + (index % 9);
  const minute = (index * 7) % 60;
  return `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

function createEvents(
  prefix: string,
  eventType: GrowthEventType,
  count: number,
  day: string,
  options: EventOptions = {},
): GrowthEvent[] {
  const attributedCount = options.attributedCount ?? count;
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    storeId: MOCK_STORE_ID,
    campaignId: index < attributedCount ? (options.campaignId ?? MOCK_CAMPAIGN_ID) : null,
    eventType,
    subjectId: `${prefix}-subject-${index + 1}`,
    occurredAt: eventTime(day, index),
    payload: options.payload?.(index) ?? {},
  }));
}

const previousWeekEvents: GrowthEvent[] = [
  ...createEvents('prev-scan', 'QR_SCANNED', 141, '2026-10-15'),
  ...createEvents('prev-booking', 'APPOINTMENT_BOOKED', 72, '2026-10-16'),
  ...createEvents('prev-checkin', 'APPOINTMENT_CHECKED_IN', 53, '2026-10-17'),
  ...createEvents('prev-payment', 'PAYMENT_PAID', 43, '2026-10-18', {
    attributedCount: 36,
    payload: (index) => ({ amountCents: index === 42 ? 53_990 : 16_905 }),
  }),
  ...createEvents('previous-rental', 'RENTAL_STARTED', 30, '2026-10-14', {
    campaignId: null,
  }),
];

const currentWeekEvents: GrowthEvent[] = [
  ...createEvents('current-scan', 'QR_SCANNED', 152, '2026-10-21'),
  ...createEvents('current-booking', 'APPOINTMENT_BOOKED', 96, '2026-10-22'),
  ...createEvents('current-checkin', 'APPOINTMENT_CHECKED_IN', 65, '2026-10-23'),
  ...createEvents('current-payment', 'PAYMENT_PAID', 38, '2026-10-23', {
    attributedCount: 34,
    payload: (index) => ({ amountCents: index === 37 ? 23_500 : 22_500 }),
  }),
  ...createEvents('previous-rental', 'RENTAL_RETURNED', 30, '2026-10-20', {
    campaignId: null,
  }),
  ...createEvents('current-rental', 'RENTAL_STARTED', 36, '2026-10-22', {
    campaignId: null,
  }),
];

const allEvents = [...previousWeekEvents, ...currentWeekEvents].sort((a, b) =>
  a.occurredAt.localeCompare(b.occurredAt),
);

const metric = (
  key: 'REVENUE' | 'TRIAL_BOOKINGS' | 'CHECK_IN_RATE' | 'ACTIVE_RENTALS',
  label: string,
  value: number,
  format: 'currency_cents' | 'count' | 'percent',
  change: number,
  changeUnit: 'percent' | 'percentage_points',
) => ({ key, label, value, format, change, changeUnit, comparisonLabel: '较上周' } as const);

export function getMockDashboardOverview(range: DateRange = DEFAULT_MOCK_RANGE) {
  const current = eventsInRange(allEvents, range);
  const previous = eventsInRange(allEvents, previousPeriod(range));

  const revenue = sumPaymentCents(current);
  const previousRevenue = sumPaymentCents(previous);
  const bookings = countEvents(current, 'APPOINTMENT_BOOKED');
  const previousBookings = countEvents(previous, 'APPOINTMENT_BOOKED');
  const checkIns = countEvents(current, 'APPOINTMENT_CHECKED_IN');
  const previousCheckIns = countEvents(previous, 'APPOINTMENT_CHECKED_IN');
  const checkInRate = ratio(checkIns, bookings);
  const previousCheckInRate = ratio(previousCheckIns, previousBookings);
  const activeRentals = activeRentalCount(allEvents, range.to);
  const previousActiveRentals = activeRentalCount(allEvents, previousPeriod(range).to);
  const attributedPayments = current.filter(
    (event) => event.eventType === 'PAYMENT_PAID' && event.campaignId !== null,
  );
  const attributedRevenueCents = sumPaymentCents(attributedPayments);
  const attributedPaymentCount = attributedPayments.length;
  const coverageRate = ratio(attributedRevenueCents, revenue);

  const funnelRows = [
    ['QR_SCANNED', '浏览活动'],
    ['APPOINTMENT_BOOKED', '试听预约'],
    ['APPOINTMENT_CHECKED_IN', '到店体验'],
    ['PAYMENT_PAID', '报名付费'],
  ] as const;

  const overview = {
    dataSource: 'mock' as const,
    dateRange: range,
    generatedAt: new Date().toISOString(),
    metrics: [
      metric('REVENUE', '本周营收', revenue, 'currency_cents', percentageChange(revenue, previousRevenue), 'percent'),
      metric('TRIAL_BOOKINGS', '试听预约', bookings, 'count', percentageChange(bookings, previousBookings), 'percent'),
      metric(
        'CHECK_IN_RATE',
        '课堂到店率',
        checkInRate,
        'percent',
        (checkInRate - previousCheckInRate) * 100,
        'percentage_points',
      ),
      metric(
        'ACTIVE_RENTALS',
        '玩具租赁中',
        activeRentals,
        'count',
        percentageChange(activeRentals, previousActiveRentals),
        'percent',
      ),
    ],
    funnel: funnelRows.map(([key, label]) => {
      const count = countEvents(current, key);
      return {
        key,
        label,
        count,
        previousCount: countEvents(previous, key),
        conversionRate: ratio(count, countEvents(current, 'QR_SCANNED')),
      };
    }),
    attribution: AttributionSummarySchema.parse({
      coverageRate,
      attributedRevenueCents,
      totalRevenueCents: revenue,
      attributedPaymentCount,
      note: 'Mock 口径：按最后一次可识别活动触点归因；真实接入后由事件表计算。',
    }),
    insights: [
      {
        severity: 'attention' as const,
        title: `到店率较上周 ${Math.abs(Math.round((checkInRate - previousCheckInRate) * 100))} 个百分点`,
        description: 'Mock 数据显示预约量增长，但到店转化下降；阶段 3 的 Agent 将基于真实事件给出可追溯分析。',
      },
      {
        severity: 'info' as const,
        title: `活动归因覆盖 ${Math.round(coverageRate * 100)}% 的本周营收`,
        description: '当前指标来自 Mock 事件，已验证从扫码到支付的活动来源字段与漏斗计算路径。',
      },
    ],
  };

  return DashboardOverviewSchema.parse(overview);
}

export function listMockGrowthEvents(input: {
  range: DateRange;
  campaignId?: string;
  eventType?: GrowthEventType;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const filtered = eventsInRange(allEvents, input.range)
    .filter((event) => !input.campaignId || event.campaignId === input.campaignId)
    .filter((event) => !input.eventType || event.eventType === input.eventType)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const start = input.cursor ? Math.max(0, filtered.findIndex((event) => event.id === input.cursor) + 1) : 0;
  const items = filtered.slice(start, start + limit);

  return GrowthEventListSchema.parse({
    dataSource: 'mock',
    items,
    nextCursor: start + limit < filtered.length ? items.at(-1)?.id ?? null : null,
    total: filtered.length,
  });
}

const requiredFields: Record<MockImportRequest['entity'], readonly string[]> = {
  GUARDIAN: ['phone'],
  COURSE_CLASS: ['name', 'capacity'],
  APPOINTMENT: ['scheduledAt', 'guardianPhone'],
  PAYMENT: ['paidAt', 'amountCents'],
  TOY_ITEM: ['assetCode', 'name'],
  RENTAL_ORDER: ['assetCode', 'guardianPhone', 'dueAt'],
};

export function validateMockImport(input: MockImportRequest): ImportBatch {
  const fields = requiredFields[input.entity];
  const errors = input.rows.flatMap((row, index) => {
    const missing = fields.filter((field) => row[field] === undefined || row[field] === null || row[field] === '');
    return missing.length > 0 ? [{ row: index + 1, message: `缺少字段：${missing.join('、')}` }] : [];
  });

  return ImportBatchSchema.parse({
    id: `mock-import-${crypto.randomUUID()}`,
    entity: input.entity,
    status: errors.length === input.rows.length ? 'REJECTED' : 'VALIDATED',
    totalRows: input.rows.length,
    validRows: input.rows.length - errors.length,
    invalidRows: errors.length,
    errors,
    isMock: true,
    createdAt: new Date().toISOString(),
  });
}
