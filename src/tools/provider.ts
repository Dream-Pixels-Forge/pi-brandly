/**
 * brandly_select_provider — AI provider selection
 */

import type { ToolContext, ProviderInfo } from "./context.js";
import { isValidProjectId, type ProviderId } from "../constants.js";

const PROVIDERS: ProviderInfo[] = [
  {
    id: "higgsfield",
    name: "Higgsfield AI",
    type: "multi",
    capabilities: ["image", "video", "3D", "audio", "marketing"],
    models: [
      "Z Image", "Nano Banana", "Nano Banana 2", "Nano Banana Pro",
      "Soul 2.0", "Soul Cinema", "Soul Location",
      "Seedream 5.0 Lite", "Seedream 4.5",
      "GPT Image 2", "Flux 2.0", "Recraft V4.1",
      "Kling 3.0", "Seedance 2.0", "Hailuo 2.3",
      "Virality Predictor (brain_activity)",
    ],
    bestFor: [
      "Product marketing videos",
      "Brand campaigns",
      "Comprehensive AI generation",
      "Quality validation",
    ],
    website: "https://higgsfield.ai",
  },
  {
    id: "kling",
    name: "Kling AI (可灵)",
    type: "video",
    capabilities: ["video", "image"],
    models: ["Kling 3.0", "Kling 3.0 Turbo", "Kling 3.0 Omni"],
    bestFor: [
      "Strong motion and physics",
      "Budget-friendly video",
      "Multi-shot dialogue",
    ],
    website: "https://klingai.com",
  },
  {
    id: "openart",
    name: "OpenArt",
    type: "image",
    capabilities: ["image"],
    models: ["Community models", "Experimental", "Style transfer"],
    bestFor: [
      "Community aesthetics",
      "Experimental styles",
      "Unique visual effects",
    ],
    website: "https://openart.ai",
  },
  {
    id: "magnific",
    name: "Magnific AI",
    type: "upscale",
    capabilities: ["upscale", "audio"],
    models: ["Magnific Upscaler", "Magnific Audio"],
    bestFor: [
      "Image upscaling and enhancement",
      "Audio generation",
      "Quality improvement",
    ],
    website: "https://magnific.ai",
  },
  {
    id: "runway",
    name: "Runway ML",
    type: "video",
    capabilities: ["video", "image"],
    models: ["Runway Gen-4", "Runway Gen-4.5"],
    bestFor: [
      "Professional cinematic quality",
      "Film-grade output",
      "Advanced motion",
    ],
    website: "https://runwayml.com",
  },
  {
    id: "pika",
    name: "Pika Labs",
    type: "video",
    capabilities: ["video"],
    models: ["Pika 2.0", "Pika Effects"],
    bestFor: [
      "Creative stylized effects",
      "Fun experiments",
      "Social content",
    ],
    website: "https://pika.art",
  },
];

export function createProviderTool(ctx: ToolContext) {
  return {
    name: "brandly_select_provider",
    description: "Select AI generation provider or list available providers",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "Project to set provider for" },
        providerId: {
          type: "string",
          enum: ["higgsfield", "kling", "openart", "magnific", "runway", "pika"],
          description: "Provider to select",
        },
        listOnly: {
          type: "boolean",
          default: false,
          description: "Only list providers, don't select",
        },
      },
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, providerId, listOnly } = args as {
        projectID?: string;
        providerId?: ProviderId;
        listOnly?: boolean;
      };

      // List providers
      if (listOnly || !providerId) {
        return {
          providers: PROVIDERS.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            capabilities: p.capabilities,
            bestFor: p.bestFor,
            website: p.website,
          })),
          total: PROVIDERS.length,
          message: `Found ${PROVIDERS.length} available providers`,
        };
      }

      // Validate provider exists
      const provider = PROVIDERS.find((p) => p.id === providerId);
      if (!provider) {
        throw new Error(
          `Provider "${providerId}" not found. Available: ${PROVIDERS.map((p) => p.id).join(", ")}`
        );
      }

      // Set provider for project if provided
      if (projectID) {
        if (!isValidProjectId(projectID)) {
          throw new Error("Invalid project ID format");
        }

        const project = await ctx.readProject(projectID);
        if (!project) {
          throw new Error(`Project not found: ${projectID}`);
        }

        project.provider = providerId;
        project.updatedAt = new Date().toISOString();
        await ctx.writeProject(projectID, project);
      }

      return {
        selected: provider,
        projectId: projectID,
        status: "selected",
        message: `Selected "${provider.name}" as AI provider`,
        usageGuide: generateUsageGuide(provider),
      };
    },
  };
}

function generateUsageGuide(provider: ProviderInfo): string {
  const lines: string[] = [];

  lines.push(`## ${provider.name} Usage Guide`);
  lines.push(`\n**Type:** ${provider.type}`);
  lines.push(`**Best for:** ${provider.bestFor.join(", ")}`);
  lines.push(`\n**Available models:**`);
  for (const model of provider.models) {
    lines.push(`- ${model}`);
  }

  lines.push(`\n**Website:** ${provider.website}`);

  return lines.join("\n");
}
