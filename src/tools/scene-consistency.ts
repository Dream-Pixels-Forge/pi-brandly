/**
 * brandly_scene_consistency — Lock character/product references
 *
 * Lock character and product references across multiple shots for visual
 * consistency. Define characters/products, assign them to scenes, and
 * generate prompts that maintain consistent appearance throughout the video.
 *
 * Adapted from brandly-plugin (OpenCode) for Pi's ExtensionAPI.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ToolContext } from "./context.js";

interface CharacterReference {
  id: string;
  name: string;
  type: "person" | "product" | "object" | "animal" | "custom";
  description: string;
  referenceImages: string[]; // paths to reference images
  attributes: {
    appearance?: string;
    clothing?: string;
    colors?: string[];
    style?: string;
    brand?: string;
    features?: string[];
  };
  consistencyScore?: number; // 0-1, how consistent the character is across shots
  usageCount: number;
  lastUsed?: string;
}

interface SceneAssignment {
  sceneIndex: number;
  characterId: string;
  role: "primary" | "secondary" | "background";
  action: string;
  position: string;
  notes: string;
}

interface ConsistencyPlan {
  characters: CharacterReference[];
  assignments: SceneAssignment[];
  rules: {
    maintainAppearance: boolean;
    lockColors: boolean;
    lockClothing: boolean;
    referenceStrength: "strict" | "moderate" | "loose";
  };
}

function generateCharacterId(): string {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSceneConsistencyTool(ctx: ToolContext) {
  return {
    name: "brandly_scene_consistency",
    description:
      "Lock character and product references across multiple shots for visual consistency. Define characters/products, assign them to scenes, and generate prompts that maintain consistent appearance throughout the video.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "create_character",
            "update_character",
            "list_characters",
            "delete_character",
            "assign_to_scene",
            "remove_from_scene",
            "get_scene_plan",
            "generate_consistent_prompt",
            "set_rules",
          ],
          description: "Action to perform",
        },
        projectID: { type: "string", description: "Project ID" },
        characterId: {
          type: "string",
          description: "Character ID (required for update/delete/assign/remove)",
        },
        name: { type: "string", description: "Character name" },
        type: {
          type: "string",
          enum: ["person", "product", "object", "animal", "custom"],
          description: "Character type",
        },
        description: { type: "string", description: "Character description for prompt generation" },
        referenceImages: {
          type: "array",
          items: { type: "string" },
          description: "Paths to reference images",
        },
        attributes: {
          type: "object",
          properties: {
            appearance: { type: "string" },
            clothing: { type: "string" },
            colors: { type: "array", items: { type: "string" } },
            style: { type: "string" },
            brand: { type: "string" },
            features: { type: "array", items: { type: "string" } },
          },
        },
        sceneIndex: { type: "number", description: "Scene index (0-based)" },
        role: {
          type: "string",
          enum: ["primary", "secondary", "background"],
          description: "Character role in the scene",
        },
        action_description: { type: "string", description: "What the character is doing in the scene" },
        position: { type: "string", description: "Position in the frame (e.g. left third, center, right third)" },
        notes: { type: "string", description: "Additional notes for this scene assignment" },
        basePrompt: { type: "string", description: "Base prompt to enhance with consistency references" },
        sceneCount: { type: "number", description: "Number of scenes for prompt generation" },
        rules: {
          type: "object",
          properties: {
            maintainAppearance: { type: "boolean" },
            lockColors: { type: "boolean" },
            lockClothing: { type: "boolean" },
            referenceStrength: { type: "string", enum: ["strict", "moderate", "loose"] },
          },
        },
      },
      required: ["action", "projectID"],
    },
    execute: async (args: Record<string, unknown>) => {
      const input = args as {
        action: string;
        projectID: string;
        characterId?: string;
        name?: string;
        type?: "person" | "product" | "object" | "animal" | "custom";
        description?: string;
        referenceImages?: string[];
        attributes?: CharacterReference["attributes"];
        sceneIndex?: number;
        role?: "primary" | "secondary" | "background";
        action_description?: string;
        position?: string;
        notes?: string;
        basePrompt?: string;
        sceneCount?: number;
        rules?: Partial<ConsistencyPlan["rules"]>;
      };

      const { action, projectID } = input;

      // Validate project
      const project = await ctx.readProject(projectID);
      if (!project) {
        throw new Error(`Project ${projectID} not found`);
      }

      // Load or create consistency plan
      const consistencyDir = join(ctx.directory, "consistency", projectID);
      await mkdir(consistencyDir, { recursive: true });

      const planPath = join(consistencyDir, "plan.json");
      let plan: ConsistencyPlan;

      if (existsSync(planPath)) {
        plan = JSON.parse(await readFile(planPath, "utf-8"));
      } else {
        plan = {
          characters: [],
          assignments: [],
          rules: {
            maintainAppearance: true,
            lockColors: true,
            lockClothing: true,
            referenceStrength: "moderate",
          },
        };
      }

      const savePlan = async () => {
        await writeFile(planPath, JSON.stringify(plan, null, 2));
      };

      switch (action) {
        case "create_character": {
          const id = generateCharacterId();
          const character: CharacterReference = {
            id,
            name: input.name || "Unnamed Character",
            type: input.type || "person",
            description: input.description || "",
            referenceImages: input.referenceImages || [],
            attributes: input.attributes || {},
            usageCount: 0,
          };
          plan.characters.push(character);
          await savePlan();
          return { ...character, message: "Character created" };
        }

        case "update_character": {
          if (!input.characterId) throw new Error("characterId required");
          const char = plan.characters.find((c) => c.id === input.characterId);
          if (!char) throw new Error("Character not found");

          if (input.name) char.name = input.name;
          if (input.type) char.type = input.type;
          if (input.description) char.description = input.description;
          if (input.referenceImages) char.referenceImages = input.referenceImages;
          if (input.attributes) {
            char.attributes = { ...char.attributes, ...input.attributes };
          }
          await savePlan();
          return { ...char, message: "Character updated" };
        }

        case "list_characters": {
          return { characters: plan.characters };
        }

        case "delete_character": {
          if (!input.characterId) throw new Error("characterId required");
          plan.characters = plan.characters.filter((c) => c.id !== input.characterId);
          plan.assignments = plan.assignments.filter(
            (a) => a.characterId !== input.characterId
          );
          await savePlan();
          return { deleted: input.characterId };
        }

        case "assign_to_scene": {
          if (!input.characterId) throw new Error("characterId required");
          if (input.sceneIndex === undefined) throw new Error("sceneIndex required");
          const char = plan.characters.find((c) => c.id === input.characterId);
          if (!char) throw new Error("Character not found");

          // Remove existing assignment for same character in same scene
          plan.assignments = plan.assignments.filter(
            (a) => !(a.sceneIndex === input.sceneIndex && a.characterId === input.characterId)
          );

          const assignment: SceneAssignment = {
            sceneIndex: input.sceneIndex,
            characterId: input.characterId,
            role: input.role || "primary",
            action: input.action_description || "",
            position: input.position || "center",
            notes: input.notes || "",
          };
          plan.assignments.push(assignment);

          char.usageCount++;
          char.lastUsed = new Date().toISOString();

          await savePlan();
          return { assignment, character: char.name, message: `Assigned to scene ${input.sceneIndex}` };
        }

        case "remove_from_scene": {
          if (!input.characterId) throw new Error("characterId required");
          if (input.sceneIndex === undefined) throw new Error("sceneIndex required");
          plan.assignments = plan.assignments.filter(
            (a) => !(a.sceneIndex === input.sceneIndex && a.characterId === input.characterId)
          );
          await savePlan();
          return { removed: input.characterId, scene: input.sceneIndex };
        }

        case "get_scene_plan": {
          const scenes = plan.assignments.reduce((acc, a) => {
            if (!acc[a.sceneIndex]) acc[a.sceneIndex] = [];
            const char = plan.characters.find((c) => c.id === a.characterId);
            acc[a.sceneIndex].push({ ...a, characterName: char?.name || "Unknown" });
            return acc;
          }, {} as Record<number, (SceneAssignment & { characterName: string })[]>);

          return { plan, scenes, rules: plan.rules };
        }

        case "generate_consistent_prompt": {
          const sceneCount = input.sceneCount || 5;
          const basePrompt = input.basePrompt || "";
          const prompts: Array<{ scene: number; prompt: string; references: string[] }> = [];

          for (let i = 0; i < sceneCount; i++) {
            const sceneAssignments = plan.assignments.filter((a) => a.sceneIndex === i);
            const refs: string[] = [];
            const descriptions: string[] = [];

            for (const assignment of sceneAssignments) {
              const char = plan.characters.find((c) => c.id === assignment.characterId);
              if (!char) continue;

              // Build character reference string
              let charRef = char.description;
              if (char.attributes.appearance) charRef += `, ${char.attributes.appearance}`;
              if (char.attributes.clothing && plan.rules.lockClothing) {
                charRef += `, wearing ${char.attributes.clothing}`;
              }
              if (char.attributes.colors && plan.rules.lockColors) {
                charRef += `, colors: ${char.attributes.colors.join(", ")}`;
              }
              if (char.attributes.brand) charRef += `, ${char.attributes.brand} brand`;

              descriptions.push(
                `${char.name} (${assignment.role}): ${charRef} - ${assignment.action} at ${assignment.position}`
              );

              // Add reference image references
              if (char.referenceImages.length > 0) {
                refs.push(...char.referenceImages);
              }
            }

            const scenePrompt = [
              `Scene ${i + 1}:`,
              descriptions.length > 0 ? descriptions.join(". ") : basePrompt,
              plan.rules.maintainAppearance
                ? "[CONSISTENT: maintain character appearance across all scenes]"
                : "",
            ]
              .filter(Boolean)
              .join(" ");

            prompts.push({
              scene: i + 1,
              prompt: scenePrompt,
              references: refs,
            });
          }

          return {
            prompts,
            rules: plan.rules,
            charactersUsed: plan.characters.map((c) => ({
              name: c.name,
              type: c.type,
              referenceCount: c.referenceImages.length,
            })),
          };
        }

        case "set_rules": {
          if (input.rules) {
            plan.rules = { ...plan.rules, ...input.rules };
            await savePlan();
          }
          return { rules: plan.rules };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  };
}
