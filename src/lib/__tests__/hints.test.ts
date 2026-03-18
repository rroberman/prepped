import { describe, it, expect } from "vitest";
import {
  getLandingHints,
  getDashboardHints,
  getHistoryHints,
  getReportHints,
} from "../hints";

describe("getLandingHints", () => {
  it("suggests adaptive when user has sessions but never tried it", () => {
    const hints = getLandingHints({ sessionCount: 3, difficulties: ["friendly", "realistic"] });
    expect(hints).toHaveLength(1);
    expect(hints[0].id).toBe("try-adaptive");
  });

  it("returns nothing when user has no sessions", () => {
    const hints = getLandingHints({ sessionCount: 0, difficulties: [] });
    expect(hints).toHaveLength(0);
  });

  it("returns nothing when user already tried adaptive", () => {
    const hints = getLandingHints({ sessionCount: 2, difficulties: ["adaptive"] });
    expect(hints).toHaveLength(0);
  });
});

describe("getDashboardHints", () => {
  it("suggests voice mode when not used", () => {
    const hints = getDashboardHints({
      sessionCount: 1,
      sameCompanyCount: 0,
      companyName: null,
      lastReportGaps: [],
      hasUsedVoice: false,
    });
    expect(hints.some((h) => h.id === "try-voice")).toBe(true);
  });

  it("does not suggest voice mode if already used", () => {
    const hints = getDashboardHints({
      sessionCount: 1,
      sameCompanyCount: 0,
      companyName: null,
      lastReportGaps: [],
      hasUsedVoice: true,
    });
    expect(hints.some((h) => h.id === "try-voice")).toBe(false);
  });

  it("nudges to check insights for 3+ same company sessions", () => {
    const hints = getDashboardHints({
      sessionCount: 5,
      sameCompanyCount: 3,
      companyName: "Acme Corp",
      lastReportGaps: [],
      hasUsedVoice: true,
    });
    expect(hints.some((h) => h.id.startsWith("check-insights-"))).toBe(true);
    expect(hints.find((h) => h.id.startsWith("check-insights-"))!.message).toContain("Acme Corp");
  });

  it("warns about last report gaps", () => {
    const hints = getDashboardHints({
      sessionCount: 2,
      sameCompanyCount: 0,
      companyName: null,
      lastReportGaps: ["Kubernetes", "AWS"],
      hasUsedVoice: true,
    });
    expect(hints.some((h) => h.id.startsWith("gap-focus-"))).toBe(true);
    expect(hints.find((h) => h.id.startsWith("gap-focus-"))!.message).toContain("Kubernetes");
  });
});

describe("getHistoryHints", () => {
  it("returns nothing with fewer than 2 completed sessions", () => {
    const hints = getHistoryHints({
      sessions: [{ status: "completed", difficulty: "friendly", decision: "hire", score: 8 }],
      groups: [],
      recurringDangerZones: [],
    });
    expect(hints).toHaveLength(0);
  });

  it("suggests difficulty upgrade when all friendly sessions are good", () => {
    const hints = getHistoryHints({
      sessions: [
        { status: "completed", difficulty: "friendly", decision: "hire", score: 8 },
        { status: "completed", difficulty: "friendly", decision: "strong_hire", score: 9 },
      ],
      groups: [],
      recurringDangerZones: [],
    });
    expect(hints.some((h) => h.id === "upgrade-from-friendly")).toBe(true);
  });

  it("does not suggest upgrade when mixed difficulties", () => {
    const hints = getHistoryHints({
      sessions: [
        { status: "completed", difficulty: "friendly", decision: "hire", score: 8 },
        { status: "completed", difficulty: "realistic", decision: "hire", score: 7 },
      ],
      groups: [],
      recurringDangerZones: [],
    });
    expect(hints.some((h) => h.id === "upgrade-from-friendly")).toBe(false);
  });

  it("warns about recurring danger zones", () => {
    const hints = getHistoryHints({
      sessions: [
        { status: "completed", difficulty: "realistic", decision: "lean_hire", score: 6 },
        { status: "completed", difficulty: "realistic", decision: "lean_hire", score: 6 },
      ],
      groups: [],
      recurringDangerZones: ["Kubernetes"],
    });
    expect(hints.some((h) => h.id.startsWith("recurring-danger-"))).toBe(true);
  });

  it("shows improving trend when scores increase", () => {
    const hints = getHistoryHints({
      sessions: [
        { status: "completed", difficulty: "realistic", decision: "lean_hire", score: 5 },
        { status: "completed", difficulty: "realistic", decision: "hire", score: 8 },
      ],
      groups: [],
      recurringDangerZones: [],
    });
    expect(hints.some((h) => h.id === "improving-trend")).toBe(true);
  });

  it("does not show improving trend when scores decline", () => {
    const hints = getHistoryHints({
      sessions: [
        { status: "completed", difficulty: "realistic", decision: "hire", score: 8 },
        { status: "completed", difficulty: "realistic", decision: "lean_hire", score: 5 },
      ],
      groups: [],
      recurringDangerZones: [],
    });
    expect(hints.some((h) => h.id === "improving-trend")).toBe(false);
  });
});

describe("getReportHints", () => {
  it("shows first interview nudge", () => {
    const hints = getReportHints({
      decision: "hire",
      difficulty: "realistic",
      completedSessionCount: 1,
      interviewerScores: [],
      committeeScores: [],
    });
    expect(hints.some((h) => h.id === "first-interview")).toBe(true);
  });

  it("does not show first interview nudge after multiple sessions", () => {
    const hints = getReportHints({
      decision: "hire",
      difficulty: "realistic",
      completedSessionCount: 3,
      interviewerScores: [],
      committeeScores: [],
    });
    expect(hints.some((h) => h.id === "first-interview")).toBe(false);
  });

  it("encourages on tough mode failure", () => {
    const hints = getReportHints({
      decision: "no_hire",
      difficulty: "tough",
      completedSessionCount: 2,
      interviewerScores: [],
      committeeScores: [],
    });
    expect(hints.some((h) => h.id === "tough-encouragement")).toBe(true);
  });

  it("does not encourage on tough mode success", () => {
    const hints = getReportHints({
      decision: "hire",
      difficulty: "tough",
      completedSessionCount: 2,
      interviewerScores: [],
      committeeScores: [],
    });
    expect(hints.some((h) => h.id === "tough-encouragement")).toBe(false);
  });

  it("shows positive score discrepancy hint", () => {
    const hints = getReportHints({
      decision: "hire",
      difficulty: "realistic",
      completedSessionCount: 2,
      interviewerScores: [4, 5, 4, 5],
      committeeScores: [7, 7, 6, 7],
    });
    expect(hints.some((h) => h.id === "score-discrepancy-positive")).toBe(true);
  });

  it("shows negative score discrepancy hint", () => {
    const hints = getReportHints({
      decision: "lean_no_hire",
      difficulty: "realistic",
      completedSessionCount: 2,
      interviewerScores: [8, 7, 8, 7],
      committeeScores: [5, 5, 5, 5],
    });
    expect(hints.some((h) => h.id === "score-discrepancy-negative")).toBe(true);
  });
});
