/**
 * pi-brandly cost tracker
 * Tracks credit spend per project and enforces budget gates
 * 
 * Adapted from brandly-plugin with atomic writes and Pi-compatible paths
 */

import { readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";

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
 * Tracks credit spend per project and enforces budget gates.
 * Call `canAfford()` before every expensive operation.
 */
export class CostTracker {
  constructor(private projectsDir: string) {}

  private getProjectPath(id: string) {
    return join(this.projectsDir, id, "project.json");
  }

  private async readState(id: string): Promise<ProjectState> {
    const raw = await readFile(this.getProjectPath(id), "utf-8");
    return JSON.parse(raw);
  }

  private async writeState(id: string, state: ProjectState): Promise<void> {
    const targetPath = this.getProjectPath(id);
    const tmpPath = targetPath + ".tmp";
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
