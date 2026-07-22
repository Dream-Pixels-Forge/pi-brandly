/**
 * brandly_director — Superproduction Director
 *
 * The Director is the orchestration brain for a multi-shot production.
 * Given a script with multiple shots, it:
 *   1. PLANS   — parses the script into an ordered production plan (production.json)
 *   2. DISPATCHES — returns the next shot to produce, one at a time, with a full brief
 *   3. TRACKS  — records each shot's status, clip, and credits as it completes
 *   4. ASSEMBLES — gathers every finished shot clip and cuts them into ONE final film
 *   5. DELIVERS — validates virality, exports the package, and reports the delivery
 *
 * The actual media generation for each shot is performed by the LLM (pi agent)
 * calling the generation tools (higgsfield_generate_video / brandly_download / etc.).
 * The Director owns STATE and ORDER so the whole thing converges to a single deliverable.
 *
 * Adapted for Pi's ExtensionAPI, reusing context + assembly/validate/export tools.
 */

import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile, readFile, readdir, copyFile } from "node:fs/promises";
import type { ToolContext } from "./tools/context.js";
import { isValidProjectId } from "./constants.js";
import { createValidateTool } from "./tools/validate.js";
import { createExportTool } from "./tools/export.js";
import { createSceneConsistencyTool } from "./tools/scene-consistency.js";

const DIRECTOR_VERSION = "1.0.0";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type ShotStatus = "pending" | "active" | "done" | "rework" | "failed";

export interface DirectorShot {
  shotId: string; // "shot-1"
  index: number;
  title?: string;
  description: string;
  prompt: string;
  model?: string;
  cameraMovement?: string;
  lighting?: string;
  durationSec: number;
  aspectRatio?: string;
  continuityFrom?: string; // shotId this shot should visually match
  dependsOn?: string[]; // shotIds that must be done first
  status: ShotStatus;
  clipPath?: string;
  creditsSpent?: number;
  notes?: string;
  score?: number;
  updatedAt?: string;
  // Canonical shots[] schema fields (Director-ready from script_agent)
  subject?: string;
  environment?: string;
  negativePrompt?: string;
}

export interface DirectorAssembly {
  order: string[]; // shotIds in final order
  style: string;
  transition: string;
  transitionDuration: number;
  fps: number;
  width: number;
  height: number;
  finalVideoPath?: string;
  assembledAt?: string;
}

export interface DirectorDelivery {
  viralityScore?: number;
  viralityReport?: string;
  exportPath?: string;
  deliveredAt?: string;
}

export interface DirectorPlan {
  id: string; // == projectId
  directorVersion: string;
  createdAt: string;
  updatedAt: string;
  status: "planned" | "in_production" | "assembling" | "delivered" | "paused";
  source: "script_agent" | "user_script" | "manual" | "project";
  style?: string;
  productName?: string;
  totalShots: number;
  shots: DirectorShot[];
  assembly?: DirectorAssembly;
  delivery?: DirectorDelivery;
  /** Visual-identity lock created at init via brandly_scene_consistency */
  consistency?: {
    enabled: boolean;
    characterIds: string[];
    primaryCharacterId?: string;
    shotCharacter: Record<string, string>; // shotId -> characterId
    rules: Record<string, unknown>;
  };
  /** MMX S2V consistency workflow for character/product identity */
  mmxConsistency?: {
    enabled: boolean;
    mode: string;
    model: string;
    referenceImages: string[];
    workflow: string[];
  };
}

// ----------------------------------------------------------------------------
// Persistence
// ----------------------------------------------------------------------------

function productionPath(ctx: ToolContext, projectID: string): string {
  return join(ctx.projectsDir, projectID, "production.json");
}

async function loadProduction(ctx: ToolContext, projectID: string): Promise<DirectorPlan> {
  const p = productionPath(ctx, projectID);
  if (!existsSync(p)) {
    throw new Error(`No production plan for project ${projectID}. Run action='init' first.`);
  }
  const content = await readFile(p, "utf-8");
  return JSON.parse(content) as DirectorPlan;
}

async function saveProduction(ctx: ToolContext, plan: DirectorPlan): Promise<void> {
  plan.updatedAt = new Date().toISOString();
  await mkdir(join(ctx.projectsDir, plan.id), { recursive: true });
  await writeFile(productionPath(ctx, plan.id), JSON.stringify(plan, null, 2), "utf-8");
}

// ----------------------------------------------------------------------------
// Script parsing
// ----------------------------------------------------------------------------

interface ParsedShot {
  index: number;
  title?: string;
  description: string;
  prompt: string;
  model?: string;
  cameraMovement?: string;
  lighting?: string;
  durationSec: number;
  aspectRatio?: string;
  subject?: string;
  environment?: string;
  negativePrompt?: string;
}

function parseDuration(text: string, fallback = 3): number {
  const m = text.match(/(\d+(?:\.\d+)?)\s*s\b/i) || text.match(/duration[:\s-]*(\d+)/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (n >= 1 && n <= 30) return n;
  }
  return fallback;
}

function parseAspectRatio(text: string): string | undefined {
  const m = text.match(/(\d+)\s*:\s*(\d+)/);
  return m ? `${m[1]}:${m[2]}` : undefined;
}

function firstMatch(line: string, keys: string[]): string | undefined {
  for (const k of keys) {
    const m = line.match(new RegExp(`${k}\\s*[:\\-]\\s*(.+)`, "i"));
    if (m) return m[1].trim();
  }
  return undefined;
}

/**
 * Parse a raw multi-shot script (markdown / bullet / table) into shot blocks.
 * Handles: "### Shot 1", "1.", "Shot 1:", markdown shot tables, and JSON.
 */
function parseMarkdownScript(text: string): ParsedShot[] {
  const lines = text.split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] | null = null;

  const shotStart = (s: string) =>
    /^\s*#{0,6}\s*(?:shot|scene|clip)\s*#?(\d+)/i.test(s) ||
    /^\s*(\d+)\.\s+/i.test(s) ||
    /^\s*[-*]\s*(?:shot|scene|clip)\s*#?(\d+)/i.test(s);

  for (const line of lines) {
    if (shotStart(line)) {
      if (current) blocks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current);

  // Fallback: no shot markers -> split on blank lines into <=12 chunks
  if (blocks.length === 0) {
    const chunks = text
      .split(/\n\s*\n/)
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 12);
    for (const c of chunks) blocks.push(c.split(/\r?\n/));
  }

  return blocks.map((block, i) => {
    const text2 = block.join("\n");
    const header = block[0] || "";
    const titleMatch = header.match(/(?:shot|scene|clip)\s*#?(\d+)\s*[:\-]?\s*(.*)/i);
    const title = titleMatch && titleMatch[2] ? titleMatch[2].trim() : undefined;

    let description = text2
      .split(/\r?\n/)
      .filter((l) => !/^(prompt|negative|model|camera|light|duration|aspect|subject|environment|action)\b/i.test(l.trim()) && l.trim())
      .join(" ")
      .trim();

    let prompt = firstMatch(text2, ["prompt"]) || description;
    const model = firstMatch(text2, ["model"]);
    const cameraMovement = firstMatch(text2, ["camera", "movement"]);
    const lighting = firstMatch(text2, ["light", "lighting"]);
    const aspectRatio = parseAspectRatio(text2) || undefined;
    const durationSec = parseDuration(text2);
    const subject = firstMatch(text2, ["subject"]) || undefined;
    const environment = firstMatch(text2, ["environment", "setting"]) || undefined;
    const negativePrompt = firstMatch(text2, ["negative", "neg"]) || undefined;

    return {
      index: i + 1,
      title,
      description: description.slice(0, 600),
      prompt: prompt.slice(0, 2400),
      model,
      cameraMovement,
      lighting,
      durationSec,
      aspectRatio,
      subject,
      environment,
      negativePrompt,
    };
  });
}

function parseScriptJson(raw: unknown): ParsedShot[] {
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  const arr: any[] =
    obj?.shots ?? obj?.assetPlan ?? obj?.asset_list ?? obj?.scenes ?? [];
  if (!Array.isArray(arr)) {
    throw new Error("scriptJson must contain a 'shots' (or 'assetPlan'/'scenes') array.");
  }
  return arr.map((s, i) => ({
    index: i + 1,
    title: s.title ?? s.name ?? (s.id !== undefined ? `Shot ${s.id}` : undefined),
    description: String(s.description ?? s.visualNotes ?? s.text ?? "").slice(0, 600),
    prompt: String(s.prompt ?? s.previewPrompt ?? s.description ?? "").slice(0, 2400),
    model: s.model,
    cameraMovement: s.cameraMovement ?? s.camera,
    lighting: s.lighting,
    durationSec: Number(s.duration ?? s.durationSec ?? 3),
    aspectRatio: s.aspectRatio,
    subject: s.subject ?? s.visualNotes,
    environment: s.environment ?? s.setting,
    negativePrompt: s.negativePrompt ?? s.negative,
  }));
}

async function readProjectScript(ctx: ToolContext, projectID: string): Promise<string | null> {
  const dirs = ctx.getProjectDirs(projectID);
  for (const rel of ["script/script.md", "script/storyboard.md", "script.md", "storyboard.md"]) {
    const p = join(dirs.project, rel);
    if (existsSync(p)) return await readFile(p, "utf-8");
  }
  // artifacts/script
  const artDir = join(dirs.project, "artifacts", "script");
  if (existsSync(artDir)) {
    const files = await readdir(artDir);
    const md = files.find((f) => f.endsWith(".md"));
    if (md) return await readFile(join(artDir, md), "utf-8");
  }
  return null;
}

// ----------------------------------------------------------------------------
// Visual-identity lock (reuses brandly_scene_consistency)
// ----------------------------------------------------------------------------

function inferCharType(subject: string, productName?: string): "person" | "product" | "object" {
  const s = subject.toLowerCase();
  if (/person|hero|man|woman|girl|boy|guy|people|character|face/.test(s)) return "person";
  if (
    /can|bottle|product|box|device|pack|cup|phone|car|watch|shoe|bag/.test(s) ||
    (productName && s.includes(productName.toLowerCase()))
  ) return "product";
  return "object";
}

function findProductImages(ctx: ToolContext, projectID: string): string[] {
  const dir = join(ctx.directory, "imagen", projectID);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .map((f) => join(dir, f));
}

/**
 * At init, lock every unique subject/product as a consistency reference so the
 * assembled film stays visually coherent shot-to-shot. Best-effort: never throws.
 */
async function lockConsistencyAtInit(
  ctx: ToolContext,
  projectID: string,
  project: any,
  plan: DirectorPlan
): Promise<void> {
  const sc = createSceneConsistencyTool(ctx);
  const subjects = new Set<string>();
  for (const shot of plan.shots) {
    if (shot.subject && shot.subject.trim()) subjects.add(shot.subject.trim());
  }
  if (subjects.size === 0 && project.name) subjects.add(project.name);
  if (subjects.size === 0) return; // nothing to lock

  const referenceImages = findProductImages(ctx, projectID);
  const attrs: Record<string, unknown> = {};
  const ia = project.imageAnalysis as Record<string, unknown> | undefined;
  if (ia) {
    if (ia.style) (attrs as any).style = ia.style;
    if (Array.isArray(ia.colors)) (attrs as any).colors = ia.colors;
  }

  await sc.execute({ action: "set_rules", projectID, rules: {
    maintainAppearance: true, lockColors: true, lockClothing: true, referenceStrength: "strict",
  } });

  const charIds: Record<string, string> = {};
  for (const subject of subjects) {
    const r: any = await sc.execute({
      action: "create_character",
      projectID,
      name: subject,
      type: inferCharType(subject, project.name),
      description: subject,
      referenceImages,
      attributes: attrs,
    });
    charIds[subject] = r.id;
  }

  const shotCharacter: Record<string, string> = {};
  const ids = Object.values(charIds);
  for (const shot of plan.shots) {
    const subj = shot.subject?.trim() || project.name || "";
    const cid = charIds[subj] || ids[0];
    if (!cid) continue;
    await sc.execute({
      action: "assign_to_scene",
      projectID,
      characterId: cid,
      sceneIndex: shot.index - 1,
      role: shot.index === 1 ? "primary" : "secondary",
      action_description: shot.description,
      position: "center",
    });
    shotCharacter[shot.shotId] = cid;
  }

  plan.consistency = {
    enabled: true,
    characterIds: ids,
    primaryCharacterId: ids[0],
    shotCharacter,
    rules: {
      maintainAppearance: true, lockColors: true, lockClothing: true, referenceStrength: "strict",
    },
  };

  // Store mmx S2V reference workflow for the Director agent
  plan.mmxConsistency = {
    enabled: true,
    mode: "s2v",
    model: "S2V-01",
    referenceImages,
    workflow: [
      "1. Use the first reference image as the subject-image for all shots",
      "2. Call brandly_mmx_video(action='generate', projectID, prompt=<shot-prompt>, subjectImage=<reference>)",
      "3. The S2V-01 model maintains character/product appearance across clips",
      "4. For the first shot, any reference image works; subsequent shots inherit consistency",
    ],
  };
}

// ----------------------------------------------------------------------------
// Production plan assembly
// ----------------------------------------------------------------------------

function buildPlan(
  projectID: string,
  parsed: ParsedShot[],
  source: DirectorPlan["source"],
  style?: string,
  productName?: string
): DirectorPlan {
  const shots: DirectorShot[] = parsed.map((p, i) => ({
    shotId: `shot-${p.index}`,
    index: p.index,
    title: p.title,
    description: p.description,
    prompt: p.prompt,
    model: p.model,
    cameraMovement: p.cameraMovement,
    lighting: p.lighting,
    durationSec: p.durationSec,
    aspectRatio: p.aspectRatio,
    continuityFrom: i > 0 ? `shot-${parsed[i - 1].index}` : undefined,
    dependsOn: [],
    status: "pending",
    subject: p.subject,
    environment: p.environment,
    negativePrompt: p.negativePrompt,
  }));

  const now = new Date().toISOString();
  return {
    id: projectID,
    directorVersion: DIRECTOR_VERSION,
    createdAt: now,
    updatedAt: now,
    status: "planned",
    source,
    style,
    productName,
    totalShots: shots.length,
    shots,
  };
}

// ----------------------------------------------------------------------------
// Dispatch logic
// ----------------------------------------------------------------------------

function getNextShot(plan: DirectorPlan): {
  shot?: DirectorShot;
  rework?: DirectorShot[];
  allDone: boolean;
} {
  const byId = new Map(plan.shots.map((s) => [s.shotId, s]));

  // 1. pending shot whose dependencies are satisfied
  for (const s of plan.shots) {
    if (s.status !== "pending") continue;
    const deps = s.dependsOn ?? [];
    if (deps.every((d) => byId.get(d)?.status === "done")) {
      return { shot: s, allDone: false };
    }
  }

  // 2. any shots still in rework
  const rework = plan.shots.filter((s) => s.status === "rework");
  if (rework.length > 0) return { rework, allDone: false };

  // 3. everything done
  return { allDone: true };
}

// ----------------------------------------------------------------------------
// Assembly (Director's cut) — ordered montage of exactly the shot clips
// ----------------------------------------------------------------------------

interface ClipRef {
  shotId: string;
  fileName: string; // name inside assets/
  srcPath: string;
  durationSec: number;
  title?: string;
}

function videoExt(p: string): string {
  const m = p.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/);
  return m ? m[1] : "mp4";
}

async function locateClip(ctx: ToolContext, projectID: string, shot: DirectorShot): Promise<string | null> {
  if (shot.clipPath && existsSync(shot.clipPath)) return shot.clipPath;
  const dir = join(ctx.directory, "videgen", projectID);
  if (!existsSync(dir)) return null;
  const files = await readdir(dir);
  // Use anchored regex to prevent shot-1 matching shot-10/shot-11/etc.
  const shotIdPattern = shot.shotId.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const match = files.find(
    (f) => /\.(mp4|webm|mov)$/i.test(f) && new RegExp(`^${shotIdPattern}\.(mp4|webm|mov)$`, "i").test(f)
  );
  return match ? join(dir, match) : null;
}

function generateDirectorComposition(
  plan: DirectorPlan,
  projectName: string,
  clips: ClipRef[],
  opts: { fps: number; width: number; height: number; transition: string; transitionDuration: number; bgMusic?: string }
): string {
  const { fps, width, height, transition, transitionDuration } = opts;
  const clipImports = clips.map((c, i) => `import Clip_${i} from "../assets/${c.fileName}";`).join("\n");
  const bgImport = opts.bgMusic ? `import BgMusic from "../assets/${opts.bgMusic}";` : "";

  let cursor = 0;
  const sequenceBlocks = clips
    .map((c, i) => {
      const frameStart = cursor;
      const durationFrames = Math.max(1, Math.round(c.durationSec * fps));
      cursor += durationFrames;
      const titleBlock = c.title
        ? `<div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "white", fontSize: 42, fontWeight: "bold", textShadow: "2px 2px 8px rgba(0,0,0,0.7)", fontFamily: "Arial, sans-serif", background: "rgba(0,0,0,0.35)", padding: "6px 20px", borderRadius: 8 }}>${c.title}</div>`
        : "";
      return `      <Sequence from={${frameStart}} durationInFrames={${durationFrames}}>
        <Video src={Clip_${i}} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ${titleBlock}
      </Sequence>`;
    })
    .join("\n");

  const totalFrames = cursor;
  const bgAudio = opts.bgMusic ? `      <Audio src={BgMusic} volume={0.8} />` : "";

  return `import { Composition, Sequence, Audio, Video } from "remotion";
${clipImports}
${bgImport}

const DirectorCut = () => {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "black" }}>
${sequenceBlocks}
${bgAudio}
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="${projectName.replace(/[^a-zA-Z0-9]/g, "")}"
      component={DirectorCut}
      durationInFrames={${totalFrames}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateRootIndex(projectName: string): string {
  return `import { registerRoot } from "remotion";
import { RemotionComposition } from "./Composition";

registerRoot(RemotionComposition);
`;
}

function generateRemotionConfig(): string {
  return `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
`;
}

function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2018",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        lib: ["DOM", "ES2018"],
        noEmit: true,
      },
      include: ["src"],
    },
    null,
    2
  );
}

function generatePackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/\s+/g, "-") + "-director-cut",
      version: "1.0.0",
      private: true,
      scripts: {
        start: "npx remotion studio",
        build: "npx remotion render src/index.ts " + projectName.replace(/[^a-zA-Z0-9]/g, "") + " out/director-cut.mp4",
      },
      dependencies: {
        "@remotion/cli": "^4.0.0",
        remotion: "^4.0.0",
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@types/react": "^18.2.0",
        typescript: "^5.4.0",
      },
    },
    null,
    2
  );
}

function generateBuildScript(assemblyDir: string, outputPath: string, compositionId: string): string {
  return `#!/bin/bash
# Brandly Director's Cut — Assembly Build
set -e
echo "🎬 Assembling Director's cut: ${assemblyDir}"
[ ! -d node_modules ] && npm install
npx remotion render src/index.ts ${compositionId} "${outputPath}" --codec h264
echo "✅ Delivered: ${outputPath}"
`;
}

async function assembleProduction(
  ctx: ToolContext,
  plan: DirectorPlan,
  opts: { style?: string; transition?: string; transitionDuration?: number; fps?: number; width?: number; height?: number; outputPath?: string; showTitles?: boolean; backgroundMusicPath?: string }
): Promise<{ outputPath: string; clips: string[]; assemblyDir: string }> {
  const projectID = plan.id;
  const projectName = plan.productName || `brandly-${projectID.slice(0, 8)}`;

  // 1. Collect done clips in shot order
  const clips: ClipRef[] = [];
  for (const shot of plan.shots) {
    if (shot.status !== "done") {
      throw new Error(`Shot ${shot.shotId} is '${shot.status}', not 'done'. Complete all shots before assembling.`);
    }
    const src = await locateClip(ctx, projectID, shot);
    if (!src) {
      throw new Error(`No clip found for ${shot.shotId}. Set clipPath on complete, or place it in videgen/${projectID}/.`);
    }
    const fileName = `${shot.shotId}.${videoExt(src)}`;
    clips.push({ shotId: shot.shotId, fileName, srcPath: src, durationSec: shot.durationSec, title: opts.showTitles ? shot.title : undefined });
  }

  const fps = opts.fps ?? 30;
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1920;
  const transition = opts.transition ?? "fade";
  const transitionDuration = opts.transitionDuration ?? 0.5;

  // 2. Write project
  const assemblyDir = join(ctx.directory, "assembly", projectID, "director");
  const srcDir = join(assemblyDir, "src");
  const assetsDir = join(assemblyDir, "assets");
  const outDir = join(assemblyDir, "out");
  await mkdir(srcDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  for (const c of clips) {
    const dest = join(assetsDir, c.fileName);
    if (!existsSync(dest)) await copyFile(c.srcPath, dest);
  }

  let bgMusic: string | undefined;
  if (opts.backgroundMusicPath && existsSync(opts.backgroundMusicPath)) {
    bgMusic = `bgmusic${opts.backgroundMusicPath.substring(opts.backgroundMusicPath.lastIndexOf("."))}`;
    await copyFile(opts.backgroundMusicPath, join(assetsDir, bgMusic));
  } else {
    const audDir = join(ctx.directory, "audgen", projectID);
    if (existsSync(audDir)) {
      const audio = (await readdir(audDir)).find((f) => /\.(mp3|wav|ogg)$/i.test(f));
      if (audio) {
        bgMusic = audio;
        await copyFile(join(audDir, audio), join(assetsDir, audio));
      }
    }
  }

  const compositionCode = generateDirectorComposition(plan, projectName, clips, {
    fps,
    width,
    height,
    transition,
    transitionDuration,
    bgMusic,
  });
  await writeFile(join(srcDir, "Composition.tsx"), compositionCode, "utf-8");
  await writeFile(join(srcDir, "index.ts"), generateRootIndex(projectName), "utf-8");
  await writeFile(join(assemblyDir, "remotion.config.ts"), generateRemotionConfig(), "utf-8");
  await writeFile(join(assemblyDir, "tsconfig.json"), generateTsConfig(), "utf-8");
  await writeFile(join(assemblyDir, "package.json"), generatePackageJson(projectName), "utf-8");

  const outputPath =
    opts.outputPath || join(outDir, `${projectName.toLowerCase().replace(/\s+/g, "-")}-director-cut.mp4`);
  const compositionId = projectName.replace(/[^a-zA-Z0-9]/g, "");
  await writeFile(join(assemblyDir, "build.sh"), generateBuildScript(assemblyDir, outputPath, compositionId), "utf-8");

  plan.assembly = {
    order: clips.map((c) => c.shotId),
    style: opts.style || plan.style || "cinematic",
    transition,
    transitionDuration,
    fps,
    width,
    height,
    finalVideoPath: outputPath,
    assembledAt: new Date().toISOString(),
  };
  plan.status = "assembling";
  await saveProduction(ctx, plan);

  return { outputPath, clips: clips.map((c) => c.fileName), assemblyDir };
}

// ----------------------------------------------------------------------------
// Delivery
// ----------------------------------------------------------------------------

async function deliverProduction(
  ctx: ToolContext,
  plan: DirectorPlan,
  opts: { exportPath?: string }
): Promise<DirectorDelivery> {
  if (!plan.assembly?.finalVideoPath) {
    throw new Error("Nothing assembled yet. Run action='assemble' first.");
  }
  const projectID = plan.id;
  const delivery: DirectorDelivery = { deliveredAt: new Date().toISOString() };

  try {
    const validate = createValidateTool(ctx);
    const vResult: any = await validate.execute({
      projectID,
      videoPath: plan.assembly.finalVideoPath,
    });
    delivery.viralityScore =
      typeof vResult?.score === "number" ? vResult.score : undefined;
    delivery.viralityReport = vResult?.message || vResult?.details?.message || JSON.stringify(vResult)?.slice(0, 500);
  } catch (e) {
    delivery.viralityReport = `Validation skipped: ${(e as Error).message}`;
  }

  try {
    const exporter = createExportTool(ctx);
    const eResult: any = await exporter.execute({ projectID, outputPath: opts.exportPath });
    delivery.exportPath = eResult?.outputPath || eResult?.exportPath || opts.exportPath;
  } catch (e) {
    delivery.exportPath = undefined;
  }

  plan.delivery = delivery;
  plan.status = "delivered";
  await saveProduction(ctx, plan);
  return delivery;
}

// ----------------------------------------------------------------------------
// Board / status rendering
// ----------------------------------------------------------------------------

function renderBoard(plan: DirectorPlan): string {
  const done = plan.shots.filter((s) => s.status === "done").length;
  const pct = plan.totalShots ? Math.round((done / plan.totalShots) * 100) : 0;
  const rows = plan.shots
    .map((s) => {
      const cont = s.continuityFrom ? ` → matches ${s.continuityFrom}` : "";
      return `  ${s.shotId.padEnd(8)} [${s.status.toUpperCase().padEnd(8)}] ${s.title || s.description.slice(0, 40)}${cont}`;
    })
    .join("\n");
  const lockLine = plan.consistency?.enabled
    ? `\n🔒 Identity locked: ${plan.consistency.characterIds.length} reference(s) — shot-to-shot coherence ON`
    : "";
  return `🎬 DIRECTOR'S PRODUCTION BOARD — ${plan.productName || plan.id}
Status: ${plan.status}   Progress: ${done}/${plan.totalShots} (${pct}%)
Source: ${plan.source}${lockLine}
${rows}`;
}

// ----------------------------------------------------------------------------
// Tool entry
// ----------------------------------------------------------------------------

export function createDirectorTool(ctx: ToolContext) {
  return {
    name: "brandly_director",
    description:
      "Superproduction Director — orchestrates a multi-shot script into one final film. Plan the production, dispatch shot-by-shot creation, track each shot, then assemble all shots and deliver.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "init",
            "plan",
            "next",
            "complete",
            "rework",
            "status",
            "assemble",
            "deliver",
            "pause",
            "resume",
          ],
          description: "Director action",
        },
        projectID: { type: "string", description: "The project UUID" },
        scriptJson: {
          type: "object",
          description:
            "Canonical shots[] schema (script_agent output feeds in directly): { shots: [ { id, title?, description, subject?, environment?, prompt, negativePrompt?, model?, cameraMovement?, lighting?, duration?, aspectRatio? } ] }",
        },
        scriptText: { type: "string", description: "Raw multi-shot script text to parse" },
        style: { type: "string", description: "Video style (cinematic, ugc, montage, ...)" },
        shotId: { type: "string", description: "Shot ID for complete/rework (e.g. 'shot-1')" },
        clipPath: { type: "string", description: "Path to the finished clip for this shot" },
        credits: { type: "number", description: "Credits spent generating this shot" },
        newPrompt: { type: "string", description: "New prompt when marking a shot for rework" },
        notes: { type: "string", description: "Optional notes" },
        assemblyStyle: { type: "string", description: "Assembly style preset" },
        transitionType: { type: "string", enum: ["fade", "slide", "wipe", "none"], default: "fade" },
        transitionDuration: { type: "number", default: 0.5 },
        fps: { type: "number", default: 30 },
        width: { type: "number", default: 1080 },
        height: { type: "number", default: 1920 },
        showTitles: { type: "boolean", default: false },
        backgroundMusicPath: { type: "string", description: "Optional bg music file" },
        outputPath: { type: "string", description: "Output path for assembled/delivered video" },
      },
      required: ["action", "projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const a = args as Record<string, any>;
      const action = a.action as string;
      const projectID = a.projectID as string;

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      switch (action) {
        // ----------------------------------------------------------------
        case "init": {
          let parsed: ParsedShot[];
          let source: DirectorPlan["source"] = "manual";

          if (a.scriptJson) {
            parsed = parseScriptJson(a.scriptJson);
            source = "script_agent";
          } else if (a.scriptText) {
            parsed = parseMarkdownScript(a.scriptText);
            source = "user_script";
          } else {
            const existing = await readProjectScript(ctx, projectID);
            if (!existing) {
              throw new Error(
                "No script provided. Pass scriptJson, scriptText, or ensure the project has a script.md (run brandly_run_project for 'script' first)."
              );
            }
            parsed = parseMarkdownScript(existing);
            source = "project";
          }

          if (parsed.length === 0) {
            throw new Error("Could not parse any shots from the provided script. Use a structured script with 'Shot 1', '1.', or a shots[] JSON.");
          }

          const plan = buildPlan(
            projectID,
            parsed,
            source,
            (a.style as string) || project.style,
            project.name
          );
          await saveProduction(ctx, plan);

          // Best-effort visual-identity lock so the film stays coherent shot-to-shot.
          if (a.lockConsistency !== false) {
            try {
              await lockConsistencyAtInit(ctx, projectID, project, plan);
              await saveProduction(ctx, plan);
            } catch (e) {
              // Non-fatal: continuity chaining still works without the lock.
              console.error("[director] consistency lock skipped:", (e as Error).message);
            }
          }

          return {
            status: "planned",
            projectId: projectID,
            totalShots: plan.totalShots,
            source,
            board: renderBoard(plan),
            next: "Call action='next' to get the first shot brief, then generate it with the video tools.",
            message: `🎬 Production planned with ${plan.totalShots} shots for "${project.name}".`,
          };
        }

        // ----------------------------------------------------------------
        case "plan":
        case "status": {
          const plan = await loadProduction(ctx, projectID);
          const done = plan.shots.filter((s) => s.status === "done").length;
          const pct = plan.totalShots ? Math.round((done / plan.totalShots) * 100) : 0;
          const next = getNextShot(plan);
          let nextAction = "Continue production";
          if (next.shot) {
            nextAction = `Generate ${next.shot.shotId} → then action='complete' with its clipPath.`;
          } else if (next.rework?.length) {
            nextAction = `Rework: ${next.rework.map((s) => s.shotId).join(", ")}.`;
          } else if (next.allDone) {
            nextAction = "All shots done → action='assemble'.";
          }
          return {
            status: plan.status,
            progress: `${done}/${plan.totalShots} (${pct}%)`,
            board: renderBoard(plan),
            nextAction,
            assembly: plan.assembly || null,
            delivery: plan.delivery || null,
          };
        }

        // ----------------------------------------------------------------
        case "next": {
          const plan = await loadProduction(ctx, projectID);
          if (plan.status === "planned") plan.status = "in_production";
          const next = getNextShot(plan);
          await saveProduction(ctx, plan);

          if (next.shot) {
            const s = next.shot;
            const doneBefore = plan.shots.filter((x) => x.status === "done").length;
            const contShot = s.continuityFrom
              ? plan.shots.find((x) => x.shotId === s.continuityFrom)
              : undefined;
            const consistencyCharId = plan.consistency?.enabled
              ? plan.consistency.shotCharacter[s.shotId]
              : undefined;
            const sceneIndex = s.index - 1;
            const instructions: string[] = [];
            if (consistencyCharId) {
              // MMX S2V consistency workflow
              const refImages = plan.mmxConsistency?.referenceImages || [];
              const s2vRef = refImages[0];
              if (s2vRef) {
                instructions.push(
                  `0. LOCK IDENTITY (MMX S2V): call brandly_mmx_video(action="generate", projectID="${projectID}", prompt="${s.prompt}", subjectImage="${s2vRef}") to maintain ${s.subject || plan.productName}'s appearance via S2V-01 model.`
                );
              } else {
                instructions.push(
                  `0. LOCK IDENTITY: call brandly_scene_consistency(action="generate_consistent_prompt", projectID="${projectID}", sceneIndex=${sceneIndex}, basePrompt="${s.prompt}") and use its returned prompt so ${s.subject || plan.productName} stays identical across shots. Reference images: consistency/${projectID}/`
                );
              }
            }
            instructions.push(
              `${consistencyCharId ? "1" : "1"}. Generate clip for ${s.shotId} using the prompt above${s.model ? ` (suggested model: ${s.model})` : ""}.`,
              s.continuityFrom
                ? `${consistencyCharId ? "2" : "2"}. Keep visual continuity with ${s.continuityFrom} (use its clip ${contShot?.clipPath ? `at ${contShot.clipPath}` : ""} as reference).`
                : `${consistencyCharId ? "2" : "2"}. No continuity dependency.`,
              `${consistencyCharId ? "3" : "3"}. Save the clip to videgen/${projectID}/ or note its path.`,
              `${consistencyCharId ? "4" : "4"}. Call action='complete' with shotId='${s.shotId}' and clipPath='<path>'.`
            );
            return {
              status: "dispatch",
              shotId: s.shotId,
              index: s.index,
              position: `${doneBefore + 1} of ${plan.totalShots}`,
              title: s.title,
              description: s.description,
              subject: s.subject || null,
              environment: s.environment || null,
              negativePrompt: s.negativePrompt || null,
              prompt: s.prompt,
              model: s.model,
              cameraMovement: s.cameraMovement,
              lighting: s.lighting,
              durationSec: s.durationSec,
              aspectRatio: s.aspectRatio,
              continuityFrom: s.continuityFrom || null,
              continuityClip: contShot?.clipPath || null,
              consistencyCharacterId: consistencyCharId || null,
              sceneIndex: consistencyCharId ? sceneIndex : null,
              instructions,
              message: `🎥 Next up: ${s.shotId} (${doneBefore + 1}/${plan.totalShots}).`,
            };
          }

          if (next.rework?.length) {
            return {
              status: "rework",
              shots: next.rework.map((s) => ({ shotId: s.shotId, prompt: s.prompt, notes: s.notes })),
              message: `🔧 ${next.rework.length} shot(s) need rework.`,
            };
          }

          return {
            status: "all_done",
            message: "✅ All shots complete. Call action='assemble' to cut the final film.",
          };
        }

        // ----------------------------------------------------------------
        case "complete": {
          const plan = await loadProduction(ctx, projectID);
          const s = plan.shots.find((x) => x.shotId === a.shotId);
          if (!s) throw new Error(`Unknown shotId: ${a.shotId}`);
          s.status = "done";
          s.clipPath = a.clipPath as string;
          if (typeof a.credits === "number") s.creditsSpent = a.credits;
          if (a.notes) s.notes = a.notes;
          s.updatedAt = new Date().toISOString();
          plan.status = "in_production";
          await saveProduction(ctx, plan);

          const remaining = plan.shots.filter((x) => x.status !== "done").length;
          return {
            status: "completed_shot",
            shotId: s.shotId,
            clipPath: s.clipPath,
            remaining,
            message:
              remaining > 0
                ? `✅ ${s.shotId} recorded. ${remaining} shot(s) left — call action='next'.`
                : `✅ ${s.shotId} recorded. All shots done — call action='assemble'.`,
            board: renderBoard(plan),
          };
        }

        // ----------------------------------------------------------------
        case "rework": {
          const plan = await loadProduction(ctx, projectID);
          const s = plan.shots.find((x) => x.shotId === a.shotId);
          if (!s) throw new Error(`Unknown shotId: ${a.shotId}`);
          if (a.newPrompt) s.prompt = a.newPrompt;
          s.status = "rework";
          s.notes = a.notes || s.notes;
          s.updatedAt = new Date().toISOString();
          await saveProduction(ctx, plan);
          return {
            status: "rework_queued",
            shotId: s.shotId,
            prompt: s.prompt,
            message: `🔧 ${s.shotId} marked for rework. Regenerate it, then action='complete'.`,
            board: renderBoard(plan),
          };
        }

        // ----------------------------------------------------------------
        case "assemble": {
          const plan = await loadProduction(ctx, projectID);
          const result = await assembleProduction(ctx, plan, {
            style: a.assemblyStyle,
            transition: a.transitionType,
            transitionDuration: a.transitionDuration,
            fps: a.fps,
            width: a.width,
            height: a.height,
            outputPath: a.outputPath,
            showTitles: a.showTitles,
            backgroundMusicPath: a.backgroundMusicPath,
          });
          return {
            status: "assembled",
            outputPath: result.outputPath,
            assemblyDir: result.assemblyDir,
            clips: result.clips,
            message: `🎬 Director's cut assembled with ${result.clips.length} shots → ${result.outputPath}`,
            next: "Render with Remotion (cd <assemblyDir> && bash build.sh), then action='deliver'.",
          };
        }

        // ----------------------------------------------------------------
        case "deliver": {
          const plan = await loadProduction(ctx, projectID);
          const delivery = await deliverProduction(ctx, plan, { exportPath: a.outputPath });
          return {
            status: "delivered",
            viralityScore: delivery.viralityScore,
            viralityReport: delivery.viralityReport,
            exportPath: delivery.exportPath,
            message: `🚀 Delivered! Final film: ${plan.assembly?.finalVideoPath}${delivery.exportPath ? ` | Package: ${delivery.exportPath}` : ""}`,
            board: renderBoard(plan),
          };
        }

        // ----------------------------------------------------------------
        case "pause": {
          const plan = await loadProduction(ctx, projectID);
          plan.status = "paused";
          await saveProduction(ctx, plan);
          return { status: "paused", message: "⏸ Production paused." };
        }
        case "resume": {
          const plan = await loadProduction(ctx, projectID);
          plan.status = plan.shots.every((s) => s.status === "done") ? "assembling" : "in_production";
          await saveProduction(ctx, plan);
          return { status: "resumed", message: "▶ Production resumed." };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  };
}
