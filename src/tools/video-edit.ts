/**
 * brandly_video_edit — Remotion video editing
 */

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import type { ToolContext } from "./context.js";
import { isValidProjectId, QUALITY_PRESETS, type VideoQuality } from "../constants.js";

type EditOperation =
  | "trim"
  | "concat"
  | "overlay"
  | "transition"
  | "add-text"
  | "add-audio"
  | "add-effect"
  | "resize"
  | "crop";

export function createVideoEditTool(ctx: ToolContext) {
  return {
    name: "brandly_video_edit",
    description: "Edit videos using Remotion (trim, concat, overlay, transition, text, audio, effects, resize, crop)",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "The project UUID" },
        operation: {
          type: "string",
          enum: ["trim", "concat", "overlay", "transition", "add-text", "add-audio", "add-effect", "resize", "crop"],
          description: "Edit operation",
        },
        inputFiles: { type: "array", items: { type: "string" }, description: "Input file paths" },
        params: { type: "object", description: "Operation-specific parameters" },
      },
      required: ["projectID", "operation", "inputFiles"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, operation, inputFiles, params } = args as {
        projectID: string;
        operation: EditOperation;
        inputFiles: string[];
        params?: Record<string, any>;
      };

      if (!isValidProjectId(projectID)) {
        throw new Error("Invalid project ID format");
      }

      // Create composition directory
      const compositionDir = join(ctx.directory, "video-edits", projectID);
      await mkdir(compositionDir, { recursive: true });

      const timestamp = Date.now();
      const compositionFile = join(compositionDir, `composition-${timestamp}.tsx`);
      const outputDir = join(ctx.directory, "renders", projectID);
      await mkdir(outputDir, { recursive: true });

      // Generate composition based on operation
      const composition = generateComposition(operation, inputFiles, params || {});

      // Return instructions for the agent
      return {
        projectId: projectID,
        operation,
        compositionFile,
        outputDir,
        status: "composition_ready",
        composition,
        writeInstructions: `Write the composition to ${compositionFile}`,
        message: `Generated ${operation} composition. Write it to ${compositionFile}, then use brandly_render_video to render.`,
      };
    },
  };
}

function generateComposition(
  operation: EditOperation,
  inputFiles: string[],
  params: Record<string, any>
): string {
  const { width = 1920, height = 1080 } = params;

  switch (operation) {
    case "trim":
      return generateTrimComposition(inputFiles[0], params, width, height);
    case "concat":
      return generateConcatComposition(inputFiles, params, width, height);
    case "overlay":
      return generateOverlayComposition(inputFiles, params, width, height);
    case "transition":
      return generateTransitionComposition(inputFiles, params, width, height);
    case "add-text":
      return generateTextComposition(inputFiles[0], params, width, height);
    case "add-audio":
      return generateAudioComposition(inputFiles[0], params, width, height);
    case "add-effect":
      return generateEffectComposition(inputFiles[0], params, width, height);
    case "resize":
      return generateResizeComposition(inputFiles[0], params);
    case "crop":
      return generateCropComposition(inputFiles[0], params, width, height);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

function generateTrimComposition(input: string, params: any, w: number, h: number): string {
  const { startTime = 0, duration = 5 } = params;
  return `import { Composition } from "remotion";
import { Video } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="TrimmedVideo"
      component={Video}
      durationInFrames={${duration * 30}}
      fps={30}
      width={${w}}
      height={${h}}
      props={{
        src: "${input}",
        startFrom: ${startTime * 30},
        endAt: ${(startTime + duration) * 30},
      }}
    />
  );
};`;
}

function generateConcatComposition(inputs: string[], params: any, w: number, h: number): string {
  const { transitionDuration = 0 } = params;
  return `import { Composition, Series } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="ConcatVideo"
      component={Series}
      durationInFrames={${inputs.length * 90}}
      fps={30}
      width={${w}}
      height={${h}}
      props={{
        sequenceConfig: [
          ${inputs.map((input) => `{ src: "${input}", duration: 90 }`).join(",\n          ")}
        ],
      }}
    />
  );
};`;
}

function generateOverlayComposition(inputs: string[], params: any, w: number, h: number): string {
  const { position = "top-right", scale = 0.2 } = params;
  return `import { Composition, AbsoluteFill, Img } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="OverlayVideo"
      component={() => (
        <AbsoluteFill>
          <Video src="${inputs[0]}" />
          <Img
            src="${inputs[1]}"
            style={{
              position: "absolute",
              ${position.includes("top") ? "top: 20px" : "bottom: 20px"},
              ${position.includes("right") ? "right: 20px" : "left: 20px"},
              width: ${w * scale}px,
              height: "auto",
            }}
          />
        </AbsoluteFill>
      )}
      durationInFrames={90}
      fps={30}
      width={${w}}
      height={${h}}
    />
  );
};`;
}

function generateTransitionComposition(inputs: string[], params: any, w: number, h: number): string {
  const { transitionType = "fade", transitionDuration = 1 } = params;
  return `import { Composition } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="TransitionVideo"
      component={() => (
        <div>
          {/* Transition: ${transitionType} (${transitionDuration}s) */}
          <Video src="${inputs[0]}" />
          <Video src="${inputs[1]}" />
        </div>
      )}
      durationInFrames={${90 * inputs.length}}
      fps={30}
      width={${w}}
      height={${h}}
    />
  );
};`;
}

function generateTextComposition(input: string, params: any, w: number, h: number): string {
  const { text = "Brand Name", fontSize = 72, color = "#ffffff", position = "center" } = params;
  return `import { Composition, AbsoluteFill, Video, Text } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="TextOverlay"
      component={() => (
        <AbsoluteFill>
          <Video src="${input}" />
          <Text
            style={{
              position: "absolute",
              ${position === "center" ? "top: 50%; left: 50%; transform: translate(-50%, -50%)" : `top: ${position === "top" ? "10%" : "80%"}`},
              fontSize: ${fontSize},
              color: "${color}",
              fontWeight: "bold",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            ${text}
          </Text>
        </AbsoluteFill>
      )}
      durationInFrames={90}
      fps={30}
      width={${w}}
      height={${h}}
    />
  );
};`;
}

function generateAudioComposition(input: string, params: any, w: number, h: number): string {
  const { audioFile, volume = 0.8 } = params;
  return `import { Composition, AbsoluteFill, Video, Audio } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="AudioOverlay"
      component={() => (
        <AbsoluteFill>
          <Video src="${input}" />
          <Audio src="${audioFile}" volume={${volume}} />
        </AbsoluteFill>
      )}
      durationInFrames={90}
      fps={30}
      width={${w}}
      height={${h}}
    />
  );
};`;
}

function generateEffectComposition(input: string, params: any, w: number, h: number): string {
  const { effectType = "blur", intensity = 5 } = params;
  return `import { Composition, AbsoluteFill, Video } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="EffectVideo"
      component={() => (
        <AbsoluteFill
          style={{
            filter: "${effectType}(${intensity}px)",
          }}
        >
          <Video src="${input}" />
        </AbsoluteFill>
      )}
      durationInFrames={90}
      fps={30}
      width={${w}}
      height={${h}}
    />
  );
};`;
}

function generateResizeComposition(input: string, params: any): string {
  const { newWidth = 1280, newHeight = 720 } = params;
  return `import { Composition, Video } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="ResizedVideo"
      component={Video}
      durationInFrames={90}
      fps={30}
      width={${newWidth}}
      height={${newHeight}}
      props={{
        src: "${input}",
      }}
    />
  );
};`;
}

function generateCropComposition(input: string, params: any, w: number, h: number): string {
  const { x = 0, y = 0, width = w, height = h } = params;
  return `import { Composition, AbsoluteFill, Video } from "remotion";

export const RemotionComposition: React.FC = () => {
  return (
    <Composition
      id="CroppedVideo"
      component={() => (
        <AbsoluteFill
          style={{
            overflow: "hidden",
            width: ${width},
            height: ${height},
          }}
        >
          <Video
            src="${input}"
            style={{
              position: "absolute",
              left: -${x},
              top: -${y},
            }}
          />
        </AbsoluteFill>
      )}
      durationInFrames={90}
      fps={30}
      width={${width}}
      height={${height}}
    />
  );
};`;
}
