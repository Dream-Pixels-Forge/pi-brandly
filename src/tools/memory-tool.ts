/**
 * brandly_memory — View/update preferences
 */

import type { ToolContext } from "./context.js";
import type { Memory } from "../memory.js";

export function createMemoryTool(ctx: ToolContext, memory: Memory) {
  return {
    name: "brandly_memory",
    description: "View or update user preferences",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["view", "like_hook", "dislike_hook", "reset"],
          description: "Action to perform",
        },
        hook: { type: "string", description: "Hook style to like/dislike" },
        style: { type: "string", description: "Preferred video style" },
        budget: { type: "number", description: "Default budget" },
      },
      required: ["action"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { action, hook, style, budget } = args as {
        action: string;
        hook?: string;
        style?: string;
        budget?: number;
      };

      switch (action) {
        case "view": {
          const prefs = memory.get();
          return {
            action: "view",
            preferences: prefs,
            exists: memory.exists(),
            message: memory.exists()
              ? "User preferences loaded"
              : "No preferences saved yet",
          };
        }

        case "like_hook": {
          if (!hook) throw new Error("hook parameter required for like_hook");
          await memory.likeHook(hook);
          return {
            action: "like_hook",
            hook,
            status: "saved",
            message: `Added "${hook}" to liked hooks`,
          };
        }

        case "dislike_hook": {
          if (!hook) throw new Error("hook parameter required for dislike_hook");
          await memory.dislikeHook(hook);
          return {
            action: "dislike_hook",
            hook,
            status: "saved",
            message: `Added "${hook}" to disliked hooks`,
          };
        }

        case "reset": {
          await memory.reset();
          return {
            action: "reset",
            status: "cleared",
            message: "All preferences cleared",
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
  };
}
