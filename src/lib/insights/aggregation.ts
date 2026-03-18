import {
  getReportBySession, getAnalysisByType, getInterviewBySession,
} from "@/lib/db/queries";
import type {
  Session, ReportData, AuditorResult, StrategistResult, ProfilerResult,
  SessionTrend, DangerZoneFrequency, StrengthFrequency,
  SkillCoverage, DifficultyBreakdown, HireDecision, InterviewDifficulty,
} from "@/types";

function parseJson<T>(json: string | null): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function getReportData(sessionId: string): ReportData | null {
  const report = getReportBySession(sessionId);
  return report ? parseJson<ReportData>(report.report_data) : null;
}

function getAgentResult<T>(
  sessionId: string,
  agentType: "auditor" | "profiler" | "strategist",
): T | null {
  const analysis = getAnalysisByType(sessionId, agentType);
  return analysis ? parseJson<T>(analysis.result) : null;
}

export function buildTrends(sessions: Session[]): SessionTrend[] {
  return sessions.map((session) => {
    const reportData = getReportData(session.id);
    const interview = getInterviewBySession(session.id);
    return {
      sessionId: session.id,
      date: session.created_at,
      difficulty: (interview?.difficulty ?? "realistic") as InterviewDifficulty,
      decision: reportData?.decision ?? null,
      overallScore: reportData ? reportData.hire_probability : null,
      dangerZoneResults: reportData?.danger_zone_performance ?? [],
    };
  });
}

export function buildDangerZones(sessions: Session[]): DangerZoneFrequency[] {
  const zoneMap = new Map<
    string,
    { count: number; firstSeen: number; lastSeen: number }
  >();

  sessions.forEach((session, idx) => {
    const auditor = getAgentResult<AuditorResult>(session.id, "auditor");
    if (!auditor) return;
    for (const dz of auditor.danger_zones) {
      const key = normalize(dz.area);
      const existing = zoneMap.get(key);
      if (existing) {
        existing.count++;
        existing.lastSeen = idx;
      } else {
        zoneMap.set(key, { count: 1, firstSeen: idx, lastSeen: idx });
      }
    }
  });

  const totalSessions = sessions.length;
  return Array.from(zoneMap.entries())
    .map(([area, data]) => ({
      area,
      count: data.count,
      sessions: totalSessions,
      resolved: data.lastSeen < totalSessions - 1 && totalSessions > 1,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildStrengths(sessions: Session[]): StrengthFrequency[] {
  const strengthMap = new Map<string, number>();

  for (const session of sessions) {
    const reportData = getReportData(session.id);
    if (!reportData) continue;
    for (const s of reportData.strengths_demonstrated) {
      const key = normalize(s);
      strengthMap.set(key, (strengthMap.get(key) ?? 0) + 1);
    }
  }

  return Array.from(strengthMap.entries())
    .filter(([, count]) => count >= 2)
    .map(([strength, count]) => ({ strength, count }))
    .sort((a, b) => b.count - a.count);
}

export function buildSkillCoverage(sessions: Session[]): SkillCoverage[] {
  const skillSet = new Set<string>();

  for (const session of sessions) {
    const strategist = getAgentResult<StrategistResult>(
      session.id, "strategist",
    );
    if (strategist) {
      for (const fa of strategist.focus_areas) {
        skillSet.add(normalize(fa.topic));
      }
    }
    const profiler = getAgentResult<ProfilerResult>(session.id, "profiler");
    if (profiler) {
      for (const skill of profiler.skills_claimed) {
        skillSet.add(normalize(skill));
      }
    }
  }

  const skillScores = new Map<string, number[]>();
  for (const skill of skillSet) skillScores.set(skill, []);

  for (const session of sessions) {
    const reportData = getReportData(session.id);
    if (!reportData) continue;
    for (const qf of reportData.question_feedback) {
      const testing = normalize(qf.what_interviewer_was_testing);
      for (const skill of skillSet) {
        if (testing.includes(skill)) {
          skillScores.get(skill)!.push(qf.score);
        }
      }
    }
  }

  return Array.from(skillSet)
    .map((skill) => ({
      skill,
      tested: skillScores.get(skill)!.length > 0,
      scores: skillScores.get(skill)!,
    }))
    .sort((a, b) => (a.tested === b.tested ? 0 : a.tested ? -1 : 1));
}

export function buildDifficultyBreakdown(
  sessions: Session[],
): DifficultyBreakdown[] {
  const byDifficulty = new Map<
    InterviewDifficulty,
    { total: number; passed: number }
  >();
  const passingDecisions = new Set<HireDecision>([
    "strong_hire", "hire", "lean_hire",
  ]);

  for (const session of sessions) {
    const interview = getInterviewBySession(session.id);
    const difficulty = (interview?.difficulty ?? "realistic") as InterviewDifficulty;
    const reportData = getReportData(session.id);

    const entry = byDifficulty.get(difficulty) ?? { total: 0, passed: 0 };
    entry.total++;
    if (reportData && passingDecisions.has(reportData.decision)) {
      entry.passed++;
    }
    byDifficulty.set(difficulty, entry);
  }

  const order: InterviewDifficulty[] = ["friendly", "realistic", "tough"];
  return order
    .filter((d) => byDifficulty.has(d))
    .map((difficulty) => {
      const data = byDifficulty.get(difficulty)!;
      return {
        difficulty,
        sessions: data.total,
        passRate: data.total > 0
          ? Math.round((data.passed / data.total) * 100)
          : 0,
      };
    });
}
