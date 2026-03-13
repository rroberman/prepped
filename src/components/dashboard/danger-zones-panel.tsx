"use client";

import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AuditorResult } from "@/types";

const severityConfig = {
  critical: { color: "text-danger", bg: "bg-danger/10", badge: "danger" as const },
  high: { color: "text-danger", bg: "bg-danger/10", badge: "danger" as const },
  medium: { color: "text-warning", bg: "bg-warning/10", badge: "warning" as const },
  low: { color: "text-muted", bg: "bg-surface-light", badge: "default" as const },
};

export function DangerZonesPanel({ data }: { data: AuditorResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-danger" />
              Danger Zones
            </div>
            <Badge
              variant={
                data.overall_risk_level === "high" ? "danger" :
                data.overall_risk_level === "medium" ? "warning" : "success"
              }
            >
              {data.overall_risk_level} risk
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted mt-1">{data.summary}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.danger_zones.map((zone, i) => {
              const config = severityConfig[zone.severity];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className={cn("p-4 rounded-lg border border-border", config.bg)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn("w-4 h-4 flex-shrink-0", config.color)} />
                      <span className="font-medium text-sm">{zone.area}</span>
                    </div>
                    <Badge variant={config.badge}>{zone.severity}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                    <div>
                      <span className="text-muted">You have:</span>
                      <p className="text-foreground/80">{zone.candidate_has}</p>
                    </div>
                    <div>
                      <span className="text-muted">They need:</span>
                      <p className={config.color}>{zone.company_needs}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {data.strengths.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Your Strengths
              </h4>
              <div className="space-y-2">
                {data.strengths.map((s, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-success font-medium">{s.area}</span>
                    <span className="text-muted"> — {s.relevance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
