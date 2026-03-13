import { Radar, ShieldAlert, Crosshair, Gavel, History } from "lucide-react";
import { UploadForm } from "@/components/landing/upload-form";
import Link from "next/link";

const features = [
  {
    icon: Radar,
    title: "The Scout",
    description: "Researches the company's real tech stack, engineering blog, and culture.",
  },
  {
    icon: ShieldAlert,
    title: "The Auditor",
    description: "Cross-references your CV against actual requirements to find danger zones.",
  },
  {
    icon: Crosshair,
    title: "The Strategist",
    description: "Builds a dossier telling the interviewer exactly where to challenge you.",
  },
  {
    icon: Gavel,
    title: "Hiring Committee",
    description: "Delivers a verdict with technical gaps, red flags, and what to improve.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight">prepped</span>
          <Link
            href="/history"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            History
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        <section className="py-24 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4 max-w-2xl leading-[1.15]">
            Practice with an interviewer who{"'"}s{" "}
            <span className="text-accent">done their homework</span>
          </h1>
          <p className="text-muted max-w-lg mb-14 leading-relaxed">
            Upload your CV and a job listing. We{"'"}ll scrape the company, audit your resume,
            find your gaps, and run a realistic mock interview.
          </p>
          <UploadForm />
        </section>

        <section className="pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-xl border border-border hover:border-border-light transition-colors"
              >
                <feature.icon className="w-5 h-5 text-muted mb-3" />
                <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
