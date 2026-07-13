/**
 * brandly_analyze_image — Deep image analysis
 */

import type { ToolContext, ProjectData } from "./context.js";
import { isValidProjectId } from "../constants.js";
import { hasMinimaxCreds, analyzeImageWithMinimax } from "./matrix-client.js";

export function createAnalyzeImageTool(ctx: ToolContext) {
  return {
    name: "brandly_analyze_image",
    description: "Deep-analyze a product image across 12 dimensions",
    parameters: {
      type: "object",
      properties: {
        imagePath: { type: "string", description: "Path or URL to the image" },
        context: { type: "string", description: "Additional context about the product" },
        projectID: { type: "string", description: "Attach analysis to existing project" },
      },
      required: ["imagePath"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { imagePath, context, projectID } = args as {
        imagePath: string;
        context?: string;
        projectID?: string;
      };

      // Validate project if provided
      if (projectID) {
        if (!isValidProjectId(projectID)) {
          throw new Error("Invalid project ID format");
        }
        const project = await ctx.readProject(projectID);
        if (!project) {
          throw new Error(`Project not found: ${projectID}`);
        }
      }

      // Primary: native model analysis (agent reads the image if it has vision)
      const result: Record<string, unknown> = {
        imagePath,
        context,
        projectID,
        status: "analysis_ready",
        analysisDimensions: [
          "subject identification",
          "product details",
          "color palette (hex values)",
          "lighting analysis",
          "composition",
          "style/genre",
          "emotion/mood",
          "text/branding",
          "background",
          "technical quality",
          "platform suitability",
          "creative direction",
        ],
        message: `Ready to analyze image at "${imagePath}". The image analyzer will provide forensic-level detail across 12 dimensions.`,
        dispatch: {
          description: "Brandly image analyzer",
          prompt: `Analyze the image at ${imagePath}. ${context ? `Context: ${context}` : ""} Provide detailed analysis across all 12 dimensions.`,
          subagentType: "general",
        },
      };

      // Fallback: if the model can't see images, use MiniMax Matrix (configured in
      // Pi's provider config). Guarantees a real analysis regardless of model vision.
      if (imagePath) {
        try {
          if (await hasMinimaxCreds()) {
            const { analysis, raw } = await analyzeImageWithMinimax(
              imagePath,
              `Analyze the image at ${imagePath}. ${context ? `Context: ${context}. ` : ""}Provide detailed analysis across all 12 dimensions: subject, product details, color palette (hex), lighting, composition, style, emotion, text/branding, background, technical quality, platform suitability, creative direction.`
            );
            result.minimaxAnalysis = analysis;
            result.minimaxRaw = raw;
            result.minimaxUsed = true;
            result.status = "analysis_complete";
            result.message = "Analysis complete via MiniMax Matrix fallback (native model vision unavailable or skipped).";
          }
        } catch (e) {
          result.minimaxError = e instanceof Error ? e.message : String(e);
        }
      }

      return result;
    },
  };
}
