import Database from "better-sqlite3";
import crypto from "crypto";
import { vi, describe, it, expect, beforeEach } from "vitest";

let db: Database.Database;

vi.mock("@/lib/db/connection", () => ({
  getDb: () => db,
}));

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, cv_text TEXT NOT NULL, cv_filename TEXT NOT NULL, job_url TEXT NOT NULL, job_title TEXT, company_name TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), cv_hash TEXT, company_domain TEXT, group_label TEXT);
  CREATE TABLE IF NOT EXISTS analyses (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), agent_type TEXT NOT NULL, status TEXT DEFAULT 'pending', result TEXT, error TEXT, started_at TEXT, completed_at TEXT, prompt_tokens INTEGER DEFAULT 0, completion_tokens INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS interviews (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), status TEXT DEFAULT 'active', current_phase TEXT DEFAULT 'warmup', question_count INTEGER DEFAULT 0, difficulty TEXT DEFAULT 'realistic', effective_difficulty TEXT DEFAULT 'realistic', started_at TEXT DEFAULT (datetime('now')), ended_at TEXT);
  CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, interview_id TEXT NOT NULL REFERENCES interviews(id), role TEXT NOT NULL, content TEXT NOT NULL, phase TEXT NOT NULL, evaluation TEXT, created_at TEXT DEFAULT (datetime('now')), prompt_tokens INTEGER DEFAULT 0, completion_tokens INTEGER DEFAULT 0, quality_score INTEGER);
  CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), interview_id TEXT NOT NULL REFERENCES interviews(id), overall_score REAL, overall_rating TEXT, report_data TEXT, created_at TEXT DEFAULT (datetime('now')), prompt_tokens INTEGER DEFAULT 0, completion_tokens INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS tts_usage (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL REFERENCES sessions(id), characters INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')));
  CREATE INDEX IF NOT EXISTS idx_sessions_group ON sessions(company_domain, cv_hash);
`;

import {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getSessionsByGroup,
  createAnalysis,
  createInterview,
  createMessage,
  createReport,
  createTtsUsage,
  getSessionTokenUsage,
} from "@/lib/db/queries";

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
});

describe("createSession", () => {
  it("creates a session with correct fields", () => {
    const session = createSession("my cv text", "resume.pdf", "https://example.com/jobs/1");
    expect(session.id).toBeDefined();
    expect(session.cv_text).toBe("my cv text");
    expect(session.cv_filename).toBe("resume.pdf");
    expect(session.job_url).toBe("https://example.com/jobs/1");
    expect(session.status).toBe("pending");
  });

  it("computes cv_hash as SHA-256 hex of cv_text", () => {
    const session = createSession("hello world", "cv.pdf", "https://example.com/job");
    const expected = crypto.createHash("sha256").update("hello world").digest("hex");
    expect(session.cv_hash).toBe(expected);
  });

  it("extracts company_domain from job URL, stripping www.", () => {
    const session = createSession("cv", "cv.pdf", "https://www.acme.com/careers/123");
    expect(session.company_domain).toBe("acme.com");
  });

  it("extracts company_domain without www prefix", () => {
    const session = createSession("cv", "cv.pdf", "https://jobs.lever.co/company");
    expect(session.company_domain).toBe("jobs.lever.co");
  });

  it("sets company_domain to null for invalid URL", () => {
    const session = createSession("cv", "cv.pdf", "not-a-url");
    expect(session.company_domain).toBeNull();
  });
});

describe("updateSession", () => {
  it("updates specified fields", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    updateSession(session.id, { status: "analyzing", job_title: "Engineer" });
    const updated = getSession(session.id)!;
    expect(updated.status).toBe("analyzing");
    expect(updated.job_title).toBe("Engineer");
  });

  it("ignores undefined values", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    updateSession(session.id, { status: "complete", job_title: undefined });
    const updated = getSession(session.id)!;
    expect(updated.status).toBe("complete");
    expect(updated.job_title).toBeNull();
  });

  it("does nothing with empty updates", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    updateSession(session.id, {});
    const after = getSession(session.id)!;
    expect(after.status).toBe("pending");
  });
});

describe("getSessionsByGroup", () => {
  it("label: prefix queries by group_label", () => {
    const s1 = createSession("cv1", "cv.pdf", "https://a.com/job");
    const s2 = createSession("cv2", "cv.pdf", "https://b.com/job");
    updateSession(s1.id, { group_label: "my-group" });
    updateSession(s2.id, { group_label: "my-group" });

    const results = getSessionsByGroup("label:my-group");
    expect(results).toHaveLength(2);
    expect(results.map((s) => s.id)).toContain(s1.id);
    expect(results.map((s) => s.id)).toContain(s2.id);
  });

  it("auto:domain:hash queries by company_domain + cv_hash where group_label IS NULL", () => {
    const first = createSession("same cv", "cv.pdf", "https://example.com/job1");
    createSession("same cv", "cv.pdf", "https://example.com/job2");
    const labeled = createSession("same cv", "cv.pdf", "https://example.com/job3");
    updateSession(labeled.id, { group_label: "labeled" });

    const hash = first.cv_hash!;
    const results = getSessionsByGroup(`auto:example.com:${hash}`);
    expect(results).toHaveLength(2);
    expect(results.map((s) => s.id)).not.toContain(labeled.id);
  });

  it("unknown prefix returns empty array", () => {
    createSession("cv", "cv.pdf", "https://example.com/job");
    expect(getSessionsByGroup("unknown:xyz")).toEqual([]);
  });
});

describe("deleteSession", () => {
  it("cascading delete removes session and all related records", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    createAnalysis(session.id, "scout");
    const interview = createInterview(session.id);
    createMessage(interview.id, "interviewer", "Hello", "warmup");
    createReport(session.id, interview.id, 8.5, "strong_hire", "{}");
    createTtsUsage(session.id, 500);

    deleteSession(session.id);

    expect(getSession(session.id)).toBeUndefined();
    expect(db.prepare("SELECT COUNT(*) as c FROM analyses WHERE session_id = ?").get(session.id)).toEqual({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) as c FROM interviews WHERE session_id = ?").get(session.id)).toEqual({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) as c FROM messages WHERE interview_id = ?").get(interview.id)).toEqual({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) as c FROM reports WHERE session_id = ?").get(session.id)).toEqual({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) as c FROM tts_usage WHERE session_id = ?").get(session.id)).toEqual({ c: 0 });
  });
});

describe("getSessionTokenUsage", () => {
  it("aggregates tokens across analyses, messages, and reports", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    const analysis = createAnalysis(session.id, "scout");
    db.prepare("UPDATE analyses SET prompt_tokens = 100, completion_tokens = 50 WHERE id = ?").run(analysis.id);

    const interview = createInterview(session.id);
    createMessage(interview.id, "interviewer", "q1", "warmup", undefined, { prompt_tokens: 200, completion_tokens: 80 });
    createMessage(interview.id, "interviewer", "q2", "warmup", undefined, { prompt_tokens: 150, completion_tokens: 60 });

    createReport(session.id, interview.id, 7.0, "hire", "{}", { prompt_tokens: 300, completion_tokens: 120 });
    createTtsUsage(session.id, 1000);
    createTtsUsage(session.id, 500);

    const usage = getSessionTokenUsage(session.id);
    expect(usage.prompt_tokens).toBe(100 + 200 + 150 + 300);
    expect(usage.completion_tokens).toBe(50 + 80 + 60 + 120);
    expect(usage.total_tokens).toBe(usage.prompt_tokens + usage.completion_tokens);
    expect(usage.tts_characters).toBe(1500);
  });

  it("returns zeros when no data exists", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    const usage = getSessionTokenUsage(session.id);
    expect(usage).toEqual({
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      tts_characters: 0,
    });
  });
});

describe("createMessage", () => {
  it("stores token usage correctly", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    const interview = createInterview(session.id);
    const msg = createMessage(interview.id, "interviewer", "Hello", "warmup", undefined, {
      prompt_tokens: 42,
      completion_tokens: 18,
    });
    expect(msg.prompt_tokens).toBe(42);
    expect(msg.completion_tokens).toBe(18);
  });

  it("defaults to 0 tokens when not provided", () => {
    const session = createSession("cv", "cv.pdf", "https://example.com/job");
    const interview = createInterview(session.id);
    const msg = createMessage(interview.id, "candidate", "Hi", "warmup");
    expect(msg.prompt_tokens).toBe(0);
    expect(msg.completion_tokens).toBe(0);
  });
});
