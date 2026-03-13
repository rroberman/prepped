"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  Shield,
  MessageCircle,
  BookOpen,
  AlertOctagon,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mic,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CoachResult } from "@/types";

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: typeof Lightbulb;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-light transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CoachPrepPanel({ data }: { data: CoachResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            Your Prep Playbook
          </CardTitle>
          <p className="text-sm text-muted mt-1" dir="auto">{data.overall_readiness}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Section title="Your Opening Pitch" icon={Mic} defaultOpen>
            <div className="bg-surface-light rounded-lg p-4">
              <p className="text-xs text-muted mb-1">&quot;Tell me about yourself&quot;</p>
              <p className="text-sm text-foreground/90 leading-relaxed" dir="auto">
                {data.opening_pitch}
              </p>
            </div>
          </Section>

          <Section title={`Danger Zone Strategies (${data.danger_zone_strategies.length})`} icon={Shield}>
            {data.danger_zone_strategies.map((dz, i) => (
              <div key={i} className="bg-surface-light rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="warning">{dz.zone}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-muted font-medium">Strategy:</span>
                    <p className="text-foreground/80" dir="auto">{dz.strategy}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted font-medium">Honest framing:</span>
                    <p className="text-foreground/60 italic" dir="auto">&ldquo;{dz.honest_framing}&rdquo;</p>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          <Section title={`Talking Points (${data.talking_points.length})`} icon={MessageCircle}>
            {data.talking_points.map((tp, i) => (
              <div key={i} className="bg-surface-light rounded-lg p-3">
                <p className="text-sm font-medium text-accent mb-1">{tp.topic}</p>
                <p className="text-sm text-foreground/80" dir="auto">{tp.key_message}</p>
                <p className="text-xs text-muted mt-1" dir="auto">{tp.supporting_evidence}</p>
              </div>
            ))}
          </Section>

          <Section title={`Stories to Prepare (${data.stories_to_prepare.length})`} icon={BookOpen}>
            {data.stories_to_prepare.map((story, i) => (
              <div key={i} className="bg-surface-light rounded-lg p-3">
                <p className="text-sm font-medium mb-1" dir="auto">{story.scenario}</p>
                <p className="text-xs text-accent mb-2" dir="auto">Use: {story.which_experience_to_use}</p>
                <ul className="space-y-1">
                  {(Array.isArray(story.key_points_to_hit) ? story.key_points_to_hit : []).map((point, j) => (
                    <li key={j} className="text-xs text-foreground/70 flex items-start gap-1.5">
                      <span className="text-success mt-0.5">•</span>
                      <span dir="auto">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          <Section title={`Things to Avoid (${data.things_to_avoid.length})`} icon={AlertOctagon}>
            <ul className="space-y-2">
              {data.things_to_avoid.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertOctagon className="w-3.5 h-3.5 text-danger mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80" dir="auto">{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={`Questions to Ask Them (${data.questions_to_ask_them.length})`} icon={HelpCircle}>
            <ul className="space-y-2">
              {data.questions_to_ask_them.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <HelpCircle className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-foreground/80" dir="auto">{q}</span>
                </li>
              ))}
            </ul>
          </Section>
        </CardContent>
      </Card>
    </motion.div>
  );
}
