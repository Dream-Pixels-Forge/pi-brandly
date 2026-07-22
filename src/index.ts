/**
 * pi-brandly — AI product video orchestrator for Pi
 * 
 * Turns product ideas into platform-ready marketing videos using a multi-agent pipeline.
 * Adapted from brandly-plugin (OpenCode) for Pi's ExtensionAPI.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type TSchema } from "typebox";
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
import { createAssemblyTool } from "./tools/assembly.js";
import { createBrandKitTool } from "./tools/brand-kit.js";
import { createBatchVariationsTool } from "./tools/batch-variations.js";
import { createAutoCaptionTool } from "./tools/auto-caption.js";
import { createSceneConsistencyTool } from "./tools/scene-consistency.js";
import { createMotionGraphicsTool } from "./tools/motion-graphics.js";
import { createMatrixTool } from "./tools/matrix.js";
import { createMmxVideoTool } from "./tools/mmx-video.js";
import { createDirectorTool } from "./director.js";

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

  // ── Registration helper ─────────────────────────────────────────────────
  // Reduces boilerplate: every brandly tool follows the same pattern.
  function registerBrandlyTool(
    name: string,
    label: string,
    description: string,
    promptSnippet: string,
    promptGuidelines: string[],
    parameters: TSchema,
    handler: (params: Record<string, unknown>, context: ToolContext) => Promise<Record<string, unknown>>
  ) {
    pi.registerTool({
      name,
      label,
      description,
      promptSnippet,
      promptGuidelines,
      parameters,
      async execute(_toolCallId, params, _signal, _onUpdate, extCtx) {
        const context = ensureContext(extCtx.cwd);
        const result = await handler(params as Record<string, unknown>, context);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          details: result,
        };
      },
    });
  }

  // ============================================================
  // Register all brandly_* tools via the registration helper
  // ============================================================

  // 1. brandly_start
  registerBrandlyTool(
    "brandly_start",
    "Brandly Start",
    "Start a new Brandly video project. Provide a product idea and optionally an image to kick off the agent pipeline.",
    "Start a new Brandly video project",
    ["Use brandly_start when the user wants to create a product marketing video", "Provide the product idea, name, and optional image path", "Budget defaults to 500 credits if not specified"],
    Type.Object({
      idea: Type.String({ description: "Product idea, concept, or brief" }),
      productName: Type.String({ description: "Name of the product" }),
      imagePath: Type.Optional(Type.String({ description: "Optional path to a product image" })),
      targetPlatforms: Type.Optional(Type.Array(Type.Union([Type.Literal("tiktok"), Type.Literal("instagram"), Type.Literal("youtube"), Type.Literal("all")]), { description: "Target social platforms", default: ["tiktok", "instagram"] })),
      budgetCredits: Type.Optional(Type.Number({ description: "Max credits to spend", default: 500, exclusiveMinimum: 0 })),
      style: Type.Optional(Type.Union([Type.Literal("cinematic"), Type.Literal("ugc"), Type.Literal("montage"), Type.Literal("multi_shot"), Type.Literal("continuous"), Type.Literal("unboxing"), Type.Literal("lifestyle")], { description: "Video style preference" })),
    }),
    async (params, context) => createStartTool(context).execute(params),
  );

  // 2. brandly_analyze_image
  registerBrandlyTool(
    "brandly_analyze_image",
    "Brandly Analyze Image",
    "Deep-analyze any product image across 12 dimensions: subject, product details, colors, lighting, composition, style, emotion, platform suitability, and creative direction.",
    "Analyze a product image for marketing",
    ["Use brandly_analyze_image before starting a project to get detailed creative brief", "Can be used standalone or attached to a project"],
    Type.Object({
      imagePath: Type.String({ description: "Path or URL to the image" }),
      context: Type.Optional(Type.String({ description: "Additional context about the product" })),
      projectID: Type.Optional(Type.String({ description: "Attach analysis to existing project" })),
    }),
    async (params, context) => createAnalyzeImageTool(context).execute(params),
  );

  // 3. brandly_run_project
  registerBrandlyTool(
    "brandly_run_project",
    "Brandly Run Project",
    "Run the next phase of the Brandly pipeline. Reads the current phase and dispatches the appropriate agent.",
    "Run the next pipeline phase",
    ["Use brandly_run_project after brandly_approve to advance the pipeline", "Returns dispatch instructions for the agent subagent"],
    Type.Object({ projectID: Type.String({ description: "The project UUID" }) }),
    async (params, context) => createRunTool(context).execute(params),
  );

  // 4. brandly_approve
  registerBrandlyTool(
    "brandly_approve",
    "Brandly Approve",
    "Approve the current pipeline phase and advance to the next one.",
    "Approve and advance pipeline phase",
    ["Use brandly_approve after reviewing agent output", "Marks phase as completed and advances currentPhase"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      phase: Type.Optional(Type.String({ description: "Phase to approve (defaults to current phase)" })),
    }),
    async (params, context) => createApproveTool(context).execute(params),
  );

  // 5. brandly_status
  registerBrandlyTool(
    "brandly_status",
    "Brandly Status",
    "Show the current status of a Brandly project — phase, budget, virality score, and artifacts.",
    "Check project status",
    ["Use brandly_status to get an overview of project progress"],
    Type.Object({ projectID: Type.String({ description: "The project UUID" }) }),
    async (params, context) => createStatusTool(context).execute(params),
  );

  // 6. brandly_estimate
  registerBrandlyTool(
    "brandly_estimate",
    "Brandly Estimate",
    "Estimate credit cost for a video project before starting.",
    "Estimate project cost",
    ["Use brandly_estimate to show the user expected costs before committing"],
    Type.Object({
      idea: Type.String({ description: "Product idea or brief" }),
      productName: Type.String({ description: "Product name" }),
      style: Type.Optional(Type.Union([Type.Literal("cinematic"), Type.Literal("ugc"), Type.Literal("montage"), Type.Literal("multi_shot"), Type.Literal("continuous"), Type.Literal("unboxing"), Type.Literal("lifestyle")], { description: "Video style" })),
      shotCount: Type.Optional(Type.Number({ description: "Number of shots (3-10)", minimum: 3, maximum: 10, default: 5 })),
    }),
    async (params, context) => createEstimateTool(context).execute(params),
  );

  // 7. brandly_re_edit
  registerBrandlyTool(
    "brandly_re_edit",
    "Brandly Re-Edit",
    "Re-edit a specific shot with a new prompt. Use after validation if a shot scores low.",
    "Re-edit a specific shot",
    ["Use brandly_re_edit when validation score is low for specific shots"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      shotId: Type.String({ description: "Shot ID to re-edit (e.g., 'shot-1')" }),
      newPrompt: Type.String({ description: "New prompt for the shot" }),
    }),
    async (params, context) => createReEditTool(context).execute(params),
  );

  // 8. brandly_validate
  registerBrandlyTool(
    "brandly_validate",
    "Brandly Validate",
    "Run Higgsfield virality predictor on the final video to score it for viral potential.",
    "Validate video virality",
    ["Use brandly_validate after the final video is rendered", "Returns MCP call instructions for the virality predictor"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      videoPath: Type.String({ description: "Path to the video file" }),
    }),
    async (params, context) => createValidateTool(context).execute(params),
  );

  // 9. brandly_record_cost
  registerBrandlyTool(
    "brandly_record_cost",
    "Brandly Record Cost",
    "Record actual credit spend against the project budget.",
    "Record credit spend",
    ["Use brandly_record_cost after each expensive operation (image/video generation)"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      phase: Type.String({ description: "Current pipeline phase" }),
      action: Type.String({ description: "What was done (e.g., 'generate_hero_image')" }),
      credits: Type.Number({ description: "Credits spent", exclusiveMinimum: 0 }),
    }),
    async (params, context) => createRecordCostTool(context).execute(params),
  );

  // 10. brandly_save_artifact
  registerBrandlyTool(
    "brandly_save_artifact",
    "Brandly Save Artifact",
    "Save a subagent's output to the project folder for persistence.",
    "Save agent output to project",
    ["Use brandly_save_artifact after each agent completes to persist results"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      phase: Type.String({ description: "Pipeline phase (e.g., 'trends', 'concept')" }),
      filename: Type.String({ description: "Filename (e.g., 'trends.md')" }),
      content: Type.String({ description: "File content" }),
    }),
    async (params, context) => createSaveArtifactTool(context).execute(params),
  );

  // 11. brandly_memory
  registerBrandlyTool(
    "brandly_memory",
    "Brandly Memory",
    "View or update user preferences (liked hooks, preferred style, budget).",
    "View or update user preferences",
    ["Use brandly_memory to remember user preferences across projects"],
    Type.Object({
      action: Type.Union([Type.Literal("view"), Type.Literal("like_hook"), Type.Literal("dislike_hook"), Type.Literal("reset")], { description: "Action to perform" }),
      hook: Type.Optional(Type.String({ description: "Hook style to like/dislike" })),
      style: Type.Optional(Type.String({ description: "Preferred video style" })),
      budget: Type.Optional(Type.Number({ description: "Default budget" })),
    }),
    async (params, context) => {
      const tool = createMemoryTool(context, memory!);
      return tool.execute(params);
    },
  );

  // 12. brandly_templates
  registerBrandlyTool(
    "brandly_templates",
    "Brandly Templates",
    "List available video style templates or get details on a specific template.",
    "List video style templates",
    ["Use brandly_templates to show available styles before starting a project"],
    Type.Object({ templateId: Type.Optional(Type.String({ description: "Specific template to view" })) }),
    async (params, context) => createTemplatesTool(context).execute(params),
  );

  // 13. brandly_cancel
  registerBrandlyTool(
    "brandly_cancel",
    "Brandly Cancel",
    "Pause or cancel a Brandly project.",
    "Pause or cancel project",
    ["Use brandly_cancel to pause or cancel a running project"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      action: Type.Union([Type.Literal("pause"), Type.Literal("cancel"), Type.Literal("resume")], { description: "Action: pause, cancel, or resume" }),
    }),
    async (params, context) => createCancelTool(context).execute(params),
  );

  // 14. brandly_progress
  registerBrandlyTool(
    "brandly_progress",
    "Brandly Progress",
    "Get the pipeline progress percentage and phase breakdown.",
    "Get pipeline progress",
    ["Use brandly_progress to show visual progress of the pipeline"],
    Type.Object({ projectID: Type.String({ description: "The project UUID" }) }),
    async (params, context) => createProgressTool(context).execute(params),
  );

  // 15. brandly_export
  registerBrandlyTool(
    "brandly_export",
    "Brandly Export",
    "Export all project artifacts and generated media files.",
    "Export project artifacts",
    ["Use brandly_export when the user wants to download or package the project"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      outputPath: Type.Optional(Type.String({ description: "Custom export path" })),
    }),
    async (params, context) => createExportTool(context).execute(params),
  );

  // 16. brandly_list_projects
  registerBrandlyTool(
    "brandly_list_projects",
    "Brandly List Projects",
    "List all Brandly projects in the workspace.",
    "List all Brandly projects",
    ["Use brandly_list_projects to show all projects"],
    Type.Object({}),
    async (_params, context) => createListProjectsTool(context).execute({}),
  );

  // 17. brandly_download
  registerBrandlyTool(
    "brandly_download",
    "Brandly Download",
    "Download generated media (image, video, audio) from Higgsfield/Magnific to project folders.",
    "Download generated media",
    ["Use brandly_download after asset/audio phases to save media locally", "Media is saved to imagen/, videgen/, or audgen/ based on type"],
    Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      mediaType: Type.Union([Type.Literal("image"), Type.Literal("video"), Type.Literal("audio")], { description: "Type of media" }),
      mediaUrl: Type.String({ description: "URL of the media to download" }),
      filename: Type.String({ description: "Filename to save as" }),
      jobId: Type.Optional(Type.String({ description: "Optional job ID for tracking" })),
    }),
    async (params, context) => createDownloadTool(context).execute(params),
  );

  // 18. brandly_select_provider
  registerBrandlyTool(
    "brandly_select_provider",
    "Brandly Select Provider",
    "Select an AI generation provider (Higgsfield, Kling, OpenArt, Magnific, Runway, Pika, Matrix) or list available providers.",
    "Select AI generation provider",
    ["Use brandly_select_provider to choose or list AI generation providers", "Different providers excel at different tasks"],
    Type.Object({
      projectID: Type.Optional(Type.String({ description: "Project to set provider for" })),
      providerId: Type.Optional(Type.Union([Type.Literal("higgsfield"), Type.Literal("kling"), Type.Literal("openart"), Type.Literal("magnific"), Type.Literal("runway"), Type.Literal("pika"), Type.Literal("matrix")], { description: "Provider to select" })),
      listOnly: Type.Optional(Type.Boolean({ description: "Only list providers, don't select one", default: false })),
    }),
    async (params, context) => createProviderTool(context).execute(params),
  );

  // 18b. brandly_matrix
  registerBrandlyTool(
    "brandly_matrix",
    "Brandly Matrix (MiniMax)",
    "MiniMax Matrix: analyze images (understanding/OCR), generate images, or generate video. Credentials read from Pi's provider config (~/.pi/agent/auth.json -> minimax).",
    "Use MiniMax Matrix for image analysis or generation",
    ["Use brandly_matrix action=analyze to understand/describe/OCR an image", "Use brandly_matrix action=image or video to generate with MiniMax"],
    Type.Object({
      action: Type.String({ enum: ["analyze", "image", "video"], description: "analyze=image understanding, image=image gen, video=video gen" }),
      imagePath: Type.Optional(Type.String({ description: "Local path or URL to the image" })),
      prompt: Type.Optional(Type.String({ description: "Question (analyze) or generation description (image/video)" })),
      model: Type.Optional(Type.String({ description: "MiniMax model (default MiniMax-M3 / image-01 / video-01)" })),
      projectID: Type.Optional(Type.String({ description: "Optional Brandly project to attach to" })),
      aspectRatio: Type.Optional(Type.String({ description: "Image aspect ratio, e.g. 9:16, 16:9, 1:1" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createMatrixTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 18c. brandly_mmx_video — MiniMax mmx CLI video generation
  registerBrandlyTool(
    "brandly_mmx_video",
    "Brandly MMX Video",
    "Generate videos using MiniMax mmx CLI. Supports T2V (text-to-video), I2V (image-to-video), SEF (start-end frame interpolation), and S2V (subject-to-video for character/product consistency).",
    "Generate video with mmx CLI",
    [
      "Use brandly_mmx_video for video generation via mmx CLI",
      "Use subjectImage parameter for character/product consistency (S2V mode)",
      "Use firstFrame+lastFrame for SEF interpolation mode",
      "Use async=true for non-blocking generation",
    ],
    Type.Object({
      action: Type.Union([Type.Literal("generate"), Type.Literal("status"), Type.Literal("download")], { description: "Action: generate, check status, or download" }),
      projectID: Type.String({ description: "The project UUID" }),
      prompt: Type.Optional(Type.String({ description: "Video description prompt" })),
      firstFrame: Type.Optional(Type.String({ description: "First frame image (I2V/SEF mode)" })),
      lastFrame: Type.Optional(Type.String({ description: "Last frame image (SEF mode)" })),
      subjectImage: Type.Optional(Type.String({ description: "Subject reference for character consistency (S2V mode)" })),
      model: Type.Optional(Type.String({ description: "Model override (auto-selected by mode)" })),
      taskId: Type.Optional(Type.String({ description: "Task ID for status/download" })),
      async: Type.Optional(Type.Boolean({ description: "Return task ID immediately", default: false })),
      downloadPath: Type.Optional(Type.String({ description: "Path to save completed video" })),
    }),
    async (params, context) => createMmxVideoTool(context).execute(params),
  );

  // 19. brandly_video_edit — Remotion video editing
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

  // 21. brandly_assemble — Montage assembly via Remotion (NEW)
  pi.registerTool({
    name: "brandly_assemble",
    label: "Brandly Assemble",
    description: "Assemble all generated video clips, images, and audio into a final montage using a complete Remotion project. Discovers assets, creates the project structure, and optionally renders the final video.",
    promptSnippet: "Assemble clips into a montage",
    promptGuidelines: [
      "Use brandly_assemble after asset/audio phases to build the final montage",
      "Generates a Remotion project with transitions and text overlays",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      style: Type.Optional(Type.Union([
        Type.Literal("montage"),
        Type.Literal("cinematic"),
        Type.Literal("ugc"),
        Type.Literal("continuous"),
        Type.Literal("simple"),
      ], { default: "montage", description: "Assembly style preset" })),
      clipDuration: Type.Optional(Type.Number({ description: "Default duration in seconds for each video clip", default: 3 })),
      transitionType: Type.Optional(Type.Union([
        Type.Literal("fade"),
        Type.Literal("slide"),
        Type.Literal("wipe"),
        Type.Literal("none"),
      ], { default: "fade", description: "Transition type between clips" })),
      transitionDuration: Type.Optional(Type.Number({ description: "Transition duration in seconds", default: 0.5 })),
      fps: Type.Optional(Type.Number({ description: "Frames per second", default: 30 })),
      width: Type.Optional(Type.Number({ description: "Output width in pixels", default: 1920 })),
      height: Type.Optional(Type.Number({ description: "Output height in pixels", default: 1080 })),
      outputPath: Type.Optional(Type.String({ description: "Output file path for rendered video" })),
      autoRender: Type.Optional(Type.Boolean({ description: "Automatically render after creating the project", default: false })),
      clipOrder: Type.Optional(Type.Array(Type.String(), { description: "Optional explicit clip order by filename" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createAssemblyTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 22. brandly_brand_kit — Manage brand kits (NEW)
  pi.registerTool({
    name: "brandly_brand_kit",
    label: "Brandly Brand Kit",
    description: "Manage brand kits — store colors, fonts, logo, tone of voice, voiceover style, and music preferences. Apply a brand kit to a project for consistent branding.",
    promptSnippet: "Manage brand kits",
    promptGuidelines: [
      "Use brandly_brand_kit to create, update, list, and apply brand kits",
      "Apply a kit to a project with action='apply'",
    ],
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("create"),
        Type.Literal("get"),
        Type.Literal("update"),
        Type.Literal("delete"),
        Type.Literal("list"),
        Type.Literal("apply"),
      ], { description: "Action to perform" }),
      brandKitId: Type.Optional(Type.String({ description: "Brand kit ID (required for get/update/delete/apply)" })),
      projectID: Type.Optional(Type.String({ description: "Project ID to apply brand kit to (required for apply)" })),
      name: Type.Optional(Type.String({ description: "Brand kit name" })),
      colors: Type.Optional(Type.Any({ description: "Brand colors (primary/secondary/accent/background/text hex)" })),
      fonts: Type.Optional(Type.Any({ description: "Font families (heading/body/accent)" })),
      logo: Type.Optional(Type.Any({ description: "Logo configuration (url/width/height/position)" })),
      tone: Type.Optional(Type.Array(Type.String(), { description: "Brand tone keywords" })),
      tagline: Type.Optional(Type.String({ description: "Brand tagline" })),
      voiceover: Type.Optional(Type.Any({ description: "Voiceover preferences (style/gender/pace)" })),
      music: Type.Optional(Type.Any({ description: "Music preferences (genre/mood/tempo)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createBrandKitTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 23. brandly_batch_variations — Multiple concept variations (NEW)
  pi.registerTool({
    name: "brandly_batch_variations",
    label: "Brandly Batch Variations",
    description: "Generate multiple variations of a video concept with different hooks, styles, CTAs, and tones. Create N variations from one idea, each as a separate project, then compare and pick the best.",
    promptSnippet: "Generate batch variations",
    promptGuidelines: [
      "Use brandly_batch_variations to A/B test concepts from a single project",
      "Each variation is a separate project under variations/{id}",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "Source project ID" }),
      variations: Type.Optional(Type.Number({ description: "Number of variations (1-10, default 3)" })),
      autoGenerate: Type.Optional(Type.Boolean({ description: "Auto-generate variation configs" })),
      customVariations: Type.Optional(Type.Array(Type.Any({ description: "Manual variation configs (name/style/hook/cta/tone)" }))),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createBatchVariationsTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 24. brandly_auto_caption — Word-level captions (NEW)
  pi.registerTool({
    name: "brandly_auto_caption",
    label: "Brandly Auto Caption",
    description: "Generate word-level captions/subtitles from voiceover audio. Outputs an SRT file and a Remotion component that can be overlaid on the final video with word-level highlighting and animations.",
    promptSnippet: "Generate auto captions",
    promptGuidelines: [
      "Use brandly_auto_caption to add subtitles to a finished video",
      "Produces SRT + a Remotion overlay component",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "Project ID" }),
      audioPath: Type.Optional(Type.String({ description: "Path to voiceover audio file" })),
      captions: Type.Optional(Type.Array(Type.Any({ description: "Pre-generated caption segments (text/start/end/words)" }))),
      style: Type.Optional(Type.Union([
        Type.Literal("tiktok"),
        Type.Literal("youtube"),
        Type.Literal("cinematic"),
        Type.Literal("minimal"),
        Type.Literal("bold"),
        Type.Literal("custom"),
      ], { description: "Caption style preset" })),
      customStyle: Type.Optional(Type.Any({ description: "Custom caption style (overrides preset)" })),
      exportSrt: Type.Optional(Type.Boolean({ description: "Export SRT subtitle file" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createAutoCaptionTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 25. brandly_scene_consistency — Lock character/product refs (NEW)
  pi.registerTool({
    name: "brandly_scene_consistency",
    label: "Brandly Scene Consistency",
    description: "Lock character and product references across multiple shots for visual consistency. Define characters/products, assign them to scenes, and generate prompts that maintain consistent appearance throughout the video.",
    promptSnippet: "Lock scene consistency",
    promptGuidelines: [
      "Use brandly_scene_consistency before the asset phase for multi-shot videos",
      "Generate consistent prompts with generate_consistent_prompt",
    ],
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("create_character"),
        Type.Literal("update_character"),
        Type.Literal("list_characters"),
        Type.Literal("delete_character"),
        Type.Literal("assign_to_scene"),
        Type.Literal("remove_from_scene"),
        Type.Literal("get_scene_plan"),
        Type.Literal("generate_consistent_prompt"),
        Type.Literal("set_rules"),
      ], { description: "Action to perform" }),
      projectID: Type.String({ description: "Project ID" }),
      characterId: Type.Optional(Type.String({ description: "Character ID" })),
      name: Type.Optional(Type.String({ description: "Character name" })),
      type: Type.Optional(Type.Union([
        Type.Literal("person"),
        Type.Literal("product"),
        Type.Literal("object"),
        Type.Literal("animal"),
        Type.Literal("custom"),
      ], { description: "Character type" })),
      description: Type.Optional(Type.String({ description: "Character description" })),
      referenceImages: Type.Optional(Type.Array(Type.String(), { description: "Paths to reference images" })),
      attributes: Type.Optional(Type.Any({ description: "Character attributes (appearance/clothing/colors/brand)" })),
      sceneIndex: Type.Optional(Type.Number({ description: "Scene index (0-based)" })),
      role: Type.Optional(Type.Union([
        Type.Literal("primary"),
        Type.Literal("secondary"),
        Type.Literal("background"),
      ], { description: "Character role in scene" })),
      action_description: Type.Optional(Type.String({ description: "What the character is doing" })),
      position: Type.Optional(Type.String({ description: "Position in frame" })),
      notes: Type.Optional(Type.String({ description: "Additional notes" })),
      basePrompt: Type.Optional(Type.String({ description: "Base prompt to enhance" })),
      sceneCount: Type.Optional(Type.Number({ description: "Number of scenes for prompt generation" })),
      rules: Type.Optional(Type.Any({ description: "Consistency rules" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createSceneConsistencyTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 26. brandly_motion_graphics — Remotion motion graphics (NEW)
  pi.registerTool({
    name: "brandly_motion_graphics",
    label: "Brandly Motion Graphics",
    description: "Create animated motion graphics using Remotion — kinetic typography, product showcases, stat counters, title reveals, and custom scene-based animations. Generates a complete Remotion project with spring physics, easing, and frame-accurate timing.",
    promptSnippet: "Create motion graphics",
    promptGuidelines: [
      "Use brandly_motion_graphics for intros, stat counters, kinetic text",
      "Pick a preset or supply custom scenes",
    ],
    parameters: Type.Object({
      projectID: Type.String({ description: "The project UUID" }),
      preset: Type.Union([
        Type.Literal("title-reveal"),
        Type.Literal("product-showcase"),
        Type.Literal("kinetic-text"),
        Type.Literal("stats-counter"),
        Type.Literal("custom"),
      ], { description: "Preset template. Use 'custom' to provide your own scenes." }),
      scenes: Type.Optional(Type.Array(Type.Any({ description: "Custom scenes array (required when preset='custom')" }))),
      fps: Type.Optional(Type.Number({ description: "Frames per second", default: 30 })),
      width: Type.Optional(Type.Number({ description: "Output width in pixels", default: 1920 })),
      height: Type.Optional(Type.Number({ description: "Output height in pixels", default: 1080 })),
      outputPath: Type.Optional(Type.String({ description: "Output file path for rendered video" })),
      autoRender: Type.Optional(Type.Boolean({ description: "Automatically render after creating the project", default: false })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createMotionGraphicsTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // 27. brandly_director — Superproduction Director (NEW)
  pi.registerTool({
    name: "brandly_director",
    label: "Brandly Director",
    description: "Superproduction Director — orchestrates a multi-shot script into one final film. Plan the production, dispatch shot-by-shot creation, track each shot, then assemble all shots and deliver.",
    promptSnippet: "Orchestrate a multi-shot superproduction",
    promptGuidelines: [
      "Use brandly_director when the user provides a script with MULTIPLE shots and wants them produced and assembled into one video",
      "Loop: init (from script) → next (get shot brief) → generate shot → complete (record clip) → repeat → assemble → deliver",
      "The Director tracks per-shot state in .pi/brandly/projects/{id}/production.json",
    ],
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("init"),
        Type.Literal("plan"),
        Type.Literal("next"),
        Type.Literal("complete"),
        Type.Literal("rework"),
        Type.Literal("status"),
        Type.Literal("assemble"),
        Type.Literal("deliver"),
        Type.Literal("pause"),
        Type.Literal("resume"),
      ], { description: "Director action" }),
      projectID: Type.String({ description: "The project UUID" }),
      scriptJson: Type.Optional(
        Type.Object(
          {
            shots: Type.Array(
              Type.Object({
                id: Type.Optional(Type.Union([Type.Number(), Type.String()])),
                title: Type.Optional(Type.String()),
                description: Type.String(),
                subject: Type.Optional(Type.String()),
                environment: Type.Optional(Type.String()),
                prompt: Type.String(),
                negativePrompt: Type.Optional(Type.String()),
                model: Type.Optional(Type.String()),
                cameraMovement: Type.Optional(Type.String()),
                lighting: Type.Optional(Type.String()),
                duration: Type.Optional(Type.Number()),
                aspectRatio: Type.Optional(Type.String()),
              })
            ),
          },
          {
            description:
              "Canonical shots[] schema. The script_agent output (shots: [...]) feeds in directly: { shots: [ { id, description, subject?, environment?, prompt, negativePrompt?, model?, cameraMovement?, lighting?, duration?, aspectRatio? } ] }",
          }
        )
      ),
      scriptText: Type.Optional(Type.String({ description: "Raw multi-shot script text to parse" })),
      lockConsistency: Type.Optional(
        Type.Boolean({ description: "Auto-lock character/product references at init via brandly_scene_consistency (keeps the film visually coherent shot-to-shot)", default: true })
      ),
      style: Type.Optional(Type.String({ description: "Video style (cinematic, ugc, montage, ...)" })),
      shotId: Type.Optional(Type.String({ description: "Shot ID for complete/rework (e.g., 'shot-1')" })),
      clipPath: Type.Optional(Type.String({ description: "Path to the finished clip for this shot" })),
      credits: Type.Optional(Type.Number({ description: "Credits spent generating this shot" })),
      newPrompt: Type.Optional(Type.String({ description: "New prompt when marking a shot for rework" })),
      notes: Type.Optional(Type.String({ description: "Optional notes" })),
      assemblyStyle: Type.Optional(Type.String({ description: "Assembly style preset" })),
      transitionType: Type.Optional(Type.Union([
        Type.Literal("fade"),
        Type.Literal("slide"),
        Type.Literal("wipe"),
        Type.Literal("none"),
      ], { default: "fade", description: "Transition type between shots" })),
      transitionDuration: Type.Optional(Type.Number({ description: "Transition duration in seconds", default: 0.5 })),
      fps: Type.Optional(Type.Number({ description: "Frames per second", default: 30 })),
      width: Type.Optional(Type.Number({ description: "Output width in pixels", default: 1080 })),
      height: Type.Optional(Type.Number({ description: "Output height in pixels", default: 1920 })),
      showTitles: Type.Optional(Type.Boolean({ description: "Show per-shot title lower-thirds", default: false })),
      backgroundMusicPath: Type.Optional(Type.String({ description: "Optional background music file" })),
      outputPath: Type.Optional(Type.String({ description: "Output path for assembled/delivered video" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, extCtx) {
      const context = ensureContext(extCtx.cwd);
      const tool = createDirectorTool(context);
      const result = await tool.execute(params as Record<string, unknown>);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        details: result,
      };
    },
  });

  // ============================================================
  // Register the /brandly_director slash-command shortcut
  // ============================================================

  (pi.registerCommand as any)({
    name: "brandly_director",
    description: "Superproduction Director — orchestrate a multi-shot script into one final film",
    isEnabled: () => true,
    execute: async (args: string) => {
      const tokens = (args || "").trim().split(/\s+/).filter(Boolean);
      const projectID = tokens.find((t) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t));
      const sub = tokens.find((t) => !/^[0-9a-f-]{36}$/i.test(t)) || "help";
      const id = projectID ? `projectID="${projectID}"` : "<projectID>";

      const calls: Record<string, string> = {
        init: `brandly_director(action="init", ${id}, scriptText="<paste the multi-shot script, or attach a script.md>")  # or scriptJson={shots:[...]}`,
        next: `brandly_director(action="next", ${id})`,
        status: `brandly_director(action="status", ${id})`,
        assemble: `brandly_director(action="assemble", ${id}, transitionType="fade")  # then: cd <assemblyDir> && bash build.sh`,
        deliver: `brandly_director(action="deliver", ${id})`,
      };

      if (sub !== "help" && calls[sub]) {
        return `🎬 Director shortcut → run:\n\n\`\`\`\n${calls[sub]}\n\`\`\``;
      }

      return `🎬 Superproduction Director — orchestrate a multi-shot script into ONE final film.

Usage: /brandly_director <subcommand> <projectID>
Subcommands:
  init      brandly_director(action="init", ${id}, scriptText="...")
  next      brandly_director(action="next", ${id})        # get next shot brief
  status    brandly_director(action="status", ${id})      # production board
  assemble  brandly_director(action="assemble", ${id})    # cut all shots → final film
  deliver   brandly_director(action="deliver", ${id})     # validate + export

Full loop:  init → next → [generate shot] → complete → next → … → assemble → deliver
The script_agent's shots[] JSON feeds in directly via scriptJson={shots:[...]}.`;
    },
  });
}
