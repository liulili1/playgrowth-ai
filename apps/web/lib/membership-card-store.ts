import {
  MembershipCardRecordSchema,
  MembershipEconomicsSchema,
  type CardKind,
  type MembershipCardRecord,
} from '@playgrowth/contracts';

const MOCK_AS_OF = '2026-10-23';

const seededCards = MembershipCardRecordSchema.array().parse([
  { cardId: 'MC-001', childId: 'CHILD-001', cardKind: 'MONTHLY_CARD', activatedAt: '2026-06-01', expiresAt: '2026-06-30', amountCents: 28800, renewedFromCardId: null, visitDays: 13, peakVisitDays: 5, activityAttendanceCount: 2, sourceCampaign: '朋友圈' },
  { cardId: 'MC-002', childId: 'CHILD-001', cardKind: 'MONTHLY_CARD', activatedAt: '2026-07-01', expiresAt: '2026-07-31', amountCents: 28800, renewedFromCardId: 'MC-001', visitDays: 9, peakVisitDays: 3, activityAttendanceCount: 1, sourceCampaign: '续卡' },
  { cardId: 'MC-003', childId: 'CHILD-002', cardKind: 'MONTHLY_CARD', activatedAt: '2026-06-06', expiresAt: '2026-07-05', amountCents: 28800, renewedFromCardId: null, visitDays: 15, peakVisitDays: 8, activityAttendanceCount: 0, sourceCampaign: '自然到店' },
  { cardId: 'MC-004', childId: 'CHILD-003', cardKind: 'MONTHLY_CARD', activatedAt: '2026-07-10', expiresAt: '2026-08-08', amountCents: 28800, renewedFromCardId: null, visitDays: 8, peakVisitDays: 2, activityAttendanceCount: 3, sourceCampaign: '会员群' },
  { cardId: 'MC-005', childId: 'CHILD-003', cardKind: 'TIMES_CARD', activatedAt: '2026-08-10', expiresAt: '2026-10-08', amountCents: 32000, renewedFromCardId: 'MC-004', visitDays: 6, peakVisitDays: 2, activityAttendanceCount: 1, sourceCampaign: '换次卡' },
  { cardId: 'TC-001', childId: 'CHILD-101', cardKind: 'TIMES_CARD', activatedAt: '2026-06-03', expiresAt: '2026-08-31', amountCents: 32000, renewedFromCardId: null, visitDays: 8, peakVisitDays: 2, activityAttendanceCount: 1, sourceCampaign: '活动海报' },
  { cardId: 'TC-002', childId: 'CHILD-101', cardKind: 'TIMES_CARD', activatedAt: '2026-09-04', expiresAt: '2026-11-30', amountCents: 32000, renewedFromCardId: 'TC-001', visitDays: 5, peakVisitDays: 1, activityAttendanceCount: 2, sourceCampaign: '续卡' },
  { cardId: 'TC-003', childId: 'CHILD-102', cardKind: 'TIMES_CARD', activatedAt: '2026-06-08', expiresAt: '2026-09-05', amountCents: 32000, renewedFromCardId: null, visitDays: 10, peakVisitDays: 3, activityAttendanceCount: 2, sourceCampaign: '自然到店' },
  { cardId: 'TC-004', childId: 'CHILD-103', cardKind: 'TIMES_CARD', activatedAt: '2026-07-12', expiresAt: '2026-10-10', amountCents: 32000, renewedFromCardId: null, visitDays: 7, peakVisitDays: 2, activityAttendanceCount: 0, sourceCampaign: '会员群' },
]);

let activeCards: MembershipCardRecord[] = seededCards;
let activeSource: 'mock' | 'imported' = 'mock';

const dateAsTime = (value: string) => new Date(`${value}T00:00:00.000Z`).getTime();
const addDays = (value: string, days: number) => new Date(dateAsTime(value) + days * 86_400_000).toISOString().slice(0, 10);
const ratio = (numerator: number, denominator: number) => (denominator === 0 ? 0 : numerator / denominator);

function uniqueFirstCards(cards: readonly MembershipCardRecord[]) {
  const cardsByChild = new Map<string, MembershipCardRecord[]>();
  for (const card of cards) {
    cardsByChild.set(card.childId, [...(cardsByChild.get(card.childId) ?? []), card]);
  }

  return [...cardsByChild.values()].map((childCards) =>
    [...childCards].sort((left, right) =>
      left.activatedAt.localeCompare(right.activatedAt) || left.cardId.localeCompare(right.cardId),
    )[0],
  );
}

function economicsRow(cardKind: CardKind, windowDays: 30 | 60 | 90, asOf: string) {
  const firstCards = uniqueFirstCards(activeCards).filter((card) => card.cardKind === cardKind);
  const eligible = firstCards.filter((card) => addDays(card.activatedAt, windowDays) <= asOf);
  const observing = firstCards.length - eligible.length;
  const eligibleChildIds = new Set(eligible.map((card) => card.childId));
  const revenue = eligible.reduce((sum, card) => {
    const windowEndsAt = addDays(card.activatedAt, windowDays);
    const childRevenue = activeCards
      .filter((candidate) => candidate.childId === card.childId)
      .filter((candidate) => candidate.activatedAt >= card.activatedAt && candidate.activatedAt <= windowEndsAt)
      .reduce((childSum, candidate) => childSum + candidate.amountCents, 0);
    return sum + childRevenue;
  }, 0);
  const renewals = eligible.map((card) => activeCards.find((candidate) => candidate.renewedFromCardId === card.cardId)).filter(
    (card): card is MembershipCardRecord => Boolean(card),
  ).filter((card) => card.activatedAt <= addDays(activeCards.find((candidate) => candidate.cardId === card.renewedFromCardId)?.expiresAt ?? card.activatedAt, 30));
  const sameKindRenewals = renewals.filter((card) => card.cardKind === cardKind);
  const switchedRenewals = renewals.filter((card) => card.cardKind !== cardKind);
  const cardsInWindow = activeCards.filter((candidate) => {
    const first = uniqueFirstCards(activeCards).find((item) => item.childId === candidate.childId);
    if (!first || !eligibleChildIds.has(candidate.childId) || first.cardKind !== cardKind) return false;
    return candidate.activatedAt >= first.activatedAt && candidate.activatedAt <= addDays(first.activatedAt, windowDays);
  });
  const visitDays = cardsInWindow.reduce((sum, card) => sum + card.visitDays, 0);
  const peakVisitDays = cardsInWindow.reduce((sum, card) => sum + card.peakVisitDays, 0);
  const activityParticipants = new Set(cardsInWindow.filter((card) => card.activityAttendanceCount > 0).map((card) => card.childId));

  return {
    cardKind,
    label: cardKind === 'MONTHLY_CARD' ? '月卡' : '次卡',
    sampleSize: firstCards.length,
    eligibleSampleSize: eligible.length,
    observingSampleSize: observing,
    netRevenueCents: revenue,
    revenuePerEligibleChildCents: eligible.length > 0 ? Math.round(revenue / eligible.length) : null,
    renewalRate30d: eligible.length > 0 ? ratio(renewals.length, eligible.length) : null,
    sameKindRenewalRate30d: eligible.length > 0 ? ratio(sameKindRenewals.length, eligible.length) : null,
    switchedCardRate30d: eligible.length > 0 ? ratio(switchedRenewals.length, eligible.length) : null,
    averageVisitDays: eligible.length > 0 ? Number((visitDays / eligible.length).toFixed(1)) : null,
    peakVisitShare: visitDays > 0 ? ratio(peakVisitDays, visitDays) : null,
    activityParticipationRate: eligible.length > 0 ? ratio(activityParticipants.size, eligible.length) : null,
    visitDataCoverageRate: eligible.length > 0 ? ratio(eligible.filter((card) => Number.isInteger(card.visitDays)).length, eligible.length) : 0,
  };
}

export function getMembershipEconomics(windowDays: 30 | 60 | 90 = 90) {
  const rows = [
    economicsRow('MONTHLY_CARD', windowDays, MOCK_AS_OF),
    economicsRow('TIMES_CARD', windowDays, MOCK_AS_OF),
  ];
  const warnings = rows.flatMap((row) => {
    const messages: string[] = [];
    if (row.eligibleSampleSize < 3) messages.push(`${row.label}完成 ${windowDays} 天观察的样本不足 3 名，请继续积累数据。`);
    if (row.observingSampleSize > 0) messages.push(`${row.label}有 ${row.observingSampleSize} 名儿童仍在观察期，不纳入结论。`);
    return messages;
  });

  return MembershipEconomicsSchema.parse({
    dataSource: activeSource,
    asOf: MOCK_AS_OF,
    windowDays,
    rows,
    warnings,
    generatedAt: new Date().toISOString(),
  });
}

export function replaceMembershipCards(rows: MembershipCardRecord[]) {
  activeCards = MembershipCardRecordSchema.array().parse(rows);
  activeSource = 'imported';
}

export function getMembershipImportStatus() {
  return { dataSource: activeSource, totalCards: activeCards.length } as const;
}
