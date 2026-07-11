/**
 * brandly_record_cost — Track credit spend
 */

import type { ToolContext } from "./context.js";
import { CostTracker } from "../cost-tracker.js";
import { isValidProjectId } from "../constants.js";

export function createRecordCostTool(ctx: ToolContext) {
  const tracker = new CostTracker(ctx.projectsDir);

  return {
    name: "brandly_record_cost",
    description: "Record credit spend against project budget",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        phase: { type: "string", description: "Current pipeline phase" },
        action: { type: "string", description: "What was done (e.g., 'generate_hero_image')" },
        credits: { type: "number", exclusiveMinimum: 0, description: "Credits spent" },
      },
      required: ["projectID", "phase", "action", "credits"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, phase, action, credits } = args as {
        projectID: string;
        phase: string;
        action: string;
        credits: number;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      // Check budget first
      const { allowed, remaining, overBudget } = await tracker.canAfford(projectID, credits);
      if (!allowed) {
        throw new Error(
          `Budget exceeded! This action costs ${credits} credits, but only ${remaining} remain. ` +
          `Over budget by ${overBudget} credits.`
        );
      }

      // Record spend
      const result = await tracker.recordSpend(projectID, phase, action, credits);

      return {
        projectId: projectID,
        phase,
        action,
        credits,
        newTotal: result.newTotal,
        remaining: result.remaining,
        status: "recorded",
        message: `Recorded ${credits} credits for "${action}" in phase "${phase}". Total: ${result.newTotal}/${(await tracker.getSummary(projectID)).budget}`,
      };
    },
  };
}
