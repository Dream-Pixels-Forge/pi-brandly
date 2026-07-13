/**
 * Shared MiniMax client for Brandly.
 *
 * Single source of truth for MiniMax calls, used by:
 *   - brandly_matrix        (analyze / image / video actions)
 *   - brandly_analyze_image (MiniMax fallback when the model can't see images)
 *
 * Credentials are read from Pi's provider configuration at:
 *   ~/.pi/agent/auth.json  ->  "minimax": { "type": "api_key", "key": "<KEY>", "groupId": "<GROUP_ID>" }
 * with an env-var fallback (MINIMAX_API_KEY / MINIMAX_GROUP_ID).
 * This reuses Pi's existing credential store — no separate key file required.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export const MINIMAX_BASE = "https://api.minimax.io/v1";

export interface MiniMaxCreds {
  key: string;
  groupId?: string;
}

/**
 * Load MiniMax credentials.
 * Priority: env vars -> Pi provider config (~/.pi/agent/auth.json -> minimax) -> error.
 */
export async function loadCreds(): Promise<MiniMaxCreds> {
  const ek = process.env.MINIMAX_API_KEY;
  if (ek) {
    return { key: ek, groupId: process.env.MINIMAX_GROUP_ID };
  }

  try {
    const p = join(homedir(), ".pi", "agent", "auth.json");
    const raw = JSON.parse(await readFile(p, "utf8"));
    const m = raw?.minimax;
    if (m?.key) {
      return {
        key: m.key,
        groupId: m.groupId ?? m.GroupId ?? m.group_id ?? undefined,
      };
    }
  } catch {
    // ignore — fall through to error below
  }

  throw new Error(
    "No MiniMax credentials found. Either:\n" +
      "  1) Add a 'minimax' entry to Pi's provider config (~/.pi/agent/auth.json):\n" +
      '     { "minimax": { "type": "api_key", "key": "<MINIMAX_API_KEY>", "groupId": "<GROUP_ID>" } }\n' +
      "  2) Or set MINIMAX_API_KEY / MINIMAX_GROUP_ID env vars."
  );
}

/** True if MiniMax credentials are resolvable (without throwing). */
export async function hasMinimaxCreds(): Promise<boolean> {
  try {
    await loadCreds();
    return true;
  } catch {
    return false;
  }
}

/** Read a local image and return a base64 data URL (MiniMax vision accepts data URLs). */
export async function fileToDataUrl(path: string): Promise<string> {
  const buf = await readFile(path);
  const ext = path.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  return `data:image/${ext};base64,${buf.toString("base64")}`;
}

/** MiniMax chat-completion (v2) call with Authorization + GroupId. */
export async function minimaxChat(
  creds: MiniMaxCreds,
  model: string,
  messages: unknown[]
): Promise<any> {
  const url = `${MINIMAX_BASE}/text/chatcompletion_v2?GroupId=${encodeURIComponent(
    creds.groupId ?? ""
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.key}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MiniMax chat failed (${res.status}): ${txt.slice(0, 500)}`);
  }
  return res.json();
}

/**
 * Image understanding via MiniMax vision LLM.
 * Returns the extracted analysis text plus the raw response.
 */
export async function analyzeImageWithMinimax(
  imagePath: string,
  prompt: string,
  model = "MiniMax-M3"
): Promise<{ analysis: string; raw: any }> {
  const creds = await loadCreds();
  const dataUrl = existsSync(imagePath) ? await fileToDataUrl(imagePath) : imagePath;
  const messages = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ];
  const data = await minimaxChat(creds, model, messages as any);
  const analysis =
    data?.choices?.[0]?.message?.content ?? data?.reply ?? JSON.stringify(data, null, 2);
  return { analysis, raw: data };
}
