"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MessageSquare, Lightbulb, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuestionFeedback } from "@/types";

interface QuestionCardProps {
  feedback: QuestionFeedback;
  index: number;
  forceExpanded?: boolean;
  interviewerScore?: number | null;
}

const verdictConfig = {
  Strong: { variant: "success" as const },
  Adequate: { variant: "accent" as const },
  Concerning: { variant: "warning" as const },
  "Red Flag": { variant: "danger" as const },
};

export function QuestionCard({ feedback, index, forceExpanded, interviewerScore }: QuestionCardProps) {
  const [expanded, setExpanded] = useState(forceExpanded ?? false);

  const scoreVariant = feedback.score >= 7 ? "success" : feedback.score >= 5 ? "warning" : "danger";
  const interviewerScoreVariant = interviewerScore != null
    ? (interviewerScore >= 7 ? "success" : interviewerScore >= 5 ? "warning" : "danger")
    : null;
  const vc = verdictConfig[feedback.verdict as keyof typeof verdictConfig] || { variant: "default" as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-start justify-between gap-4 text-left cursor-pointer"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="accent">{feedback.phase}</Badge>
              {interviewerScore != null && interviewerScoreVariant && (
                <Badge variant={interviewerScoreVariant} title="Interviewer's real-time assessment of your answer">
                  Live: {interviewerScore}/10
                </Badge>
              )}
              <Badge variant={scoreVariant} title="Hiring committee's retrospective assessment">
                Committee: {feedback.score}/10
              </Badge>
              <Badge variant={vc.variant}>{feedback.verdict}</Badge>
            </div>
            <p className="text-sm font-medium" dir="auto">{feedback.question}</p>
          </div>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-muted flex-shrink-0 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {(expanded || forceExpanded) && (
            <motion.div
              initial={forceExpanded ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 border-t border-border pt-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Your Answer
                  </div>
                  <p className="text-sm text-foreground/80 bg-surface-light rounded-lg p-3" dir="auto">
                    {feedback.answer}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                    <Eye className="w-3.5 h-3.5" />
                    What the Interviewer Was Testing
                  </div>
                  <p className="text-sm text-accent-light" dir="auto">{feedback.what_interviewer_was_testing}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
                    Analysis
                  </div>
                  <p className="text-sm" dir="auto">{feedback.analysis}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs text-accent mb-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    What a Strong Answer Would Cover
                  </div>
                  <p className="text-sm text-foreground/80 bg-accent/5 border border-accent/10 rounded-lg p-3" dir="auto">
                    {feedback.ideal_response_outline}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
