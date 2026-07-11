/**
 * brandly_run_project — Dispatch next pipeline agent
 */

import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext } from "./context.js";
import { isValidProjectId, PHASE_AGENT_MAP } from "../constants.js";
import { withRetry } from "../retry.js";

export function createRunTool(ctx: ToolContext) {
  return {
    name: "brandly_run_project",
    description: "Run the next phase of the Brandly pipeline",
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

      if (project.status === "cancelled") {
        throw new Error("Cannot run — project is cancelled");
      }
      if (project.status === "paused") {
        throw new Error("Cannot run — project is paused. Use brandly_cancel with action='resume' to continue.");
      }

      const currentPhase = project.currentPhase;
      const agentFile = PHASE_AGENT_MAP[currentPhase as keyof typeof PHASE_AGENT_MAP];

      if (!agentFile || currentPhase === "done") {
        return {
          projectId: projectID,
          status: "completed",
          message: "All phases completed! The project is done.",
        };
      }

      const agentPath = join(ctx.agentsDir, agentFile);
      if (!existsSync(agentPath)) {
        throw new Error(`Agent file not found: ${agentFile}. Ensure the pi-brandly extension is properly installed.`);
      }

      // Read agent prompt with retry
      const agentPrompt = await withRetry(
        () => readFile(agentPath, "utf-8"),
        {
          maxRetries: 2,
          baseDelayMs: 500,
        }
      );

      // Build project context for the agent
      const projectContext = buildProjectContext(project);

      return {
        projectId: projectID,
        currentPhase,
        agent: agentFile,
        agentPrompt: `${agentPrompt}\n\n---\n\n## Project Context\n\n${projectContext}`,
        status: "dispatched",
        message: `Dispatched ${agentFile} for phase "${currentPhase}"`,
        dispatch: {
          description: `Brandly ${currentPhase} agent`,
          prompt: `${agentPrompt}\n\n---\n\n## Project Context\n\n${projectContext}`,
          subagentType: "general",
        },
      };
    },
  };
}

/**
 * Build project context string for agent prompt
 */
function buildProjectContext(project: any): string {
  const lines: string[] = [];

  lines.push(`**Project ID:** ${project.id}`);
  lines.push(`**Product:** ${project.name}`);
  lines.push(`**Description:** ${project.description}`);
  lines.push(`**Style:** ${project.style}`);
  lines.push(`**Shot Count:** ${project.shotCount}`);
  lines.push(`**Target Platforms:** ${project.targetPlatforms?.join(", ") || "tiktok, instagram"}`);
  lines.push(`**Budget:** ${project.budget} credits (${project.spent} spent)`);

  if (project.imageAnalysis) {
    lines.push(`\n**Image Analysis:**\n\`\`\`json\n${JSON.stringify(project.imageAnalysis, null, 2)}\n\`\`\``);
  }

  if (project.hooks && project.hooks.length > 0) {
    lines.push(`\n**Hooks:** ${project.hooks.join(", ")}`);
  }

  // Include completed phase outputs
  for (const [phase, result] of Object.entries(project.phases || {})) {
    if ((result as any).status === "completed" && (result as any).output) {
      lines.push(`\n**${phase} output:**\n${(result as any).output}`);
    }
  }

  return lines.join("\n");
}
