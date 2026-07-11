/**
 * brandly_save_artifact — Persist agent output
 */

import { join } from "node:path";
import type { ToolContext } from "./context.js";
import { isValidProjectId } from "../constants.js";

export function createSaveArtifactTool(ctx: ToolContext) {
  return {
    name: "brandly_save_artifact",
    description: "Save agent output to project folder",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        phase: { type: "string", description: "Pipeline phase (e.g., 'trends', 'concept')" },
        filename: { type: "string", description: "Filename (e.g., 'trends.md')" },
        content: { type: "string", description: "File content" },
      },
      required: ["projectID", "phase", "filename", "content"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, phase, filename, content } = args as {
        projectID: string;
        phase: string;
        filename: string;
        content: string;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Ensure phase directory exists
      const phaseDir = join(ctx.projectsDir, projectID, phase);
      const filePath = join(phaseDir, filename);

      await ctx.writeAtomic(filePath, content);

      // Update phase result with artifact reference
      if (!project.phases[phase]) {
        project.phases[phase] = { status: "running" };
      }
      if (!project.phases[phase].artifacts) {
        project.phases[phase].artifacts = [];
      }
      project.phases[phase].artifacts!.push(filename);

      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID, project);

      return {
        projectId: projectID,
        phase,
        filename,
        path: filePath,
        status: "saved",
        message: `Saved "${filename}" to phase "${phase}"`,
      };
    },
  };
}
