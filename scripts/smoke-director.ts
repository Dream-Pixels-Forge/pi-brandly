import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createContext } from "../src/tools/context.js";
import { createDirectorTool } from "../src/director.js";
import { generateProjectId } from "../src/constants.js";

const ws = mkdtempSync(join(tmpdir(), "brandly-test-"));
const ctx = createContext(ws, join(ws, "ext"));
const director = createDirectorTool(ctx);

async function fakeProject(): Promise<string> {
  const id = generateProjectId();
  await ctx.writeProject(id, {
    id,
    name: "TestProd",
    status: "running",
    style: "cinematic",
    shotCount: 2,
    budget: 500,
    spent: 0,
    currentPhase: "script",
    phases: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);
  return id;
}

async function main(): Promise<void> {
// ---------------------------------------------------------------------------
// Scenario A: markdown script (continuity chaining)
// ---------------------------------------------------------------------------
{
  const projectID = await fakeProject();
  const script = `### Shot 1 — Hook
Product slams onto marble, 3s, camera dolly in
Prompt: a can slams onto marble counter, golden hour
### Shot 2 — Reveal
Liquid pours in slow motion, 4s
Prompt: matcha liquid pours, slow-mo, continuity with shot-1`;

  let r: any = await director.execute({ action: "init", projectID, scriptText: script });
  console.log("[A] INIT       ->", r.status, "shots:", r.totalShots);
  r = await director.execute({ action: "next", projectID });
  console.log("[A] NEXT 1     ->", r.shotId, "| continuity:", r.continuityFrom);
  const vg = join(ws, "videgen", projectID);
  await mkdir(vg, { recursive: true });
  await writeFile(join(vg, "shot-1.mp4"), "x");
  await director.execute({ action: "complete", projectID, shotId: "shot-1", clipPath: join(vg, "shot-1.mp4"), credits: 15 });
  r = await director.execute({ action: "next", projectID });
  console.log("[A] NEXT 2     ->", r.shotId, "| continuityClip set:", !!r.continuityClip);
  await writeFile(join(vg, "shot-2.mp4"), "x");
  await director.execute({ action: "complete", projectID, shotId: "shot-2", clipPath: join(vg, "shot-2.mp4") });
  r = await director.execute({ action: "next", projectID });
  console.log("[A] NEXT 3     ->", r.status, "(expect all_done)");
  r = await director.execute({ action: "assemble", projectID, showTitles: true });
  console.log("[A] ASSEMBLE   ->", r.status, "| clips:", r.clips.join(","));
}

// ---------------------------------------------------------------------------
// Scenario B: canonical shots[] JSON (output of script_agent) — new fields
// ---------------------------------------------------------------------------
{
  const projectID = await fakeProject();
  const scriptJson = {
    shots: [
      {
        id: 1,
        title: "Hook",
        description: "Product slams onto a marble counter",
        subject: "MatchaQuick can",
        environment: "Minimalist kitchen counter",
        prompt: "MatchaQuick can slams onto marble, golden hour backlight, slow dolly in",
        negativePrompt: "blurry, distorted, text overlay",
        model: "kling3_0",
        cameraMovement: "slow dolly in",
        lighting: "golden hour backlight",
        duration: 3,
        aspectRatio: "9:16",
      },
      {
        id: 2,
        title: "Reveal",
        description: "Liquid pours in ultra slow motion",
        subject: "Matcha liquid",
        environment: "Same counter",
        prompt: "Matcha liquid pours in ultra slow-mo, continuity with prior shot, soft studio key",
        negativePrompt: "blurry, distorted",
        model: "seedance_2_0",
        cameraMovement: "push in",
        lighting: "soft studio key",
        duration: 4,
      },
    ],
  };

  let r: any = await director.execute({ action: "init", projectID, scriptJson });
  console.log("\n[B] INIT       ->", r.status, "shots:", r.totalShots, "| source:", r.source, "(expect script_agent)");
  r = await director.execute({ action: "next", projectID });
  console.log("[B] NEXT 1     ->", r.shotId);
  console.log("    subject:", r.subject, "| env:", r.environment, "| negPrompt:", r.negativePrompt, "| model:", r.model);
  const vg = join(ws, "videgen", projectID);
  await mkdir(vg, { recursive: true });
  await writeFile(join(vg, "shot-1.mp4"), "x");
  await director.execute({ action: "complete", projectID, shotId: "shot-1", clipPath: join(vg, "shot-1.mp4"), credits: 15 });
  r = await director.execute({ action: "next", projectID });
  console.log("[B] NEXT 2     ->", r.shotId, "| continuityClip set:", !!r.continuityClip, "| negPrompt:", r.negativePrompt);
  await writeFile(join(vg, "shot-2.mp4"), "x");
  await director.execute({ action: "complete", projectID, shotId: "shot-2", clipPath: join(vg, "shot-2.mp4") });
  r = await director.execute({ action: "assemble", projectID, showTitles: true });
  console.log("[B] ASSEMBLE   ->", r.status, "| output:", r.outputPath.split(/[\\/]/).pop());
}

console.log("\nALL CHECKS PASSED");
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e);
  process.exit(1);
});
