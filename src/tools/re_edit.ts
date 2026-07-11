/**
 * brandly_re_edit — Re-edit a specific shot
 */

import type { ToolContext, ProjectData, ReEditEntry } from "./context.js";
import { isValidProjectId } from "../constants.js";

export function createReEditTool(ctx: ToolContext) {
  return {
    name: "brandly_re_edit",
    description: "Re-edit a specific shot with a new prompt",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        shotId: { type: "string", description: "Shot ID to re-edit (e.g., 'shot-1')" },
        newPrompt: { type: "string", description: "New prompt for the shot" },
      },
      required: ["projectID", "shotId", "newPrompt"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, shotId, newPrompt } = args as {
        projectID: string;
        shotId: string;
        newPrompt: string;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Check re-edit limit (max 2 per shot)
      const existingEdits = (project.reEditHistory || []).filter(
        (e) => e.shotId === shotId
      );
      if (existingEdits.length >= 2) {
        throw new Error(
          `Shot "${shotId}" has already been re-edited ${existingEdits.length} times. Maximum 2 re-edits per shot.`
        );
      }

      // Add to re-edit history
      const entry: ReEditEntry = {
        shotId,
        originalPrompt: existingEdits.length > 0
          ? existingEdits[existingEdits.length - 1].newPrompt
          : "(original)",
        newPrompt,
        timestamp: new Date().toISOString(),
      };

      if (!project.reEditHistory) {
        project.reEditHistory = [];
      }
      project.reEditHistory.push(entry);

      // Set re-edit target for the script agent
      project.currentPhase = "re_edit";

      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);

      return {
        projectId: projectID,
        shotId,
        editNumber: existingEdits.length + 1,
        maxEdits: 2,
        status: "queued",
        message: `Shot "${shotId}" queued for re-edit with new prompt. Run brandly_run_project to dispatch the script agent.`,
        entry,
      };
    },
  };
}
