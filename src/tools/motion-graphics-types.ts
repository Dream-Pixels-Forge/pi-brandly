/**
 * pi-brandly motion graphics types
 *
 * Extracted from motion-graphics.ts for modularity.
 * Shared types for the motion graphics system.
 */

export type AnimationType =
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

export type EasingType = "linear" | "easeIn" | "easeOut" | "easeInOut" | "spring";

export type ElementType = "text" | "rect" | "circle" | "line" | "image";

export interface MotionGraphicAnimation {
  type: AnimationType;
  duration?: number;
  delay?: number;
  easing?: EasingType;
}

export interface MotionGraphicElement {
  type: ElementType;
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
  animation?: MotionGraphicAnimation;
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

/**
 * Validated preset names.
 */
export type MotionGraphicPreset = "title-reveal" | "product-showcase" | "kinetic-text" | "stats-counter" | "custom";

/**
 * All available animation types for documentation / validation.
 */
export const ANIMATION_TYPES: AnimationType[] = [
  "fadeIn", "fadeOut", "slideInLeft", "slideInRight", "slideInTop", "slideInBottom",
  "scaleIn", "scaleOut", "rotateIn", "typewriter", "bounce", "pulse", "blurIn",
  "countUp", "drawLine",
];

export const ELEMENT_TYPES: ElementType[] = ["text", "rect", "circle", "line", "image"];
