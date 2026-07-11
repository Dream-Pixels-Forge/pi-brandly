import { join } from "node:path";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ToolContext } from "./context.js";
import { isValidProjectId } from "../constants.js";

interface ClipAsset {
  path: string;
  type: "video" | "image" | "audio";
  name: string;
}

interface MontageSegment {
  clip: ClipAsset;
  duration: number;
  transition?: string;
  transitionDuration?: number;
  startTime?: number;
  text?: string;
  textPosition?: string;
  effect?: string;
  volume?: number;
}

interface AssemblyPlan {
  segments: MontageSegment[];
  totalDuration: number;
  fps: number;
  width: number;
  height: number;
  audioTrack?: ClipAsset;
  backgroundMusic?: ClipAsset;
  style: string;
}

async function discoverMedia(dir: string): Promise<ClipAsset[]> {
  if (!existsSync(dir)) return [];

  const clips: ClipAsset[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const subClips = await discoverMedia(fullPath);
      clips.push(...subClips);
    } else {
      const ext = entry.name.toLowerCase();
      if (ext.endsWith(".mp4") || ext.endsWith(".webm") || ext.endsWith(".mov")) {
        clips.push({ path: fullPath, type: "video", name: entry.name });
      } else if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".gif")) {
        clips.push({ path: fullPath, type: "image", name: entry.name });
      } else if (ext.endsWith(".mp3") || ext.endsWith(".wav") || ext.endsWith(".ogg")) {
        clips.push({ path: fullPath, type: "audio", name: entry.name });
      }
    }
  }

  return clips;
}

function inferDurationForImage(fps: number): number {
  return 3; // 3 seconds per image by default
}

function generateAssemblyPlan(
  assets: ClipAsset[],
  params: Record<string, unknown>,
  style: string
): AssemblyPlan {
  const fps = (params.fps as number) || 30;
  const width = (params.width as number) || 1920;
  const height = (params.height as number) || 1080;
  const clipDuration = (params.clipDuration as number) || 3;
  const transitionType = (params.transitionType as string) || "fade";
  const transitionDuration = (params.transitionDuration as number) || 0.5;

  const videos = assets.filter((a) => a.type === "video");
  const images = assets.filter((a) => a.type === "image");
  const audios = assets.filter((a) => a.type === "audio");

  const backgroundMusic = audios.length > 0 ? audios[0] : undefined;

  const orderedClips = [...videos, ...images];
  const segments: MontageSegment[] = [];

  for (const clip of orderedClips) {
    const duration = clip.type === "image" ? inferDurationForImage(fps) : clipDuration;
    segments.push({
      clip,
      duration,
      transition: transitionType,
      transitionDuration,
    });
  }

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

  return {
    segments,
    totalDuration,
    fps,
    width,
    height,
    backgroundMusic,
    style,
  };
}

function generateRemotionProject(plan: AssemblyPlan, projectName: string): string {
  const { segments, fps, width, height, backgroundMusic } = plan;

  const clipImports = segments
    .map((seg, i) => {
      const ext = seg.clip.name.split(".").pop();
      const isVideo = ["mp4", "webm", "mov"].includes(ext || "");
      const importPath = `./assets/${seg.clip.name}`;
      return `import ${isVideo ? "Video" : "Img"}_${i} from "${importPath}";`;
    })
    .join("\n");

  const audioImport = backgroundMusic
    ? `import audioTrack from "./assets/${backgroundMusic.name}";`
    : "";

  const clipDeclarations = segments
    .map((seg, i) => {
      const ext = seg.clip.name.split(".").pop();
      const isVideo = ["mp4", "webm", "mov"].includes(ext || "");
      return `  const Clip_${i}: ${isVideo ? "typeof Video" : "typeof Img"}_${i} = ${isVideo ? "Video" : "Img"}_${i};`;
    })
    .join("\n");

  const sequenceBlocks = segments
    .map((seg, i) => {
      const frameStart = segments
        .slice(0, i)
        .reduce((sum, s) => sum + s.duration * fps, 0);
      const durationFrames = Math.round(seg.duration * fps);
      const ext = seg.clip.name.split(".").pop();
      const isVideo = ["mp4", "webm", "mov"].includes(ext || "");

      return `      <Sequence from={${frameStart}} durationInFrames={${durationFrames}}>
        <${isVideo ? "Video" : "Img"}
          src={${isVideo ? "Video" : "Img"}_${i}}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          ${isVideo ? "" : `durationInFrames={${durationFrames}}`}
        />
        ${seg.text ? `<TextOverlay text="${seg.text}" position="${seg.textPosition || "bottom"}" />` : ""}
      </Sequence>`;
    })
    .join("\n");

  const totalFrames = Math.round(plan.totalDuration * fps);

  return `import { Composition, Sequence, Audio, staticFile } from 'remotion';
${clipImports}
${audioImport}

${clipDeclarations}

const TextOverlay = ({ text, position }: { text: string; position: string }) => {
  const posStyle = position === 'top'
    ? { top: '10%' }
    : position === 'center'
    ? { top: '50%', transform: 'translateY(-50%)' }
    : { bottom: '10%' };

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      transform: position === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)',
      ...posStyle,
      color: 'white',
      fontSize: 48,
      fontWeight: 'bold',
      textShadow: '2px 2px 8px rgba(0,0,0,0.7)',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '8px 24px',
      borderRadius: 8,
      background: 'rgba(0,0,0,0.4)',
    }}>
      {text}
    </div>
  );
};

const MontageComposition = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'black' }}>
${sequenceBlocks}
${backgroundMusic ? `      <Audio src={audioTrack} volume={0.8} />` : ""}
    </div>
  );
};

export const RemotionComposition = () => {
  return (
    <Composition
      id="${projectName}"
      component={MontageComposition}
      durationInFrames={${totalFrames}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};
`;
}

function generateRemotionConfig(projectName: string): string {
  return `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
`;
}

function generatePackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      private: true,
      scripts: {
        start: "npx remotion studio",
        build: "npx remotion render src/index.ts " + projectName + " out/video.mp4",
        "build:gif": "npx remotion render src/index.ts " + projectName + " out/video.gif --codec gif",
        "build:webm": "npx remotion render src/index.ts " + projectName + " out/video.webm --codec vp8",
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

function generateRootIndex(projectName: string): string {
  return `import { registerRoot } from "remotion";
import { RemotionComposition } from "./Composition";

registerRoot(RemotionComposition);
`;
}

function generateBuildScript(projectDir: string, outputPath: string): string {
  return `#!/bin/bash
# Brandly Assembly Build Script
# Generated: ${new Date().toISOString()}

set -e

echo "🎬 Building montage: ${projectDir}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Render the video
echo "🎥 Rendering video..."
npx remotion render src/index.ts Montage "${outputPath}" --codec h264

echo "✅ Build complete: ${outputPath}"
`;
}

export function createAssemblyTool(ctx: ToolContext) {
  return {
    name: "brandly_assemble",
    description:
      "Assemble all generated video clips, images, and audio into a final montage using a complete Remotion project. Discovers assets, creates project structure, and optionally renders the final video.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        style: {
          type: "string",
          enum: ["montage", "cinematic", "ugc", "continuous", "simple"],
          default: "montage",
          description: "Assembly style preset",
        },
        clipDuration: {
          type: "number",
          default: 3,
          description: "Default duration in seconds for each video clip (images always use 3s)",
        },
        transitionType: {
          type: "string",
          enum: ["fade", "slide", "wipe", "none"],
          default: "fade",
          description: "Transition type between clips",
        },
        transitionDuration: {
          type: "number",
          default: 0.5,
          description: "Transition duration in seconds",
        },
        fps: {
          type: "number",
          default: 30,
          description: "Frames per second",
        },
        width: {
          type: "number",
          default: 1920,
          description: "Output width in pixels",
        },
        height: {
          type: "number",
          default: 1080,
          description: "Output height in pixels",
        },
        outputPath: {
          type: "string",
          description: "Output file path for rendered video",
        },
        autoRender: {
          type: "boolean",
          default: false,
          description: "Automatically render after creating the project",
        },
        clipOrder: {
          type: "array",
          items: { type: "string" },
          description: "Optional explicit clip order by filename. Unlisted clips are appended.",
        },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const {
        projectID,
        style,
        clipDuration,
        transitionType,
        transitionDuration,
        fps,
        width,
        height,
        outputPath,
        autoRender,
        clipOrder,
      } = args as Record<string, any>;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const projectName = project.name || `brandly-${projectID.slice(0, 8)}`;

      // Discover all generated assets
      const mediaFolders = ["imagen", "videgen", "audgen"];
      const allAssets: ClipAsset[] = [];

      for (const folder of mediaFolders) {
        const mediaDir = join(ctx.directory, folder, projectID as string);
        const assets = await discoverMedia(mediaDir);
        allAssets.push(...assets);
      }

      // Also check for assets in the project's artifacts
      const projectDir = join(ctx.projectsDir, projectID as string);
      const artifactsDir = join(projectDir, "artifacts");
      const artifactAssets = await discoverMedia(artifactsDir);
      allAssets.push(...artifactAssets);

      if (allAssets.length === 0) {
        throw new Error(
          "No media assets found. Generate videos/images/audio first using brandly_image, brandly_video tools."
        );
      }

      // Apply clip ordering if provided
      let orderedAssets = allAssets;
      if (clipOrder && Array.isArray(clipOrder) && clipOrder.length > 0) {
        const orderMap = new Map(clipOrder.map((name, i) => [name, i]));
        orderedAssets = [...allAssets].sort((a, b) => {
          const aIdx = orderMap.has(a.name) ? orderMap.get(a.name)! : Infinity;
          const bIdx = orderMap.has(b.name) ? orderMap.get(b.name)! : Infinity;
          return aIdx - bIdx;
        });
      }

      // Generate assembly plan
      const plan = generateAssemblyPlan(
        orderedAssets,
        {
          fps,
          width,
          height,
          clipDuration,
          transitionType,
          transitionDuration,
        },
        (style as string) || "montage"
      );

      // Create the Remotion project directory
      const assemblyDir = join(ctx.directory, "assembly", projectID as string);
      const srcDir = join(assemblyDir, "src");
      const assetsDir = join(assemblyDir, "assets");
      const outDir = join(assemblyDir, "out");

      await mkdir(srcDir, { recursive: true });
      await mkdir(assetsDir, { recursive: true });
      await mkdir(outDir, { recursive: true });

      // Copy assets to the Remotion project's assets folder
      const copiedAssets: string[] = [];
      for (const asset of orderedAssets) {
        const srcPath = asset.path;
        const destPath = join(assetsDir, asset.name);
        if (!existsSync(destPath)) {
          const { copyFile } = await import("node:fs/promises");
          await copyFile(srcPath, destPath);
        }
        copiedAssets.push(asset.name);
      }

      // Generate the Remotion composition
      const compositionCode = generateRemotionProject(plan, projectName);
      await writeFile(join(srcDir, "Composition.tsx"), compositionCode, "utf-8");

      // Generate root index
      const rootIndex = generateRootIndex(projectName);
      await writeFile(join(srcDir, "index.ts"), rootIndex, "utf-8");

      // Generate remotion config
      const remotionConfig = generateRemotionConfig(projectName);
      await writeFile(join(assemblyDir, "remotion.config.ts"), remotionConfig, "utf-8");

      // Generate package.json
      const packageJson = generatePackageJson(projectName);
      await writeFile(join(assemblyDir, "package.json"), packageJson, "utf-8");

      // Generate build script
      const finalOutputPath =
        outputPath || join(outDir, `${projectName.toLowerCase().replace(/\s+/g, "-")}.mp4`);
      const buildScript = generateBuildScript(assemblyDir, finalOutputPath);
      const buildScriptPath = join(assemblyDir, "build.sh");
      await writeFile(buildScriptPath, buildScript, "utf-8");

      // Save assembly metadata
      const assemblyMeta = {
        id: `assembly-${Date.now()}`,
        projectId: projectID,
        projectName,
        style: plan.style,
        segmentCount: plan.segments.length,
        totalDuration: plan.totalDuration,
        fps: plan.fps,
        width: plan.width,
        height: plan.height,
        clips: copiedAssets,
        backgroundMusic: plan.backgroundMusic?.name || null,
        assemblyDir,
        compositionPath: join(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: "created",
        createdAt: new Date().toISOString(),
      };

      const metaPath = join(assemblyDir, "assembly-meta.json");
      await writeFile(metaPath, JSON.stringify(assemblyMeta, null, 2), "utf-8");

      // Update project with assembly info
      if (!project.phases) {
        project.phases = {};
      }

      const currentPhase = project.currentPhase as string;
      if (!project.phases[currentPhase]) {
        project.phases[currentPhase] = {
          status: "running",
          startedAt: new Date().toISOString(),
        };
      }

      const phaseOutput = project.phases[currentPhase].output
        ? JSON.parse(project.phases[currentPhase].output || "{}")
        : {};

      if (!phaseOutput.assemblies) {
        phaseOutput.assemblies = [];
      }

      phaseOutput.assemblies.push({
        assemblyId: assemblyMeta.id,
        assemblyDir,
        segmentCount: plan.segments.length,
        totalDuration: plan.totalDuration,
        outputPath: finalOutputPath,
        createdAt: new Date().toISOString(),
      });

      project.phases[currentPhase].output = JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID as string, project);

      const nextSteps = [
        `1. cd ${assemblyDir}`,
        "2. Install dependencies: npm install",
        "3. Preview in Remotion Studio: npm start",
        `4. Render final video: npm run build`,
        `   Output: ${finalOutputPath}`,
      ];

      if (autoRender) {
        nextSteps.push("5. Auto-render was requested — run: bash " + buildScriptPath);
      }

      return {
        projectId: projectID,
        assemblyId: assemblyMeta.id,
        projectName,
        style: plan.style,
        assemblyDir,
        segmentCount: plan.segments.length,
        totalDuration: `${plan.totalDuration.toFixed(1)}s`,
        clips: copiedAssets,
        backgroundMusic: plan.backgroundMusic?.name || null,
        compositionPath: join(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: "created",
        message: `Remotion assembly project created with ${plan.segments.length} clips (${plan.totalDuration.toFixed(1)}s total)`,
        nextSteps,
      };
    },
  };
}
