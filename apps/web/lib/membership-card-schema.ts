export const membershipCardSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS membership_cards (
    card_id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    card_kind TEXT NOT NULL CHECK (card_kind IN ('MONTHLY_CARD', 'TIMES_CARD')),
    activated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    renewed_from_card_id TEXT,
    visit_days INTEGER NOT NULL DEFAULT 0 CHECK (visit_days >= 0),
    peak_visit_days INTEGER NOT NULL DEFAULT 0 CHECK (peak_visit_days >= 0),
    activity_attendance_count INTEGER NOT NULL DEFAULT 0 CHECK (activity_attendance_count >= 0),
    source_campaign TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS membership_cards_child_activated_idx
    ON membership_cards (child_id, activated_at);`,
  `CREATE INDEX IF NOT EXISTS membership_cards_renewed_from_idx
    ON membership_cards (renewed_from_card_id);`,
  `CREATE TABLE IF NOT EXISTS membership_import_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data_source TEXT NOT NULL CHECK (data_source IN ('mock', 'imported')),
    imported_at TEXT NOT NULL,
    imported_file_name TEXT
  );`,
];
