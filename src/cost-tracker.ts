/**
 * pi-brandly cost tracker
 * Tracks credit spend per project and enforces budget gates
 * 
 * Adapted from brandly-plugin with atomic writes and Pi-compatible paths
 */

import { readFile, writeFile, rename, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

interface CostEntry {
  phase: string;
  action: string;
  credits: number;
  timestamp: string;
}

interface ProjectState {
  id: string;
  budgetCredits: number;
  creditsSpent: number;
  costLog: CostEntry[];
}

/**
 * Simple file-based lock with retry to prevent concurrent write races.
 * Uses a .lock file alongside the target; if stale (>5s), forcibly acquired.
 */
async function withLock<T>(lockPath: string, fn: () => Promise<T>, retries = 5, delayMs = 50): Promise<T> {
  const lockTmp = lockPath + "." + randomUUID().slice(0, 8);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Try to create lock file exclusively
      await writeFile(lockTmp, String(process.pid), { flag: "wx" });
      // Rename is atomic on most filesystems
      await rename(lockTmp, lockPath);
      try {
        return await fn();
      } finally {
        try { await unlink(lockPath); } catch { /* ignore */ }
      }
    } catch (err: any) {
      if (err?.code === "EEXIST") {
        // Lock exists — check if stale (older than 5s)
        try {
          const stat = (await import("node:fs/promises")).stat;
          const s = await stat(lockPath);
          if (Date.now() - s.mtimeMs > 5000) {
            await unlink(lockPath).catch(() => {});
            continue;
          }
        } catch { /* lock file gone, retry */ }
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed to acquire lock after ${retries} attempts: ${lockPath}`);
}

/**
 * Tracks credit spend per project and enforces budget gates.
 * Call `canAfford()` before every expensive operation.
 * Uses file locking to prevent race conditions on concurrent writes.
 */
export class CostTracker {
  constructor(private projectsDir: string) {}

  private getProjectPath(id: string) {
    return join(this.projectsDir, id, "project.json");
  }

  private getLockPath(id: string) {
    return join(this.projectsDir, id, "project.json.lock");
  }

  private async readState(id: string): Promise<ProjectState> {
    const raw = await readFile(this.getProjectPath(id), "utf-8");
    return JSON.parse(raw);
  }

  private async writeState(id: string, state: ProjectState): Promise<void> {
    const targetPath = this.getProjectPath(id);
    const tmpPath = targetPath + ".tmp";
    await mkdir(join(targetPath, ".."), { recursive: true });
    await writeFile(tmpPath, JSON.stringify(state, null, 2));
    await rename(tmpPath, targetPath);
  }

  /**
   * Check if the project can afford a given credit cost.
   * Returns { allowed, remaining, overBudget }
   */
  async canAfford(
    projectId: string,
    credits: number
  ): Promise<{ allowed: boolean; remaining: number; overBudget: number }> {
    try {
      const state = await this.readState(projectId);
      const remaining = state.budgetCredits - state.creditsSpent;
      const overBudget = credits - remaining;
      return {
        allowed: credits <= remaining,
        remaining,
        overBudget: Math.max(0, overBudget),
      };
    } catch {
      return { allowed: false, remaining: 0, overBudget: credits };
    }
  }

  /**
   * Record a credit spend against the project.
   * Throws if would exceed budget (call canAfford first!).
   */
  async recordSpend(
    projectId: string,
    phase: string,
    action: string,
    credits: number
  ): Promise<{ newTotal: number; remaining: number }> {
    return withLock(this.getLockPath(projectId), async () => {
      const state = await this.readState(projectId);

      if (state.creditsSpent + credits > state.budgetCredits) {
        throw new Error(
          `Budget exceeded! Attempted: ${state.creditsSpent + credits}, Budget: ${state.budgetCredits}`
        );
      }

      state.creditsSpent += credits;
      state.costLog.push({
        phase,
        action,
        credits,
        timestamp: new Date().toISOString(),
      });

      await this.writeState(projectId, state);

      return {
        newTotal: state.creditsSpent,
        remaining: state.budgetCredits - state.creditsSpent,
      };
    });
  }

  /**
   * Get a summary of credit usage.
   */
  async getSummary(projectId: string) {
    const state = await this.readState(projectId);
    const byPhase: Record<string, number> = {};

    for (const entry of state.costLog) {
      byPhase[entry.phase] = (byPhase[entry.phase] || 0) + entry.credits;
    }

    return {
      total: state.creditsSpent,
      budget: state.budgetCredits,
      remaining: state.budgetCredits - state.creditsSpent,
      percentUsed: Math.round((state.creditsSpent / state.budgetCredits) * 100),
      byPhase,
      entries: state.costLog,
    };
  }
}
