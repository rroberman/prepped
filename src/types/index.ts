export interface Session {
  id: string;
  cv_text: string;
  cv_filename: string;
  job_url: string;
  job_title: string | null;
  company_name: string | null;
  status: "pending" | "analyzing" | "ready" | "interviewing" | "completed";
  created_at: string;
  updated_at: string;
  cv_hash: string | null;
  company_domain: string | null;
  group_label: string | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export interface Analysis {
  id: string;
  session_id: string;
  agent_type: AgentType;
  status: "pending" | "running" | "completed" | "failed";
  result: string | null; // JSON string
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  prompt_tokens: number;
  completion_tokens: number;
}

export type AgentType = "scout" | "profiler" | "auditor" | "strategist" | "coach";

export type InterviewDifficulty = "friendly" | "realistic" | "tough";

export interface Interview {
  id: string;
  session_id: string;
  status: "active" | "completed";
  current_phase: InterviewPhase;
  question_count: number;
  difficulty: InterviewDifficulty;
  started_at: string;
  ended_at: string | null;
}

export type InterviewPhase =
  | "warmup"
  | "technical_deep_dive"
  | "danger_zones"
  | "system_design"
  | "closing";

export interface Message {
  id: string;
  interview_id: string;
  role: "interviewer" | "candidate";
  content: string;
  phase: InterviewPhase;
  evaluation: string | null;
  created_at: string;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface Report {
  id: string;
  session_id: string;
  interview_id: string;
  overall_score: number;
  overall_rating: string;
  report_data: string; // JSON
  created_at: string;
  prompt_tokens: number;
  completion_tokens: number;
}

// --- Agent Result Types ---

export interface ScoutResult {
  company_name: string;
  company_summary: string;
  tech_stack: string[];
  engineering_culture: string;
  recent_news: string[];
  blog_insights: string[];
  team_structure: string;
  interview_process_hints: string[];
  company_stage: string; // e.g. "Series B startup", "Public enterprise"
  job_title: string;
  job_requirements: string[];
  job_responsibilities: string[];
}

export interface AuditorResult {
  danger_zones: DangerZone[];
  strengths: CandidateStrength[];
  experience_gaps: string[];
  overall_risk_level: "low" | "medium" | "high";
  summary: string;
}

export interface DangerZone {
  area: string; // e.g. "Cloud Platform Mismatch"
  candidate_has: string; // e.g. "Azure experience"
  company_needs: string; // e.g. "AWS-heavy infrastructure"
  severity: "low" | "medium" | "high" | "critical";
  probing_questions: string[]; // questions the interviewer should ask
}

export interface CandidateStrength {
  area: string;
  evidence: string;
  relevance: string; // why it matters for this role
}

export interface StrategistResult {
  interviewer_persona: string; // e.g. "Senior DevOps Lead, 10 years at company"
  interviewer_tone: string; // e.g. "Friendly but skeptical, technically precise"
  opening_approach: string;
  focus_areas: FocusArea[];
  red_flag_triggers: string[]; // what should raise concern during interview
  closing_instructions: string;
  overall_strategy: string;
}

export interface FocusArea {
  topic: string;
  why: string; // why this matters for the role
  approach: string; // how to probe this area
  follow_up_if_weak: string; // what to do if candidate struggles
  time_allocation: string; // e.g. "25% of interview"
}

export interface ProfilerResult {
  candidate_name: string;
  seniority_assessment: string; // e.g. "Claims senior, evidence suggests strong mid-level"
  career_trajectory: string; // upward, lateral, stagnant, pivot
  career_red_flags: CareerRedFlag[];
  resume_questions: string[]; // questions the resume itself invites
  narrative_assessment: string; // is their story coherent?
  strongest_signal: string; // single most impressive thing
  weakest_signal: string; // single most concerning thing
  years_of_experience: number;
  skills_claimed: string[];
}

export interface CareerRedFlag {
  flag: string; // e.g. "Job hopping", "Title inflation"
  evidence: string;
  severity: "low" | "medium" | "high";
}

export interface CoachResult {
  overall_readiness: string; // paragraph assessment
  danger_zone_strategies: DangerZoneStrategy[];
  talking_points: TalkingPoint[];
  stories_to_prepare: StoryPrompt[];
  things_to_avoid: string[];
  opening_pitch: string; // how to answer "tell me about yourself"
  questions_to_ask_them: string[];
}

export interface DangerZoneStrategy {
  zone: string;
  strategy: string; // how to handle it if asked
  honest_framing: string; // how to admit the gap without killing yourself
}

export interface TalkingPoint {
  topic: string;
  key_message: string;
  supporting_evidence: string;
}

export interface StoryPrompt {
  scenario: string; // "Tell me about a time you..."
  which_experience_to_use: string;
  key_points_to_hit: string[];
}

// --- Report Types ---

export interface QuestionFeedback {
  question: string;
  answer: string;
  phase: InterviewPhase;
  score: number;
  verdict: string; // e.g. "Strong", "Concerning", "Red Flag"
  analysis: string;
  what_interviewer_was_testing: string;
  ideal_response_outline: string;
}

export interface ReportData {
  decision: "strong_hire" | "hire" | "lean_hire" | "lean_no_hire" | "no_hire";
  hire_probability: number; // 0-100
  summary: string;
  technical_gaps: TechnicalGap[];
  communication_flags: string[];
  strengths_demonstrated: string[];
  danger_zone_performance: DangerZoneVerdict[];
  question_feedback: QuestionFeedback[];
  final_verdict: string; // paragraph, the "hiring committee" narrative
  recommendations: string[]; // what to study/improve
}

export interface TechnicalGap {
  area: string;
  severity: "minor" | "moderate" | "major";
  detail: string;
}

export interface DangerZoneVerdict {
  zone: string;
  result: "passed" | "partially_passed" | "failed";
  detail: string;
}

// --- Cross-Session Insights Types ---

export type HireDecision = "strong_hire" | "hire" | "lean_hire" | "lean_no_hire" | "no_hire";

export const DECISION_RANK: Record<HireDecision, number> = {
  strong_hire: 5,
  hire: 4,
  lean_hire: 3,
  lean_no_hire: 2,
  no_hire: 1,
};

export interface SessionGroup {
  groupId: string;
  companyName: string | null;
  company_domain: string | null;
  cvHash: string | null;
  groupLabel: string | null;
  sessionCount: number;
  dateRange: { first: string; last: string };
  bestOutcome: HireDecision | null;
}

export interface DangerZoneFrequency {
  area: string;
  count: number;
  sessions: number;
  resolved: boolean;
}

export interface StrengthFrequency {
  strength: string;
  count: number;
}

export interface SkillCoverage {
  skill: string;
  tested: boolean;
  scores: number[];
}

export interface SessionTrend {
  sessionId: string;
  date: string;
  difficulty: InterviewDifficulty;
  decision: HireDecision | null;
  overallScore: number | null;
  dangerZoneResults: DangerZoneVerdict[];
}

export interface DifficultyBreakdown {
  difficulty: InterviewDifficulty;
  sessions: number;
  passRate: number;
}

export interface GroupInsights {
  group: SessionGroup;
  trends: SessionTrend[];
  dangerZones: DangerZoneFrequency[];
  strengths: StrengthFrequency[];
  skillCoverage: SkillCoverage[];
  difficultyBreakdown: DifficultyBreakdown[];
}

// SSE event types
export interface AgentProgressEvent {
  agent_type: AgentType;
  status: "running" | "completed" | "failed";
  result?: unknown;
  error?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
}
