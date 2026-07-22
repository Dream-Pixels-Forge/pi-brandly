/**
 * pi-brandly memory system
 * User preferences persistence across sessions
 */

import { readFile, writeFile, rename, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

export interface UserPreferences {
  preferredStyle?: string;
  targetPlatforms?: string[];
  likedHooks?: string[];
  dislikedHooks?: string[];
  budget?: number;
  lastUsedStyle?: string;
  lastProvider?: string;
}

export class Memory {
  private data: UserPreferences;
  private memoryPath: string;

  constructor(memoryDir: string) {
    this.memoryPath = join(memoryDir, "user-preferences.json");
    this.data = this.loadSync();
  }

  /**
   * Synchronous load for constructor — uses readFileSync via dynamic import.
   * This is acceptable because the constructor must be sync for Pi's ExtensionAPI.
   */
  private loadSync(): UserPreferences {
    try {
      if (existsSync(this.memoryPath)) {
        // Dynamic require is intentional: constructor must be synchronous.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require("node:fs") as typeof import("node:fs");
        const content = fs.readFileSync(this.memoryPath, "utf-8");
        return JSON.parse(content);
      }
    } catch {
      // Return empty preferences on error
    }
    return {};
  }

  get(): UserPreferences {
    return { ...this.data };
  }

  exists(): boolean {
    return Object.keys(this.data).length > 0;
  }

  async save(): Promise<void> {
    const dir = join(this.memoryPath, "..");
    await mkdir(dir, { recursive: true });

    const tempPath = join(
      tmpdir(),
      `brandly-memory-${randomUUID()}.json`
    );

    try {
      await writeFile(tempPath, JSON.stringify(this.data, null, 2), "utf-8");
      await rename(tempPath, this.memoryPath);
    } catch (err) {
      // Clean up temp file on error
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    }
  }

  update(prefs: Partial<UserPreferences>): void {
    this.data = { ...this.data, ...prefs };
  }

  /**
   * Add a liked hook style
   */
  async likeHook(hook: string): Promise<void> {
    if (!this.data.likedHooks) {
      this.data.likedHooks = [];
    }
    if (!this.data.likedHooks.includes(hook)) {
      this.data.likedHooks.push(hook);
    }
    // Remove from disliked if present
    if (this.data.dislikedHooks) {
      this.data.dislikedHooks = this.data.dislikedHooks.filter((h) => h !== hook);
    }
    await this.save();
  }

  /**
   * Add a disliked hook style
   */
  async dislikeHook(hook: string): Promise<void> {
    if (!this.data.dislikedHooks) {
      this.data.dislikedHooks = [];
    }
    if (!this.data.dislikedHooks.includes(hook)) {
      this.data.dislikedHooks.push(hook);
    }
    // Remove from liked if present
    if (this.data.likedHooks) {
      this.data.likedHooks = this.data.likedHooks.filter((h) => h !== hook);
    }
    await this.save();
  }

  /**
   * Reset all preferences
   */
  async reset(): Promise<void> {
    this.data = {};
    await this.save();
  }
}
