/**
 * brandly_render_video — Render Remotion compositions
 */

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import type { ToolContext } from "./context.js";
import { isValidProjectId, QUALITY_PRESETS, type VideoQuality, type VideoFormat } from "../constants.js";

export function createVideoRenderTool(ctx: ToolContext) {
  return {
    name: "brandly_render_video",
    description: "Render a Remotion composition to final video",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        compositionPath: { type: "string", description: "Path to the Remotion composition file" },
        outputPath: { type: "string", description: "Output file path" },
        format: {
          type: "string",
          enum: ["mp4", "webm", "gif"],
          default: "mp4",
          description: "Output format",
        },
        quality: {
          type: "string",
          enum: ["low", "medium", "high", "ultra"],
          default: "high",
          description: "Quality preset",
        },
      },
      required: ["projectID", "compositionPath"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, compositionPath, outputPath, format = "mp4", quality = "high" } = args as {
        projectID: string;
        compositionPath: string;
        outputPath?: string;
        format?: VideoFormat;
        quality?: VideoQuality;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Ensure output directory exists
      const outputDir = join(ctx.directory, "renders", projectID);
      await mkdir(outputDir, { recursive: true });

      // Determine output path
      const finalOutputPath = outputPath || join(outputDir, `final-cut.${format}`);

      // Get quality preset
      const preset = QUALITY_PRESETS[quality];

      // Generate render command
      const renderCommand = [
        "npx remotion render",
        compositionPath,
        finalOutputPath,
        `--codec ${format === "gif" ? "gif" : format === "webm" ? "vp8" : "h264"}`,
        `--image-format jpeg`,
        `--jpeg-quality ${quality === "ultra" ? 100 : quality === "high" ? 90 : quality === "medium" ? 80 : 60}`,
      ].join(" \\\n  ");

      return {
        projectId: projectID,
        compositionPath,
        outputPath: finalOutputPath,
        format,
        quality,
        preset,
        status: "render_ready",
        renderCommand,
        message: `Ready to render. Run the render command to produce the final video.`,
      };
    },
  };
}
