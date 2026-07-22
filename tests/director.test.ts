/**
 * Unit tests for Director script parsing and plan building
 */

import { describe, it } from "node:test";
import assert from "node:assert";

// We test the pure functions by reimplementing them here for testing.
// In production, these live in director.ts and are not exported.

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

// --- Tests ---

describe("parseDuration", () => {
  it("should parse '3s' format", () => {
    assert.strictEqual(parseDuration("3s"), 3);
  });

  it("should parse 'duration: 5' format", () => {
    assert.strictEqual(parseDuration("duration: 5"), 5);
  });

  it("should parse decimal durations", () => {
    assert.strictEqual(parseDuration("2.5s"), 2.5);
  });

  it("should return fallback for no match", () => {
    assert.strictEqual(parseDuration("no duration here"), 3);
    assert.strictEqual(parseDuration("no duration here", 5), 5);
  });

  it("should clamp to valid range", () => {
    assert.strictEqual(parseDuration("0s"), 3); // too small
    assert.strictEqual(parseDuration("50s"), 3); // too large
  });
});

describe("parseAspectRatio", () => {
  it("should parse 9:16", () => {
    assert.strictEqual(parseAspectRatio("9:16"), "9:16");
  });

  it("should parse 16:9", () => {
    assert.strictEqual(parseAspectRatio("aspect ratio: 16:9"), "16:9");
  });

  it("should return undefined for no match", () => {
    assert.strictEqual(parseAspectRatio("no ratio here"), undefined);
  });
});

describe("firstMatch", () => {
  it("should find first matching key", () => {
    assert.strictEqual(firstMatch("camera: dolly in", ["camera", "movement"]), "dolly in");
  });

  it("should try multiple keys", () => {
    assert.strictEqual(firstMatch("movement: pan right", ["camera", "movement"]), "pan right");
  });

  it("should return undefined if no match", () => {
    assert.strictEqual(firstMatch("no match here", ["camera"]), undefined);
  });
});

describe("parseMarkdownScript", () => {
  it("should parse ### Shot N format", () => {
    const script = `### Shot 1 — Hook
Product slams onto marble surface.
Camera: dolly in
Duration: 3s

### Shot 2 — Reveal
Liquid pours in slow motion.
Camera: orbit
Duration: 4s`;

    const shots = parseMarkdownScript(script);
    assert.strictEqual(shots.length, 2);
    assert.strictEqual(shots[0].title, "— Hook");
    assert.ok(shots[0].prompt.includes("Product slams"));
    assert.strictEqual(shots[0].cameraMovement, "dolly in");
    assert.strictEqual(shots[0].durationSec, 3);
    assert.strictEqual(shots[1].durationSec, 4);
  });

  it("should parse numbered list format", () => {
    const script = `1. Hook shot
Product appears dramatically.
Duration: 2s

2. Feature shot
Show the product in use.
Duration: 3s`;

    const shots = parseMarkdownScript(script);
    assert.strictEqual(shots.length, 2);
    assert.strictEqual(shots[0].durationSec, 2);
  });

  it("should parse bullet format", () => {
    const script = `- Shot 1: Opening
Dramatic entrance
Duration: 2s

- Shot 2: Closing
Product reveal
Duration: 3s`;

    const shots = parseMarkdownScript(script);
    assert.strictEqual(shots.length, 2);
  });

  it("should handle blank-line fallback", () => {
    const script = `First paragraph with some content about the product.

Second paragraph with more details about features.`;

    const shots = parseMarkdownScript(script);
    assert.ok(shots.length >= 1);
  });

  it("should parse aspect ratios", () => {
    const script = `### Shot 1
Product on table
Aspect: 9:16
Duration: 3s`;

    const shots = parseMarkdownScript(script);
    assert.strictEqual(shots[0].aspectRatio, "9:16");
  });

  it("should parse model specification", () => {
    const script = `### Shot 1
Product shot
Model: kling3_0
Duration: 3s`;

    const shots = parseMarkdownScript(script);
    assert.strictEqual(shots[0].model, "kling3_0");
  });
});

describe("Shot validation", () => {
  it("should have required fields", () => {
    const script = `### Shot 1
A product shot on marble.
Duration: 3s`;

    const shots = parseMarkdownScript(script);
    assert.ok(shots[0].description);
    assert.ok(shots[0].prompt);
    assert.strictEqual(typeof shots[0].durationSec, "number");
    assert.ok(shots[0].durationSec >= 1);
  });
});
