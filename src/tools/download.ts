/**
 * brandly_download — Download generated media
 */

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext, DownloadedFile } from "./context.js";
import { isValidProjectId, IMAGEN_DIR, VIDEOGEN_DIR, AUDGEN_DIR } from "../constants.js";

export function createDownloadTool(ctx: ToolContext) {
  return {
    name: "brandly_download",
    description: "Download generated media from Higgsfield/Magnific",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        mediaType: {
          type: "string",
          enum: ["image", "video", "audio"],
          description: "Type of media",
        },
        mediaUrl: { type: "string", description: "URL of the media to download" },
        filename: { type: "string", description: "Filename to save as" },
        jobId: { type: "string", description: "Optional job ID for tracking" },
      },
      required: ["projectID", "mediaType", "mediaUrl", "filename"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, mediaType, mediaUrl, filename, jobId } = args as {
        projectID: string;
        mediaType: "image" | "video" | "audio";
        mediaUrl: string;
        filename: string;
        jobId?: string;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      // Determine target directory
      const dirMap: Record<string, string> = {
        image: IMAGEN_DIR,
        video: VIDEOGEN_DIR,
        audio: AUDGEN_DIR,
      };
      const targetDir = join(ctx.directory, dirMap[mediaType], projectID);

      // Ensure directory exists
      await mkdir(targetDir, { recursive: true });

      const targetPath = join(targetDir, filename);

      // Return download instructions (actual download done by agent via bash/curl)
      return {
        projectId: projectID,
        mediaType,
        mediaUrl,
        filename,
        jobId,
        targetPath,
        status: "download_ready",
        downloadCommand: `curl -L -o "${targetPath}" "${mediaUrl}"`,
        message: `Download "${filename}" (${mediaType}) to ${targetPath}`,
      };
    },
  };
}
