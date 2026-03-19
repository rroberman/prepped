/**
 * Hardcoded mock data for the static demo site (GitHub Pages).
 * No API calls, no database — everything is baked in.
 */

import type { ReportData } from "@/types";

export const DEMO_SESSION_ID = "demo";

export const DEMO_SCOUT_RESULT = {
  company_name: "Acme Corp",
  company_summary: "Mid-stage SaaS company building developer tools. Series B, ~200 employees.",
  tech_stack: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker", "Kubernetes"],
  engineering_culture: "Product-driven engineering team. Ship fast, iterate. Code reviews required.",
  recent_news: ["Raised $50M Series B", "Launched new API platform"],
  blog_insights: ["Focus on developer experience", "Moving to microservices architecture"],
  team_structure: "Small cross-functional squads (5-7 people), each owns a product area.",
  interview_process_hints: ["Technical phone screen", "Take-home project", "System design round"],
  company_stage: "Series B startup",
  job_title: "Senior Full-Stack Engineer",
  job_requirements: [
    "5+ years of experience with TypeScript and React",
    "Strong backend experience with Node.js",
    "Experience with PostgreSQL or similar relational databases",
    "AWS infrastructure experience",
    "Experience leading technical projects",
  ],
  job_responsibilities: [
    "Design and implement full-stack features end-to-end",
    "Mentor junior engineers and conduct code reviews",
    "Contribute to system architecture decisions",
    "Improve CI/CD and developer tooling",
  ],
};

export const DEMO_PROFILER_RESULT = {
  candidate_name: "Jane Doe",
  seniority_assessment: "Solid mid-to-senior level. 8 years of experience with clear growth trajectory.",
  career_trajectory: "upward",
  career_red_flags: [] as { flag: string; evidence: string; severity: string }[],
  resume_questions: [
    "What was the scale of the microservice migration at TechStartup?",
    "What specific mentoring approaches did you use?",
  ],
  narrative_assessment: "Coherent progression from agency work to product engineering. Clear specialization in full-stack TypeScript.",
  strongest_signal: "Led a monolith-to-microservices migration — shows architectural ownership.",
  weakest_signal: "No mention of system design at scale or distributed systems experience.",
  years_of_experience: 8,
  skills_claimed: ["TypeScript", "JavaScript", "React", "Node.js", "Python", "PostgreSQL", "Redis", "Docker", "AWS", "Git"],
};

export const DEMO_AUDITOR_RESULT = {
  danger_zones: [
    {
      area: "Kubernetes Experience",
      candidate_has: "Docker experience, no Kubernetes mentioned",
      company_needs: "Kubernetes-based infrastructure",
      severity: "medium",
      probing_questions: [
        "Have you worked with container orchestration beyond Docker Compose?",
        "How would you approach debugging a pod that keeps crashing in Kubernetes?",
      ],
    },
    {
      area: "Scale Experience",
      candidate_has: "Mid-size startup experience",
      company_needs: "Growing platform with scaling challenges",
      severity: "low",
      probing_questions: [
        "What's the highest traffic system you've worked on?",
        "How do you approach performance optimization?",
      ],
    },
  ],
  strengths: [
    {
      area: "Full-Stack TypeScript",
      evidence: "3+ years of TypeScript across frontend and backend",
      relevance: "Direct match with the role's primary tech stack",
    },
    {
      area: "Migration Experience",
      evidence: "Led monolith-to-microservices migration",
      relevance: "Shows architectural thinking and ability to lead technical initiatives",
    },
  ],
  experience_gaps: ["No Kubernetes experience listed", "Limited distributed systems exposure"],
  overall_risk_level: "medium",
  summary: "Strong full-stack match with relevant tech stack. Main gaps are in container orchestration and large-scale systems.",
};

export const DEMO_STRATEGIST_RESULT = {
  interviewer_persona: "Alex Chen, Staff Engineer at Acme Corp. 12 years in the industry, moved from backend to full-stack.",
  interviewer_tone: "Friendly but thorough. Asks follow-up questions. Wants to understand depth, not just breadth.",
  opening_approach: "Start with their microservice migration story — it's their strongest signal and will build confidence before probing gaps.",
  focus_areas: [
    {
      topic: "Microservices Architecture",
      why: "Core to the role and candidate's claimed strength",
      approach: "Ask about specific decisions, tradeoffs, and what they'd do differently",
      follow_up_if_weak: "Probe with a hypothetical: 'If you had to split a monolith serving 10K req/s, where would you start?'",
      time_allocation: "30%",
    },
    {
      topic: "Frontend Architecture",
      why: "Full-stack role requires strong React skills",
      approach: "Ask about state management, performance optimization, component design",
      follow_up_if_weak: "Give a concrete UI scenario and ask how they'd architect it",
      time_allocation: "25%",
    },
    {
      topic: "Infrastructure & DevOps",
      why: "Kubernetes gap needs probing",
      approach: "Ask about their Docker experience and how they'd approach container orchestration",
      follow_up_if_weak: "This is a known gap — assess learning ability rather than current knowledge",
      time_allocation: "20%",
    },
    {
      topic: "Technical Leadership",
      why: "Senior role includes mentoring",
      approach: "Ask about mentoring approach, code review philosophy, handling disagreements",
      follow_up_if_weak: "Ask for a specific example of helping a junior grow",
      time_allocation: "25%",
    },
  ],
  red_flag_triggers: [
    "Cannot explain architectural decisions behind the migration",
    "No concrete examples of mentoring outcomes",
    "Dismisses gaps instead of showing learning attitude",
  ],
  closing_instructions: "End with 'What questions do you have for me about Acme?' — gives insight into their research and priorities.",
  overall_strategy: "Lead with strengths (migration, full-stack), then probe gaps (K8s, scale). Assess learning attitude on gaps rather than expecting expertise.",
};

export const DEMO_COACH_RESULT = {
  overall_readiness: "Well-positioned for this role. Main prep needed around Kubernetes/infrastructure gaps and preparing concrete scale stories.",
  danger_zone_strategies: [
    {
      zone: "Kubernetes Experience",
      strategy: "Be honest about the gap but show enthusiasm for learning. Mention Docker expertise as a foundation.",
      honest_framing: "I haven't worked with Kubernetes in production yet, but I've used Docker extensively and understand container orchestration concepts. I'd be excited to deepen this skill.",
    },
    {
      zone: "Scale Experience",
      strategy: "Frame TechStartup's growth as relevant scale experience, even if not massive.",
      honest_framing: "While I haven't worked at hyperscale, I've dealt with real growth challenges during our migration and learned solid fundamentals around performance and reliability.",
    },
  ],
  talking_points: [
    {
      topic: "Microservice Migration",
      key_message: "Led the migration end-to-end with measurable impact on deploy velocity",
      supporting_evidence: "70% reduction in deploy times, went from monthly to daily deploys",
    },
    {
      topic: "Mentoring",
      key_message: "Structured mentoring that produced measurable growth",
      supporting_evidence: "Mentored 3 juniors, one promoted to mid-level within a year",
    },
  ],
  stories_to_prepare: [
    {
      scenario: "Tell me about a time you had to make a difficult technical decision",
      which_experience_to_use: "Choosing between gradual vs big-bang migration approach at TechStartup",
      key_points_to_hit: ["Evaluated tradeoffs", "Got team buy-in", "Measured results"],
    },
  ],
  things_to_avoid: [
    "Don't oversell Kubernetes knowledge",
    "Don't badmouth previous employers",
    "Don't give vague answers — always use specific examples",
  ],
  opening_pitch: "I'm a full-stack engineer with 8 years of experience, most recently leading a microservices migration at TechStartup. I'm drawn to Acme because of your focus on developer tools — it aligns with my passion for building great developer experiences.",
  questions_to_ask_them: [
    "What does the onboarding look like for new engineers?",
    "How does the team approach technical debt?",
    "What's the biggest engineering challenge you're facing right now?",
  ],
};

export const DEMO_AGENTS = {
  scout: { status: "completed" as const, result: DEMO_SCOUT_RESULT, error: null, prompt_tokens: 1250, completion_tokens: 820 },
  profiler: { status: "completed" as const, result: DEMO_PROFILER_RESULT, error: null, prompt_tokens: 980, completion_tokens: 650 },
  auditor: { status: "completed" as const, result: DEMO_AUDITOR_RESULT, error: null, prompt_tokens: 1100, completion_tokens: 740 },
  strategist: { status: "completed" as const, result: DEMO_STRATEGIST_RESULT, error: null, prompt_tokens: 1400, completion_tokens: 900 },
  coach: { status: "completed" as const, result: DEMO_COACH_RESULT, error: null, prompt_tokens: 1300, completion_tokens: 850 },
};

export const DEMO_INTERVIEW_MESSAGES = [
  {
    id: "demo-msg-1",
    interview_id: "demo-interview",
    role: "interviewer" as const,
    content: "Hi Jane! I'm Alex Chen, a Staff Engineer here at Acme. Thanks for taking the time today. I've had a chance to look over your background, and I'm excited to dig into some of the work you've done — especially that microservices migration at TechStartup. Before we get into the technical stuff, can you give me a quick overview of what you're working on right now and what drew you to Acme?",
    phase: "warmup" as const,
    evaluation: null,
    created_at: "2025-01-15T10:00:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: null,
  },
  {
    id: "demo-msg-2",
    interview_id: "demo-interview",
    role: "candidate" as const,
    content: "Thanks Alex! Right now I'm the senior full-stack engineer at TechStartup where I've been leading our migration from a Django monolith to a Node.js/TypeScript microservices architecture. What drew me to Acme is the focus on developer tools — I've spent a lot of time building internal tooling at TechStartup and I realized that's what I'm most passionate about. The fact that Acme is doing this as a product really excites me.",
    phase: "warmup" as const,
    evaluation: null,
    created_at: "2025-01-15T10:01:30Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: 7,
  },
  {
    id: "demo-msg-3",
    interview_id: "demo-interview",
    role: "interviewer" as const,
    content: "That's great context. Let's dive into that migration — it sounds like a significant undertaking. Can you walk me through the architecture decisions you made? Specifically, how did you decide what to extract first, and what was your strategy for managing the transition period where both the monolith and new services had to coexist?",
    phase: "technical_deep_dive" as const,
    evaluation: null,
    created_at: "2025-01-15T10:02:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: null,
  },
  {
    id: "demo-msg-4",
    interview_id: "demo-interview",
    role: "candidate" as const,
    content: "We took a strangler fig approach. The first thing we extracted was the authentication service because it had the clearest boundaries and every other service would need it. We used an API gateway to route traffic — new endpoints went to microservices, legacy ones stayed on the monolith. For the coexistence period, we set up event-driven communication with a shared message queue so both systems could stay in sync. The hardest part was honestly the data migration — we had to run dual writes for about two months while we verified data consistency. We built a reconciliation tool that compared records nightly and flagged discrepancies.",
    phase: "technical_deep_dive" as const,
    evaluation: null,
    created_at: "2025-01-15T10:04:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: 8,
  },
  {
    id: "demo-msg-5",
    interview_id: "demo-interview",
    role: "interviewer" as const,
    content: "Solid approach with the strangler fig pattern. The dual-write reconciliation is interesting — that's a real-world problem a lot of teams skip. Now, let me shift gears a bit. I noticed your background is strong on Docker but I didn't see much about Kubernetes. Our infrastructure is heavily K8s-based. Can you tell me about your experience with container orchestration and how you'd approach getting up to speed on our stack?",
    phase: "danger_zones" as const,
    evaluation: null,
    created_at: "2025-01-15T10:05:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: null,
  },
  {
    id: "demo-msg-6",
    interview_id: "demo-interview",
    role: "candidate" as const,
    content: "I'll be honest — I haven't used Kubernetes in production. At TechStartup we use Docker Compose for local dev and deploy to AWS ECS, which handles orchestration for us. That said, I understand the core concepts: pods, services, deployments, ingress controllers. I've gone through a few tutorials and deployed a hobby project to a k3s cluster. I think my Docker experience is a strong foundation — I understand containerization, networking, health checks, resource limits. The gap is really in the operational side: debugging pod issues, managing helm charts, setting up monitoring. I'd want to pair with someone experienced on the team for the first few weeks and would probably set up a local minikube environment to practice.",
    phase: "danger_zones" as const,
    evaluation: null,
    created_at: "2025-01-15T10:07:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: 6,
  },
  {
    id: "demo-msg-7",
    interview_id: "demo-interview",
    role: "interviewer" as const,
    content: "I appreciate the honesty and the clear plan for ramping up. Let me give you a system design scenario. Imagine we're building a new feature: a real-time collaborative code editor for our platform. Multiple users can edit the same file simultaneously, similar to Google Docs but for code. How would you approach designing this? Think about the architecture, data flow, and what technologies you'd consider.",
    phase: "system_design" as const,
    evaluation: null,
    created_at: "2025-01-15T10:08:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: null,
  },
  {
    id: "demo-msg-8",
    interview_id: "demo-interview",
    role: "candidate" as const,
    content: "Great question. I'd break this into a few layers. For real-time sync, I'd use CRDTs — specifically something like Yjs or Automerge — rather than OT, because CRDTs handle offline editing and conflict resolution without a central server being the bottleneck. The architecture would have a WebSocket gateway service that maintains connections to all active editors. Each document session would have a room, and the gateway broadcasts operations to all participants. For persistence, I'd use a document store — probably PostgreSQL with JSONB for the document state, plus an append-only operations log for history and undo. The frontend would use CodeMirror 6 with the Yjs binding. For scaling, the WebSocket servers would need to be stateful per-room, so I'd use consistent hashing to route users editing the same file to the same server, with Redis pub/sub for cross-server communication if a room spans multiple instances. The tricky parts would be cursor presence, syntax highlighting performance on large files, and handling reconnection gracefully.",
    phase: "system_design" as const,
    evaluation: null,
    created_at: "2025-01-15T10:12:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: 9,
  },
  {
    id: "demo-msg-9",
    interview_id: "demo-interview",
    role: "interviewer" as const,
    content: "That's a really thorough answer — the CRDT choice is well-reasoned and the scaling considerations show good systems thinking. One last question before we wrap up: you mentioned mentoring three junior developers at TechStartup. What's your philosophy on code reviews? How do you balance being thorough with not blocking your team's velocity?",
    phase: "closing" as const,
    evaluation: null,
    created_at: "2025-01-15T10:13:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: null,
  },
  {
    id: "demo-msg-10",
    interview_id: "demo-interview",
    role: "candidate" as const,
    content: "My approach is to focus reviews on three things: correctness, readability, and architecture — in that order. I try to approve quickly for small, well-scoped changes and save deeper reviews for architectural decisions. For juniors specifically, I try to ask questions rather than prescribe solutions — 'what would happen if this list had 10K items?' teaches more than 'add pagination here.' I also believe in having clear team standards documented so reviews aren't about personal preferences. At TechStartup, we set up an ADR process for architectural decisions and a style guide for common patterns, which reduced review friction significantly. One of the juniors I mentored is now doing reviews himself and his feedback quality is excellent.",
    phase: "closing" as const,
    evaluation: null,
    created_at: "2025-01-15T10:15:00Z",
    prompt_tokens: 0,
    completion_tokens: 0,
    quality_score: 8,
  },
];

export const DEMO_REPORT_DATA: ReportData = {
  decision: "hire" as const,
  hire_probability: 78,
  summary: "Jane demonstrates strong full-stack engineering skills with a clear track record of technical leadership. The microservices migration project shows genuine architectural ownership, and her system design answer revealed solid distributed systems intuition despite limited hands-on scale experience. The Kubernetes gap is real but manageable given her strong container fundamentals and clear learning plan.",
  technical_gaps: [
    {
      area: "Kubernetes / Container Orchestration",
      severity: "moderate",
      detail: "No production Kubernetes experience. Has Docker fundamentals and conceptual understanding, but would need ramp-up time on our K8s infrastructure.",
    },
    {
      area: "Large-Scale Systems",
      severity: "minor",
      detail: "Experience is at mid-stage startup scale. Showed good instincts in system design but hasn't operated systems at our target scale yet.",
    },
  ],
  communication_flags: [
    "Excellent at structuring complex technical explanations",
    "Good at acknowledging gaps without being defensive",
  ],
  strengths_demonstrated: [
    "Deep understanding of migration patterns and data consistency challenges",
    "Strong system design skills — CRDT choice for collaborative editing was well-reasoned",
    "Thoughtful approach to mentoring and code reviews",
    "Honest about gaps while demonstrating clear growth mindset",
    "Good balance of technical depth and practical pragmatism",
  ],
  danger_zone_performance: [
    {
      zone: "Kubernetes Experience",
      result: "partially_passed" as const,
      detail: "Acknowledged the gap honestly, showed Docker expertise as a foundation, and had a concrete plan for ramping up. Not a blocker for hire.",
    },
    {
      zone: "Scale Experience",
      result: "passed" as const,
      detail: "System design answer showed strong intuition about scaling challenges (consistent hashing, pub/sub for cross-server communication) despite limited hands-on experience.",
    },
  ],
  question_feedback: [
    {
      question: "Overview and motivation for joining Acme",
      answer: "Described current role leading microservices migration, expressed genuine interest in developer tools as a product area.",
      phase: "warmup",
      score: 7,
      verdict: "Good opening. Showed genuine interest and clear career narrative. Could have been more specific about what aspects of Acme's product excited her.",
      analysis: "The candidate effectively connected her experience to the role. The mention of internal tooling passion aligning with Acme's product focus was a good signal.",
      what_interviewer_was_testing: "Cultural fit, motivation, communication skills",
      ideal_response_outline: "Specific examples of developer tool problems she's passionate about solving, plus concrete knowledge of Acme's product.",
    },
    {
      question: "Walk through the microservices migration architecture",
      answer: "Detailed strangler fig approach with auth service extraction first, API gateway routing, event-driven communication, and dual-write reconciliation.",
      phase: "technical_deep_dive",
      score: 9,
      verdict: "Excellent. Demonstrated deep architectural thinking with real-world tradeoffs. The reconciliation tool detail was particularly impressive.",
      analysis: "This was the strongest answer of the interview. The candidate showed genuine ownership of a complex project and could articulate specific technical decisions and their reasoning.",
      what_interviewer_was_testing: "Architectural decision-making, ability to handle complexity, real project experience vs theoretical knowledge",
      ideal_response_outline: "Exactly what was delivered — specific pattern choice (strangler fig), clear sequencing rationale, and acknowledgment of the hardest parts.",
    },
    {
      question: "Kubernetes experience and ramp-up plan",
      answer: "Honest about the gap, described Docker expertise as foundation, mentioned hobby K8s project, outlined specific learning plan including pairing.",
      phase: "danger_zones",
      score: 6,
      verdict: "Adequate. The honesty and learning plan were good, but the actual Kubernetes knowledge is thin. Would need team support.",
      analysis: "The candidate handled this well interpersonally but the technical gap is real. The difference between ECS and K8s operational complexity is significant.",
      what_interviewer_was_testing: "Self-awareness, learning ability, honesty about gaps",
      ideal_response_outline: "What was delivered was appropriate for someone with this gap. Ideally would have shown more K8s conceptual depth.",
    },
    {
      question: "System design: real-time collaborative code editor",
      answer: "Proposed CRDT-based architecture with WebSocket gateway, PostgreSQL persistence, CodeMirror 6 frontend, consistent hashing for scaling.",
      phase: "system_design",
      score: 9,
      verdict: "Outstanding. CRDT vs OT tradeoff was well-articulated. Scaling considerations (consistent hashing, Redis pub/sub) showed strong distributed systems thinking.",
      analysis: "This answer significantly exceeded expectations given the candidate's stated limited scale experience. Shows strong theoretical foundations and ability to design for problems she hasn't directly faced.",
      what_interviewer_was_testing: "System design ability, distributed systems knowledge, ability to think through complex problems",
      ideal_response_outline: "The answer covered all expected areas and added depth on scaling that wasn't required.",
    },
    {
      question: "Code review philosophy and mentoring approach",
      answer: "Focuses on correctness, readability, architecture. Uses questions over prescriptions for juniors. Established ADR process and style guide to reduce friction.",
      phase: "closing",
      score: 8,
      verdict: "Strong. Shows mature engineering leadership. The ADR process and measurable mentoring outcomes (junior now doing quality reviews) are great signals.",
      analysis: "The candidate demonstrated a thoughtful, structured approach to technical leadership that aligns well with our team culture.",
      what_interviewer_was_testing: "Leadership style, mentoring ability, team collaboration",
      ideal_response_outline: "Concrete examples of mentoring outcomes and a systematic approach to code review — which is exactly what was delivered.",
    },
  ],
  final_verdict: "Jane is a strong hire for the Senior Full-Stack Engineer position. Her technical depth in TypeScript/React/Node.js is exactly what the role requires, and the migration project demonstrates the kind of architectural ownership we need. The Kubernetes gap is a manageable ramp-up item — her Docker fundamentals and learning attitude suggest she'll get there within the first quarter. The system design answer was particularly impressive and suggests she'll grow into even more complex challenges. I recommend extending an offer.",
  recommendations: [
    "Pair with a senior platform engineer for Kubernetes onboarding during the first month",
    "Start with a feature team rather than infrastructure work to leverage existing strengths",
    "Consider her for the collaborative editing project — her system design answer showed strong intuition",
    "Connect with the mentoring program early — her coaching approach would benefit the team",
  ],
};

export const DEMO_INTERVIEW_META = {
  difficulty: "adaptive" as const,
  effective_difficulty: "tough" as const,
  interviewerScores: [5, 7, 8, 6, 9, 8],
  completedSessionCount: 1,
};

export const DEMO_TOKEN_USAGE = {
  prompt_tokens: 18500,
  completion_tokens: 8200,
  total_tokens: 26700,
  tts_characters: 0,
};

export const DEMO_SESSION = {
  id: DEMO_SESSION_ID,
  cv_text: "",
  cv_filename: "jane-doe-cv.pdf",
  job_url: "https://acme.com/careers/senior-fullstack",
  job_title: "Senior Full-Stack Engineer",
  company_name: "Acme Corp",
  status: "completed" as const,
  created_at: "2025-01-15T09:30:00Z",
  updated_at: "2025-01-15T10:30:00Z",
  cv_hash: "demo-hash",
  company_domain: "acme.com",
  group_label: null,
};

export const DEMO_HISTORY_SESSIONS = [
  {
    ...DEMO_SESSION,
    tokenUsage: DEMO_TOKEN_USAGE,
    interviewDifficulty: "adaptive" as const,
    reportDecision: "hire" as const,
    reportScore: 78,
  },
];
