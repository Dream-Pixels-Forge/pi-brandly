/**
 * brandly_mmx_video — MiniMax mmx CLI video generation
 *
 * Wraps the mmx CLI for video generation with support for:
 * - T2V (Text-to-Video) via Hailuo-2.3
 * - I2V (Image-to-Video) via Hailuo-2.3 / Hailuo-2.3-Fast
 * - SEF (Start-End Frame interpolation) via Hailuo-02
 * - S2V (Subject-to-Video) via S2V-01 for character/product consistency
 *
 * The S2V mode is critical for the Director's shot-to-shot consistency:
 * pass a reference image of the character/product and the model maintains
 * their appearance across all generated clips.
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ToolContext } from "./context.js";
import { isValidProjectId } from "../constants.js";

const execFileAsync = promisify(execFile);

// ── Types ───────────────────────────────────────────────────────────────────

export type MmxVideoMode = "t2v" | "i2v" | "sef" | "s2v";

export interface MmxVideoGenerateParams {
  /** Text prompt describing the video */
  prompt: string;
  /** First frame image path or URL (for I2V, SEF) */
  firstFrame?: string;
  /** Last frame image path or URL (for SEF interpolation) */
  lastFrame?: string;
  /** Subject reference image for character consistency (for S2V) */
  subjectImage?: string;
  /** Model override (auto-selected based on mode) */
  model?: string;
  /** Don't wait for completion, return task ID immediately */
  async?: boolean;
  /** Download path for the completed video */
  download?: string;
}

export interface MmxVideoResult {
  taskId?: string;
  status: "submitted" | "completed" | "failed" | "polling";
  videoPath?: string;
  model: string;
  mode: MmxVideoMode;
  message: string;
}

// ── Mode detection ──────────────────────────────────────────────────────────

function detectMode(params: MmxVideoGenerateParams): MmxVideoMode {
  if (params.subjectImage) return "s2v";
  if (params.firstFrame && params.lastFrame) return "sef";
  if (params.firstFrame) return "i2v";
  return "t2v";
}

function modelForMode(mode: MmxVideoMode, customModel?: string): string {
  if (customModel) return customModel;
  switch (mode) {
    case "s2v": return "S2V-01";
    case "sef": return "MiniMax-Hailuo-02";
    case "i2v": return "MiniMax-Hailuo-2.3";
    case "t2v": return "MiniMax-Hailuo-2.3";
  }
}

// ── CLI wrapper ─────────────────────────────────────────────────────────────

async function runMmx(args: string[], timeoutSec = 300): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync("mmx", args, {
      timeout: timeoutSec * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (err: any) {
    const msg = err.stderr || err.message || String(err);
    throw new Error(`mmx CLI error: ${msg}`);
  }
}

function parseTaskId(stdout: string): string | undefined {
  // mmx outputs task ID in various formats; try common patterns
  const m = stdout.match(/task[_\s]*id[:\s]+([a-f0-9-]+)/i)
    || stdout.match(/"task_id"\s*:\s*"([^"]+)"/)
    || stdout.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  return m?.[1];
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createMmxVideoTool(ctx: ToolContext) {
  return {
    name: "brandly_mmx_video",
    description:
      "Generate videos using MiniMax mmx CLI. Supports T2V (text-to-video), I2V (image-to-video), SEF (start-end frame interpolation), and S2V (subject-to-video for character/product consistency).",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["generate", "status", "download"],
          description: "Action: generate a video, check task status, or download a completed video",
        },
        projectID: { type: "string", description: "The project UUID" },
        prompt: { type: "string", description: "Video description prompt" },
        firstFrame: {
          type: "string",
          description: "First frame image path or URL (enables I2V mode)",
        },
        lastFrame: {
          type: "string",
          description: "Last frame image path or URL (enables SEF interpolation mode with Hailuo-02)",
        },
        subjectImage: {
          type: "string",
          description: "Subject reference image for character/product consistency (enables S2V mode with S2V-01 model)",
        },
        model: {
          type: "string",
          description: "Model override (auto-selected: T2V=Hailuo-2.3, I2V=Hailuo-2.3, SEF=Hailuo-02, S2V=S2V-01)",
        },
        taskId: { type: "string", description: "Task ID for status/download actions" },
        async: {
          type: "boolean",
          default: false,
          description: "Return task ID immediately without waiting for completion",
        },
        downloadPath: {
          type: "string",
          description: "Path to save the completed video (for generate action with --download)",
        },
      },
      required: ["action", "projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const {
        action,
        projectID,
        prompt,
        firstFrame,
        lastFrame,
        subjectImage,
        model,
        taskId,
        async: asyncMode,
        downloadPath,
      } = args as {
        action: string;
        projectID: string;
        prompt?: string;
        firstFrame?: string;
        lastFrame?: string;
        subjectImage?: string;
        model?: string;
        taskId?: string;
        async?: boolean;
        downloadPath?: string;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      const videoDir = join(ctx.directory, "videgen", projectID);
      await mkdir(videoDir, { recursive: true });

      switch (action) {
        // ── Generate ──────────────────────────────────────────────────
        case "generate": {
          if (!prompt) throw new Error("prompt is required for generate action");

          const mode = detectMode({ prompt, firstFrame, lastFrame, subjectImage });
          const resolvedModel = modelForMode(mode, model);

          // Build mmx args
          const mmxArgs = ["video", "generate", "--prompt", prompt, "--model", resolvedModel];

          if (firstFrame) mmxArgs.push("--first-frame", firstFrame);
          if (lastFrame) mmxArgs.push("--last-frame", lastFrame);
          if (subjectImage) mmxArgs.push("--subject-image", subjectImage);

          // Download mode
          const effectiveDownloadPath = downloadPath || join(videoDir, `mmx-${Date.now()}.mp4`);
          if (!asyncMode) {
            mmxArgs.push("--download", effectiveDownloadPath);
          } else {
            mmxArgs.push("--async", "--quiet");
          }

          mmxArgs.push("--output", "json");

          const { stdout } = await runMmx(mmxArgs, asyncMode ? 30 : 600);

          let parsed: any;
          try {
            parsed = JSON.parse(stdout);
          } catch {
            parsed = { raw: stdout };
          }

          const tid = parsed.task_id || parsed.taskId || parseTaskId(stdout);

          if (asyncMode && tid) {
            return {
              status: "submitted",
              taskId: tid,
              model: resolvedModel,
              mode,
              message: `🎬 Video generation submitted (${mode.toUpperCase()} via ${resolvedModel}). Task: ${tid}. Use action='status' to poll.`,
            };
          }

          // Synchronous mode — video should be downloaded
          return {
            status: "completed",
            videoPath: effectiveDownloadPath,
            model: resolvedModel,
            mode,
            taskId: tid,
            message: `🎬 Video generated (${mode.toUpperCase()} via ${resolvedModel}) → ${effectiveDownloadPath}`,
          };
        }

        // ── Status ───────────────────────────────────────────────────
        case "status": {
          if (!taskId) throw new Error("taskId is required for status action");
          const { stdout } = await runMmx(["video", "task", "get", taskId, "--output", "json"]);
          let parsed: any;
          try {
            parsed = JSON.parse(stdout);
          } catch {
            parsed = { raw: stdout };
          }
          return {
            status: parsed.status || "unknown",
            taskId,
            file_id: parsed.file_id || parsed.fileId,
            download_url: parsed.download_url || parsed.downloadUrl,
            raw: parsed,
            message: `Task ${taskId}: ${parsed.status || "unknown"}`,
          };
        }

        // ── Download ─────────────────────────────────────────────────
        case "download": {
          if (!taskId) throw new Error("taskId is required for download action");
          const targetPath = downloadPath || join(videoDir, `mmx-${taskId}.mp4`);
          const { stdout } = await runMmx(["video", "download", taskId, "--output", targetPath]);
          return {
            status: "completed",
            videoPath: targetPath,
            message: `🎬 Video downloaded → ${targetPath}`,
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  };
}
