/**
 * brandly_matrix — MiniMax Matrix integration for Brandly
 *
 * Image understanding/analysis/OCR (analyze), image generation (image),
 * and video generation (video). Credentials read from Pi's provider config
 * (~/.pi/agent/auth.json -> minimax). Shared MiniMax logic lives in
 * ./matrix-client.ts so brandly_analyze_image can reuse it as a fallback.
 */

import { existsSync } from "node:fs";
import type { ToolContext } from "./context.js";
import {
  MINIMAX_BASE,
  loadCreds,
  fileToDataUrl,
  type MiniMaxCreds,
} from "./matrix-client.js";

export function createMatrixTool(_ctx: ToolContext) {
  return {
    name: "brandly_matrix",
    description:
      "MiniMax Matrix: image understanding/analysis/OCR (analyze), image generation (image), and video generation (video). Credentials read from Pi's provider config (~/.pi/agent/auth.json -> minimax).",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["analyze", "image", "video"],
          description:
            "analyze = image understanding/OCR; image = image generation; video = video generation",
        },
        imagePath: {
          type: "string",
          description: "Local path or URL to the image (analyze / image reference / video first frame)",
        },
        prompt: {
          type: "string",
          description: "Question for analyze, or generation description for image/video",
        },
        model: {
          type: "string",
          description: "MiniMax model (default MiniMax-M3 for vision, image-01 for images, video-01 for video)",
        },
        projectID: {
          type: "string",
          description: "Optional: attach result to a Brandly project",
        },
        aspectRatio: {
          type: "string",
          description: "Image aspect ratio, e.g. 9:16, 16:9, 1:1",
        },
      },
      required: ["action"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { action, imagePath, prompt, model, aspectRatio } = args as {
        action: "analyze" | "image" | "video";
        imagePath?: string;
        prompt?: string;
        model?: string;
        projectID?: string;
        aspectRatio?: string;
      };

      const creds: MiniMaxCreds = await loadCreds();

      // ---- ANALYZE: image understanding via MiniMax vision LLM ----
      if (action === "analyze") {
        if (!imagePath) throw new Error("action 'analyze' requires imagePath");
        const dataUrl = existsSync(imagePath) ? await fileToDataUrl(imagePath) : imagePath;
        const messages = [
          {
            role: "user",
            content: [
              { type: "text", text: prompt || "Describe this image in detailed forensic detail." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ];
        const res = await fetch(
          `${MINIMAX_BASE}/text/chatcompletion_v2?GroupId=${encodeURIComponent(creds.groupId ?? "")}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${creds.key}`,
            },
            body: JSON.stringify({ model: model || "MiniMax-M3", messages }),
          }
        );
        if (!res.ok) {
          throw new Error(`MiniMax chat failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
        }
        const data = await res.json();
        const text =
          data?.choices?.[0]?.message?.content ?? data?.reply ?? JSON.stringify(data, null, 2);
        return {
          action: "analyze",
          imagePath,
          model: model || "MiniMax-M3",
          analysis: text,
          raw: data,
        };
      }

      // ---- IMAGE GENERATION ----
      if (action === "image") {
        if (!prompt) throw new Error("action 'image' requires prompt");
        const url = `${MINIMAX_BASE}/image_generation?GroupId=${encodeURIComponent(
          creds.groupId ?? ""
        )}`;
        const body: Record<string, unknown> = {
          model: model || "image-01",
          prompt,
          aspect_ratio: aspectRatio || "1:1",
        };
        if (imagePath && existsSync(imagePath)) {
          body.image = await fileToDataUrl(imagePath);
        }
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creds.key}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(`MiniMax image failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
        }
        return { action: "image", model: model || "image-01", result: await res.json() };
      }

      // ---- VIDEO GENERATION ----
      if (action === "video") {
        if (!prompt) throw new Error("action 'video' requires prompt");
        const url = `${MINIMAX_BASE}/video_generation?GroupId=${encodeURIComponent(
          creds.groupId ?? ""
        )}`;
        const body: Record<string, unknown> = {
          model: model || "video-01",
          prompt,
        };
        if (imagePath && existsSync(imagePath)) {
          body.first_frame_image = await fileToDataUrl(imagePath);
        }
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creds.key}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(`MiniMax video failed (${res.status}): ${(await res.text()).slice(0, 500)}`);
        }
        return { action: "video", model: model || "video-01", result: await res.json() };
      }

      throw new Error(`Unknown action: ${action}`);
    },
  };
}
