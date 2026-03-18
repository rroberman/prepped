import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  Session, Report, Analysis, Interview,
  ReportData, AuditorResult, StrategistResult, ProfilerResult,
  DangerZone, FocusArea,
} from "@/types";

vi.mock("@/lib/db/queries", () => ({
  getReportBySession: vi.fn(),
  getAnalysisByType: vi.fn(),
  getInterviewBySession: vi.fn(),
}));

import {
  getReportBySession,
  getAnalysisByType,
  getInterviewBySession,
} from "@/lib/db/queries";
import {
  buildTrends,
  buildDangerZones,
  buildStrengths,
  buildSkillCoverage,
  buildDifficultyBreakdown,
} from "../aggregation";

const mockedGetReport = vi.mocked(getReportBySession);
const mockedGetAnalysis = vi.mocked(getAnalysisByType);
const mockedGetInterview = vi.mocked(getInterviewBySession);

const mockSession = (id: string, overrides = {}): Session => ({
  id, cv_text: "", cv_filename: "", job_url: "", job_title: null,
  company_name: null, status: "completed", created_at: "2024-01-01",
  updated_at: "2024-01-01", cv_hash: null, company_domain: null, group_label: null,
  ...overrides,
});

const mockReport = (data: Partial<ReportData>): Report => ({
  id: "r1", session_id: "s1", interview_id: "i1",
  overall_score: 75, overall_rating: "good",
  report_data: JSON.stringify({
    decision: "hire",
    hire_probability: 75,
    summary: "",
    technical_gaps: [],
    communication_flags: [],
    strengths_demonstrated: [],
    danger_zone_performance: [],
    question_feedback: [],
    final_verdict: "",
    recommendations: [],
    ...data,
  } satisfies ReportData),
  created_at: "2024-01-01",
  prompt_tokens: 0, completion_tokens: 0,
});

const mockAuditorResult = (zones: Partial<DangerZone>[]): Analysis => ({
  id: "a1", session_id: "s1", agent_type: "auditor",
  status: "completed",
  result: JSON.stringify({
    danger_zones: zones.map((z) => ({
      area: z.area ?? "Unknown",
      candidate_has: z.candidate_has ?? "",
      company_needs: z.company_needs ?? "",
      severity: z.severity ?? "medium",
      probing_questions: z.probing_questions ?? [],
    })),
    strengths: [], experience_gaps: [],
    overall_risk_level: "medium", summary: "",
  } satisfies AuditorResult),
  error: null, started_at: null, completed_at: null,
  prompt_tokens: 0, completion_tokens: 0,
});

const mockStrategistResult = (focusAreas: Partial<FocusArea>[]): Analysis => ({
  id: "a2", session_id: "s1", agent_type: "strategist",
  status: "completed",
  result: JSON.stringify({
    interviewer_persona: "", interviewer_tone: "",
    opening_approach: "",
    focus_areas: focusAreas.map((fa) => ({
      topic: fa.topic ?? "", why: fa.why ?? "",
      approach: fa.approach ?? "", follow_up_if_weak: fa.follow_up_if_weak ?? "",
      time_allocation: fa.time_allocation ?? "",
    })),
    red_flag_triggers: [], closing_instructions: "", overall_strategy: "",
  } satisfies StrategistResult),
  error: null, started_at: null, completed_at: null,
  prompt_tokens: 0, completion_tokens: 0,
});

const mockProfilerResult = (skills: string[]): Analysis => ({
  id: "a3", session_id: "s1", agent_type: "profiler",
  status: "completed",
  result: JSON.stringify({
    candidate_name: "Test", seniority_assessment: "",
    career_trajectory: "", career_red_flags: [],
    resume_questions: [], narrative_assessment: "",
    strongest_signal: "", weakest_signal: "",
    years_of_experience: 5, skills_claimed: skills,
  } satisfies ProfilerResult),
  error: null, started_at: null, completed_at: null,
  prompt_tokens: 0, completion_tokens: 0,
});

const mockInterview = (difficulty: string): Interview => ({
  id: "i1", session_id: "s1", status: "completed",
  current_phase: "closing", question_count: 5,
  difficulty: difficulty as Interview["difficulty"],
  started_at: "2024-01-01", ended_at: "2024-01-01",
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("buildTrends", () => {
  it("returns trend per session with report data", () => {
    const sessions = [mockSession("s1"), mockSession("s2")];
    mockedGetReport.mockImplementation((id) =>
      id === "s1" ? mockReport({ decision: "hire", hire_probability: 75 }) : null,
    );
    mockedGetInterview.mockImplementation((id) =>
      id === "s1" ? mockInterview("tough") : null,
    );

    const trends = buildTrends(sessions);

    expect(trends).toHaveLength(2);
    expect(trends[0]).toMatchObject({
      sessionId: "s1", decision: "hire", overallScore: 75, difficulty: "tough",
    });
  });

  it("handles missing report", () => {
    mockedGetReport.mockReturnValue(null);
    mockedGetInterview.mockReturnValue(mockInterview("friendly"));

    const trends = buildTrends([mockSession("s1")]);

    expect(trends[0].decision).toBeNull();
    expect(trends[0].overallScore).toBeNull();
    expect(trends[0].dangerZoneResults).toEqual([]);
  });

  it("defaults difficulty to realistic when no interview", () => {
    mockedGetReport.mockReturnValue(null);
    mockedGetInterview.mockReturnValue(null);

    const trends = buildTrends([mockSession("s1")]);

    expect(trends[0].difficulty).toBe("realistic");
  });
});

describe("buildDangerZones", () => {
  it("counts occurrences across sessions (case-insensitive)", () => {
    const sessions = [mockSession("s1"), mockSession("s2")];
    mockedGetAnalysis.mockImplementation((id) => {
      if (id === "s1") return mockAuditorResult([{ area: "Cloud Gaps" }]);
      if (id === "s2") return mockAuditorResult([{ area: "cloud gaps" }]);
      return null;
    });

    const zones = buildDangerZones(sessions);

    expect(zones).toHaveLength(1);
    expect(zones[0]).toMatchObject({ area: "cloud gaps", count: 2, sessions: 2 });
  });

  it("marks resolved when zone not in most recent session", () => {
    const sessions = [mockSession("s1"), mockSession("s2")];
    mockedGetAnalysis.mockImplementation((id) => {
      if (id === "s1") return mockAuditorResult([{ area: "Old Gap" }, { area: "Persistent" }]);
      if (id === "s2") return mockAuditorResult([{ area: "Persistent" }]);
      return null;
    });

    const zones = buildDangerZones(sessions);

    const old = zones.find((z) => z.area === "old gap");
    const persistent = zones.find((z) => z.area === "persistent");
    expect(old?.resolved).toBe(true);
    expect(persistent?.resolved).toBe(false);
  });

  it("single session: never resolved", () => {
    mockedGetAnalysis.mockReturnValue(mockAuditorResult([{ area: "Gap" }]));

    const zones = buildDangerZones([mockSession("s1")]);

    expect(zones[0].resolved).toBe(false);
  });

  it("sorted by count descending", () => {
    const sessions = [mockSession("s1"), mockSession("s2")];
    mockedGetAnalysis.mockImplementation((id) => {
      if (id === "s1") return mockAuditorResult([{ area: "Rare" }, { area: "Common" }]);
      if (id === "s2") return mockAuditorResult([{ area: "Common" }]);
      return null;
    });

    const zones = buildDangerZones(sessions);

    expect(zones[0].area).toBe("common");
    expect(zones[0].count).toBe(2);
    expect(zones[1].area).toBe("rare");
    expect(zones[1].count).toBe(1);
  });
});

describe("buildStrengths", () => {
  it("filters out strengths appearing only once", () => {
    const sessions = [mockSession("s1"), mockSession("s2")];
    mockedGetReport.mockImplementation((id) => {
      if (id === "s1") return mockReport({ strengths_demonstrated: ["Leadership", "Coding"] });
      if (id === "s2") return mockReport({ strengths_demonstrated: ["leadership"] });
      return null;
    });

    const strengths = buildStrengths(sessions);

    expect(strengths).toHaveLength(1);
    expect(strengths[0]).toMatchObject({ strength: "leadership", count: 2 });
  });

  it("groups case-insensitively", () => {
    const sessions = [mockSession("s1"), mockSession("s2"), mockSession("s3")];
    mockedGetReport.mockImplementation((id) => {
      if (id === "s1") return mockReport({ strengths_demonstrated: ["React"] });
      if (id === "s2") return mockReport({ strengths_demonstrated: ["REACT"] });
      if (id === "s3") return mockReport({ strengths_demonstrated: ["react"] });
      return null;
    });

    const strengths = buildStrengths(sessions);

    expect(strengths).toHaveLength(1);
    expect(strengths[0].count).toBe(3);
  });

  it("sorted by count descending", () => {
    const sessions = [mockSession("s1"), mockSession("s2"), mockSession("s3")];
    mockedGetReport.mockReturnValue(
      mockReport({ strengths_demonstrated: ["A", "B"] }),
    );
    mockedGetReport.mockImplementation((id) => {
      if (id === "s1") return mockReport({ strengths_demonstrated: ["A", "B"] });
      if (id === "s2") return mockReport({ strengths_demonstrated: ["A", "B"] });
      if (id === "s3") return mockReport({ strengths_demonstrated: ["A"] });
      return null;
    });

    const strengths = buildStrengths(sessions);

    expect(strengths[0]).toMatchObject({ strength: "a", count: 3 });
    expect(strengths[1]).toMatchObject({ strength: "b", count: 2 });
  });
});

describe("buildSkillCoverage", () => {
  it("collects skills from strategist and profiler", () => {
    const sessions = [mockSession("s1")];
    mockedGetAnalysis.mockImplementation((_id, type) => {
      if (type === "strategist") return mockStrategistResult([{ topic: "React" }]);
      if (type === "profiler") return mockProfilerResult(["TypeScript"]);
      return null;
    });
    mockedGetReport.mockReturnValue(mockReport({ question_feedback: [] }));

    const coverage = buildSkillCoverage(sessions);

    const skills = coverage.map((c) => c.skill).sort();
    expect(skills).toEqual(["react", "typescript"]);
  });

  it("marks tested when question_feedback contains the skill", () => {
    const sessions = [mockSession("s1")];
    mockedGetAnalysis.mockImplementation((_id, type) => {
      if (type === "strategist") return mockStrategistResult([{ topic: "React" }]);
      if (type === "profiler") return mockProfilerResult(["Node"]);
      return null;
    });
    mockedGetReport.mockReturnValue(mockReport({
      question_feedback: [{
        question: "q", answer: "a", phase: "technical_deep_dive",
        score: 8, verdict: "Strong", analysis: "",
        what_interviewer_was_testing: "React component patterns",
        ideal_response_outline: "",
      }],
    }));

    const coverage = buildSkillCoverage(sessions);

    const react = coverage.find((c) => c.skill === "react");
    const node = coverage.find((c) => c.skill === "node");
    expect(react?.tested).toBe(true);
    expect(react?.scores).toEqual([8]);
    expect(node?.tested).toBe(false);
    expect(node?.scores).toEqual([]);
  });

  it("untested skills included with empty scores", () => {
    const sessions = [mockSession("s1")];
    mockedGetAnalysis.mockImplementation((_id, type) => {
      if (type === "strategist") return mockStrategistResult([]);
      if (type === "profiler") return mockProfilerResult(["Go", "Rust"]);
      return null;
    });
    mockedGetReport.mockReturnValue(mockReport({ question_feedback: [] }));

    const coverage = buildSkillCoverage(sessions);

    expect(coverage).toHaveLength(2);
    for (const c of coverage) {
      expect(c.tested).toBe(false);
      expect(c.scores).toEqual([]);
    }
  });
});

describe("buildDifficultyBreakdown", () => {
  it("groups by difficulty with pass rate", () => {
    const sessions = [mockSession("s1"), mockSession("s2"), mockSession("s3")];
    mockedGetInterview.mockImplementation((id) => {
      if (id === "s1") return mockInterview("friendly");
      if (id === "s2") return mockInterview("friendly");
      if (id === "s3") return mockInterview("tough");
      return null;
    });
    mockedGetReport.mockImplementation((id) => {
      if (id === "s1") return mockReport({ decision: "hire" });
      if (id === "s2") return mockReport({ decision: "no_hire" });
      if (id === "s3") return mockReport({ decision: "strong_hire" });
      return null;
    });

    const breakdown = buildDifficultyBreakdown(sessions);

    const friendly = breakdown.find((b) => b.difficulty === "friendly");
    const tough = breakdown.find((b) => b.difficulty === "tough");
    expect(friendly).toMatchObject({ sessions: 2, passRate: 50 });
    expect(tough).toMatchObject({ sessions: 1, passRate: 100 });
  });

  it("lean_hire counts as pass", () => {
    mockedGetInterview.mockReturnValue(mockInterview("realistic"));
    mockedGetReport.mockReturnValue(mockReport({ decision: "lean_hire" }));

    const breakdown = buildDifficultyBreakdown([mockSession("s1")]);

    expect(breakdown[0].passRate).toBe(100);
  });

  it("lean_no_hire counts as fail", () => {
    mockedGetInterview.mockReturnValue(mockInterview("realistic"));
    mockedGetReport.mockReturnValue(mockReport({ decision: "lean_no_hire" }));

    const breakdown = buildDifficultyBreakdown([mockSession("s1")]);

    expect(breakdown[0].passRate).toBe(0);
  });

  it("maintains friendly → realistic → tough order", () => {
    const sessions = [mockSession("s1"), mockSession("s2"), mockSession("s3")];
    mockedGetInterview.mockImplementation((id) => {
      if (id === "s1") return mockInterview("tough");
      if (id === "s2") return mockInterview("friendly");
      if (id === "s3") return mockInterview("realistic");
      return null;
    });
    mockedGetReport.mockReturnValue(mockReport({ decision: "hire" }));

    const breakdown = buildDifficultyBreakdown(sessions);

    expect(breakdown.map((b) => b.difficulty)).toEqual(["friendly", "realistic", "tough"]);
  });

  it("only includes difficulties that appear", () => {
    mockedGetInterview.mockReturnValue(mockInterview("tough"));
    mockedGetReport.mockReturnValue(mockReport({ decision: "hire" }));

    const breakdown = buildDifficultyBreakdown([mockSession("s1")]);

    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].difficulty).toBe("tough");
  });
});
