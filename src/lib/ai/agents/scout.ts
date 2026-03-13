import { jsonCompletion } from "../llm-client";
import { scrapeJobUrl, scrapeCompanyContext } from "@/lib/scraper/job-scraper";
import type { ScoutResult, TokenUsage } from "@/types";

export async function runScout(jobUrl: string): Promise<{ data: ScoutResult; usage: TokenUsage }> {
  // Scrape in parallel: job posting + company context
  const [jobText, companyContext] = await Promise.all([
    scrapeJobUrl(jobUrl),
    scrapeCompanyContext(jobUrl),
  ]);

  const systemPrompt = `You are "The Scout" — a technical intelligence agent. Your job is to extract factual information from a job posting and company pages for interview preparation.

You are given:
1. The raw text from the job posting
2. The company's homepage, about page, and engineering blog/content

CRITICAL RULES — READ CAREFULLY:
- The JOB POSTING is your PRIMARY source of truth. Everything about the role (requirements, tech stack, responsibilities) must come from what is EXPLICITLY STATED in the job posting text.
- Do NOT add technologies, skills, or requirements that are not mentioned in the job posting. If the job posting doesn't mention a specific programming language, framework, or tool, do NOT include it — even if the company is famously known for it.
- The company pages (homepage, about, blog) are ONLY for understanding company context (culture, stage, size, general domain). Do NOT use them to infer job-specific technical requirements.
- If a field has no supporting evidence in the provided text, use an empty array or "Not specified" — never fabricate.

Return a JSON object:
- company_name: string
- company_summary: string (2-3 sentences — what they do, how big, what stage)
- tech_stack: string[] (ONLY technologies explicitly mentioned in the job posting text)
- engineering_culture: string (based on company pages — what kind of org is this?)
- recent_news: string[] (anything notable from their content — or empty array if nothing found)
- blog_insights: string[] (technical topics from their blog — or empty array if not available)
- team_structure: string (based on available evidence, or "Not specified")
- interview_process_hints: string[] (ONLY if explicitly mentioned — never guess)
- company_stage: string (e.g., "Early-stage startup", "Series B scale-up", "Public enterprise")
- job_title: string (exact title from the posting)
- job_requirements: string[] (skills/experience explicitly listed in the posting)
- job_responsibilities: string[] (duties explicitly listed in the posting)

Return ONLY valid JSON.`;

  const userPrompt = `JOB POSTING TEXT:
${jobText}

COMPANY HOMEPAGE:
${companyContext.homepage || "(could not scrape)"}

COMPANY ABOUT PAGE:
${companyContext.about || "(could not scrape)"}

ENGINEERING BLOG / CONTENT:
${companyContext.engineering || "(could not scrape)"}`;

  return jsonCompletion<ScoutResult>(systemPrompt, userPrompt, {
    temperature: 0.1,
    maxTokens: 2500,
  }) as Promise<{ data: ScoutResult; usage: TokenUsage }>;
}
