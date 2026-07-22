/**
 * Unit tests for validation utilities
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { Type } from "typebox";
import {
  validateParams,
  validateProjectId,
  validateRequired,
  validateRange,
  contextualError,
} from "../src/tools/validate-utils.js";

describe("validateParams", () => {
  const schema = Type.Object({
    name: Type.String(),
    count: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
  });

  it("should pass valid params", () => {
    const result = validateParams(schema, { name: "test", count: 5 }, "test_tool");
    assert.strictEqual(result.name, "test");
    assert.strictEqual(result.count, 5);
  });

  it("should use defaults for optional params", () => {
    const result = validateParams(schema, { name: "test" }, "test_tool");
    assert.strictEqual(result.name, "test");
  });

  it("should throw on missing required params", () => {
    assert.throws(() => validateParams(schema, {}, "test_tool"), /Invalid parameters/);
  });

  it("should throw on wrong type", () => {
    assert.throws(() => validateParams(schema, { name: 123 }, "test_tool"), /Invalid parameters/);
  });

  it("should throw on out-of-range values", () => {
    assert.throws(() => validateParams(schema, { name: "test", count: 0 }, "test_tool"), /Invalid parameters/);
  });
});

describe("validateProjectId", () => {
  it("should accept valid UUID", () => {
    assert.doesNotThrow(() => validateProjectId("550e8400-e29b-41d4-a716-446655440000", "test"));
  });

  it("should reject invalid UUID", () => {
    assert.throws(() => validateProjectId("not-a-uuid", "test"), /Invalid project ID format/);
  });

  it("should reject empty string", () => {
    assert.throws(() => validateProjectId("", "test"), /Invalid project ID format/);
  });
});

describe("validateRequired", () => {
  it("should pass when all required keys present", () => {
    assert.doesNotThrow(() => validateRequired({ a: "1", b: "2" }, ["a", "b"], "test"));
  });

  it("should throw on missing key", () => {
    assert.throws(() => validateRequired({ a: "1" }, ["a", "b"], "test"), /Missing required parameter: b/);
  });

  it("should throw on empty string", () => {
    assert.throws(() => validateRequired({ a: "" }, ["a"], "test"), /Missing required parameter: a/);
  });

  it("should throw on null", () => {
    assert.throws(() => validateRequired({ a: null }, ["a"], "test"), /Missing required parameter: a/);
  });
});

describe("validateRange", () => {
  it("should pass within range", () => {
    assert.doesNotThrow(() => validateRange(5, 1, 10, "count", "test"));
  });

  it("should pass at boundaries", () => {
    assert.doesNotThrow(() => validateRange(1, 1, 10, "count", "test"));
    assert.doesNotThrow(() => validateRange(10, 1, 10, "count", "test"));
  });

  it("should throw below range", () => {
    assert.throws(() => validateRange(0, 1, 10, "count", "test"), /must be between/);
  });

  it("should throw above range", () => {
    assert.throws(() => validateRange(11, 1, 10, "count", "test"), /must be between/);
  });
});

describe("contextualError", () => {
  it("should include tool name", () => {
    const err = contextualError("my_tool", undefined, "something broke");
    assert.ok(err.message.includes("[my_tool]"));
    assert.ok(err.message.includes("something broke"));
  });

  it("should include truncated project ID", () => {
    const err = contextualError("my_tool", "550e8400-e29b-41d4-a716-446655440000", "fail");
    assert.ok(err.message.includes("[my_tool|550e8400]"));
  });
});
