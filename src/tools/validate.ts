/**
 * brandly_validate — Virality validation
 */

import type { ToolContext } from "./context.js";
import { isValidProjectId } from "../constants.js";

export function createValidateTool(ctx: ToolContext) {
  return {
    name: "brandly_validate",
    description: "Validate video virality with Higgsfield Virality Predictor",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        videoPath: { type: "string", description: "Path to the video file" },
      },
      required: ["projectID", "videoPath"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, videoPath } = args as {
        projectID: string;
        videoPath: string;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Return MCP call instructions for the validation agent
      return {
        projectId: projectID,
        videoPath,
        status: "validation_ready",
        mcpInstructions: {
          tool: "higgsfield_generate_create",
          params: {
            type: "brain_activity",
            video: videoPath,
            wait: true,
          },
        },
        scoringThresholds: {
          excellent: { min: 80, max: 100, action: "Ready for publishing" },
          good: { min: 60, max: 79, action: "Minor improvements recommended" },
          average: { min: 40, max: 59, action: "Significant re-edit needed" },
          poor: { min: 0, max: 39, action: "Major rework required" },
        },
        platformRequirements: {
          tiktok: { minScore: 60, hookTime: "1-2 seconds" },
          instagram: { minScore: 55, hookTime: "2-3 seconds" },
          youtube: { minScore: 50, hookTime: "3-5 seconds" },
          twitter: { minScore: 65, hookTime: "1-2 seconds" },
        },
        message: `Ready to validate video at "${videoPath}". Use the validation agent to run the virality predictor.`,
        dispatch: {
          description: "Brandly validation agent",
          prompt: `Validate the video at ${videoPath} for project ${projectID}. Use the Higgsfield Virality Predictor to score it.`,
          subagentType: "general",
        },
      };
    },
  };
}
