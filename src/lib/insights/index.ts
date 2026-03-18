import { getSessionsByGroup } from "@/lib/db/queries";
import { getSessionGroups } from "./grouping";
import {
  buildTrends,
  buildDangerZones,
  buildStrengths,
  buildSkillCoverage,
  buildDifficultyBreakdown,
} from "./aggregation";
import type { GroupInsights } from "@/types";

export { getSessionGroups } from "./grouping";

export function getGroupInsights(groupId: string): GroupInsights | null {
  const groups = getSessionGroups();
  const group = groups.find((g) => g.groupId === groupId);
  if (!group) return null;

  const sessions = getSessionsByGroup(groupId);
  if (sessions.length === 0) return null;

  return {
    group,
    trends: buildTrends(sessions),
    dangerZones: buildDangerZones(sessions),
    strengths: buildStrengths(sessions),
    skillCoverage: buildSkillCoverage(sessions),
    difficultyBreakdown: buildDifficultyBreakdown(sessions),
  };
}
