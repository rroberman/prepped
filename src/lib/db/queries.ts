import { nanoid } from "nanoid";
import { getDb } from "./connection";
import type { Session, Analysis, Interview, Message, Report, AgentType } from "@/types";

// Sessions
export function createSession(cvText: string, cvFilename: string, jobUrl: string): Session {
  const db = getDb();
  const id = nanoid();
  db.prepare(
    `INSERT INTO sessions (id, cv_text, cv_filename, job_url) VALUES (?, ?, ?, ?)`
  ).run(id, cvText, cvFilename, jobUrl);
  return getSession(id)!;
}

export function getSession(id: string): Session | null {
  const db = getDb();
  return db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id) as Session | null;
}

export function updateSession(id: string, updates: Partial<Pick<Session, "status" | "job_title" | "company_name">>) {
  const db = getDb();
  const fields = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  if (fields.length === 0) return;
  const values = Object.values(updates).filter((v) => v !== undefined);
  db.prepare(`UPDATE sessions SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`).run(
    ...values,
    id
  );
}

export function listSessions(): Session[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC`).all() as Session[];
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
  const fields = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  if (fields.length === 0) return;
  const values = Object.values(updates).filter((v) => v !== undefined);
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
  db.prepare(
    `INSERT INTO interviews (id, session_id, difficulty) VALUES (?, ?, ?)`
  ).run(id, sessionId, difficulty);
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
  updates: Partial<Pick<Interview, "status" | "current_phase" | "question_count" | "ended_at">>
) {
  const db = getDb();
  const fields = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  if (fields.length === 0) return;
  const values = Object.values(updates).filter((v) => v !== undefined);
  db.prepare(`UPDATE interviews SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
}

// Messages
export function createMessage(
  interviewId: string,
  role: "interviewer" | "candidate",
  content: string,
  phase: string,
  evaluation?: string,
  tokenUsage?: { prompt_tokens: number; completion_tokens: number }
): Message {
  const db = getDb();
  const id = nanoid();
  db.prepare(
    `INSERT INTO messages (id, interview_id, role, content, phase, evaluation, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, interviewId, role, content, phase, evaluation || null, tokenUsage?.prompt_tokens ?? 0, tokenUsage?.completion_tokens ?? 0);
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
