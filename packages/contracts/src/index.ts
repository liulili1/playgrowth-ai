import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('web'),
  stage: z.literal('bootstrap'),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const DateRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine(({ from, to }) => from <= to, { message: 'from 不能晚于 to', path: ['to'] });

export type DateRange = z.infer<typeof DateRangeSchema>;

export const GrowthEventTypeSchema = z.enum([
  'QR_SCANNED',
  'LEAD_CREATED',
  'APPOINTMENT_BOOKED',
  'APPOINTMENT_CHECKED_IN',
  'PAYMENT_PAID',
  'RENTAL_STARTED',
  'RENTAL_RETURNED',
]);

export type GrowthEventType = z.infer<typeof GrowthEventTypeSchema>;

export const GrowthEventSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  campaignId: z.string().nullable(),
  eventType: GrowthEventTypeSchema,
  subjectId: z.string(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type GrowthEvent = z.infer<typeof GrowthEventSchema>;

export const MetricKeySchema = z.enum([
  'REVENUE',
  'TRIAL_BOOKINGS',
  'CHECK_IN_RATE',
  'ACTIVE_RENTALS',
]);

export const DashboardMetricSchema = z.object({
  key: MetricKeySchema,
  label: z.string(),
  value: z.number(),
  format: z.enum(['currency_cents', 'count', 'percent']),
  change: z.number(),
  changeUnit: z.enum(['percent', 'percentage_points']),
  comparisonLabel: z.string(),
});

export type DashboardMetric = z.infer<typeof DashboardMetricSchema>;

export const FunnelStageSchema = z.object({
  key: z.enum(['QR_SCANNED', 'APPOINTMENT_BOOKED', 'APPOINTMENT_CHECKED_IN', 'PAYMENT_PAID']),
  label: z.string(),
  count: z.number().int().nonnegative(),
  previousCount: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(1),
});

export type FunnelStage = z.infer<typeof FunnelStageSchema>;

export const AttributionSummarySchema = z.object({
  coverageRate: z.number().min(0).max(1),
  attributedRevenueCents: z.number().int().nonnegative(),
  totalRevenueCents: z.number().int().nonnegative(),
  attributedPaymentCount: z.number().int().nonnegative(),
  note: z.string(),
});

export const DashboardOverviewSchema = z.object({
  dataSource: z.literal('mock'),
  dateRange: DateRangeSchema,
  generatedAt: z.string().datetime(),
  metrics: z.array(DashboardMetricSchema).length(4),
  funnel: z.array(FunnelStageSchema).length(4),
  attribution: AttributionSummarySchema,
  insights: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      severity: z.enum(['info', 'attention']),
    }),
  ),
});

export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;

export const GrowthEventListSchema = z.object({
  dataSource: z.literal('mock'),
  items: z.array(GrowthEventSchema),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
});

export type GrowthEventList = z.infer<typeof GrowthEventListSchema>;

export const ImportEntitySchema = z.enum([
  'GUARDIAN',
  'COURSE_CLASS',
  'APPOINTMENT',
  'PAYMENT',
  'TOY_ITEM',
  'RENTAL_ORDER',
]);

export const MockImportRequestSchema = z.object({
  entity: ImportEntitySchema,
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
});

export type MockImportRequest = z.infer<typeof MockImportRequestSchema>;

export const ImportBatchSchema = z.object({
  id: z.string(),
  entity: ImportEntitySchema,
  status: z.enum(['VALIDATED', 'REJECTED']),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  errors: z.array(z.object({ row: z.number().int().positive(), message: z.string() })),
  isMock: z.literal(true),
  createdAt: z.string().datetime(),
});

export type ImportBatch = z.infer<typeof ImportBatchSchema>;

export const CardKindSchema = z.enum(['MONTHLY_CARD', 'TIMES_CARD']);
export type CardKind = z.infer<typeof CardKindSchema>;

export const MembershipCardRecordSchema = z
  .object({
    cardId: z.string().trim().min(1).max(80),
    childId: z.string().trim().min(1).max(80),
    cardKind: CardKindSchema,
    activatedAt: z.string().date(),
    expiresAt: z.string().date(),
    amountCents: z.number().int().positive().max(1_000_000),
    renewedFromCardId: z.string().trim().min(1).max(80).nullable(),
    visitDays: z.number().int().nonnegative().max(365),
    peakVisitDays: z.number().int().nonnegative().max(365),
    activityAttendanceCount: z.number().int().nonnegative().max(365),
    sourceCampaign: z.string().trim().max(100).nullable(),
  })
  .refine((record) => record.activatedAt <= record.expiresAt, {
    message: '激活日期不能晚于到期日期',
    path: ['expiresAt'],
  })
  .refine((record) => record.peakVisitDays <= record.visitDays, {
    message: '高峰时段到店天数不能大于总到店天数',
    path: ['peakVisitDays'],
  });

export type MembershipCardRecord = z.infer<typeof MembershipCardRecordSchema>;

export const MembershipImportErrorSchema = z.object({
  row: z.number().int().positive(),
  message: z.string(),
});

export const MembershipImportResultSchema = z.object({
  status: z.enum(['IMPORTED', 'REJECTED']),
  fileName: z.string(),
  fileType: z.enum(['csv', 'xlsx']),
  totalRows: z.number().int().nonnegative(),
  importedRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  errors: z.array(MembershipImportErrorSchema),
  dataSource: z.enum(['mock', 'imported']),
  importedAt: z.string().datetime(),
});

export type MembershipImportResult = z.infer<typeof MembershipImportResultSchema>;

export const CardEconomicsRowSchema = z.object({
  cardKind: CardKindSchema,
  label: z.string(),
  sampleSize: z.number().int().nonnegative(),
  eligibleSampleSize: z.number().int().nonnegative(),
  observingSampleSize: z.number().int().nonnegative(),
  netRevenueCents: z.number().int().nonnegative(),
  revenuePerEligibleChildCents: z.number().int().nonnegative().nullable(),
  renewalRate30d: z.number().min(0).max(1).nullable(),
  sameKindRenewalRate30d: z.number().min(0).max(1).nullable(),
  switchedCardRate30d: z.number().min(0).max(1).nullable(),
  averageVisitDays: z.number().nonnegative().nullable(),
  peakVisitShare: z.number().min(0).max(1).nullable(),
  activityParticipationRate: z.number().min(0).max(1).nullable(),
  visitDataCoverageRate: z.number().min(0).max(1),
});

export const MembershipEconomicsSchema = z.object({
  dataSource: z.enum(['mock', 'imported']),
  asOf: z.string().date(),
  windowDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  rows: z.array(CardEconomicsRowSchema).length(2),
  warnings: z.array(z.string()),
  generatedAt: z.string().datetime(),
});

export type MembershipEconomics = z.infer<typeof MembershipEconomicsSchema>;
