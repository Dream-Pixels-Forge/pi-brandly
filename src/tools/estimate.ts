/**
 * brandly_estimate — Cost estimation
 */

import type { ToolContext } from "./context.js";
import { STYLE_COSTS, SHOT_COSTS, VIDEO_STYLES, type VideoStyle } from "../constants.js";

export function createEstimateTool(ctx: ToolContext) {
  return {
    name: "brandly_estimate",
    description: "Estimate credit cost for a video project",
    parameters: {
      type: "object",
      properties: {
        idea: { type: "string", description: "Product idea or brief" },
        productName: { type: "string", description: "Product name" },
        style: {
          type: "string",
          enum: VIDEO_STYLES,
          description: "Video style",
        },
        shotCount: {
          type: "number",
          minimum: 3,
          maximum: 10,
          default: 5,
          description: "Number of shots (3-10)",
        },
      },
      required: ["idea", "productName"],
    },
    execute: async (args: Record<string, unknown>) => {
      const { idea, productName, style, shotCount } = args as {
        idea: string;
        productName: string;
        style?: string;
        shotCount?: number;
      };

      const selectedStyle = (style as VideoStyle) || "cinematic";
      const shots = shotCount || 5;

      const baseCost = STYLE_COSTS[selectedStyle] || 200;
      const shotCost = SHOT_COSTS[shots] || 0;
      const totalCost = baseCost + shotCost;

      // Build breakdown
      const breakdown: Record<string, number> = {
        "Base cost (style)": baseCost,
        "Additional shots": shotCost,
        "Total estimated": totalCost,
      };

      // Cost per phase estimate
      const phases = ["trends", "concept", "script", "asset", "audio", "validate", "publish"];
      const costPerPhase: Record<string, number> = {};
      for (const phase of phases) {
        costPerPhase[phase] = Math.round(totalCost / phases.length);
      }

      // Budget recommendations
      const recommendations: string[] = [];
      if (totalCost < 100) {
        recommendations.push("Low budget — consider UGC or montage style for better value");
      } else if (totalCost < 200) {
        recommendations.push("Medium budget — cinematic or lifestyle style recommended");
      } else {
        recommendations.push("High budget — multi-shot or cinematic style for premium quality");
      }

      if (shots > 7) {
        recommendations.push(`${shots} shots is ambitious — consider 5-6 for first project`);
      }

      return {
        product: productName,
        idea,
        style: selectedStyle,
        shotCount: shots,
        breakdown,
        costPerPhase,
        recommendations,
        budgetSuggestion: Math.ceil(totalCost * 1.1), // 10% buffer
      };
    },
  };
}
