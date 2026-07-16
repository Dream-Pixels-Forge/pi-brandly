/**
 * brandly_start — Create a new video project
 */

import { join } from "node:path";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ProjectData } from "../types";
import type { VideoStyle } from "../constants";
import { generateProjectId, VIDEO_STYLES, IMAGEN_DIR, VIDEOGEN_DIR, AUDGEN_DIR, CONSISTENCY_DIR, ASSEMBLY_DIR } from "../constants";
import type { ToolContext } from "./context.js";

export function createStartTool(ctx: ToolContext) {
  return {
    name: "brandly_start",
    description: "Start a new Brandly video project",
    parameters: {
      type: "object",
      properties: {
        idea: { type: "string", description: "Product idea, concept, or brief" },
        productName: { type: "string", description: "Name of the product" },
        imagePath: { type: "string", description: "Optional path to a product image" },
        targetPlatforms: {
          type: "array",
          items: { type: "string" },
          default: ["tiktok", "instagram"],
          description: "Target social platforms",
        },
        budgetCredits: {
          type: "number",
          default: 500,
          exclusiveMinimum: 0,
          description: "Max credits to spend on this project",
        },
        style: {
          type: "string",
          enum: VIDEO_STYLES,
          description: "Video style preference",
        },
      },
      required: ["idea", "productName"],
    },
    execute: async (args: Record<string, unknown>) => {
      const {
        idea,
        productName,
        imagePath,
        targetPlatforms,
        budgetCredits,
        style,
      } = args as {
        idea: string;
        productName: string;
        imagePath?: string;
        targetPlatforms?: string[];
        budgetCredits?: number;
        style?: string;
      };

      const projectId = generateProjectId();
      const dirs = ctx.getProjectDirs(projectId);

      // Create project directory structure
      await mkdir(dirs.project, { recursive: true });
      await mkdir(dirs.analysis, { recursive: true });
      await mkdir(dirs.script, { recursive: true });
      await mkdir(dirs.storyboard, { recursive: true });
      await mkdir(dirs.assets, { recursive: true });
      await mkdir(dirs.audio, { recursive: true });

      // Create project data
      const project: ProjectData = {
        id: projectId,
        name: productName,
        description: idea,
        status: "pending",
        style: (style as VideoStyle) || "cinematic",
        shotCount: 5,
        budget: budgetCredits || 500,
        spent: 0,
        currentPhase: "init",
        phases: {
          init: { status: "pending" },
        },
        hooks: [],
        settings: [],
        targetPlatforms: targetPlatforms || ["tiktok", "instagram"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await ctx.writeProject(projectId, project);

      // Create workspace-root media directories for this project (only on init).
      // These hold generated assets and are namespaced per project id.
      const mediaRoots = [IMAGEN_DIR, VIDEOGEN_DIR, AUDGEN_DIR, CONSISTENCY_DIR, ASSEMBLY_DIR];
      for (const root of mediaRoots) {
        await mkdir(join(ctx.directory, root), { recursive: true });
        await mkdir(join(ctx.directory, root, projectId), { recursive: true });
      }

      // Ensure the user's project .gitignore excludes Brandly's generated media
      // directories so they are never committed to the user's own repo.
      const gitignorePath = join(ctx.directory, ".gitignore");
      const brandlyMarker = "# Brandly generated media";
      const brandlyBlock =
        "\n" +
        brandlyMarker +
        "\n" +
        `${IMAGEN_DIR}/\n` +
        `${VIDEOGEN_DIR}/\n` +
        `${AUDGEN_DIR}/\n` +
        `${CONSISTENCY_DIR}/\n` +
        `${ASSEMBLY_DIR}/\n`;
      let existingGitignore = "";
      try {
        existingGitignore = await readFile(gitignorePath, "utf-8");
      } catch {
        existingGitignore = "";
      }
      if (!existingGitignore.includes(brandlyMarker)) {
        await writeFile(gitignorePath, existingGitignore.trimEnd() + brandlyBlock, "utf-8");
      }

      // Copy product image if provided
      if (imagePath) {
        await mkdir(dirs.imagen, { recursive: true });
        if (existsSync(imagePath)) {
          await copyFile(imagePath, join(dirs.imagen, "product.png"));
        } else {
          // URL or non-local path — store reference
          project.imageAnalysis = { sourceUrl: imagePath };
          await ctx.writeProject(projectId, project);
        }
      }

      return {
        projectId,
        status: "created",
        message: `Project "${productName}" created with ID: ${projectId}`,
        nextPhase: "init",
        gitignore: gitignorePath,
        dirs: {
          project: dirs.project,
          imagen: dirs.imagen,
          videgen: dirs.videgen,
          audgen: dirs.audgen,
          consistency: join(ctx.directory, CONSISTENCY_DIR, projectId),
          assembly: join(ctx.directory, ASSEMBLY_DIR, projectId),
        },
      };
    },
  };
}
