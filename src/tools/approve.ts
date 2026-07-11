/**
 * brandly_approve — Approve phase & advance pipeline
 */

import type { ToolContext } from "./context.js";
import { isValidProjectId, PHASE_ORDER } from "../constants.js";

export function createApproveTool(ctx: ToolContext) {
  return {
    name: "brandly_approve",
    description: "Approve the current pipeline phase and advance",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        phase: { type: "string", description: "Phase to approve (defaults to current phase)" },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, phase } = args as { projectID: string; phase?: string };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      if (project.status === "cancelled" || project.status === "paused") {
        throw new Error(`Cannot approve — project is ${project.status}`);
      }

      const targetPhase = phase || project.currentPhase;

      // Mark phase as completed
      if (!project.phases[targetPhase]) {
        project.phases[targetPhase] = { status: "pending" };
      }
      project.phases[targetPhase].status = "completed";
      project.phases[targetPhase].completedAt = new Date().toISOString();

      // Advance to next phase
      const currentIdx = PHASE_ORDER.indexOf(targetPhase as any);
      let nextPhase: string | null = null;

      if (currentIdx >= 0 && currentIdx < PHASE_ORDER.length - 1) {
        nextPhase = PHASE_ORDER[currentIdx + 1];
        project.currentPhase = nextPhase;

        // Initialize next phase
        if (!project.phases[nextPhase]) {
          project.phases[nextPhase] = { status: "pending" };
        }
      } else {
        // Last phase completed
        project.currentPhase = "done";
        project.status = "completed";
      }

      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);

      return {
        projectId: projectID,
        approvedPhase: targetPhase,
        status: "approved",
        currentPhase: project.currentPhase,
        nextPhase,
        projectStatus: project.status,
        message: nextPhase
          ? `Phase "${targetPhase}" approved. Now on "${nextPhase}".`
          : `Phase "${targetPhase}" approved. Project completed!`,
      };
    },
  };
}
