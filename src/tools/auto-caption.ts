/**
 * brandly_auto_caption — Word-level captions / subtitles
 *
 * Generate word-level captions/subtitles from voiceover audio. Outputs an
 * SRT file and a Remotion component that can be overlaid on the final video
 * with word-level highlighting and animations.
 *
 * Adapted from brandly-plugin (OpenCode) for Pi's ExtensionAPI.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ToolContext } from "./context.js";

interface CaptionWord {
  word: string;
  start: number; // ms
  end: number; // ms
  confidence?: number;
}

interface CaptionSegment {
  text: string;
  start: number;
  end: number;
  words: CaptionWord[];
}

interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  position: "top" | "center" | "bottom";
  alignment: "left" | "center" | "right";
  maxWidth: number;
  padding: number;
  borderRadius: number;
  wordHighlight: boolean;
  highlightColor: string;
  animation: "none" | "fade" | "pop" | "typewriter";
}

const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "Inter",
  fontSize: 48,
  fontColor: "#FFFFFF",
  backgroundColor: "#000000",
  backgroundOpacity: 0.7,
  position: "bottom",
  alignment: "center",
  maxWidth: 80,
  padding: 12,
  borderRadius: 8,
  wordHighlight: true,
  highlightColor: "#FFD700",
  animation: "pop",
};

const CAPTION_PRESETS: Record<string, Partial<CaptionStyle>> = {
  tiktok: {
    fontFamily: "Impact",
    fontSize: 56,
    fontColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0,
    position: "center",
    wordHighlight: true,
    highlightColor: "#00FF00",
    animation: "pop",
  },
  youtube: {
    fontFamily: "Roboto",
    fontSize: 42,
    fontColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0.8,
    position: "bottom",
    wordHighlight: false,
    animation: "fade",
  },
  cinematic: {
    fontFamily: "Playfair Display",
    fontSize: 36,
    fontColor: "#F5F5F5",
    backgroundColor: "#000000",
    backgroundOpacity: 0.5,
    position: "bottom",
    wordHighlight: false,
    animation: "typewriter",
  },
  minimal: {
    fontFamily: "Inter",
    fontSize: 32,
    fontColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0,
    position: "bottom",
    wordHighlight: false,
    animation: "none",
  },
  bold: {
    fontFamily: "Montserrat",
    fontSize: 64,
    fontColor: "#FFFFFF",
    backgroundColor: "#FF0000",
    backgroundOpacity: 0.9,
    position: "center",
    wordHighlight: true,
    highlightColor: "#FFD700",
    animation: "pop",
  },
};

function generateCaptionSrt(segments: CaptionSegment[]): string {
  let srt = "";
  segments.forEach((seg, idx) => {
    const startTime = formatSrtTime(seg.start);
    const endTime = formatSrtTime(seg.end);
    srt += `${idx + 1}\n${startTime} --> ${endTime}\n${seg.text}\n\n`;
  });
  return srt;
}

function formatSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function generateCaptionComponent(style: CaptionStyle): string {
  return `import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

interface Caption {
  text: string;
  start: number;
  end: number;
  words: { word: string; start: number; end: number }[];
}

interface AutoCaptionProps {
  captions: Caption[];
  style?: Partial<CaptionStyle>;
}

const DEFAULT_STYLE: CaptionStyle = ${JSON.stringify(style, null, 2)};

export const AutoCaption: React.FC<AutoCaptionProps> = ({
  captions,
  style: userStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = { ...DEFAULT_STYLE, ...userStyle };
  const currentTime = (frame / fps) * 1000;

  const activeSegment = captions.find(
    (c) => currentTime >= c.start && currentTime <= c.end
  );

  if (!activeSegment) return null;

  const segmentProgress = interpolate(
    currentTime,
    [activeSegment.start, activeSegment.end],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const getWordStyle = (wordIdx: number): React.CSSProperties => {
    const word = activeSegment.words[wordIdx];
    if (!word) return {};

    const isActive = currentTime >= word.start && currentTime <= word.end;
    const isPast = currentTime > word.end;

    const baseStyle: React.CSSProperties = {
      transition: "all 0.15s ease",
      opacity: isPast ? 0.5 : 1,
    };

    if (s.wordHighlight && isActive) {
      return {
        ...baseStyle,
        color: s.highlightColor,
        transform: "scale(1.1)",
        fontWeight: "bold",
      };
    }

    return baseStyle;
  };

  const getContainerStyle = (): React.CSSProperties => {
    const positionStyles: Record<string, React.CSSProperties> = {
      top: { top: "10%", justifyContent: "flex-start" },
      center: { top: "50%", transform: "translateY(-50%)", justifyContent: "center" },
      bottom: { bottom: "10%", justifyContent: "flex-end" },
    };

    return {
      position: "absolute",
      left: "50%",
      transform: s.position === "center" ? "translate(-50%, -50%)" : "translateX(-50%)",
      width: \`\${s.maxWidth}%\`,
      textAlign: s.alignment,
      padding: s.padding,
      borderRadius: s.borderRadius,
      backgroundColor:
        s.backgroundColor + Math.round(s.backgroundOpacity * 255)
          .toString(16)
          .padStart(2, "0"),
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      color: s.fontColor,
      lineHeight: 1.3,
      ...positionStyles[s.position],
    };
  };

  const getAnimationStyle = (): React.CSSProperties => {
    switch (s.animation) {
      case "fade":
        return {
          opacity: interpolate(segmentProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        };
      case "pop":
        return {
          transform: \`scale(\${interpolate(
            segmentProgress,
            [0, 0.1, 0.9, 1],
            [0.8, 1, 1, 0.8],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )})\`,
        };
      case "typewriter":
        return {
          clipPath: \`inset(0 \${(1 - segmentProgress) * 100}% 0 0)\`,
        };
      default:
        return {};
    }
  };

  return (
    <AbsoluteFill>
      <div style={{ ...getContainerStyle(), ...getAnimationStyle() }}>
        {activeSegment.words.map((w, i) => (
          <span key={i} style={getWordStyle(i)}>
            {w.word}{" "}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
`;
}

function generateCaptionEntry(
  captions: CaptionSegment[],
  style: CaptionStyle
): string {
  return `import { Composition } from "remotion";
import { AutoCaption } from "./AutoCaption";

const captions = ${JSON.stringify(captions, null, 2)};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AutoCaption"
      component={AutoCaption}
      durationInFrames={30 * 60}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        captions,
      }}
    />
  );
};
`;
}

export function createAutoCaptionTool(ctx: ToolContext) {
  return {
    name: "brandly_auto_caption",
    description:
      "Generate word-level captions/subtitles from voiceover audio. Outputs SRT file and a Remotion component that can be overlaid on the final video with word-level highlighting and animations.",
    parameters: {
      type: "object",
      properties: {
        projectID: { type: "string", description: "Project ID" },
        audioPath: {
          type: "string",
          description: "Path to voiceover audio file (relative to project directory)",
        },
        captions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              start: { type: "number" },
              end: { type: "number" },
              words: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    start: { type: "number" },
                    end: { type: "number" },
                  },
                },
              },
            },
          },
          description: "Pre-generated caption segments (if available). If not provided, generates placeholder captions.",
        },
        style: {
          type: "string",
          enum: ["tiktok", "youtube", "cinematic", "minimal", "bold", "custom"],
          description: "Caption style preset",
        },
        customStyle: {
          type: "object",
          properties: {
            fontFamily: { type: "string" },
            fontSize: { type: "number" },
            fontColor: { type: "string" },
            backgroundColor: { type: "string" },
            backgroundOpacity: { type: "number" },
            position: { type: "string", enum: ["top", "center", "bottom"] },
            alignment: { type: "string", enum: ["left", "center", "right"] },
            maxWidth: { type: "number" },
            wordHighlight: { type: "boolean" },
            highlightColor: { type: "string" },
            animation: { type: "string", enum: ["none", "fade", "pop", "typewriter"] },
          },
          description: "Custom caption style (overrides preset)",
        },
        exportSrt: { type: "boolean", description: "Export SRT subtitle file" },
      },
      required: ["projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { projectID, audioPath, customStyle, exportSrt } = args as {
        projectID: string;
        audioPath?: string;
        captions?: CaptionSegment[];
        style?: string;
        customStyle?: Partial<CaptionStyle>;
        exportSrt?: boolean;
      };

      // Validate project
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project ${projectID} not found`);
      }

      // Build caption style
      const presetName = (args.style as string) || "tiktok";
      const preset = CAPTION_PRESETS[presetName] || CAPTION_PRESETS.tiktok;
      const captionStyle: CaptionStyle = { ...DEFAULT_STYLE, ...preset, ...customStyle };

      // Use provided captions or generate placeholders
      let captions: CaptionSegment[] = args.captions as CaptionSegment[] ||
        audioPath && existsSync(audioPath)
          ? [
              {
                text: "Replace with transcribed captions from: " + audioPath,
                start: 0,
                end: 3000,
                words: [
                  { word: "Replace", start: 0, end: 500 },
                  { word: "with", start: 500, end: 800 },
                  { word: "transcribed", start: 800, end: 2000 },
                  { word: "captions", start: 2000, end: 3000 },
                ],
              },
            ]
          : [
              {
                text: "Replace with actual transcribed captions",
                start: 0,
                end: 3000,
                words: [
                  { word: "Replace", start: 0, end: 500 },
                  { word: "with", start: 500, end: 800 },
                  { word: "actual", start: 800, end: 1200 },
                  { word: "transcribed", start: 1200, end: 2000 },
                  { word: "captions", start: 2000, end: 3000 },
                ],
              },
            ];

      // Create captions directory
      const captionsDir = join(ctx.directory, "captions", projectID);
      const srcDir = join(captionsDir, "src");
      await mkdir(srcDir, { recursive: true });

      // Save caption data
      await writeFile(
        join(captionsDir, "captions.json"),
        JSON.stringify({ captions, style: captionStyle }, null, 2)
      );

      // Export SRT if requested
      if (exportSrt !== false) {
        const srt = generateCaptionSrt(captions);
        await writeFile(join(captionsDir, "captions.srt"), srt);
      }

      // Generate Remotion component
      await writeFile(
        join(srcDir, "AutoCaption.tsx"),
        generateCaptionComponent(captionStyle)
      );
      await writeFile(
        join(srcDir, "Root.tsx"),
        generateCaptionEntry(captions, captionStyle)
      );
      await writeFile(
        join(srcDir, "index.ts"),
        `import { registerRoot } from "remotion";\nimport { RemotionRoot } from "./Root";\nregisterRoot(RemotionRoot);\n`
      );

      // Generate package.json
      await writeFile(
        join(captionsDir, "package.json"),
        JSON.stringify(
          {
            name: `brandly-captions-${projectID}`,
            version: "1.0.0",
            private: true,
            scripts: {
              studio: "remotion studio",
              render: "remotion render",
            },
            dependencies: {
              "@remotion/cli": "4.0.0",
              react: "^18.2.0",
              "react-dom": "^18.2.0",
              remotion: "4.0.0",
            },
            devDependencies: {
              "@types/react": "^18.2.0",
              typescript: "^5.3.0",
            },
          },
          null,
          2
        )
      );

      return {
        projectID,
        captionStyle: captionStyle,
        captionsCount: captions.length,
        totalDuration: captions.length > 0 ? captions[captions.length - 1].end : 0,
        files: {
          captionsJson: join(captionsDir, "captions.json"),
          srt: exportSrt !== false ? join(captionsDir, "captions.srt") : null,
          component: join(srcDir, "AutoCaption.tsx"),
        },
        message: `Generated ${captions.length} caption segments. Remotion component ready in ${captionsDir}`,
      };
    },
  };
}
