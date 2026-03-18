import type { ReportData, InterviewDifficulty, SessionGroup } from "@/types";

export interface Hint {
  id: string;
  message: string;
  variant: "info" | "success" | "warning";
}

// --- Landing page hints (needs session count + difficulty history) ---

export interface LandingHintData {
  sessionCount: number;
  difficulties: InterviewDifficulty[];
}

export function getLandingHints(data: LandingHintData): Hint[] {
  const hints: Hint[] = [];

  if (data.sessionCount > 0 && !data.difficulties.includes("adaptive")) {
    hints.push({
      id: "try-adaptive",
      message: "Try Adaptive difficulty — it adjusts in real-time based on your answers.",
      variant: "info",
    });
  }

  return hints;
}

// --- Dashboard/session page hints ---

export interface DashboardHintData {
  sessionCount: number;
  sameCompanyCount: number;
  companyName: string | null;
  lastReportGaps: string[];
  hasUsedVoice: boolean;
}

export function getDashboardHints(data: DashboardHintData): Hint[] {
  const hints: Hint[] = [];

  if (data.sessionCount >= 1 && !data.hasUsedVoice) {
    hints.push({
      id: "try-voice",
      message: "Try voice mode for a more realistic interview experience.",
      variant: "info",
    });
  }

  if (data.sameCompanyCount >= 3 && data.companyName) {
    hints.push({
      id: `check-insights-${data.companyName.toLowerCase().replace(/\s+/g, "-")}`,
      message: `You've practiced for ${data.companyName} ${data.sameCompanyCount} times — check your Insights page for trends.`,
      variant: "info",
    });
  }

  if (data.lastReportGaps.length > 0) {
    const topGap = data.lastReportGaps[0];
    hints.push({
      id: `gap-focus-${topGap.toLowerCase().replace(/\s+/g, "-")}`,
      message: `Last time, the committee flagged a gap in ${topGap} — focus your prep there.`,
      variant: "warning",
    });
  }

  return hints;
}

// --- History page hints (2+ sessions required for performance hints) ---

export interface HistoryHintData {
  sessions: Array<{
    status: string;
    difficulty: InterviewDifficulty;
    decision: string | null;
    score: number | null;
  }>;
  groups: SessionGroup[];
  recurringDangerZones: string[];
}

export function getHistoryHints(data: HistoryHintData): Hint[] {
  const hints: Hint[] = [];
  const completed = data.sessions.filter((s) => s.status === "completed");

  if (completed.length < 2) return hints;

  // All friendly with good outcomes → suggest upgrade
  const friendlySessions = completed.filter((s) => s.difficulty === "friendly");
  const friendlyGood = friendlySessions.filter((s) =>
    s.decision && ["strong_hire", "hire", "lean_hire"].includes(s.decision)
  );
  if (friendlySessions.length >= 2 && friendlyGood.length === friendlySessions.length) {
    hints.push({
      id: "upgrade-from-friendly",
      message: "You're doing well on Friendly — ready to try Realistic or Adaptive?",
      variant: "success",
    });
  }

  // Recurring danger zone
  if (data.recurringDangerZones.length > 0) {
    const zone = data.recurringDangerZones[0];
    hints.push({
      id: `recurring-danger-${zone.toLowerCase().replace(/\s+/g, "-")}`,
      message: `"${zone}" keeps coming up as a gap across interviews — might be worth focused study.`,
      variant: "warning",
    });
  }

  // Improving trend (last 2 completed sessions show score increase)
  const withScores = completed.filter((s) => s.score !== null);
  if (withScores.length >= 2) {
    const last = withScores[withScores.length - 1].score!;
    const prev = withScores[withScores.length - 2].score!;
    if (last > prev) {
      hints.push({
        id: "improving-trend",
        message: "Your scores have been climbing — nice progress!",
        variant: "success",
      });
    }
  }

  // Groups with 2+ sessions that haven't been viewed in insights
  const multiGroups = data.groups.filter((g) => g.sessionCount >= 2);
  if (multiGroups.length > 0) {
    const group = multiGroups[0];
    hints.push({
      id: `insights-nudge-${group.groupId}`,
      message: `You have ${group.sessionCount} sessions for ${group.companyName || "a company"} — check the Insights page for trends.`,
      variant: "info",
    });
  }

  return hints;
}

// --- Report page hints ---

export interface ReportHintData {
  decision: ReportData["decision"];
  difficulty: InterviewDifficulty;
  completedSessionCount: number;
  interviewerScores: number[];
  committeeScores: number[];
}

export function getReportHints(data: ReportHintData): Hint[] {
  const hints: Hint[] = [];

  // First interview nudge
  if (data.completedSessionCount <= 1) {
    hints.push({
      id: "first-interview",
      message: "This is your first interview — try the same company again to see how you improve.",
      variant: "info",
    });
  }

  // Tough mode encouragement
  if (data.difficulty === "tough" && ["lean_no_hire", "no_hire"].includes(data.decision)) {
    hints.push({
      id: "tough-encouragement",
      message: "Tough mode is designed to challenge — don't be discouraged. Check the recommendations below.",
      variant: "info",
    });
  }

  // Score discrepancy — committee rated higher than live
  if (data.interviewerScores.length >= 2 && data.committeeScores.length >= 2) {
    const avgLive = data.interviewerScores.reduce((a, b) => a + b, 0) / data.interviewerScores.length;
    const avgCommittee = data.committeeScores.reduce((a, b) => a + b, 0) / data.committeeScores.length;
    if (avgCommittee - avgLive >= 1.5) {
      hints.push({
        id: "score-discrepancy-positive",
        message: "The committee rated you higher than the interviewer did live — your answers improved in context.",
        variant: "success",
      });
    } else if (avgLive - avgCommittee >= 1.5) {
      hints.push({
        id: "score-discrepancy-negative",
        message: "The interviewer rated you higher live than the committee did — some answers may not have held up under scrutiny.",
        variant: "warning",
      });
    }
  }

  return hints;
}
