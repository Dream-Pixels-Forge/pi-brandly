/**
 * pi-brandly motion graphics presets
 *
 * Pre-built scene templates for common motion graphic patterns.
 * Extracted from motion-graphics.ts for modularity.
 */

import type { MotionGraphicProject } from "./motion-graphics-types.js";

/**
 * Generate a preset motion graphic project.
 */
export function generatePreset(
  preset: string,
  fps: number,
  width: number,
  height: number
): MotionGraphicProject {
  switch (preset) {
    case "title-reveal":
      return titleRevealPreset(fps, width, height);
    case "product-showcase":
      return productShowcasePreset(fps, width, height);
    case "kinetic-text":
      return kineticTextPreset(fps, width, height);
    case "stats-counter":
      return statsCounterPreset(fps, width, height);
    default:
      throw new Error(`Unknown preset: ${preset}. Available: title-reveal, product-showcase, kinetic-text, stats-counter`);
  }
}

function titleRevealPreset(fps: number, width: number, height: number): MotionGraphicProject {
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
            animation: { type: "scaleIn", duration: 0.8, easing: "spring" },
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
            animation: { type: "typewriter", duration: 1.5, delay: 0.3 },
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
            animation: { type: "fadeIn", duration: 0.8, delay: 1.8 },
          },
          {
            type: "line",
            x: 30,
            y: 54,
            width: 40,
            color: "#6c63ff",
            strokeWidth: 3,
            animation: { type: "drawLine", duration: 0.6, delay: 1.5 },
          },
        ],
      },
    ],
  };
}

function productShowcasePreset(fps: number, width: number, height: number): MotionGraphicProject {
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
            animation: { type: "scaleIn", duration: 0.6, easing: "spring" },
          },
          {
            type: "text",
            x: 10,
            y: 60,
            width: 80,
            text: "INTRODUCING",
            color: "rgba(255,255,255,0.5)",
            fontSize: 24,
            fontWeight: "normal",
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.8, delay: 0.3 },
          },
          {
            type: "text",
            x: 10,
            y: 68,
            width: 80,
            text: "YOUR PRODUCT",
            color: "#ffffff",
            fontSize: 56,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "slideInBottom", duration: 0.6, delay: 0.5 },
          },
        ],
      },
      {
        id: "features",
        duration: 4,
        background: "#0a0a0a",
        elements: [
          {
            type: "text",
            x: 10,
            y: 20,
            width: 80,
            text: "FEATURE 1",
            color: "#6c63ff",
            fontSize: 36,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "slideInLeft", duration: 0.5, delay: 0.2 },
          },
          {
            type: "text",
            x: 10,
            y: 35,
            width: 80,
            text: "Benefit description goes here",
            color: "rgba(255,255,255,0.8)",
            fontSize: 24,
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.5, delay: 0.6 },
          },
          {
            type: "line",
            x: 10,
            y: 32,
            width: 20,
            color: "#6c63ff",
            strokeWidth: 2,
            animation: { type: "drawLine", duration: 0.4, delay: 0.4 },
          },
          {
            type: "text",
            x: 10,
            y: 50,
            width: 80,
            text: "FEATURE 2",
            color: "#6c63ff",
            fontSize: 36,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "slideInLeft", duration: 0.5, delay: 1.2 },
          },
          {
            type: "text",
            x: 10,
            y: 65,
            width: 80,
            text: "Another benefit description",
            color: "rgba(255,255,255,0.8)",
            fontSize: 24,
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.5, delay: 1.6 },
          },
          {
            type: "line",
            x: 10,
            y: 62,
            width: 20,
            color: "#6c63ff",
            strokeWidth: 2,
            animation: { type: "drawLine", duration: 0.4, delay: 1.4 },
          },
        ],
      },
      {
        id: "cta",
        duration: 3,
        background: "linear-gradient(135deg, #6c63ff, #4a42d4)",
        elements: [
          {
            type: "text",
            x: 10,
            y: 35,
            width: 80,
            text: "GET STARTED",
            color: "#ffffff",
            fontSize: 64,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "scaleIn", duration: 0.6, easing: "spring" },
          },
          {
            type: "text",
            x: 10,
            y: 55,
            width: 80,
            text: "yoursite.com",
            color: "rgba(255,255,255,0.8)",
            fontSize: 28,
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.5, delay: 0.8 },
          },
        ],
      },
    ],
  };
}

function kineticTextPreset(fps: number, width: number, height: number): MotionGraphicProject {
  return {
    fps,
    width,
    height,
    scenes: [
      {
        id: "word1",
        duration: 1.5,
        background: "#000",
        elements: [
          {
            type: "text",
            x: 5,
            y: 30,
            width: 90,
            text: "FAST",
            color: "#ff4444",
            fontSize: 120,
            fontWeight: "bold",
            fontFamily: "Impact, sans-serif",
            animation: { type: "scaleIn", duration: 0.3, easing: "spring" },
          },
        ],
      },
      {
        id: "word2",
        duration: 1.5,
        background: "#000",
        elements: [
          {
            type: "text",
            x: 5,
            y: 30,
            width: 90,
            text: "POWERFUL",
            color: "#44aaff",
            fontSize: 100,
            fontWeight: "bold",
            fontFamily: "Impact, sans-serif",
            animation: { type: "slideInLeft", duration: 0.3 },
          },
        ],
      },
      {
        id: "word3",
        duration: 1.5,
        background: "#000",
        elements: [
          {
            type: "text",
            x: 5,
            y: 30,
            width: 90,
            text: "SIMPLE",
            color: "#44ff44",
            fontSize: 100,
            fontWeight: "bold",
            fontFamily: "Impact, sans-serif",
            animation: { type: "fadeIn", duration: 0.3 },
          },
        ],
      },
      {
        id: "tagline",
        duration: 2.5,
        background: "#000",
        elements: [
          {
            type: "text",
            x: 10,
            y: 40,
            width: 80,
            text: "YOUR TAGLINE HERE",
            color: "#ffffff",
            fontSize: 48,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "typewriter", duration: 1.5, delay: 0.3 },
          },
          {
            type: "line",
            x: 25,
            y: 52,
            width: 50,
            color: "#6c63ff",
            strokeWidth: 3,
            animation: { type: "drawLine", duration: 0.5, delay: 1.8 },
          },
        ],
      },
    ],
  };
}

function statsCounterPreset(fps: number, width: number, height: number): MotionGraphicProject {
  return {
    fps,
    width,
    height,
    scenes: [
      {
        id: "stats",
        duration: 5,
        background: "linear-gradient(180deg, #0a0a0a, #1a1a2e)",
        elements: [
          {
            type: "text",
            x: 10,
            y: 10,
            width: 80,
            text: "BY THE NUMBERS",
            color: "rgba(255,255,255,0.5)",
            fontSize: 24,
            fontWeight: "normal",
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.5 },
          },
          {
            type: "text",
            x: 10,
            y: 25,
            width: 35,
            text: "10K+",
            color: "#6c63ff",
            fontSize: 72,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "countUp", duration: 2, delay: 0.3 },
          },
          {
            type: "text",
            x: 10,
            y: 42,
            width: 35,
            text: "Users",
            color: "rgba(255,255,255,0.7)",
            fontSize: 24,
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.5, delay: 0.5 },
          },
          {
            type: "text",
            x: 55,
            y: 25,
            width: 35,
            text: "99.9%",
            color: "#44ff44",
            fontSize: 72,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "countUp", duration: 2, delay: 0.8 },
          },
          {
            type: "text",
            x: 55,
            y: 42,
            width: 35,
            text: "Uptime",
            color: "rgba(255,255,255,0.7)",
            fontSize: 24,
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.5, delay: 1.0 },
          },
          {
            type: "line",
            x: 10,
            y: 55,
            width: 80,
            color: "rgba(255,255,255,0.1)",
            strokeWidth: 1,
          },
          {
            type: "text",
            x: 10,
            y: 62,
            width: 80,
            text: "50M+",
            color: "#ffaa44",
            fontSize: 72,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            animation: { type: "countUp", duration: 2, delay: 1.3 },
          },
          {
            type: "text",
            x: 10,
            y: 79,
            width: 80,
            text: "API Calls Processed",
            color: "rgba(255,255,255,0.7)",
            fontSize: 24,
            fontFamily: "Arial, sans-serif",
            animation: { type: "fadeIn", duration: 0.5, delay: 1.5 },
          },
        ],
      },
    ],
  };
}
