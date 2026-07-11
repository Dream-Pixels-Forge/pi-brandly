/**
 * pi-brandly context factory
 * Adapted from brandly-plugin for Pi's ExtensionAPI
 * 
 * Key adaptation: Uses .pi/brandly/ for project storage (trusted by Pi's trust system)
 */

import { join } from "node:path";
import {
  readFile,
  writeFile,
  readdir,
  rename,
  unlink,
  mkdir,
} from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { ProjectData } from "../types";
import {
  STYLE_COSTS,
  SHOT_COSTS,
  PHASE_ORDER,
  BRANDLY_DIR,
  PROJECTS_DIR,
  USER_PREFS_FILE,
  IMAGEN_DIR,
  VIDEOGEN_DIR,
  AUDGEN_DIR,
  type VideoStyle,
} from "../constants";

/**
 * Path validation: ensure path stays within allowed directories
 */
function isPathAllowed(filePath: string, baseDir: string): boolean {
  const resolved = join(baseDir, filePath);
  return resolved.startsWith(baseDir);
}

/**
 * Get artifact paths for a project phase
 */
function getArtifactPaths(projectDir: string, phase: string): string[] {
  const artifactDir = join(projectDir, "artifacts", phase);
  if (!existsSync(artifactDir)) {
    return [];
  }
  return readdirSync(artifactDir)
    .filter((f: string) => f.endsWith(".md") || f.endsWith(".json"))
    .map((f: string) => join(artifactDir, f));
}

/**
 * Calculate cost estimate for a phase range
 */
function getPhaseCostEstimate(
  style: string,
  shotCount: number,
  currentPhase: string,
  targetPhase: string
): number {
  const styleCost = STYLE_COSTS[style as VideoStyle] || 200;
  const shotCost = SHOT_COSTS[shotCount] || 0;

  const startIdx = PHASE_ORDER.indexOf(currentPhase as any);
  const endIdx = PHASE_ORDER.indexOf(targetPhase as any);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return 0;
  }

  const phasesRemaining = endIdx - startIdx;
  const baseTotal = styleCost + shotCost;
  return Math.round((baseTotal * phasesRemaining) / PHASE_ORDER.length);
}

/**
 * ToolContext for pi-brandly tools
 * Provides all file I/O and project management utilities
 */
export interface ToolContext {
  /** Workspace root directory (from Pi's ExtensionContext.cwd) */
  directory: string;
  /** .pi/brandly/ directory */
  brandlyDir: string;
  /** .pi/brandly/projects/ directory */
  projectsDir: string;
  /** imagen/ directory (workspace-relative) */
  imagesDir: string;
  /** videgen/ directory (workspace-relative) */
  artifactsDir: string;
  /** audgen/ directory (workspace-relative) */
  audioDir: string;
  /** agents/ directory (extension-bundled) */
  agentsDir: string;
  /** Write file atomically (temp + rename) */
  writeAtomic: (path: string, content: string) => Promise<void>;
  /** Write project data */
  writeProject: (id: string, data: ProjectData) => Promise<void>;
  /** Read project data */
  readProject: (id: string) => Promise<ProjectData | null>;
  /** List all project IDs */
  listProjects: () => Promise<string[]>;
  /** Validate path is allowed */
  isPathAllowed: (filePath: string) => boolean;
  /** Get artifact paths for a phase */
  getArtifactPaths: (projectDir: string, phase: string) => string[];
  /** Calculate cost estimate */
  getPhaseCostEstimate: (
    style: string,
    shotCount: number,
    currentPhase: string,
    targetPhase: string
  ) => number;
  /** Read user preferences */
  readPreferences: () => Promise<Record<string, unknown>>;
  /** Write user preferences */
  writePreferences: (prefs: Record<string, unknown>) => Promise<void>;
  /** Get project directory paths */
  getProjectDirs: (id: string) => {
    project: string;
    imagen: string;
    videgen: string;
    audgen: string;
    analysis: string;
    script: string;
    storyboard: string;
    assets: string;
    audio: string;
  };
}

/**
 * Create ToolContext for a given workspace
 * 
 * @param workspaceDir - The workspace root (from Pi's ExtensionContext.cwd)
 * @param extensionDir - The extension's own directory (for bundled agents)
 */
export function createContext(workspaceDir: string, extensionDir: string): ToolContext {
  // Project storage in .pi/brandly/ (trusted by Pi's trust system)
  const BRANDLY_PATH = join(workspaceDir, ".pi", BRANDLY_DIR);
  const PROJECTS_PATH = join(BRANDLY_PATH, PROJECTS_DIR);
  
  // Generated media in workspace root
  const IMAGES_PATH = join(workspaceDir, IMAGEN_DIR);
  const ARTIFACTS_PATH = join(workspaceDir, VIDEOGEN_DIR);
  const AUDIO_PATH = join(workspaceDir, AUDGEN_DIR);
  
  // Agents bundled with the extension
  const AGENTS_PATH = join(extensionDir, "agents");

  async function writeAtomic(filePath: string, content: string): Promise<void> {
    const dir = join(filePath, "..");
    await mkdir(dir, { recursive: true });

    const tempPath = join(
      tmpdir(),
      `brandly-${randomUUID()}-${Date.now()}.tmp`
    );

    try {
      await writeFile(tempPath, content, "utf-8");
      await rename(tempPath, filePath);
    } catch (err) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    }
  }

  async function writeProject(id: string, data: ProjectData): Promise<void> {
    const projectDir = join(PROJECTS_PATH, id);
    await mkdir(projectDir, { recursive: true });
    const filePath = join(projectDir, "project.json");
    await writeAtomic(filePath, JSON.stringify(data, null, 2));
  }

  async function readProject(id: string): Promise<ProjectData | null> {
    const filePath = join(PROJECTS_PATH, id, "project.json");
    if (!existsSync(filePath)) {
      return null;
    }
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ProjectData;
  }

  async function listProjects(): Promise<string[]> {
    if (!existsSync(PROJECTS_PATH)) {
      return [];
    }
    const entries = await readdir(PROJECTS_PATH, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }

  async function readPreferences(): Promise<Record<string, unknown>> {
    const prefsPath = join(BRANDLY_PATH, USER_PREFS_FILE);
    if (!existsSync(prefsPath)) {
      return {};
    }
    const content = await readFile(prefsPath, "utf-8");
    return JSON.parse(content);
  }

  async function writePreferences(prefs: Record<string, unknown>): Promise<void> {
    await mkdir(BRANDLY_PATH, { recursive: true });
    const prefsPath = join(BRANDLY_PATH, USER_PREFS_FILE);
    await writeAtomic(prefsPath, JSON.stringify(prefs, null, 2));
  }

  function getProjectDirs(id: string) {
    const project = join(PROJECTS_PATH, id);
    return {
      project,
      imagen: join(IMAGES_PATH, id),
      videgen: join(ARTIFACTS_PATH, id),
      audgen: join(AUDIO_PATH, id),
      analysis: join(project, "analysis"),
      script: join(project, "script"),
      storyboard: join(project, "storyboard"),
      assets: join(project, "assets"),
      audio: join(project, "audio"),
    };
  }

  return {
    directory: workspaceDir,
    brandlyDir: BRANDLY_PATH,
    projectsDir: PROJECTS_PATH,
    imagesDir: IMAGES_PATH,
    artifactsDir: ARTIFACTS_PATH,
    audioDir: AUDIO_PATH,
    agentsDir: AGENTS_PATH,
    writeAtomic,
    writeProject,
    readProject,
    listProjects,
    isPathAllowed: (p: string) => isPathAllowed(p, workspaceDir),
    getArtifactPaths: (projectDir: string, phase: string) =>
      getArtifactPaths(projectDir, phase),
    getPhaseCostEstimate,
    readPreferences,
    writePreferences,
    getProjectDirs,
  };
}
