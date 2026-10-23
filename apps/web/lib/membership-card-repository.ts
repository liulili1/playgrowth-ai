import { env } from 'cloudflare:workers';
import { MembershipCardRecordSchema, type MembershipCardRecord } from '@playgrowth/contracts';
import { calculateMembershipEconomics, seededMembershipCards } from '@/lib/membership-card-store';
import { membershipCardSchemaStatements } from '@/lib/membership-card-schema';

type DataSource = 'mock' | 'imported';

type MembershipCardRow = {
  card_id: string;
  child_id: string;
  card_kind: MembershipCardRecord['cardKind'];
  activated_at: string;
  expires_at: string;
  amount_cents: number;
  renewed_from_card_id: string | null;
  visit_days: number;
  peak_visit_days: number;
  activity_attendance_count: number;
  source_campaign: string;
};

type ImportStateRow = {
  data_source: DataSource;
};

let schemaReady: Promise<void> | undefined;

function getDatabase() {
  const database = (env as unknown as { PLAYGROWTH_DB?: D1Database }).PLAYGROWTH_DB;
  if (!database) {
    throw new Error('D1 数据库绑定 PLAYGROWTH_DB 未配置。请检查 cloudflare.config.ts。');
  }
  return database;
}

async function ensureSchema(database: D1Database) {
  schemaReady ??= database
    .batch(membershipCardSchemaStatements.map((statement) => database.prepare(statement)))
    .then(() => undefined);
  await schemaReady;
}

function insertCardStatement(database: D1Database, card: MembershipCardRecord, ignoreConflicts = false) {
  return database
    .prepare(`
      INSERT ${ignoreConflicts ? 'OR IGNORE ' : ''}INTO membership_cards (
        card_id, child_id, card_kind, activated_at, expires_at, amount_cents,
        renewed_from_card_id, visit_days, peak_visit_days,
        activity_attendance_count, source_campaign
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      card.cardId,
      card.childId,
      card.cardKind,
      card.activatedAt,
      card.expiresAt,
      card.amountCents,
      card.renewedFromCardId,
      card.visitDays,
      card.peakVisitDays,
      card.activityAttendanceCount,
      card.sourceCampaign,
    );
}

async function ensureSeeded(database: D1Database) {
  await ensureSchema(database);
  const count = await database.prepare('SELECT COUNT(*) AS total FROM membership_cards').first<{ total: number }>();
  if ((count?.total ?? 0) > 0) return;

  await database.batch([
    ...seededMembershipCards.map((card) => insertCardStatement(database, card, true)),
    database
      .prepare(`
        INSERT INTO membership_import_state (id, data_source, imported_at, imported_file_name)
        VALUES (1, 'mock', ?, NULL)
        ON CONFLICT(id) DO UPDATE SET
          data_source = excluded.data_source,
          imported_at = excluded.imported_at,
          imported_file_name = NULL
      `)
      .bind(new Date().toISOString()),
  ]);
}

function mapCard(row: MembershipCardRow) {
  return MembershipCardRecordSchema.parse({
    cardId: row.card_id,
    childId: row.child_id,
    cardKind: row.card_kind,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    amountCents: row.amount_cents,
    renewedFromCardId: row.renewed_from_card_id,
    visitDays: row.visit_days,
    peakVisitDays: row.peak_visit_days,
    activityAttendanceCount: row.activity_attendance_count,
    sourceCampaign: row.source_campaign,
  });
}

async function getCardsAndSource() {
  const database = getDatabase();
  await ensureSeeded(database);
  const [cardsResult, source] = await Promise.all([
    database.prepare('SELECT * FROM membership_cards ORDER BY activated_at, card_id').all<MembershipCardRow>(),
    database.prepare('SELECT data_source FROM membership_import_state WHERE id = 1').first<ImportStateRow>(),
  ]);

  return {
    cards: cardsResult.results.map(mapCard),
    dataSource: (source?.data_source === 'imported' ? 'imported' : 'mock') as DataSource,
  };
}

export async function getMembershipEconomics(windowDays: 30 | 60 | 90 = 90) {
  const { cards, dataSource } = await getCardsAndSource();
  return calculateMembershipEconomics(cards, dataSource, windowDays);
}

export async function replaceMembershipCards(rows: MembershipCardRecord[], fileName: string) {
  const cards = MembershipCardRecordSchema.array().parse(rows);
  const database = getDatabase();
  await ensureSchema(database);

  await database.batch([
    database.prepare('DELETE FROM membership_cards'),
    ...cards.map((card) => insertCardStatement(database, card)),
    database
      .prepare(`
        INSERT INTO membership_import_state (id, data_source, imported_at, imported_file_name)
        VALUES (1, 'imported', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          data_source = excluded.data_source,
          imported_at = excluded.imported_at,
          imported_file_name = excluded.imported_file_name
      `)
      .bind(new Date().toISOString(), fileName),
  ]);
}

export async function getMembershipImportStatus() {
  const { cards, dataSource } = await getCardsAndSource();
  return { dataSource, totalCards: cards.length } as const;
}
