/**
 * pi-brandly runtime validation utilities
 *
 * Provides TypeBox-based runtime validation for tool parameters,
 * eliminating unsafe `as` casts and catching bad input early.
 */

import { type TSchema } from "typebox";
import { Value } from "typebox/value";

/**
 * Validate params against a TypeBox schema at runtime.
 * Returns the validated (and coerced) value, or throws a descriptive error.
 */
export function validateParams<T>(schema: TSchema, params: Record<string, unknown>, toolName: string): T {
  if (!Value.Check(schema, params)) {
    const errors = [...Value.Errors(schema, params)];
    const details = errors.map((e) => `  - ${e.path}: ${e.message}`).join("\n");
    throw new Error(
      `[${toolName}] Invalid parameters:\n${details}`
    );
  }
  return params as unknown as T;
}

/**
 * Validate that a string is a valid UUID v4.
 */
export function validateProjectId(id: string, toolName: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`[${toolName}] Invalid project ID format: ${id}`);
  }
}

/**
 * Validate that required string parameters are non-empty.
 */
export function validateRequired(
  params: Record<string, unknown>,
  requiredKeys: string[],
  toolName: string
): void {
  for (const key of requiredKeys) {
    const val = params[key];
    if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
      throw new Error(`[${toolName}] Missing required parameter: ${key}`);
    }
  }
}

/**
 * Validate that a number is within a range.
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  paramName: string,
  toolName: string
): void {
  if (typeof value !== "number" || value < min || value > max) {
    throw new Error(
      `[${toolName}] Parameter '${paramName}' must be between ${min} and ${max}, got: ${value}`
    );
  }
}

/**
 * Wrap an error with project context for better debugging.
 */
export function contextualError(toolName: string, projectId: string | undefined, message: string): Error {
  const prefix = projectId ? `[${toolName}|${projectId.slice(0, 8)}]` : `[${toolName}]`;
  return new Error(`${prefix} ${message}`);
}
