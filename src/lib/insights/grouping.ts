import { listSessions, getReportBySession } from "@/lib/db/queries";
import type { Session, SessionGroup, ReportData, HireDecision } from "@/types";
import { DECISION_RANK } from "@/types";

function buildGroupId(session: Session): string {
  if (session.group_label) return `label:${session.group_label}`;
  if (session.company_domain && session.cv_hash) {
    return `auto:${session.company_domain}:${session.cv_hash}`;
  }
  return `auto:unknown:${session.id}`;
}

function getBestOutcome(sessions: Session[]): HireDecision | null {
  let best: HireDecision | null = null;
  let bestRank = 0;
  for (const session of sessions) {
    const report = getReportBySession(session.id);
    if (!report) continue;
    try {
      const data = JSON.parse(report.report_data) as ReportData;
      const rank = DECISION_RANK[data.decision] ?? 0;
      if (rank > bestRank) {
        bestRank = rank;
        best = data.decision;
      }
    } catch { /* invalid JSON */ }
  }
  return best;
}

export function getSessionGroups(): SessionGroup[] {
  const sessions = listSessions();
  const groupMap = new Map<string, Session[]>();

  for (const session of sessions) {
    const groupId = buildGroupId(session);
    const group = groupMap.get(groupId);
    if (group) group.push(session);
    else groupMap.set(groupId, [session]);
  }

  const groups: SessionGroup[] = [];
  for (const [groupId, groupSessions] of groupMap) {
    const sorted = groupSessions.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    groups.push({
      groupId,
      companyName: sorted[0].company_name,
      company_domain: sorted[0].company_domain,
      cvHash: sorted[0].cv_hash,
      groupLabel: sorted[0].group_label,
      sessionCount: sorted.length,
      dateRange: {
        first: sorted[0].created_at,
        last: sorted[sorted.length - 1].created_at,
      },
      bestOutcome: getBestOutcome(sorted),
    });
  }

  return groups.sort((a, b) => {
    if (a.sessionCount > 1 && b.sessionCount <= 1) return -1;
    if (b.sessionCount > 1 && a.sessionCount <= 1) return 1;
    return new Date(b.dateRange.last).getTime() - new Date(a.dateRange.last).getTime();
  });
}
