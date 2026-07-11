/**
 * pi-brandly types
 * Adapted from brandly-plugin (OpenCode) for Pi's ExtensionAPI
 */

import type { VideoStyle } from "./constants";

export interface BrandlyConfig {
  defaultBudget?: number;
  maxBudget?: number;
}

/**
 * Project data stored in .pi/brandly/projects/{id}/project.json
 */
export interface ProjectData {
  id: string;
  name?: string;
  description?: string;
  status: "pending" | "running" | "completed" | "failed" | "paused" | "cancelled";
  style: VideoStyle;
  shotCount: number;
  budget: number;
  spent: number;
  currentPhase: string;
  phases: Record<string, PhaseResult>;
  hooks?: string[];
  settings?: string[];
  targetPlatforms?: string[];
  imageAnalysis?: Record<string, unknown>;
  // New fields for advanced features
  provider?: string;
  previewMode?: boolean;
  previewApproved?: boolean;
  reEditHistory?: ReEditEntry[];
  postGenViralityScore?: number;
  idea?: string;
  productName?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  brandKit?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PhaseResult {
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
  artifacts?: string[];
}

export interface ReEditEntry {
  shotId: string;
  originalPrompt: string;
  newPrompt: string;
  timestamp: string;
  result?: string;
}

export interface TrendReport {
  summary: string;
  patterns: string[];
  recommendations: string[];
  timestamp: string;
}

export interface ConceptData {
  title: string;
  description: string;
  visualStyle: string;
  narrative: string;
  characters?: string[];
  setting?: string;
}

export interface ScriptData {
  scenes: ScriptScene[];
  duration: number;
  tone: string;
  pacing: string;
}

export interface ScriptScene {
  id: number;
  description: string;
  duration: number;
  dialogue?: string;
  visualNotes?: string;
}

export interface AssetPlan {
  assets: AssetItem[];
  style: string;
  mood: string;
}

export interface AssetItem {
  id: string;
  type: "image" | "video" | "audio" | "3d";
  description: string;
  prompt: string;
  aspectRatio?: string;
  duration?: number;
}

export interface AudioPlan {
  tracks: AudioTrack[];
  style: string;
  mood: string;
}

export interface AudioTrack {
  id: string;
  type: "music" | "sfx" | "voiceover";
  description: string;
  prompt: string;
  duration?: number;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface CostEstimate {
  style: VideoStyle;
  shotCount: number;
  baseCost: number;
  shotCost: number;
  totalCost: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "upscale" | "multi";
  capabilities: string[];
  models: string[];
  bestFor: string[];
  website: string;
}

export interface DownloadedFile {
  url: string;
  localPath: string;
  mediaType: string;
  filename: string;
  downloadedAt: string;
}
