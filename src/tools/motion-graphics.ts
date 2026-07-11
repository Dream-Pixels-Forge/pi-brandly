import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import type { ToolContext } from "./context.js";
import { isValidProjectId } from "../constants.js";

// Safely embed a user-supplied string as a JS string literal in generated code.
function jsStr(value: unknown): string {
  return JSON.stringify(value ?? "");
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface MotionGraphicElement {
  type: "text" | "rect" | "circle" | "line" | "image";
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  borderRadius?: number;
  opacity?: number;
  rotation?: number;
  strokeWidth?: number;
  letterSpacing?: number;
  src?: string;
  animation?: {
    type:
      | "fadeIn"
      | "fadeOut"
      | "slideInLeft"
      | "slideInRight"
      | "slideInTop"
      | "slideInBottom"
      | "scaleIn"
      | "scaleOut"
      | "rotateIn"
      | "typewriter"
      | "bounce"
      | "pulse"
      | "blurIn"
      | "countUp"
      | "drawLine";
    duration?: number;
    delay?: number;
    easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring";
  };
}

export interface MotionGraphicScene {
  id: string;
  duration: number;
  background?: string;
  backgroundImage?: string;
  elements: MotionGraphicElement[];
}

export interface MotionGraphicProject {
  fps: number;
  width: number;
  height: number;
  scenes: MotionGraphicScene[];
  style?: string;
}

// ── Remotion code generation ────────────────────────────────────────────────

function easingToRemotion(easing?: string): string {
  switch (easing) {
    case "easeIn":
      return "[0.4, 0, 1, 1]";
    case "easeOut":
      return "[0, 0, 0.2, 1]";
    case "easeInOut":
      return "[0.4, 0, 0.2, 1]";
    case "spring":
      return "spring({ config: { damping: 10, stiffness: 100 } })";
    case "linear":
    default:
      return "[0, 0, 1, 1]";
  }
}

function generateElementAnimation(
  el: MotionGraphicElement,
  elementVar: string
): string {
  const anim = el.animation;
  if (!anim) return "";

  const dur = anim.duration ?? 0.5;
  const delay = anim.delay ?? 0;
  const isSpring = anim.easing === "spring";
  const easingValue = isSpring
    ? "spring({ config: { damping: 10, stiffness: 100 } })"
    : easingToRemotion(anim.easing);
  const easingOption = `easing: ${easingValue}, `;

  // Frame math helpers
  const startFrame = `(${delay} * fps)`;
  const endFrame = `(${delay} + ${dur}) * fps`;

  switch (anim.type) {
    case "fadeIn":
      return `
    // fadeIn ${elementVar}
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, ${el.opacity ?? 1}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "fadeOut":
      return `
    // fadeOut ${elementVar}
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [${el.opacity ?? 1}, 0], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "slideInLeft":
      return `
    // slideInLeft ${elementVar}
    const ${elementVar}_x = interpolate(
      frame, ${startFrame}, ${endFrame}, [-100, ${el.x}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "slideInRight":
      return `
    // slideInRight ${elementVar}
    const ${elementVar}_x = interpolate(
      frame, ${startFrame}, ${endFrame}, [110, ${el.x}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "slideInTop":
      return `
    // slideInTop ${elementVar}
    const ${elementVar}_y = interpolate(
      frame, ${startFrame}, ${endFrame}, [-100, ${el.y}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "slideInBottom":
      return `
    // slideInBottom ${elementVar}
    const ${elementVar}_y = interpolate(
      frame, ${startFrame}, ${endFrame}, [110, ${el.y}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "scaleIn":
      return `
    // scaleIn ${elementVar}
    const ${elementVar}_scale = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "scaleOut":
      return `
    // scaleOut ${elementVar}
    const ${elementVar}_scale = interpolate(
      frame, ${startFrame}, ${endFrame}, [1, 0], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [1, 0], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "rotateIn":
      return `
    // rotateIn ${elementVar}
    const ${elementVar}_rotation = interpolate(
      frame, ${startFrame}, ${endFrame}, [-180, ${el.rotation ?? 0}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "typewriter":
      return `
    // typewriter ${elementVar}
    const ${elementVar}_charCount = Math.floor(
      interpolate(frame, ${startFrame}, ${endFrame}, [0, ${(el.text || "").length}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    );`;

    case "bounce":
      return `
    // bounce ${elementVar}
    const ${elementVar}_bounce = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_scale = 1 + Math.sin(${elementVar}_bounce * Math.PI * 3) * 0.1 * (1 - ${elementVar}_bounce);
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "pulse":
      return `
    // pulse ${elementVar}
    const ${elementVar}_pulse = Math.sin((frame - ${startFrame}) / ${dur} * fps * Math.PI * 2) * 0.5 + 0.5;
    const ${elementVar}_scale = 1 + ${elementVar}_pulse * 0.05;
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, ${el.opacity ?? 1}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "blurIn":
      return `
    // blurIn ${elementVar}
    const ${elementVar}_blur = interpolate(
      frame, ${startFrame}, ${endFrame}, [20, 0], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const ${elementVar}_opacity = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    case "countUp":
      return `
    // countUp ${elementVar}
    const ${elementVar}_count = Math.floor(
       interpolate(frame, ${startFrame}, ${endFrame}, [0, ${parseInt(jsStr(el.text || "100"), 10) || 100}], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    );`;

    case "drawLine":
      return `
    // drawLine ${elementVar}
    const ${elementVar}_progress = interpolate(
      frame, ${startFrame}, ${endFrame}, [0, 1], { ${easingOption}extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );`;

    default:
      return "";
  }
}

function generateElementStyle(
  el: MotionGraphicElement,
  elementVar: string
): string {
  const anim = el.animation?.type;
  const parts: string[] = [];

  parts.push(`position: 'absolute'`);
  parts.push(`left: '${el.x}%'`);
  parts.push(`top: '${el.y}%'`);

  if (el.width) parts.push(`width: '${el.width}%'`);
  if (el.height) parts.push(`height: '${el.height}%'`);
  if (el.color && el.type !== "line") parts.push(`color: ${jsStr(el.color)}`);
  if (el.fontSize) parts.push(`fontSize: ${el.fontSize}`);
  if (el.fontWeight) parts.push(`fontWeight: ${jsStr(el.fontWeight)}`);
  if (el.fontFamily) parts.push(`fontFamily: ${jsStr(el.fontFamily)}`);
  if (el.borderRadius) parts.push(`borderRadius: ${el.borderRadius}`);
  if (el.strokeWidth) parts.push(`strokeWidth: ${el.strokeWidth}`);

  // Animation-driven styles
  if (anim === "fadeIn" || anim === "fadeOut") {
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "slideInLeft" || anim === "slideInRight") {
    parts.push(`left: ${elementVar}_x + '%'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "slideInTop" || anim === "slideInBottom") {
    parts.push(`top: ${elementVar}_y + '%'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "scaleIn" || anim === "scaleOut") {
    parts.push(`transform: 'scale(' + ${elementVar}_scale + ')'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "rotateIn") {
    parts.push(
      `transform: 'rotate(' + ${elementVar}_rotation + 'deg)'`
    );
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "bounce") {
    parts.push(`transform: 'scale(' + ${elementVar}_scale + ')'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "pulse") {
    parts.push(`transform: 'scale(' + ${elementVar}_scale + ')'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (anim === "blurIn") {
    parts.push(`filter: 'blur(' + ${elementVar}_blur + 'px)'`);
    parts.push(`opacity: ${elementVar}_opacity`);
  }
  if (!anim && el.opacity !== undefined) {
    parts.push(`opacity: ${el.opacity}`);
  }
  if (el.rotation && anim !== "rotateIn") {
    parts.push(`transform: 'rotate(${el.rotation}deg)'`);
  }

  return `{\n          ${parts.join(",\n          ")}\n        }`;
}

function generateElementJSX(
  el: MotionGraphicElement,
  index: number,
  sceneIndex: number
): string {
  const tag = `el${sceneIndex}_${index}`;
  const style = generateElementStyle(el, tag);

  let innerJSX = "";

  switch (el.type) {
    case "text": {
      if (el.animation?.type === "typewriter") {
        // _text and _charCount are declared in generateSceneComponent
        innerJSX = `<span>{${tag}_text.slice(0, ${tag}_charCount)}</span>`;
      } else if (el.animation?.type === "countUp") {
        innerJSX = `<span>{${tag}_count}</span>`;
      } else {
        innerJSX = `<span>{${tag}_text}</span>`;
      }
      break;
    }
    case "rect":
      innerJSX = "";
      break;
    case "circle":
      innerJSX = "";
      break;
    case "line": {
      const lineColor = jsStr(el.color || "#ffffff");
      const sw = el.strokeWidth || 2;
      if (el.animation?.type === "drawLine") {
        innerJSX = `<div style={{ position: 'absolute', left: '${el.x}%', top: '${el.y}%', width: '${el.width || 50}%', height: ${sw}, background: ${lineColor}, transformOrigin: 'left', transform: 'scaleX(' + ${tag}_progress + ')' }} />`;
        return innerJSX;
      }
      innerJSX = `<div style={{ ...${style}, height: ${sw}, background: ${lineColor} }} />`;
      return innerJSX;
    }
    case "image":
      if (!el.src) return "";
      innerJSX = `<img src={${jsStr(el.src)}} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />`;
      break;
  }

  if (el.type === "rect" || el.type === "circle") {
    const bg = jsStr(el.color || "#ffffff");
    const br =
      el.type === "circle"
        ? "borderRadius: '50%'"
        : el.borderRadius
        ? `borderRadius: ${el.borderRadius}`
        : "";
    const rectStyle = style.replace(
      /^\{/,
      `{ ${br ? br + ", " : ""}background: ${bg},`
    );
    return `<div style={${rectStyle}} />`;
  }

  return `<div style={${style}}>\n        ${innerJSX}\n      </div>`;
}

function generateSceneComponent(
  scene: MotionGraphicScene,
  sceneIndex: number,
  fps: number
): string {
  const compName = `Scene_${sceneIndex}`;
  const bg = jsStr(scene.background || "#000000");
  const durationFrames = scene.duration * fps;

  const elementBlocks = scene.elements
    .map((el, i) => generateElementJSX(el, i, sceneIndex))
    .join("\n\n    ");

  // Collect variable declarations for elements with animations
  const animatedVars = scene.elements
    .map((el, i) => {
      if (!el.animation) return "";
      const varName = `el${sceneIndex}_${i}`;
      return generateElementAnimation(el, varName);
    })
    .filter(Boolean)
    .join("\n");

  // Hoist each text element's content to a const so special characters
  // (&, <, >) stay inside a normal JS scope, not a JSX child.
  const textVars = scene.elements
    .map((el, i) => {
      if (el.type !== "text") return "";
      const tag = `el${sceneIndex}_${i}`;
      return `    const ${tag}_text = ${jsStr(el.text || "Text")};`;
    })
    .filter(Boolean)
    .join("\n");

  return `
  // ── ${compName} (${scene.duration}s) ──
  const ${compName} = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
${textVars}
${animatedVars}

    return (
      <AbsoluteFill style={{ background: ${bg}${scene.backgroundImage ? `, backgroundImage: ${jsStr(`url(${scene.backgroundImage})`)}, backgroundSize: 'cover'` : ""} }}>
    ${elementBlocks}
      </AbsoluteFill>
    );
  };`;
}

function generateFullComposition(project: MotionGraphicProject): string {
  const { fps, width, height, scenes } = project;

  // Calculate frame ranges for each scene
  let accumulatedFrames = 0;
  const sceneRanges: { from: number; duration: number }[] = [];
  for (const scene of scenes) {
    const dur = scene.duration * fps;
    sceneRanges.push({ from: accumulatedFrames, duration: dur });
    accumulatedFrames += dur;
  }
  const totalFrames = accumulatedFrames;

  // Scene component definitions
  const sceneComponents = scenes
    .map((s, i) => generateSceneComponent(s, i, fps))
    .join("\n");

  // Sequence blocks
  const sequenceBlocks = scenes
    .map((s, i) => {
      const range = sceneRanges[i];
      return `      <Sequence from={${range.from}} durationInFrames={${range.duration}}>
        <Scene_${i} />
      </Sequence>`;
    })
    .join("\n");

  return `import { Composition, AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

${sceneComponents}

  // ── Main Composition ──
  const MotionGraphic = () => {
    return (
      <AbsoluteFill style={{ background: '#000' }}>
${sequenceBlocks}
      </AbsoluteFill>
    );
  };

  export const RemotionComposition = () => {
    return (
      <Composition
        id="MotionGraphic"
        component={MotionGraphic}
        durationInFrames={${totalFrames}}
        fps={${fps}}
        width={${width}}
        height={${height}}
      />
    );
  };
`;
}

// ── Project scaffolding ─────────────────────────────────────────────────────

function generateRootIndex(): string {
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

function generatePackageJson(projectName: string): string {
  return JSON.stringify(
    {
      name: (projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "brandly-motion-graphic"),
      version: "1.0.0",
      private: true,
      scripts: {
        start: "npx remotion studio",
        build: "npx remotion render src/index.ts MotionGraphic out/motion-graphic.mp4",
        "build:gif":
          "npx remotion render src/index.ts MotionGraphic out/motion-graphic.gif --codec gif",
        "build:webm":
          "npx remotion render src/index.ts MotionGraphic out/motion-graphic.webm --codec vp8",
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

function generateBuildScript(outputPath: string): string {
  return `#!/bin/bash
# Brandly Motion Graphics Build Script
# Generated: ${new Date().toISOString()}

set -e

echo "🎬 Building motion graphic..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Preview in Remotion Studio
# npm start

# Render the video
echo "🎥 Rendering video..."
npx remotion render src/index.ts MotionGraphic "${outputPath}" --codec h264

echo "✅ Build complete: ${outputPath}"
`;
}

// ── Preset templates ────────────────────────────────────────────────────────

function generatePreset(
  preset: string,
  fps: number,
  width: number,
  height: number
): MotionGraphicProject {
  switch (preset) {
    case "title-reveal":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "title",
            duration: 4,
            background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
            elements: [
              {
                type: "rect",
                x: 5,
                y: 40,
                width: 90,
                height: 20,
                color: "rgba(255,255,255,0.05)",
                borderRadius: 16,
                animation: {
                  type: "scaleIn",
                  duration: 0.8,
                  easing: "spring",
                },
              },
              {
                type: "text",
                x: 10,
                y: 42,
                width: 80,
                text: "YOUR TITLE",
                color: "#ffffff",
                fontSize: 72,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "typewriter",
                  duration: 1.5,
                  delay: 0.3,
                },
              },
              {
                type: "text",
                x: 10,
                y: 56,
                width: 80,
                text: "Subtitle goes here",
                color: "rgba(255,255,255,0.7)",
                fontSize: 28,
                fontWeight: "normal",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.8,
                  delay: 1.8,
                },
              },
              {
                type: "line",
                x: 30,
                y: 54,
                width: 40,
                color: "#6c63ff",
                strokeWidth: 3,
                animation: {
                  type: "drawLine",
                  duration: 0.6,
                  delay: 1.5,
                },
              },
            ],
          },
        ],
      };

    case "product-showcase":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "intro",
            duration: 3,
            background: "#0a0a0a",
            elements: [
              {
                type: "circle",
                x: 35,
                y: 25,
                width: 30,
                height: 30,
                color: "#6c63ff",
                animation: {
                  type: "scaleIn",
                  duration: 0.6,
                  easing: "spring",
                },
              },
              {
                type: "text",
                x: 10,
                y: 60,
                width: 80,
                text: "INTRODUCING",
                color: "rgba(255,255,255,0.5)",
                fontSize: 24,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "slideInBottom",
                  duration: 0.5,
                  delay: 0.3,
                },
              },
              {
                type: "text",
                x: 10,
                y: 68,
                width: 80,
                text: "Product Name",
                color: "#ffffff",
                fontSize: 56,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "slideInBottom",
                  duration: 0.6,
                  delay: 0.5,
                  easing: "easeOut",
                },
              },
            ],
          },
          {
            id: "features",
            duration: 4,
            background: "#0a0a0a",
            elements: [
              {
                type: "rect",
                x: 5,
                y: 10,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: {
                  type: "slideInLeft",
                  duration: 0.5,
                  delay: 0,
                },
              },
              {
                type: "text",
                x: 7,
                y: 15,
                width: 23,
                text: "Fast",
                color: "#6c63ff",
                fontSize: 28,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.3,
                },
              },
              {
                type: "text",
                x: 7,
                y: 25,
                width: 23,
                text: "10x faster than competitors",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.5,
                },
              },
              {
                type: "rect",
                x: 36,
                y: 10,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: {
                  type: "slideInLeft",
                  duration: 0.5,
                  delay: 0.2,
                },
              },
              {
                type: "text",
                x: 38,
                y: 15,
                width: 23,
                text: "Secure",
                color: "#6c63ff",
                fontSize: 28,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.5,
                },
              },
              {
                type: "text",
                x: 38,
                y: 25,
                width: 23,
                text: "Enterprise-grade encryption",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.7,
                },
              },
              {
                type: "rect",
                x: 67,
                y: 10,
                width: 27,
                height: 35,
                color: "#1a1a2e",
                borderRadius: 12,
                animation: {
                  type: "slideInLeft",
                  duration: 0.5,
                  delay: 0.4,
                },
              },
              {
                type: "text",
                x: 69,
                y: 15,
                width: 23,
                text: "Simple",
                color: "#6c63ff",
                fontSize: 28,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.7,
                },
              },
              {
                type: "text",
                x: 69,
                y: 25,
                width: 23,
                text: "Setup in under 2 minutes",
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.9,
                },
              },
            ],
          },
          {
            id: "cta",
            duration: 3,
            background: "linear-gradient(135deg, #6c63ff, #3f3d99)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 35,
                width: 80,
                text: "Get Started Today",
                color: "#ffffff",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "scaleIn",
                  duration: 0.6,
                  easing: "spring",
                },
              },
              {
                type: "rect",
                x: 30,
                y: 55,
                width: 40,
                height: 10,
                color: "#ffffff",
                borderRadius: 50,
                animation: {
                  type: "fadeIn",
                  duration: 0.5,
                  delay: 0.5,
                },
              },
              {
                type: "text",
                x: 30,
                y: 56.5,
                width: 40,
                text: "Start Free Trial →",
                color: "#6c63ff",
                fontSize: 24,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.5,
                  delay: 0.6,
                },
              },
            ],
          },
        ],
      };

    case "kinetic-text":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "word1",
            duration: 1.5,
            background: "#0f0f0f",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "CREATE",
                color: "#ffffff",
                fontSize: 120,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: {
                  type: "scaleIn",
                  duration: 0.3,
                  easing: "spring",
                },
              },
            ],
          },
          {
            id: "word2",
            duration: 1.5,
            background: "#1a1a2e",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "STUNNING",
                color: "#6c63ff",
                fontSize: 120,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: {
                  type: "slideInLeft",
                  duration: 0.3,
                  easing: "spring",
                },
              },
            ],
          },
          {
            id: "word3",
            duration: 1.5,
            background: "#0f0f0f",
            elements: [
              {
                type: "text",
                x: 10,
                y: 30,
                width: 80,
                text: "MOTION",
                color: "#ffffff",
                fontSize: 120,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: {
                  type: "slideInRight",
                  duration: 0.3,
                  easing: "spring",
                },
              },
            ],
          },
          {
            id: "word4",
            duration: 2,
            background: "linear-gradient(135deg, #6c63ff, #3f3d99)",
            elements: [
              {
                type: "text",
                x: 10,
                y: 25,
                width: 80,
                text: "GRAPHICS",
                color: "#ffffff",
                fontSize: 100,
                fontWeight: "900",
                fontFamily: "Impact, sans-serif",
                animation: {
                  type: "bounce",
                  duration: 0.8,
                  easing: "spring",
                },
              },
              {
                type: "text",
                x: 10,
                y: 55,
                width: 80,
                text: "with brandly + remotion",
                color: "rgba(255,255,255,0.8)",
                fontSize: 32,
                fontWeight: "normal",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.5,
                  delay: 0.5,
                },
              },
            ],
          },
        ],
      };

    case "stats-counter":
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "stats",
            duration: 5,
            background: "#0a0a0a",
            elements: [
              {
                type: "text",
                x: 10,
                y: 8,
                width: 80,
                text: "BY THE NUMBERS",
                color: "rgba(255,255,255,0.4)",
                fontSize: 20,
                fontWeight: "600",
                fontFamily: "Arial, sans-serif",
                letterSpacing: 8,
                animation: {
                  type: "fadeIn",
                  duration: 0.5,
                },
              },
              {
                type: "text",
                x: 5,
                y: 25,
                width: 25,
                text: "10000",
                color: "#6c63ff",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "countUp",
                  duration: 2,
                  delay: 0.3,
                },
              },
              {
                type: "text",
                x: 5,
                y: 42,
                width: 25,
                text: "Users",
                color: "rgba(255,255,255,0.6)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.5,
                },
              },
              {
                type: "text",
                x: 37,
                y: 25,
                width: 25,
                text: "500",
                color: "#ff6b6b",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "countUp",
                  duration: 2,
                  delay: 0.6,
                },
              },
              {
                type: "text",
                x: 37,
                y: 42,
                width: 25,
                text: "Projects",
                color: "rgba(255,255,255,0.6)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 0.8,
                },
              },
              {
                type: "text",
                x: 70,
                y: 25,
                width: 25,
                text: "99",
                color: "#4ecdc4",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "countUp",
                  duration: 2,
                  delay: 0.9,
                },
              },
              {
                type: "text",
                x: 70,
                y: 42,
                width: 25,
                text: "% Uptime",
                color: "rgba(255,255,255,0.6)",
                fontSize: 20,
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.4,
                  delay: 1.1,
                },
              },
              {
                type: "line",
                x: 5,
                y: 55,
                width: 90,
                color: "rgba(255,255,255,0.1)",
                strokeWidth: 1,
              },
              {
                type: "text",
                x: 10,
                y: 60,
                width: 80,
                text: "Trusted by teams worldwide",
                color: "rgba(255,255,255,0.5)",
                fontSize: 24,
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.6,
                  delay: 2.5,
                },
              },
            ],
          },
        ],
      };

    default:
      return {
        fps,
        width,
        height,
        scenes: [
          {
            id: "default",
            duration: 3,
            background: "#000000",
            elements: [
              {
                type: "text",
                x: 10,
                y: 40,
                width: 80,
                text: "Motion Graphic",
                color: "#ffffff",
                fontSize: 64,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                animation: {
                  type: "fadeIn",
                  duration: 0.8,
                },
              },
            ],
          },
        ],
      };
  }
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createMotionGraphicsTool(ctx: ToolContext) {
  return {
    name: "brandly_motion_graphics",
    description:
      "Create animated motion graphics using Remotion — kinetic typography, product showcases, stat counters, title reveals, and custom scene-based animations. Generates a complete Remotion project with spring physics, easing, and frame-accurate timing.",
    parameters: {
      type: "object",
      properties: {
        projectID: {
          type: "string",
          description: "The project UUID",
        },
        preset: {
          type: "string",
          enum: [
            "title-reveal",
            "product-showcase",
            "kinetic-text",
            "stats-counter",
            "custom",
          ],
          description:
            "Preset template. Use 'custom' to provide your own scenes.",
        },
        scenes: {
          type: "array",
          description:
            "Custom scenes array (required when preset='custom'). Each scene has id, duration, background, and elements.",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              duration: { type: "number" },
              background: { type: "string" },
              backgroundImage: { type: "string" },
              elements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "text",
                        "rect",
                        "circle",
                        "line",
                        "image",
                      ],
                    },
                    id: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                    text: { type: "string" },
                    color: { type: "string" },
                    fontSize: { type: "number" },
                    fontWeight: { type: "string" },
                    fontFamily: { type: "string" },
                    borderRadius: { type: "number" },
                    opacity: { type: "number" },
                    rotation: { type: "number" },
                    strokeWidth: { type: "number" },
                    src: { type: "string" },
                    animation: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: [
                            "fadeIn",
                            "fadeOut",
                            "slideInLeft",
                            "slideInRight",
                            "slideInTop",
                            "slideInBottom",
                            "scaleIn",
                            "scaleOut",
                            "rotateIn",
                            "typewriter",
                            "bounce",
                            "pulse",
                            "blurIn",
                            "countUp",
                            "drawLine",
                          ],
                        },
                        duration: { type: "number" },
                        delay: { type: "number" },
                        easing: {
                          type: "string",
                          enum: [
                            "linear",
                            "easeIn",
                            "easeOut",
                            "easeInOut",
                            "spring",
                          ],
                        },
                      },
                    },
                  },
                  required: ["type", "x", "y"],
                },
              },
            },
            required: ["id", "duration", "elements"],
          },
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
      },
      required: ["projectID", "preset"],
    },
    execute: async (args: Record<string, unknown>) => {
      const {
        projectID,
        preset,
        scenes,
        fps: fpsArg,
        width: widthArg,
        height: heightArg,
        outputPath,
        autoRender,
      } = args as Record<string, any>;

      if (!isValidProjectId(projectID as string)) {
        throw new Error("Invalid project ID format");
      }

      const project = await ctx.readProject(projectID as string);
      if (!project) {
        throw new Error(`Project not found: ${projectID}`);
      }

      const fps = (fpsArg as number) || 30;
      const width = (widthArg as number) || 1920;
      const height = (heightArg as number) || 1080;
      const projectName = project.name || `brandly-${projectID.slice(0, 8)}`;

      // Build motion graphic project from preset or custom scenes
      let mgProject: MotionGraphicProject;

      if (preset === "custom") {
        if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
          throw new Error(
            "scenes array is required when using preset='custom'"
          );
        }
        mgProject = {
          fps,
          width,
          height,
          scenes: scenes as MotionGraphicScene[],
          style: "custom",
        };
      } else {
        mgProject = generatePreset(
          preset as string,
          fps,
          width,
          height
        );
      }

      // Generate the Remotion composition
      const compositionCode = generateFullComposition(mgProject);

      // Create project directory structure
      const assemblyDir = join(
        ctx.directory,
        "motion-graphics",
        projectID as string
      );
      const srcDir = join(assemblyDir, "src");
      const outDir = join(assemblyDir, "out");

      await mkdir(srcDir, { recursive: true });
      await mkdir(outDir, { recursive: true });

      // Write files
      await writeFile(
        join(srcDir, "Composition.tsx"),
        compositionCode,
        "utf-8"
      );
      await writeFile(join(srcDir, "index.ts"), generateRootIndex(), "utf-8");
      await writeFile(
        join(assemblyDir, "remotion.config.ts"),
        generateRemotionConfig(),
        "utf-8"
      );
      await writeFile(
        join(assemblyDir, "package.json"),
        generatePackageJson(projectName),
        "utf-8"
      );

      const finalOutputPath =
        outputPath ||
        join(outDir, `motion-graphic-${Date.now()}.mp4`);
      const buildScript = generateBuildScript(finalOutputPath);
      await writeFile(
        join(assemblyDir, "build.sh"),
        buildScript,
        "utf-8"
      );

      // Save metadata
      const meta = {
        id: `mg-${Date.now()}`,
        projectId: projectID,
        projectName,
        preset,
        fps,
        width,
        height,
        sceneCount: mgProject.scenes.length,
        totalDuration: mgProject.scenes.reduce(
          (sum, s) => sum + s.duration,
          0
        ),
        assemblyDir,
        compositionPath: join(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: "created",
        createdAt: new Date().toISOString(),
      };

      await writeFile(
        join(assemblyDir, "motion-graphics-meta.json"),
        JSON.stringify(meta, null, 2),
        "utf-8"
      );

      // Update project phases
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
      if (!phaseOutput.motionGraphics) {
        phaseOutput.motionGraphics = [];
      }
      phaseOutput.motionGraphics.push({
        mgId: meta.id,
        preset,
        assemblyDir,
        totalDuration: meta.totalDuration,
        outputPath: finalOutputPath,
        createdAt: new Date().toISOString(),
      });
      project.phases[currentPhase].output =
        JSON.stringify(phaseOutput);
      project.updatedAt = new Date().toISOString();
      await ctx.writeProject(projectID as string, project);

      const nextSteps = [
        `1. cd ${assemblyDir}`,
        "2. Install dependencies: npm install",
        "3. Preview in Remotion Studio: npm start",
        `4. Render final video: npm run build`,
        `   Output: ${finalOutputPath}`,
      ];

      // Optional: auto-render the project after scaffolding.
      let renderStatus: string | undefined;
      let renderOutput: string | undefined;
      if (autoRender) {
        try {
          const shell = process.platform === "win32" ? "cmd" : "bash";
          const flag = process.platform === "win32" ? "/c" : "-c";
          renderOutput = execFileSync(
            shell,
            [flag, `cd ${JSON.stringify(assemblyDir)} && npm install && npm run build`],
            { encoding: "utf-8", timeout: 20 * 60 * 1000 }
          );
          meta.status = "rendered";
          renderStatus = "rendered";
        } catch (err) {
          meta.status = "render_failed";
          renderStatus = "render_failed";
          renderOutput = String(err);
        }
        await writeFile(
          join(assemblyDir, "motion-graphics-meta.json"),
          JSON.stringify(meta, null, 2),
          "utf-8"
        );
      }

      return {
        projectId: projectID,
        mgId: meta.id,
        projectName,
        preset,
        assemblyDir,
        sceneCount: mgProject.scenes.length,
        totalDuration: `${meta.totalDuration}s`,
        compositionPath: join(srcDir, "Composition.tsx"),
        outputPath: finalOutputPath,
        status: meta.status,
        renderStatus,
        renderOutput:
          renderStatus === "render_failed" ? renderOutput : undefined,
        message: `Motion graphic project created: ${preset} (${meta.totalDuration}s, ${mgProject.scenes.length} scenes)`,
        nextSteps,
      };
    },
  };
}
