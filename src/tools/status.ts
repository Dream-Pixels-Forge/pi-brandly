/**
 * brandly_status — Show project status
 */

import type { ToolContext } from "./context.js";
import { isValidProjectId, PHASE_ORDER } from "../constants.js";

export function createStatusTool(ctx: ToolContext) {
  return {
    name: "brandly_status",
    description: "Show project status",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID } = args as { projectID: string };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Calculate progress
      const completedPhases = Object.values(project.phases).filter(
        (p) => p.status === "completed"
      ).length;
      const progress = Math.round((completedPhases / PHASE_ORDER.length) * 100);

      // Get current phase info
      const currentPhaseIdx = PHASE_ORDER.indexOf(project.currentPhase as any);
      const nextPhase = currentPhaseIdx < PHASE_ORDER.length - 1
        ? PHASE_ORDER[currentPhaseIdx + 1]
        : null;

      return {
        projectId: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        style: project.style,
        currentPhase: project.currentPhase,
        nextPhase,
        progress: `${progress}%`,
        budget: {
          total: project.budget,
          spent: project.spent,
          remaining: project.budget - project.spent,
          percentUsed: Math.round((project.spent / project.budget) * 100),
        },
        phases: project.phases,
        targetPlatforms: project.targetPlatforms,
        viralityScore: project.postGenViralityScore,
        provider: project.provider,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    },
  };
}
