"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  status: "pending" | "running" | "completed" | "failed";
  result: unknown | null;
  error: string | null;
  index: number;
  tokens?: { prompt: number; completion: number };
}

const statusConfig = {
  pending: { icon: Clock, color: "text-muted", badge: "default" as const, label: "Waiting" },
  running: { icon: Loader2, color: "text-accent", badge: "accent" as const, label: "Running" },
  completed: { icon: CheckCircle2, color: "text-success", badge: "success" as const, label: "Done" },
  failed: { icon: AlertCircle, color: "text-danger", badge: "danger" as const, label: "Failed" },
};

export function AgentCard({ title, description, icon: Icon, status, result, error, index, tokens }: AgentCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Card
        className={cn(
          "transition-all duration-300",
          status === "running" && "border-accent/30",
          status === "completed" && "border-success/20",
          status === "failed" && "border-danger/20"
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-surface-light", config.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{title}</h3>
              <p className="text-xs text-muted">{description}</p>
            </div>
          </div>
          <Badge variant={config.badge}>
            <StatusIcon className={cn("w-3 h-3 mr-1", status === "running" && "animate-spin")} />
            {config.label}
          </Badge>
        </div>

        {status === "completed" && result != null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 pt-3 border-t border-border"
          >
            <div className="flex items-center justify-between">
              <AgentResultPreview result={result} />
              {tokens && (
                <span className="text-[10px] text-muted flex-shrink-0 ml-3">
                  {(tokens.prompt + tokens.completion).toLocaleString()} tokens
                </span>
              )}
            </div>
          </motion.div>
        )}

        {status === "failed" && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 pt-3 border-t border-border"
          >
            <p className="text-xs text-danger">{error}</p>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

function AgentResultPreview({ result }: { result: unknown }) {
  const data = result as Record<string, unknown>;
  const previewFields: string[] = [];

  if (data.company_name) previewFields.push(`${data.company_name}`);
  if (data.job_title) previewFields.push(`${data.job_title}`);
  if (data.company_stage) previewFields.push(`${data.company_stage}`);
  if (Array.isArray(data.tech_stack)) previewFields.push(`${data.tech_stack.length} technologies`);
  if (Array.isArray(data.recent_news)) previewFields.push(`${data.recent_news.length} news items`);
  if (Array.isArray(data.danger_zones)) previewFields.push(`${data.danger_zones.length} danger zones`);
  if (data.overall_risk_level) previewFields.push(`${(data.overall_risk_level as string).toUpperCase()} risk`);
  if (Array.isArray(data.strengths) && !data.danger_zones) previewFields.push(`${data.strengths.length} strengths`);
  if (data.candidate_name && data.seniority_assessment) previewFields.push(`${data.candidate_name}`);
  if (data.years_of_experience) previewFields.push(`${data.years_of_experience} years exp`);
  if (Array.isArray(data.career_red_flags)) previewFields.push(`${data.career_red_flags.length} red flags`);
  if (data.career_trajectory && !data.interviewer_persona) previewFields.push(`${data.career_trajectory}`);
  if (data.interviewer_persona) {
    const persona = data.interviewer_persona as string;
    previewFields.push(persona.length > 50 ? persona.slice(0, 50) + "..." : persona);
  }
  if (Array.isArray(data.focus_areas)) previewFields.push(`${data.focus_areas.length} focus areas`);
  if (Array.isArray(data.danger_zone_strategies)) previewFields.push(`${data.danger_zone_strategies.length} strategies`);
  if (Array.isArray(data.talking_points)) previewFields.push(`${data.talking_points.length} talking points`);
  if (Array.isArray(data.stories_to_prepare)) previewFields.push(`${data.stories_to_prepare.length} stories to prep`);

  return (
    <div className="flex flex-wrap gap-1.5">
      {previewFields.slice(0, 4).map((field, i) => (
        <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-surface-light text-muted">
          {field}
        </span>
      ))}
    </div>
  );
}
