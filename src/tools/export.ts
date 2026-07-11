/**
 * brandly_export — Export project artifacts
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import type { ToolContext } from "./context.js";
import { isValidProjectId } from "../constants.js";

export function createExportTool(ctx: ToolContext) {
  return {
    name: "brandly_export",
    description: "Export all project artifacts and generated media",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        outputPath: { type: "string", description: "Custom export path" },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, outputPath } = args as {
        projectID: string;
        outputPath?: string;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const dirs = ctx.getProjectDirs(projectID);
      const exportPath = outputPath || join(dirs.project, "export");

      // Collect all artifacts
      const manifest: Record<string, string[]> = {
        project: [],
        analysis: [],
        script: [],
        storyboard: [],
        assets: [],
        audio: [],
        imagen: [],
        videgen: [],
        audgen: [],
      };

      // Scan each directory for files
      for (const [key, dir] of Object.entries({
        project: dirs.project,
        analysis: dirs.analysis,
        script: dirs.script,
        storyboard: dirs.storyboard,
        assets: dirs.assets,
        audio: dirs.audio,
        imagen: dirs.imagen,
        videgen: dirs.videgen,
        audgen: dirs.audgen,
      })) {
        if (existsSync(dir)) {
          try {
            const files = await readdir(dir);
            manifest[key] = files.filter((f) => !f.startsWith("."));
          } catch {
            // Skip unreadable dirs
          }
        }
      }

      // Calculate totals
      const totalFiles = Object.values(manifest).reduce(
        (sum, files) => sum + files.length,
        0
      );

      return {
        projectId: projectID,
        name: project.name,
        status: project.status,
        exportPath,
        manifest,
        totalFiles,
        budget: {
          total: project.budget,
          spent: project.spent,
          remaining: project.budget - project.spent,
        },
        message: `Found ${totalFiles} files across ${Object.keys(manifest).length} directories. Export to: ${exportPath}`,
      };
    },
  };
}
