/**
 * brandly_templates — List video style templates
 */

import { join } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { ToolContext } from "./context.js";

const TEMPLATES = [
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Film-quality product showcase with dramatic lighting and smooth camera movements",
    style: "cinematic",
    baseCost: 250,
    bestFor: ["Premium products", "Brand campaigns", "High-end launches"],
    characteristics: [
      "Smooth camera movements",
      "Dramatic lighting",
      "Film grain",
      "Shallow depth of field",
      "Color grading",
    ],
  },
  {
    id: "ugc",
    name: "UGC (User Generated Content)",
    description: "Authentic, raw-feeling content that looks like a real user testimonial",
    style: "ugc",
    baseCost: 150,
    bestFor: ["Social media", "Testimonials", "Authentic marketing"],
    characteristics: [
      "Handheld feel",
      "Natural lighting",
      "Casual tone",
      "Direct-to-camera",
      "Quick cuts",
    ],
  },
  {
    id: "montage",
    name: "Montage",
    description: "Fast-paced collection of product shots with energetic transitions",
    style: "montage",
    baseCost: 200,
    bestFor: ["Product showcases", "Feature highlights", "Dynamic ads"],
    characteristics: [
      "Quick cuts",
      "Multiple angles",
      "Energetic pacing",
      "Music-driven",
      "Visual variety",
    ],
  },
  {
    id: "multi_shot",
    name: "Multi-Shot",
    description: "Structured narrative with distinct scenes and story progression",
    style: "multi_shot",
    baseCost: 300,
    bestFor: ["Storytelling", "Tutorials", "Complex products"],
    characteristics: [
      "Scene-based structure",
      "Narrative arc",
      "Multiple setups",
      "Clear progression",
      "Dialogue support",
    ],
  },
  {
    id: "continuous",
    name: "Continuous",
    description: "Seamless single-take feel with flowing transitions",
    style: "continuous",
    baseCost: 200,
    bestFor: ["Satisfying content", "ASMR", "Product reveals"],
    characteristics: [
      "Single-take feel",
      "Smooth transitions",
      "Continuous motion",
      "Satisfying flow",
    ],
  },
  {
    id: "unboxing",
    name: "Unboxing",
    description: "Product reveal with anticipation building and first impressions",
    style: "unboxing",
    baseCost: 180,
    bestFor: ["New products", "Gifts", "Tech gadgets"],
    characteristics: [
      "Anticipation building",
      "Reveal moments",
      "Detail close-ups",
      "First reactions",
      "Packaging focus",
    ],
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    description: "Product integrated into everyday life scenarios",
    style: "lifestyle",
    baseCost: 170,
    bestFor: ["Consumer products", "Fashion", "Food & beverage"],
    characteristics: [
      "Real-world settings",
      "Daily routines",
      "Relatable scenarios",
      "Warm tones",
      "Natural interactions",
    ],
  },
];

export function createTemplatesTool(ctx: ToolContext) {
  return {
    name: "brandly_templates",
    description: "List available video style templates",
    parameters: {
      type: "object",
      properties: {
        templateId: { type: "string", description: "Specific template to view" },
      },
    },
    execute: async (args: Record<string, unknown>) => {
      const { templateId } = args as { templateId?: string };

      if (templateId) {
        const template = TEMPLATES.find((t) => t.id === templateId);
        if (!template) {
          throw new Error(
            `Template "${templateId}" not found. Available: ${TEMPLATES.map((t) => t.id).join(", ")}`
          );
        }
        return {
          template,
          message: `Template "${template.name}" details`,
        };
      }

      return {
        templates: TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          baseCost: t.baseCost,
          bestFor: t.bestFor,
        })),
        total: TEMPLATES.length,
        message: `Found ${TEMPLATES.length} video style templates`,
      };
    },
  };
}
