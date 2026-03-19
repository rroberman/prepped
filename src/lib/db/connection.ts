import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "interview-studio.db");
    db = new Database(dbPath);
    // Restrict DB file permissions (owner read/write only)
    try { fs.chmodSync(dbPath, 0o600); } catch { /* may fail on Windows */ }
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
    migrateTokenColumns(db);
    migrateTtsTable(db);
    migrateSessionGroups(db);
    backfillSessionGroups(db);
    migrateAdaptiveDifficulty(db);
  }
  return db;
}

function migrateTokenColumns(db: Database.Database) {
  const migrations = [
    "ALTER TABLE analyses ADD COLUMN prompt_tokens INTEGER DEFAULT 0",
    "ALTER TABLE analyses ADD COLUMN completion_tokens INTEGER DEFAULT 0",
    "ALTER TABLE messages ADD COLUMN prompt_tokens INTEGER DEFAULT 0",
    "ALTER TABLE messages ADD COLUMN completion_tokens INTEGER DEFAULT 0",
    "ALTER TABLE reports ADD COLUMN prompt_tokens INTEGER DEFAULT 0",
    "ALTER TABLE reports ADD COLUMN completion_tokens INTEGER DEFAULT 0",
  ];
  migrations.push(
    "ALTER TABLE interviews ADD COLUMN difficulty TEXT DEFAULT 'realistic'"
  );
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}

function migrateTtsTable(db: Database.Database) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tts_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        characters INTEGER NOT NULL,
        model TEXT NOT NULL DEFAULT 'tts-1',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tts_usage_session ON tts_usage(session_id)`);
  } catch { /* table already exists */ }
}

function migrateSessionGroups(db: Database.Database) {
  const migrations = [
    "ALTER TABLE sessions ADD COLUMN cv_hash TEXT",
    "ALTER TABLE sessions ADD COLUMN company_domain TEXT",
    "ALTER TABLE sessions ADD COLUMN group_label TEXT",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_group ON sessions(company_domain, cv_hash)");
  } catch { /* index already exists */ }
}

function backfillSessionGroups(db: Database.Database) {
  const sessions = db.prepare(
    "SELECT id, cv_text, job_url FROM sessions WHERE cv_hash IS NULL OR company_domain IS NULL"
  ).all() as Array<{ id: string; cv_text: string | null; job_url: string | null }>;

  const update = db.prepare(
    "UPDATE sessions SET cv_hash = ?, company_domain = ? WHERE id = ?"
  );

  for (const session of sessions) {
    const cvHash = session.cv_text
      ? crypto.createHash("sha256").update(session.cv_text).digest("hex")
      : null;
    let companyDomain: string | null = null;
    if (session.job_url) {
      try {
        companyDomain = new URL(session.job_url).hostname.replace(/^www\./, "");
      } catch { /* invalid URL */ }
    }
    update.run(cvHash, companyDomain, session.id);
  }
}

function migrateAdaptiveDifficulty(db: Database.Database) {
  const migrations = [
    "ALTER TABLE interviews ADD COLUMN effective_difficulty TEXT DEFAULT 'realistic'",
    "ALTER TABLE messages ADD COLUMN quality_score INTEGER",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      cv_text TEXT NOT NULL,
      cv_filename TEXT NOT NULL,
      job_url TEXT NOT NULL,
      job_title TEXT,
      company_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      error TEXT,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      current_phase TEXT NOT NULL DEFAULT 'warmup',
      question_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      phase TEXT NOT NULL,
      evaluation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (interview_id) REFERENCES interviews(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      interview_id TEXT NOT NULL,
      overall_score REAL NOT NULL,
      overall_rating TEXT NOT NULL,
      report_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (interview_id) REFERENCES interviews(id)
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_session ON analyses(session_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_session ON interviews(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_interview ON messages(interview_id);
    CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id);
  `);
}
