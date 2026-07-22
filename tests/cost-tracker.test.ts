/**
 * Unit tests for CostTracker
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { CostTracker } from "../src/cost-tracker.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname ?? ".", ".test-tmp");

describe("CostTracker", () => {
  let tracker: CostTracker;

  beforeEach(async () => {
    await mkdir(join(TEST_DIR, "test-project-1"), { recursive: true });
    await writeFile(
      join(TEST_DIR, "test-project-1", "project.json"),
      JSON.stringify({
        id: "test-project-1",
        budgetCredits: 500,
        creditsSpent: 0,
        costLog: [],
      })
    );
    tracker = new CostTracker(TEST_DIR);
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  describe("canAfford", () => {
    it("should allow when within budget", async () => {
      const result = await tracker.canAfford("test-project-1", 100);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.remaining, 500);
      assert.strictEqual(result.overBudget, 0);
    });

    it("should deny when over budget", async () => {
      const result = await tracker.canAfford("test-project-1", 600);
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.remaining, 500);
      assert.strictEqual(result.overBudget, 100);
    });

    it("should deny for non-existent project", async () => {
      const result = await tracker.canAfford("non-existent", 100);
      assert.strictEqual(result.allowed, false);
    });
  });

  describe("recordSpend", () => {
    it("should record spend and update totals", async () => {
      const result = await tracker.recordSpend("test-project-1", "asset", "generate_image", 50);
      assert.strictEqual(result.newTotal, 50);
      assert.strictEqual(result.remaining, 450);
    });

    it("should throw when exceeding budget", async () => {
      await assert.rejects(
        () => tracker.recordSpend("test-project-1", "asset", "generate_video", 600),
        /Budget exceeded/
      );
    });

    it("should accumulate multiple spends", async () => {
      await tracker.recordSpend("test-project-1", "asset", "img1", 50);
      await tracker.recordSpend("test-project-1", "asset", "img2", 30);
      await tracker.recordSpend("test-project-1", "audio", "music", 20);

      const summary = await tracker.getSummary("test-project-1");
      assert.strictEqual(summary.total, 100);
      assert.strictEqual(summary.remaining, 400);
      assert.strictEqual(summary.byPhase["asset"], 80);
      assert.strictEqual(summary.byPhase["audio"], 20);
      assert.strictEqual(summary.entries.length, 3);
    });
  });

  describe("getSummary", () => {
    it("should return correct percentages", async () => {
      await tracker.recordSpend("test-project-1", "asset", "gen", 250);
      const summary = await tracker.getSummary("test-project-1");
      assert.strictEqual(summary.percentUsed, 50);
    });
  });
});
