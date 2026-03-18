import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgentPipeline } from "../orchestrator";

vi.mock("../scout", () => ({ runScout: vi.fn() }));
vi.mock("../profiler", () => ({ runProfiler: vi.fn() }));
vi.mock("../auditor", () => ({ runAuditor: vi.fn() }));
vi.mock("../strategist", () => ({ runStrategist: vi.fn() }));
vi.mock("../coach", () => ({ runCoach: vi.fn() }));
vi.mock("@/lib/db/queries", () => ({
  getAnalysesBySession: vi.fn(),
  updateAnalysis: vi.fn(),
  updateSession: vi.fn(),
  createAnalysis: vi.fn(),
}));

import { runScout } from "../scout";
import { runProfiler } from "../profiler";
import { runAuditor } from "../auditor";
import { runStrategist } from "../strategist";
import { runCoach } from "../coach";
import {
  getAnalysesBySession,
  updateAnalysis,
  updateSession,
  createAnalysis,
} from "@/lib/db/queries";

const mockScout = vi.mocked(runScout);
const mockProfiler = vi.mocked(runProfiler);
const mockAuditor = vi.mocked(runAuditor);
const mockStrategist = vi.mocked(runStrategist);
const mockCoach = vi.mocked(runCoach);
const mockGetAnalyses = vi.mocked(getAnalysesBySession);
const mockUpdateAnalysis = vi.mocked(updateAnalysis);
const mockUpdateSession = vi.mocked(updateSession);
const mockCreateAnalysis = vi.mocked(createAnalysis);

const SESSION_ID = "sess-1";
const CV_TEXT = "John Doe, Software Engineer, 5 years experience";
const JOB_URL = "https://example.com/jobs/1";

const mockUsage = { prompt_tokens: 100, completion_tokens: 50 };

const mockScoutResult = {
  company_name: "Acme",
  company_summary: "Tech company",
  tech_stack: ["TypeScript"],
  engineering_culture: "Agile",
  recent_news: [],
  blog_insights: [],
  team_structure: "Flat",
  interview_process_hints: [],
  company_stage: "Series B startup",
  job_title: "Engineer",
  job_requirements: ["TypeScript"],
  job_responsibilities: ["Build features"],
};

const mockProfilerResult = {
  candidate_name: "John Doe",
  seniority_assessment: "Mid-level",
  career_trajectory: "upward",
  career_red_flags: [],
  resume_questions: [],
  narrative_assessment: "Coherent",
  strongest_signal: "TypeScript",
  weakest_signal: "No cloud experience",
  years_of_experience: 5,
  skills_claimed: ["TypeScript", "React"],
};

const mockAuditorResult = {
  danger_zones: [],
  strengths: [],
  experience_gaps: [],
  overall_risk_level: "low" as const,
  summary: "Good fit",
};

const mockStrategistResult = {
  interviewer_persona: "Senior Engineer",
  interviewer_tone: "Friendly",
  opening_approach: "Warm up",
  focus_areas: [],
  red_flag_triggers: [],
  closing_instructions: "Thank candidate",
  overall_strategy: "Balanced",
};

const mockCoachResult = {
  overall_readiness: "Ready",
  danger_zone_strategies: [],
  talking_points: [],
  stories_to_prepare: [],
  things_to_avoid: [],
};

const analysisRecords = [
  { id: "a-scout", agent_type: "scout", session_id: SESSION_ID, status: "pending" },
  { id: "a-profiler", agent_type: "profiler", session_id: SESSION_ID, status: "pending" },
  { id: "a-auditor", agent_type: "auditor", session_id: SESSION_ID, status: "pending" },
  { id: "a-strategist", agent_type: "strategist", session_id: SESSION_ID, status: "pending" },
  { id: "a-coach", agent_type: "coach", session_id: SESSION_ID, status: "pending" },
] as never[];

let onProgress: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  onProgress = vi.fn();
  // First call returns empty (no existing), second call returns all records
  mockGetAnalyses.mockReturnValueOnce([]).mockReturnValue(analysisRecords);
});

describe("runAgentPipeline", () => {
  it("happy path — all agents succeed", async () => {
    mockScout.mockResolvedValue({ data: mockScoutResult, usage: mockUsage });
    mockProfiler.mockResolvedValue({ data: mockProfilerResult, usage: mockUsage });
    mockAuditor.mockResolvedValue({ data: mockAuditorResult, usage: mockUsage });
    mockStrategist.mockResolvedValue({ data: mockStrategistResult, usage: mockUsage });
    mockCoach.mockResolvedValue({ data: mockCoachResult, usage: mockUsage });

    await runAgentPipeline(SESSION_ID, CV_TEXT, JOB_URL, onProgress);

    // All 5 agents called
    expect(mockScout).toHaveBeenCalledWith(JOB_URL);
    expect(mockProfiler).toHaveBeenCalledWith(CV_TEXT);
    expect(mockAuditor).toHaveBeenCalledOnce();
    expect(mockStrategist).toHaveBeenCalledOnce();
    expect(mockCoach).toHaveBeenCalledOnce();

    // 5 analysis records created
    expect(mockCreateAnalysis).toHaveBeenCalledTimes(5);

    // Each agent triggers "running" then "completed"
    for (const agent of ["scout", "profiler", "auditor", "strategist", "coach"]) {
      expect(onProgress).toHaveBeenCalledWith(agent, "running");
      expect(onProgress).toHaveBeenCalledWith(
        agent,
        "completed",
        expect.anything(),
        undefined,
        mockUsage
      );
    }

    // Session updated to "analyzing" then "ready"
    expect(mockUpdateSession).toHaveBeenCalledWith(SESSION_ID, { status: "analyzing" });
    expect(mockUpdateSession).toHaveBeenCalledWith(SESSION_ID, { status: "ready" });

    // Session gets job_title and company_name from scout
    expect(mockUpdateSession).toHaveBeenCalledWith(SESSION_ID, {
      job_title: "Engineer",
      company_name: "Acme",
    });
  });

  it("scout failure — auditor, strategist, coach marked failed", async () => {
    mockScout.mockRejectedValue(new Error("Scrape failed"));
    mockProfiler.mockResolvedValue({ data: mockProfilerResult, usage: mockUsage });

    await runAgentPipeline(SESSION_ID, CV_TEXT, JOB_URL, onProgress);

    // Downstream agents marked failed
    for (const agent of ["auditor", "strategist", "coach"]) {
      expect(onProgress).toHaveBeenCalledWith(
        agent,
        "failed",
        undefined,
        "Scout failed — no company intel available"
      );
    }

    // Auditor/Strategist/Coach never called
    expect(mockAuditor).not.toHaveBeenCalled();
    expect(mockStrategist).not.toHaveBeenCalled();
    expect(mockCoach).not.toHaveBeenCalled();

    // Session never set to "ready"
    expect(mockUpdateSession).not.toHaveBeenCalledWith(SESSION_ID, { status: "ready" });
  });

  it("profiler failure, scout succeeds — pipeline continues through wave 3", async () => {
    mockScout.mockResolvedValue({ data: mockScoutResult, usage: mockUsage });
    mockProfiler.mockRejectedValue(new Error("PDF parse error"));
    mockAuditor.mockResolvedValue({ data: mockAuditorResult, usage: mockUsage });
    mockStrategist.mockResolvedValue({ data: mockStrategistResult, usage: mockUsage });
    mockCoach.mockResolvedValue({ data: mockCoachResult, usage: mockUsage });

    await runAgentPipeline(SESSION_ID, CV_TEXT, JOB_URL, onProgress);

    // Auditor called with raw CV text (no profiler enrichment)
    expect(mockAuditor).toHaveBeenCalledWith(CV_TEXT, mockScoutResult);

    // Wave 3 still runs
    expect(mockStrategist).toHaveBeenCalledOnce();
    expect(mockCoach).toHaveBeenCalledOnce();

    // Session reaches "ready"
    expect(mockUpdateSession).toHaveBeenCalledWith(SESSION_ID, { status: "ready" });
  });

  it("auditor failure — strategist and coach marked failed", async () => {
    mockScout.mockResolvedValue({ data: mockScoutResult, usage: mockUsage });
    mockProfiler.mockResolvedValue({ data: mockProfilerResult, usage: mockUsage });
    mockAuditor.mockRejectedValue(new Error("LLM timeout"));

    await runAgentPipeline(SESSION_ID, CV_TEXT, JOB_URL, onProgress);

    // Strategist and Coach marked failed
    for (const agent of ["strategist", "coach"]) {
      expect(onProgress).toHaveBeenCalledWith(
        agent,
        "failed",
        undefined,
        "Auditor failed — cannot build strategy"
      );
    }

    // Wave 3 agents never called
    expect(mockStrategist).not.toHaveBeenCalled();
    expect(mockCoach).not.toHaveBeenCalled();

    // Session never set to "ready"
    expect(mockUpdateSession).not.toHaveBeenCalledWith(SESSION_ID, { status: "ready" });
  });

  it("does not create analysis records that already exist", async () => {
    // First call returns all 5 already existing
    mockGetAnalyses.mockReset();
    mockGetAnalyses
      .mockReturnValueOnce(analysisRecords)
      .mockReturnValue(analysisRecords);

    mockScout.mockResolvedValue({ data: mockScoutResult, usage: mockUsage });
    mockProfiler.mockResolvedValue({ data: mockProfilerResult, usage: mockUsage });
    mockAuditor.mockResolvedValue({ data: mockAuditorResult, usage: mockUsage });
    mockStrategist.mockResolvedValue({ data: mockStrategistResult, usage: mockUsage });
    mockCoach.mockResolvedValue({ data: mockCoachResult, usage: mockUsage });

    await runAgentPipeline(SESSION_ID, CV_TEXT, JOB_URL, onProgress);

    // No createAnalysis calls since all records already exist
    expect(mockCreateAnalysis).not.toHaveBeenCalled();
  });
});
