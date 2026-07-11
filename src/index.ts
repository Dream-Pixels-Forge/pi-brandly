/**
 * pi-brandly — AI product video orchestrator for Pi
 * 
 * Turns product ideas into platform-ready marketing videos using a multi-agent pipeline.
 * Adapted from brandly-plugin (OpenCode) for Pi's ExtensionAPI.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Core modules
import { createContext, type ToolContext } from "./tools/context.js";
import { CostTracker } from "./cost-tracker.js";
import { Memory } from "./memory.js";

// Tools
import { createStartTool } from "./tools/start.js";
import { createStatusTool } from "./tools/status.js";
import { createRunTool } from "./tools/run.js";
import { createApproveTool } from "./tools/approve.js";
import { createEstimateTool } from "./tools/estimate.js";
import { createReEditTool } from "./tools/re_edit.js";
import { createValidateTool } from "./tools/validate.js";
import { createRecordCostTool } from "./tools/cost.js";
import { createSaveArtifactTool } from "./tools/artifact.js";
import { createMemoryTool } from "./tools/memory-tool.js";
import { createTemplatesTool } from "./tools/templates.js";
import { createCancelTool } from "./tools/cancel.js";
import { createProgressTool } from "./tools/progress.js";
import { createExportTool } from "./tools/export.js";
import { createListProjectsTool } from "./tools/list_projects.js";
import { createAnalyzeImageTool } from "./tools/image.js";
import { createDownloadTool } from "./tools/download.js";
import { createProviderTool } from "./tools/provider.js";
import { createVideoEditTool } from "./tools/video-edit.js";
import { createVideoRenderTool } from "./tools/video-render.js";

/**
 * Extension directory (for bundled agents, skills, templates)
 * In Pi, extensions can resolve their own directory via import.meta.url
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const EXTENSION_DIR = join(__dirname, "..");

export default function (pi: ExtensionAPI) {
  // Deferred context initialization (needs session cwd)
  let ctx: ToolContext | null = null;
  let costTracker: CostTracker | null = null;
  let memory: Memory | null = null;

  function ensureContext(cwd: string): ToolContext {
    if (!ctx) {
      ctx = createContext(cwd, EXTENSION_DIR);
      costTracker = new CostTracker(ctx.projectsDir);
      memory = new Memory(ctx.brandlyDir);
    }
    return ctx;
  }

  // ============================================================
  // Register all 20 brandly_* tools
  // ============================================================

  // 1. brandly_start — Create new project
  pi.registerTool({
    name: "brandly_start",
    label: "Brandly Start",
    description: "Start a new Brandly video project. Provide a product idea and optionally an image to kick off the agent pipeline.",
    promptSnippet: "Start a new Brandly video project",
    promptGuidelines: [
      "Use brandly_start when the user wants to create a product marketing video",
      "Provide the product idea, name, and optional image path",
      "Budget defaults to 500 credits if not specified",
    ],
    parameters: Type.Object({
      idea: Type.String({ description: "Product idea, concept, or brief" }),
      productName: Type.String({ description: "Name of the product" }),
      imagePath: Type.Optional(Type.String({ description: "Optional path to a product image" })),
      targetPlatforms: Type.Optional(Type.Array(
        Type.Union([
          Type.Literal("tiktok"),
          Type.Literal("instagram"),
          Type.Literal("youtube"),
          Type.Literal("all"),
        ]),
        { description: "Target social platforms", default: ["tiktok", "instagram"] }
      )),
      budgetCredits: Type.Optional(Type.Number({
        description: "Max credits to spend",
        default: 500,
        exclusiveMinimum: 0,
      })),
      style: Type.Optional(Type.Union([
        Type.Literal("cinematic"),
        Type.Literal("ugc"),
        Type.Literal("montage"),
        Type.Literal("multi_shot"),
        Type.Literal("continuous"),
        Type.Literal("unboxing"),
        Type.Literal("lifestyle"),
      ], { description: "Video style preference" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createStartTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 2. brandly_analyze_image — Deep image analysis
  pi.registerTool({
    name: "brandly_analyze_image",
    label: "Brandly Analyze Image",
    description: "Deep-analyze any product image across 12 dimensions: subject, product details, colors, lighting, composition, style, emotion, platform suitability, and creative direction.",
    promptSnippet: "Analyze a product image for marketing",
    promptGuidelines: [
      "Use brandly_analyze_image before starting a project to get detailed creative brief",
      "Can be used standalone or attached to a project",
    ],
    parameters: Type.Object({
      imagePath: Type.String({ description: "Path or URL to the image" }),
      context: Type.Optional(Type.String({ description: "Additional context about the product" })),
      projectID: Type.Optional(Type.String({ description: "Attach analysis to existing project" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createAnalyzeImageTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 3. brandly_run_project — Dispatch next pipeline agent
  pi.registerTool({
    name: "brandly_run_project",
    label: "Brandly Run Project",
    description: "Run the next phase of the Brandly pipeline. Reads the current phase and dispatches the appropriate agent.",
    promptSnippet: "Run the next pipeline phase",
    promptGuidelines: [
      "Use brandly_run_project after brandly_approve to advance the pipeline",
      "Returns dispatch instructions for the agent subagent",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createRunTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 4. brandly_approve — Approve phase & advance
  pi.registerTool({
    name: "brandly_approve",
    label: "Brandly Approve",
    description: "Approve the current pipeline phase and advance to the next one.",
    promptSnippet: "Approve and advance pipeline phase",
    promptGuidelines: [
      "Use brandly_approve after reviewing agent output",
      "Marks phase as completed and advances currentPhase",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      phase: Type.Optional(Type.String({ description: "Phase to approve (defaults to current phase)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createApproveTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 5. brandly_status — Project status
  pi.registerTool({
    name: "brandly_status",
    label: "Brandly Status",
    description: "Show the current status of a Brandly project — phase, budget, virality score, and artifacts.",
    promptSnippet: "Check project status",
    promptGuidelines: [
      "Use brandly_status to get an overview of project progress",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createStatusTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 6. brandly_estimate — Cost estimation
  pi.registerTool({
    name: "brandly_estimate",
    label: "Brandly Estimate",
    description: "Estimate credit cost for a video project before starting.",
    promptSnippet: "Estimate project cost",
    promptGuidelines: [
      "Use brandly_estimate to show the user expected costs before committing",
    ],
    parameters: Type.Object({
      idea: Type.String({ description: "Product idea or brief" }),
      productName: Type.String({ description: "Product name" }),
      style: Type.Optional(Type.Union([
        Type.Literal("cinematic"),
        Type.Literal("ugc"),
        Type.Literal("montage"),
        Type.Literal("multi_shot"),
        Type.Literal("continuous"),
        Type.Literal("unboxing"),
        Type.Literal("lifestyle"),
      ], { description: "Video style" })),
      shotCount: Type.Optional(Type.Number({
        description: "Number of shots (3-10)",
        minimum: 3,
        maximum: 10,
        default: 5,
      })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createEstimateTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 7. brandly_re_edit — Re-edit a specific shot
  pi.registerTool({
    name: "brandly_re_edit",
    label: "Brandly Re-Edit",
    description: "Re-edit a specific shot with a new prompt. Use after validation if a shot scores low.",
    promptSnippet: "Re-edit a specific shot",
    promptGuidelines: [
      "Use brandly_re_edit when validation score is low for specific shots",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      shotId: Type.String({ description: "Shot ID to re-edit (e.g., 'shot-1')" }),
      newPrompt: Type.String({ description: "New prompt for the shot" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createReEditTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 8. brandly_validate — Virality validation
  pi.registerTool({
    name: "brandly_validate",
    label: "Brandly Validate",
    description: "Run Higgsfield virality predictor on the final video to score it for viral potential.",
    promptSnippet: "Validate video virality",
    promptGuidelines: [
      "Use brandly_validate after the final video is rendered",
      "Returns MCP call instructions for the virality predictor",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      videoPath: Type.String({ description: "Path to the video file" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createValidateTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 9. brandly_record_cost — Track credit spend
  pi.registerTool({
    name: "brandly_record_cost",
    label: "Brandly Record Cost",
    description: "Record actual credit spend against the project budget.",
    promptSnippet: "Record credit spend",
    promptGuidelines: [
      "Use brandly_record_cost after each expensive operation (image/video generation)",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      phase: Type.String({ description: "Current pipeline phase" }),
      action: Type.String({ description: "What was done (e.g., 'generate_hero_image')" }),
      credits: Type.Number({ description: "Credits spent", exclusiveMinimum: 0 }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createRecordCostTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 10. brandly_save_artifact — Persist agent output
  pi.registerTool({
    name: "brandly_save_artifact",
    label: "Brandly Save Artifact",
    description: "Save a subagent's output to the project folder for persistence.",
    promptSnippet: "Save agent output to project",
    promptGuidelines: [
      "Use brandly_save_artifact after each agent completes to persist results",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      phase: Type.String({ description: "Pipeline phase (e.g., 'trends', 'concept')" }),
      filename: Type.String({ description: "Filename (e.g., 'trends.md')" }),
      content: Type.String({ description: "File content" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createSaveArtifactTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 11. brandly_memory — View/update preferences
  pi.registerTool({
    name: "brandly_memory",
    label: "Brandly Memory",
    description: "View or update user preferences (liked hooks, preferred style, budget).",
    promptSnippet: "View or update user preferences",
    promptGuidelines: [
      "Use brandly_memory to remember user preferences across projects",
    ],
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("view"),
        Type.Literal("like_hook"),
        Type.Literal("dislike_hook"),
        Type.Literal("reset"),
      ], { description: "Action to perform" }),
      hook: Type.Optional(Type.String({ description: "Hook style to like/dislike" })),
      style: Type.Optional(Type.String({ description: "Preferred video style" })),
      budget: Type.Optional(Type.Number({ description: "Default budget" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createMemoryTool(context, memory!);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 12. brandly_templates — List video style templates
  pi.registerTool({
    name: "brandly_templates",
    label: "Brandly Templates",
    description: "List available video style templates or get details on a specific template.",
    promptSnippet: "List video style templates",
    promptGuidelines: [
      "Use brandly_templates to show available styles before starting a project",
    ],
    parameters: Type.Object({
      templateId: Type.Optional(Type.String({ description: "Specific template to view" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createTemplatesTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 13. brandly_cancel — Pause/cancel project
  pi.registerTool({
    name: "brandly_cancel",
    label: "Brandly Cancel",
    description: "Pause or cancel a Brandly project.",
    promptSnippet: "Pause or cancel project",
    promptGuidelines: [
      "Use brandly_cancel to pause or cancel a running project",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      action: Type.Union([
        Type.Literal("pause"),
        Type.Literal("cancel"),
        Type.Literal("resume"),
      ], { description: "Action: pause, cancel, or resume" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createCancelTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 14. brandly_progress — Pipeline progress
  pi.registerTool({
    name: "brandly_progress",
    label: "Brandly Progress",
    description: "Get the pipeline progress percentage and phase breakdown.",
    promptSnippet: "Get pipeline progress",
    promptGuidelines: [
      "Use brandly_progress to show visual progress of the pipeline",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createProgressTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 15. brandly_export — Collect all artifacts
  pi.registerTool({
    name: "brandly_export",
    label: "Brandly Export",
    description: "Export all project artifacts and generated media files.",
    promptSnippet: "Export project artifacts",
    promptGuidelines: [
      "Use brandly_export when the user wants to download or package the project",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      outputPath: Type.Optional(Type.String({ description: "Custom export path" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createExportTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 16. brandly_list_projects — List all projects
  pi.registerTool({
    name: "brandly_list_projects",
    label: "Brandly List Projects",
    description: "List all Brandly projects in the workspace.",
    promptSnippet: "List all Brandly projects",
    promptGuidelines: [
      "Use brandly_list_projects to show all projects",
    ],
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createListProjectsTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 17. brandly_download — Download generated media (NEW)
  pi.registerTool({
    name: "brandly_download",
    label: "Brandly Download",
    description: "Download generated media (image, video, audio) from Higgsfield/Magnific to project folders.",
    promptSnippet: "Download generated media",
    promptGuidelines: [
      "Use brandly_download after asset/audio phases to save media locally",
      "Media is saved to imagen/, videgen/, or audgen/ based on type",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      mediaType: Type.Union([
        Type.Literal("image"),
        Type.Literal("video"),
        Type.Literal("audio"),
      ], { description: "Type of media" }),
      mediaUrl: Type.String({ description: "URL of the media to download" }),
      filename: Type.String({ description: "Filename to save as" }),
      jobId: Type.Optional(Type.String({ description: "Optional job ID for tracking" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createDownloadTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 18. brandly_select_provider — AI provider selection (NEW)
  pi.registerTool({
    name: "brandly_select_provider",
    label: "Brandly Select Provider",
    description: "Select an AI generation provider (Higgsfield, Kling, OpenArt, Magnific, Runway, Pika) or list available providers.",
    promptSnippet: "Select AI generation provider",
    promptGuidelines: [
      "Use brandly_select_provider to choose or list AI generation providers",
      "Different providers excel at different tasks",
    ],
    parameters: Type.Object({
      projectID: Type.Optional(Type.String({ description: "Project to set provider for" })),
      providerId: Type.Optional(Type.Union([
        Type.Literal("higgsfield"),
        Type.Literal("kling"),
        Type.Literal("openart"),
        Type.Literal("magnific"),
        Type.Literal("runway"),
        Type.Literal("pika"),
      ], { description: "Provider to select" })),
      listOnly: Type.Optional(Type.Boolean({
        description: "Only list providers, don't select one",
        default: false,
      })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createProviderTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 19. brandly_video_edit — Remotion video editing (NEW)
  pi.registerTool({
    name: "brandly_video_edit",
    label: "Brandly Video Edit",
    description: "Edit videos using Remotion: trim, concat, overlay, transition, text, audio, effects, resize, crop.",
    promptSnippet: "Edit video with Remotion",
    promptGuidelines: [
      "Use brandly_video_edit to programmatically edit videos",
      "Generates a Remotion composition that can be rendered",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      operation: Type.Union([
        Type.Literal("trim"),
        Type.Literal("concat"),
        Type.Literal("overlay"),
        Type.Literal("transition"),
        Type.Literal("add-text"),
        Type.Literal("add-audio"),
        Type.Literal("add-effect"),
        Type.Literal("resize"),
        Type.Literal("crop"),
      ], { description: "Edit operation" }),
      inputFiles: Type.Array(Type.String(), { description: "Input file paths" }),
      params: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
        description: "Operation-specific parameters",
      })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createVideoEditTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 20. brandly_render_video — Render Remotion compositions (NEW)
  pi.registerTool({
    name: "brandly_render_video",
    label: "Brandly Render Video",
    description: "Render a Remotion composition to produce the final video file.",
    promptSnippet: "Render video composition",
    promptGuidelines: [
      "Use brandly_render_video after creating a composition with brandly_video_edit",
      "Supports mp4, webm, gif formats with quality presets",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      compositionPath: Type.String({ description: "Path to the Remotion composition file" }),
      outputPath: Type.Optional(Type.String({ description: "Output file path" })),
      format: Type.Optional(Type.Union([
        Type.Literal("mp4"),
        Type.Literal("webm"),
        Type.Literal("gif"),
      ], { description: "Output format", default: "mp4" })),
      quality: Type.Optional(Type.Union([
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
        Type.Literal("ultra"),
      ], { description: "Quality preset", default: "high" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createVideoRenderTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // ============================================================
  // Register commands
  // ============================================================
  
  pi.registerCommand({
    name: "brandly",
    description: "Brandly — AI product video orchestrator",
    isEnabled: () => true,
    execute: async (args, signal) => {
      // Basic help output
      return `Brandly — AI Product Video Generator

Tools:
  brandly_start         Start a new video project
  brandly_analyze_image Deep-analyze a product image
  brandly_run_project   Run the next pipeline phase
  brandly_approve       Approve phase & advance
  brandly_status        Check project status
  brandly_estimate      Estimate costs before starting
  brandly_re_edit       Re-edit a specific shot
  brandly_validate      Score video for virality
  brandly_download      Download generated media
  brandly_select_provider  Choose AI provider
  brandly_video_edit    Edit video with Remotion
  brandly_render_video  Render final video

Pipeline: init → trends → concept → script → asset → audio → validate → publish → done

Example:
  "Make a product video for MatchaQuick" → brandly_start
  "Check status" → brandly_status
  "Export the project" → brandly_export`;
    },
  });
}
