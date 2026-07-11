/**
 * brandly_progress — Pipeline progress
 */

import type { ToolContext } from "./context.js";
import { isValidProjectId, PHASE_ORDER } from "../constants.js";

export function createProgressTool(ctx: ToolContext) {
  return {
    name: "brandly_progress",
    description: "Get pipeline progress percentage",
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
      const totalPhases = PHASE_ORDER.length;
      const completedPhases = Object.values(project.phases).filter(
        (p) => p.status === "completed"
      ).length;
      const percentage = Math.round((completedPhases / totalPhases) * 100);

      // Build visual progress bar
      const barLength = 20;
      const filled = Math.round((percentage / 100) * barLength);
      const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

      // Phase breakdown
      const phaseStatus = PHASE_ORDER.map((phase) => {
        const result = project.phases[phase];
        let status = "pending";
        let icon = "⏳";
        if (result) {
          if (result.status === "completed") {
            status = "completed";
            icon = "✅";
          } else if (result.status === "running") {
            status = "running";
            icon = "🔄";
          } else if (result.status === "failed") {
            status = "failed";
            icon = "❌";
          }
        }
        if (phase === project.currentPhase && status === "pending") {
          status = "current";
          icon = "▶️";
        }
        return { phase, status, icon };
      });

      return {
        projectId: projectID,
        percentage: `${percentage}%`,
        bar: `[${bar}] ${percentage}%`,
        completedPhases,
        totalPhases,
        currentPhase: project.currentPhase,
        phases: phaseStatus,
        status: project.status,
      };
    },
  };
}
