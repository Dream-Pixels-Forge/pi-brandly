/**
 * Unit tests for ToolContext
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { createContext } from "../src/tools/context.js";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname ?? ".", ".test-ctx-tmp");
const EXT_DIR = join(TEST_DIR, "ext");

describe("ToolContext", () => {
  beforeEach(async () => {
    await mkdir(EXT_DIR, { recursive: true });
    await mkdir(join(EXT_DIR, "agents"), { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("should create context with correct paths", () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);
    assert.strictEqual(ctx.directory, TEST_DIR);
    assert.ok(ctx.brandlyDir.includes("brandly"));
    assert.ok(ctx.projectsDir.includes("projects"));
    assert.strictEqual(ctx.agentsDir, join(EXT_DIR, "agents"));
  });

  it("should create project directories", () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);
    const dirs = ctx.getProjectDirs("test-123");

    assert.ok(dirs.project.includes("test-123"));
    assert.ok(dirs.imagen.includes("imagen"));
    assert.ok(dirs.videgen.includes("videgen"));
    assert.ok(dirs.audgen.includes("audgen"));
  });

  it("should write and read project atomically", async () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);
    const project = {
      id: "test-atomic",
      name: "Test",
      status: "pending" as const,
      style: "cinematic" as const,
      shotCount: 5,
      budget: 500,
      spent: 0,
      currentPhase: "init",
      phases: { init: { status: "pending" as const } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ctx.writeProject("test-atomic", project);
    const read = await ctx.readProject("test-atomic");

    assert.notStrictEqual(read, null);
    assert.strictEqual(read!.id, "test-atomic");
    assert.strictEqual(read!.name, "Test");
  });

  it("should list projects", async () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);

    await mkdir(join(ctx.projectsDir, "proj-1"), { recursive: true });
    await mkdir(join(ctx.projectsDir, "proj-2"), { recursive: true });

    const projects = await ctx.listProjects();
    assert.ok(projects.includes("proj-1"));
    assert.ok(projects.includes("proj-2"));
  });

  it("should return null for non-existent project", async () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);
    const result = await ctx.readProject("non-existent");
    assert.strictEqual(result, null);
  });

  it("should validate allowed paths", () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);
    assert.strictEqual(ctx.isPathAllowed(join(TEST_DIR, "file.txt")), true);
  });

  it("should reject paths outside workspace", () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);
    // On Windows, use a path that's clearly outside the workspace
    const outsidePath = TEST_DIR.startsWith("C:/") || TEST_DIR.startsWith("C:\\") 
      ? "D:/some/other/file.txt" 
      : "/etc/passwd";
    assert.strictEqual(ctx.isPathAllowed(outsidePath), false);
  });

  it("should write and read preferences", async () => {
    const ctx = createContext(TEST_DIR, EXT_DIR);
    const prefs = { preferredStyle: "cinematic", budget: 300 };

    await ctx.writePreferences(prefs);
    const read = await ctx.readPreferences();

    assert.strictEqual(read.preferredStyle, "cinematic");
    assert.strictEqual(read.budget, 300);
  });
});
