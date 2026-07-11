/**
 * brandly_cancel — Pause/cancel/resume project
 */

import type { ToolContext } from "./context.js";
import { isValidProjectId } from "../constants.js";

export function createCancelTool(ctx: ToolContext) {
  return {
    name: "brandly_cancel",
    description: "Pause, cancel, or resume a project",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        action: {
          type: "string",
          enum: ["pause", "cancel", "resume"],
          description: "Action: pause, cancel, or resume",
        },
      },
      required: ["projectID", "action"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, action } = args as {
        projectID: string;
        action: "pause" | "cancel" | "resume";
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const oldStatus = project.status;

      switch (action) {
        case "pause":
          if (project.status === "completed") {
            throw new Error("Cannot pause a completed project");
          }
          if (project.status === "cancelled") {
            throw new Error("Cannot pause a cancelled project. Use resume first.");
          }
          project.status = "paused";
          break;

        case "cancel":
          if (project.status === "completed") {
            throw new Error("Cannot cancel a completed project");
          }
          project.status = "cancelled";
          break;

        case "resume":
          if (project.status !== "paused") {
            throw new Error("Can only resume a paused project");
          }
          project.status = "running";
          break;
      }

      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);

      return {
        projectId: projectID,
        action,
        previousStatus: oldStatus,
        newStatus: project.status,
        status: "updated",
        message: `Project ${action === "resume" ? "resumed" : action + "d"}. Status: ${project.status}`,
      };
    },
  };
}
