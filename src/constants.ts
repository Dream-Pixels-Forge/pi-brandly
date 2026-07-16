/**
 * pi-brandly constants
 * Video styles, costs, phase definitions
 */

import { randomUUID } from "node:crypto";

export function generateProjectId(): string {
  return randomUUID();
}

export function isValidProjectId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export type VideoStyle = "cinematic" | "ugc" | "montage" | "multi_shot" | "continuous" | "unboxing" | "lifestyle";

export const VIDEO_STYLES: VideoStyle[] = [
  "cinematic",
  "ugc",
  "montage",
  "multi_shot",
  "continuous",
  "unboxing",
  "lifestyle",
];

export const STYLE_COSTS: Record<VideoStyle, number> = {
  cinematic: 250,
  ugc: 150,
  montage: 200,
  multi_shot: 300,
  continuous: 200,
  unboxing: 180,
  lifestyle: 170,
};

export const SHOT_COSTS: Record<number, number> = {
  3: 0,
  4: 15,
  5: 30,
  6: 50,
  7: 75,
  8: 100,
  9: 140,
  10: 180,
};

export const PHASE_ORDER = [
  "init",
  "trends",
  "concept",
  "script",
  "asset",
  "audio",
  "re_edit",
  "validate",
  "publish",
  "done",
] as const;

export type Phase = (typeof PHASE_ORDER)[number];

export const PHASE_AGENT_MAP: Record<Phase, string> = {
  init: "trends_agent.md",
  trends: "trends_agent.md",
  concept: "concept_agent.md",
  script: "script_agent.md",
  asset: "asset_agent.md",
  audio: "audio_agent.md",
  re_edit: "script_agent.md",
  validate: "validation_agent.md",
  publish: "publish_agent.md",
  done: "",
};

/**
 * Directory names for pi-brandly project storage
 * Projects are stored in: .pi/brandly/projects/{id}/
 */
export const BRANDLY_DIR = "brandly";
export const PROJECTS_DIR = "projects";
export const USER_PREFS_FILE = "user-preferences.json";

/**
 * Generated media directories (workspace-relative)
 */
export const IMAGEN_DIR = "imagen";
export const VIDEOGEN_DIR = "videgen";
export const AUDGEN_DIR = "audgen";
export const CONSISTENCY_DIR = "consistency";
export const ASSEMBLY_DIR = "assembly";

/**
 * Directory names from Pi's config (for reference)
 * Pi stores extensions in: .pi/extensions/
 * Pi stores skills in: .pi/skills/
 */
export const PI_CONFIG_DIR = ".pi";
export const PI_EXTENSIONS_DIR = "extensions";

/**
 * Video editing quality presets
 */
export type VideoQuality = "low" | "medium" | "high" | "ultra";

export const QUALITY_PRESETS: Record<VideoQuality, { width: number; height: number; bitrate: string }> = {
  low: { width: 640, height: 360, bitrate: "1M" },
  medium: { width: 1280, height: 720, bitrate: "5M" },
  high: { width: 1920, height: 1080, bitrate: "10M" },
  ultra: { width: 3840, height: 2160, bitrate: "20M" },
};

/**
 * Video output formats
 */
export type VideoFormat = "mp4" | "webm" | "gif";

/**
 * Provider IDs
 */
export type ProviderId = "higgsfield" | "kling" | "openart" | "magnific" | "runway" | "pika" | "matrix";
