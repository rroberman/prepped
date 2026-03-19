import crypto from "crypto";
import { nanoid } from "nanoid";
import { getDb } from "./connection";
import type { Session, Analysis, Interview, Message, Report, AgentType } from "@/types";

// Sessions
export function createSession(cvText: string, cvFilename: string, jobUrl: string): Session {
  const db = getDb();
  const id = nanoid();
  const cvHash = crypto.createHash("sha256").update(cvText).digest("hex");
  let companyDomain: string | null = null;
  try {
    companyDomain = new URL(jobUrl).hostname.replace(/^www\./, "");
  } catch { /* invalid URL */ }
  db.prepare(
    `INSERT INTO sessions (id, cv_text, cv_filename, job_url, cv_hash, company_domain) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, cvText, cvFilename, jobUrl, cvHash, companyDomain);
  return getSession(id)!;
}

export function getSession(id: string): Session | null {
  const db = getDb();
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as Session | null;
}

const ALLOWED_SESSION_FIELDS = new Set(["status", "job_title", "company_name", "group_label"]);
const ALLOWED_ANALYSIS_FIELDS = new Set(["status", "result", "error", "started_at", "completed_at", "prompt_tokens", "completion_tokens"]);
const ALLOWED_INTERVIEW_FIELDS = new Set(["status", "current_phase", "question_count", "ended_at", "effective_difficulty"]);

function buildUpdate(updates: Record<string, unknown>, allowed: Set<string>): { fields: string[]; values: unknown[] } {
  const entries = Object.entries(updates).filter(([k, v]) => v !== undefined && allowed.has(k));
  return {
    fields: entries.map(([k]) => `${k} = ?`),
    values: entries.map(([, v]) => v),
  };
}

export function updateSession(id: string, updates: Partial<Pick<Session, "status" | "job_title" | "company_name" | "group_label">>) {
  const db = getDb();
  const { fields, values } = buildUpdate(updates, ALLOWED_SESSION_FIELDS);
  if (fields.length === 0) return;
  db.prepare(`UPDATE sessions SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(
    ...values,
    id
  );
}

export function listSessions(): Session[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC`).all() as Session[];
}

export function getSessionsByGroup(groupId: string): Session[] {
  const db = getDb();
  if (groupId.startsWith("label:")) {
    const label = groupId.slice(6);
    return db.prepare(
      `SELECT * FROM sessions WHERE group_label = ? ORDER BY created_at ASC`
    ).all(label) as Session[];
  }
  if (groupId.startsWith("auto:")) {
    const parts = groupId.slice(5);
    const separatorIdx = parts.indexOf(":");
    const domain = parts.slice(0, separatorIdx);
    const hash = parts.slice(separatorIdx + 1);
    return db.prepare(
      `SELECT * FROM sessions WHERE company_domain = ? AND cv_hash = ? AND group_label IS NULL ORDER BY created_at ASC`
    ).all(domain, hash) as Session[];
  }
  return [];
}

export function deleteSession(id: string) {
  const db = getDb();
  db.transaction(() => {
    // Delete messages via interviews
    db.prepare(`DELETE FROM messages WHERE interview_id IN (SELECT id FROM interviews WHERE session_id = ?)`).run(id);
    db.prepare(`DELETE FROM reports WHERE session_id = ?`).run(id);
    db.prepare(`DELETE FROM interviews WHERE session_id = ?`).run(id);
    db.prepare(`DELETE FROM analyses WHERE session_id = ?`).run(id);
    db.prepare(`DELETE FROM tts_usage WHERE session_id = ?`).run(id);
    db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  })();
}

// Analyses
export function createAnalysis(sessionId: string, agentType: AgentType): Analysis {
  const db = getDb();
  const id = nanoid();
  db.prepare(
    `INSERT INTO analyses (id, session_id, agent_type) VALUES (?, ?, ?)`
  ).run(id, sessionId, agentType);
  return db.prepare(`SELECT * FROM analyses WHERE id = ?`).get(id) as Analysis;
}

export function getAnalysesBySession(sessionId: string): Analysis[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM analyses WHERE session_id = ?`).all(sessionId) as Analysis[];
}

export function updateAnalysis(
  id: string,
  updates: Partial<Pick<Analysis, "status" | "result" | "error" | "started_at" | "completed_at" | "prompt_tokens" | "completion_tokens">>
) {
  const db = getDb();
  const { fields, values } = buildUpdate(updates, ALLOWED_ANALYSIS_FIELDS);
  if (fields.length === 0) return;
  db.prepare(`UPDATE analyses SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
}

export function getAnalysisByType(sessionId: string, agentType: AgentType): Analysis | null {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM analyses WHERE session_id = ? AND agent_type = ?`
  ).get(sessionId, agentType) as Analysis | null;
}

// Interviews
export function createInterview(sessionId: string, difficulty: string = "realistic"): Interview {
  const db = getDb();
  const id = nanoid();
  const effectiveDifficulty = difficulty === "adaptive" ? "realistic" : difficulty;
  db.prepare(
    `INSERT INTO interviews (id, session_id, difficulty, effective_difficulty) VALUES (?, ?, ?, ?)`
  ).run(id, sessionId, difficulty, effectiveDifficulty);
  return db.prepare(`SELECT * FROM interviews WHERE id = ?`).get(id) as Interview;
}

export function getInterviewBySession(sessionId: string): Interview | null {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM interviews WHERE session_id = ? ORDER BY started_at DESC LIMIT 1`
  ).get(sessionId) as Interview | null;
}

export function updateInterview(
  id: string,
  updates: Partial<Pick<Interview, "status" | "current_phase" | "question_count" | "ended_at" | "effective_difficulty">>
) {
  const db = getDb();
  const { fields, values } = buildUpdate(updates, ALLOWED_INTERVIEW_FIELDS);
  if (fields.length === 0) return;
  db.prepare(`UPDATE interviews SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
}

// Messages
export function createMessage(
  interviewId: string,
  role: "interviewer" | "candidate",
  content: string,
  phase: string,
  evaluation?: string,
  tokenUsage?: { prompt_tokens: number; completion_tokens: number },
  qualityScore?: number | null
): Message {
  const db = getDb();
  const id = nanoid();
  db.prepare(
    `INSERT INTO messages (id, interview_id, role, content, phase, evaluation, prompt_tokens, completion_tokens, quality_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, interviewId, role, content, phase, evaluation || null, tokenUsage?.prompt_tokens ?? 0, tokenUsage?.completion_tokens ?? 0, qualityScore ?? null);
  return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as Message;
}

export function getMessagesByInterview(interviewId: string): Message[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM messages WHERE interview_id = ? ORDER BY created_at ASC`
  ).all(interviewId) as Message[];
}

// Reports
export function createReport(
  sessionId: string,
  interviewId: string,
  overallScore: number,
  overallRating: string,
  reportData: string,
  tokenUsage?: { prompt_tokens: number; completion_tokens: number }
): Report {
  const db = getDb();
  const id = nanoid();
  db.prepare(
    `INSERT INTO reports (id, session_id, interview_id, overall_score, overall_rating, report_data, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, sessionId, interviewId, overallScore, overallRating, reportData, tokenUsage?.prompt_tokens ?? 0, tokenUsage?.completion_tokens ?? 0);
  return db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id) as Report;
}

export function getReportBySession(sessionId: string): Report | null {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM reports WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`
  ).get(sessionId) as Report | null;
}

// TTS usage
export function createTtsUsage(sessionId: string, characters: number) {
  const db = getDb();
  db.prepare(
    `INSERT INTO tts_usage (session_id, characters) VALUES (?, ?)`
  ).run(sessionId, characters);
}

export function getSessionTtsUsage(sessionId: string): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COALESCE(SUM(characters), 0) AS total_characters FROM tts_usage WHERE session_id = ?`
  ).get(sessionId) as { total_characters: number };
  return row.total_characters;
}

// Token usage
export function getSessionTokenUsage(sessionId: string): { prompt_tokens: number; completion_tokens: number; total_tokens: number; tts_characters: number } {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COALESCE(a.pt, 0) + COALESCE(m.pt, 0) + COALESCE(r.pt, 0) AS prompt_tokens,
      COALESCE(a.ct, 0) + COALESCE(m.ct, 0) + COALESCE(r.ct, 0) AS completion_tokens
    FROM (SELECT 1) dummy
    LEFT JOIN (SELECT SUM(prompt_tokens) AS pt, SUM(completion_tokens) AS ct FROM analyses WHERE session_id = ?) a ON 1=1
    LEFT JOIN (
      SELECT SUM(m.prompt_tokens) AS pt, SUM(m.completion_tokens) AS ct
      FROM messages m JOIN interviews i ON m.interview_id = i.id WHERE i.session_id = ?
    ) m ON 1=1
    LEFT JOIN (SELECT SUM(prompt_tokens) AS pt, SUM(completion_tokens) AS ct FROM reports WHERE session_id = ?) r ON 1=1
  `).get(sessionId, sessionId, sessionId) as { prompt_tokens: number; completion_tokens: number };
  const ttsCharacters = getSessionTtsUsage(sessionId);
  return {
    prompt_tokens: row.prompt_tokens,
    completion_tokens: row.completion_tokens,
    total_tokens: row.prompt_tokens + row.completion_tokens,
    tts_characters: ttsCharacters,
  };
}
