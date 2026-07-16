# Plan: pi-brandly Plugin for Pi Agent

## Overview

Port the [brandly-plugin](https://github.com/Dream-Pixels-Forge/brandly-plugin) (OpenCode) to a Pi extension (`pi-brandly`). The plugin is an AI product video orchestrator that turns product ideas into platform-ready marketing videos using a multi-agent pipeline.

---

## Architecture Mapping: OpenCode → Pi

| OpenCode Concept | Pi Equivalent | Notes |
|---|---|---|
| `@opencode-ai/plugin` | `@earendil-works/pi-coding-agent` | Pi's extension API |
| Plugin `tools` array | `pi.registerTool()` calls | Each tool registered individually with TypeBox schemas |
| `execute(args)` | `execute(toolCallId, params, signal, onUpdate, ctx)` | Pi has richer signature: abort signal, streaming updates, context |
| `task()` subagent dispatch | `pi` subprocess spawning (see `subagent` example) | Spawn isolated `pi --mode json -p --no-session` per agent |
| Plugin `name` | Extension auto-discovered from `.pi/extensions/` | No explicit name needed |
| N/A | `pi.registerCommand()` | Add `/brandly` commands for quick access |
| N/A | `pi.on("session_start", ...)` | Initialize state, load memory |
| N/A | `pi.on("tool_call", ...)` | Optional: intercept bash/write for path protection |
| N/A | `pi.appendEntry()` | Persist project state to session |
| N/A | `resources_discover` event | Contribute skills, prompts, agent definitions |

---

## Project Structure

```
pi-brandly/
├── package.json                    # npm package with pi manifest
├── tsconfig.json
├── README.md
├── LICENSE
│
├── src/
│   ├── index.ts                    # Extension entry point (default export)
│   ├── constants.ts                # Video styles, costs, phase order, agent map
│   ├── types.ts                    # TypeScript interfaces (ProjectData, etc.)
│   ├── memory.ts                   # User preferences (hooks, styles)
│   ├── cost-tracker.ts             # Credit tracking & budget enforcement
│   ├── retry.ts                    # Exponential backoff utility
│   └── tools/
│       ├── context.ts              # ToolContext factory (dirs, read/write helpers)
│       ├── start.ts                # brandly_start — create new project
│       ├── image.ts                # brandly_analyze_image — deep image analysis
│       ├── run.ts                  # brandly_run_project — dispatch next agent
│       ├── approve.ts              # brandly_approve — advance pipeline phase
│       ├── status.ts               # brandly_status — project status overview
│       ├── estimate.ts             # brandly_estimate — cost estimation
│       ├── re_edit.ts              # brandly_re_edit — re-edit a specific shot
│       ├── validate.ts             # brandly_validate — virality scoring
│       ├── cost.ts                 # brandly_record_cost — track spend
│       ├── artifact.ts             # brandly_save_artifact — persist agent output
│       ├── memory.ts               # brandly_memory — view/update preferences
│       ├── templates.ts            # brandly_templates — list video style templates
│       ├── cancel.ts               # brandly_cancel — pause/cancel project
│       ├── progress.ts             # brandly_progress — pipeline progress %
│       ├── export.ts               # brandly_export — collect all artifacts
│       ├── list_projects.ts        # brandly_list_projects — list all projects
│       ├── download.ts             # brandly_download — download generated media
│       ├── provider.ts             # brandly_select_provider — AI provider selection
│       ├── video-edit.ts           # brandly_video_edit — Remotion video editing
│       └── video-render.ts         # brandly_render_video — render compositions
│
├── agents/                         # Agent prompt definitions (Pi agent markdown format)
│   ├── trends_agent.md
│   ├── concept_agent.md
│   ├── script_agent.md
│   ├── asset_agent.md
│   ├── audio_agent.md
│   ├── publish_agent.md
│   ├── image_analyzer.md
│   └── validation_agent.md         # NEW: Detailed virality validation
│
├── skills/
│   └── SKILL.md                    # Pi skill definition (triggers, instructions)
│
├── prompts/                        # Prompt templates for quick commands
│   ├── brandly-start.md
│   ├── brandly-analyze.md
│   └── brandly-publish.md
│
├── templates/                      # Video style template data
│   ├── cinematic.json
│   ├── ugc.json
│   └── montage.json
│
└── references/                     # NEW: Reference documentation
    └── higgsfield-models.md        # Model costs & prompt optimization guide
```

---

## Implementation Phases

### Phase 1: Core Foundation (Estimated: ~2 hours)

**Goal:** Scaffold the project and implement the extension skeleton with context, types, and constants.

#### 1.1 Project Setup
- [ ] Create `package.json` with pi package manifest:
  ```json
  {
    "name": "pi-brandly",
    "keywords": ["pi-package"],
    "pi": {
      "extensions": ["./src/index.ts"],
      "skills": ["./skills"],
      "prompts": ["./prompts"]
    }
  }
  ```
- [ ] Create `tsconfig.json`
- [ ] Create `.gitignore`

#### 1.2 Core Types & Constants
- [ ] Port `src/types.ts` — `ProjectData`, `PhaseResult`, `ToolContext`, etc.
- [ ] Port `src/constants.ts` — `VIDEO_STYLES`, `STYLE_COSTS`, `SHOT_COSTS`, `PHASE_ORDER`, `PHASE_AGENT_MAP`
- [ ] Port `src/retry.ts` — `withRetry()` utility

#### 1.3 Context & Memory
- [ ] Port `src/tools/context.ts` — Adapt `ToolContext` factory for Pi:
  - Use `ctx.cwd` from Pi's `ExtensionContext` instead of OpenCode's `directory` param
  - Use `CONFIG_DIR_NAME` from `@earendil-works/pi-coding-agent` for `.pi` directory
  - Project data stored in `.pi/brandly/projects/{id}/` (project-local, trusted)
  - Generated files stored in workspace-relative dirs: `imagen/`, `videgen/`, `audgen/`
- [ ] Port `src/memory.ts` — User preferences persistence

#### 1.4 Extension Entry Point
- [ ] Create `src/index.ts` with Pi extension factory:
  ```typescript
  import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
  
  export default function (pi: ExtensionAPI) {
    // Initialize context from ctx.cwd (deferred to session_start)
    // Register all tools
    // Register commands
    // Register event handlers
  }
  ```

---

### Phase 2: Tool Registration (Estimated: ~4 hours)

**Goal:** Port all 20 tools from OpenCode plugin to Pi `registerTool()` calls.

**Key adaptation pattern for each tool:**

```typescript
// OpenCode pattern:
{
  name: "brandly_start",
  description: "...",
  parameters: { type: "object", properties: {...}, required: [...] },
  execute: async (args) => { ... }
}

// Pi pattern:
pi.registerTool({
  name: "brandly_start",
  label: "Brandly Start",
  description: "...",
  promptSnippet: "Start a new Brandly video project",
  promptGuidelines: ["Use brandly_start when the user wants to create a product marketing video."],
  parameters: Type.Object({
    idea: Type.String({ description: "Product idea, concept, or brief" }),
    productName: Type.String({ description: "Name of the product" }),
    // ...
  }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Use ctx from Pi's ExtensionContext
    // Use signal for abort support
    // Use onUpdate for streaming progress
    return {
      content: [{ type: "text", text: "..." }],
      details: { ... }
    };
  },
});
```

#### Tools to port (in order):

**Core Pipeline Tools (16):**
1. [ ] `brandly_start` — Create new project
2. [ ] `brandly_analyze_image` — Deep image analysis
3. [ ] `brandly_run_project` — Dispatch next pipeline agent
4. [ ] `brandly_approve` — Approve phase & advance
5. [ ] `brandly_status` — Project status overview
6. [ ] `brandly_estimate` — Cost estimation
7. [ ] `brandly_re_edit` — Re-edit specific shot
8. [ ] `brandly_validate` — Virality validation
9. [ ] `brandly_record_cost` — Track credit spend
10. [ ] `brandly_save_artifact` — Persist agent output
11. [ ] `brandly_memory` — View/update preferences
12. [ ] `brandly_templates` — List video style templates
13. [ ] `brandly_cancel` — Pause/cancel project
14. [ ] `brandly_progress` — Pipeline progress %
15. [ ] `brandly_export` — Collect all artifacts
16. [ ] `brandly_list_projects` — List all projects

**New Tools (4):**
17. [ ] `brandly_download` — Download generated media from Higgsfield/Magnific
18. [ ] `brandly_select_provider` — AI provider selection (Higgsfield, Kling, OpenArt, Magnific, Runway, Pika)
19. [ ] `brandly_video_edit` — Remotion-based video editing (trim, concat, overlay, transition, text, audio, effect, resize, crop)
20. [ ] `brandly_render_video` — Render Remotion compositions to final video

---

### Phase 3: Agent Dispatch & Subagent System (Estimated: ~3 hours)

**Goal:** Implement the agent dispatch mechanism using Pi's subprocess spawning pattern.

**Key difference from OpenCode:** OpenCode uses a `task()` tool for subagent dispatch. Pi uses direct subprocess spawning of `pi --mode json -p --no-session` (as shown in the `subagent` example).

#### 3.1 Agent Definitions
- [ ] Port all 8 agent `.md` files with Pi-compatible frontmatter:
  ```markdown
  ---
  name: brandly-trends
  description: Research viral product marketing trends
  tools: read, bash, grep
  model: claude-sonnet-4-20250514
  ---
  
  You are a social media trends analyst...
  ```
- [ ] Store agents in `agents/` directory (contributes via `resources_discover` or bundled in package)

#### 3.2 Subagent Runner
- [ ] Create a subagent runner utility (adapted from Pi's `subagent` example):
  - Spawns `pi --mode json -p --no-session --model <model> --tools <tools>`
  - Reads JSON mode output for results
  - Supports abort via signal
  - Streams progress via `onUpdate`
- [ ] Integrate into `brandly_run_project` tool:
  - Read the agent `.md` file for current phase
  - Spawn the agent subprocess with the agent prompt + project context
  - Return the agent's output

#### 3.3 Pipeline Integration
- [ ] `brandly_run_project` reads current phase → loads agent prompt → spawns subprocess → returns output
- [ ] `brandly_approve` validates phase → marks completed → advances `currentPhase`
- [ ] Pipeline phases: `init → trends → concept → script → asset → audio → re_edit → validate → publish → done`

---

### Phase 4: UI & Commands (Estimated: ~1.5 hours)

**Goal:** Add Pi-specific UX enhancements.

#### 4.1 Custom Commands
- [ ] `/brandly start` — Quick project creation wizard
- [ ] `/brandly status [id]` — Show project status
- [ ] `/brandly list` — List all projects
- [ ] `/brandly help` — Show usage guide

#### 4.2 Event Handlers
- [ ] `session_start` — Initialize context, load memory, set up status line
- [ ] `tool_call` on `bash`/`write` — Optional path protection for `.brandly/` dirs
- [ ] `resources_discover` — Contribute skills and prompts

#### 4.3 Status Line
- [ ] Add footer status showing active Brandly project (if any) and phase progress

---

### Phase 5: Skills, Prompts & Templates (Estimated: ~1 hour)

**Goal:** Package the skill definition, prompt templates, and video style templates.

#### 5.1 Skill Definition
- [ ] Create `skills/SKILL.md` — Pi skill with trigger phrases and usage instructions
  - Triggers: "make a product video", "create marketing video", "Brandly this product"
  - Contains full usage guide, pipeline walkthrough, cost reference
  - Includes STAMP Framework, Three-Act Structure, 8-Layer Prompt Framework
  - Includes Virality Predictor integration details
  - Includes Provider Selection guide
  - Includes Video Editing with Remotion guide

#### 5.2 Prompt Templates
- [ ] `prompts/brandly-start.md` — Quick-start template for new projects
- [ ] `prompts/brandly-analyze.md` — Image analysis template
- [ ] `prompts/brandly-publish.md` — Publishing checklist template

#### 5.3 Video Style Templates
- [ ] Port `templates/cinematic.json`
- [ ] Port `templates/ugc.json`
- [ ] Port `templates/montage.json`

#### 5.4 Reference Documentation
- [ ] Port `references/higgsfield-models.md` — Model costs & prompt optimization guide

---

### Phase 6: Cost Tracking & Memory (Estimated: ~1 hour)

**Goal:** Implement persistent cost tracking and user preference memory.

#### 6.1 Cost Tracker
- [ ] Port `src/cost-tracker.ts` with atomic writes
- [ ] Integrate budget checks into `brandly_run_project`, `brandly_record_cost`
- [ ] Add budget gate: pause pipeline when credits exhausted

#### 6.2 Memory System
- [ ] Port `src/memory.ts` — `UserPreferences` persistence
- [ ] Store in `.pi/brandly/user-preferences.json`
- [ ] `brandly_memory` tool: view, like_hook, dislike_hook, reset

---

### Phase 7: Video Editing System (Estimated: ~2 hours)

**Goal:** Port the Remotion-based video editing and rendering system.

#### 7.1 Video Edit Tool
- [ ] Port `src/tools/video-edit.ts` — Remotion composition generation
- [ ] Support operations: trim, concat, overlay, transition, add-text, add-audio, add-effect, resize, crop
- [ ] Generate TypeScript Remotion compositions for each operation

#### 7.2 Video Render Tool
- [ ] Port `src/tools/video-render.ts` — Render script generation
- [ ] Support quality presets: low, medium, high, ultra
- [ ] Support formats: mp4, webm, gif

#### 7.3 Provider Selection
- [ ] Port `src/tools/provider.ts` — 6 AI providers with capabilities, models, usage guides
- [ ] Providers: Higgsfield, Kling, OpenArt, Magnific, Runway, Pika

#### 7.4 Download Tool
- [ ] Port `src/tools/download.ts` — Download generated media to project folders
- [ ] Support media types: image, video, audio
- [ ] Track downloads in project state

---

### Phase 8: Advanced Features (Estimated: ~2 hours)

**Goal:** Implement advanced pipeline features from the development plan.

#### 8.1 Preview-First Quality System
- [ ] Add preview mode to asset pipeline (480p, 3s previews before full renders)
- [ ] Cost savings: ~50 credits saved per avoided full render
- [ ] Add `previewMode`, `previewPaths`, `previewApproved` to project state

#### 8.2 Post-Generation Virality Validation
- [ ] Add validation loop after final cut assembly
- [ ] Auto-suggest re-edits if virality score < 7
- [ ] Add `postGenViralityScore` to project state

#### 8.3 Per-Shot Re-Edit Loop
- [ ] Allow re-generating specific shots without full pipeline restart
- [ ] Add `reEditTarget`, `reEditHistory` to project state
- [ ] Maximum 2 re-edit attempts per shot

#### 8.4 Publishing Automation
- [ ] Generate platform-specific captions (TikTok, Instagram, YouTube)
- [ ] Generate hashtag sets (broad + niche + trending)
- [ ] Suggest optimal posting times
- [ ] Generate thumbnails per platform
- [ ] Create complete publishing checklists

#### 8.5 Superproduction Director (IMPLEMENTED)
- [x] `brandly_director` tool — multi-shot orchestration state machine
- [x] `init` — parse a multi-shot script (markdown / shot tables / `shots[]` JSON) into an ordered production plan (`production.json`)
- [x] `next` — dispatch ONE shot at a time with a full brief + `continuityClip` reference
- [x] `complete` / `rework` — track per-shot status, clip path, and credits
- [x] `assemble` — cut all `done` shots into ONE ordered Remotion film (Director's cut)
- [x] `deliver` — run virality validation + export the package
- [x] `pause` / `resume` / `status` / `plan` — production control
- [x] `agents/director_agent.md` persona + `prompts/director.md` template
- `src/director.ts` owns the orchestration loop; reuses `createValidateTool` / `createExportTool`

#### 8.6 Auto Identity-Lock at init (IMPLEMENTED)
- [x] At `action="init"`, the Director auto-creates `brandly_scene_consistency` references for every unique subject/product in the script (type inferred: person/product/object), assigns each shot (scene) to its character, and sets strict lock rules
- [x] Each `next` brief includes a `0. LOCK IDENTITY` step calling `generate_consistent_prompt` so the product/character stays identical shot-to-shot
- [x] State stored in `consistency/{projectID}/plan.json`; surfaced on the production board (🔒 Identity locked)
- [x] Best-effort (never blocks init); opt-out via `lockConsistency=false`

---

### Phase 9: Testing & Polish (Estimated: ~1.5 hours)

**Goal:** Test the extension end-to-end and polish the experience.

#### 9.1 Manual Testing
- [ ] Test `pi -e ./src/index.ts` — Extension loads without errors
- [ ] Test each tool individually via LLM interaction
- [ ] Test full pipeline: start → trends → concept → script → asset → audio → validate → publish
- [ ] Test cost tracking and budget enforcement
- [ ] Test memory persistence across sessions
- [ ] Test project listing and status
- [ ] Test video editing operations
- [ ] Test provider selection
- [ ] Test download functionality

#### 9.2 Edge Cases
- [ ] Invalid project IDs
- [ ] Budget exceeded errors
- [ ] Cancelled/paused project states
- [ ] Missing agent files
- [ ] Concurrent project operations
- [ ] Video editing with missing files
- [ ] Provider API failures

#### 9.3 Documentation
- [ ] Write comprehensive README.md with installation, usage, and examples
- [ ] Add inline JSDoc comments to all public APIs

---

## Key Technical Decisions

### 1. Project Storage Location
**Decision:** Store project state in `.pi/brandly/projects/{id}/` (project-local).

**Rationale:** 
- Pi's trust system means `.pi/` is only loaded for trusted projects
- Keeps brandly data alongside other Pi project config
- Generated media files (`imagen/`, `videgen/`, `audgen/`) stay in workspace root for easy access

### 2. Agent Dispatch Mechanism
**Decision:** Use Pi subprocess spawning (`pi --mode json -p --no-session`) for each agent.

**Rationale:**
- Each agent gets an isolated context window (critical for long pipelines)
- Reuses Pi's model/provider configuration automatically
- JSON mode provides structured output for parsing
- Supports abort propagation via signal

**Alternative considered:** Inline LLM calls via `ctx.modelRegistry` — rejected because agents need tool access (bash, read, write) and their own context.

### 3. Tool Schema: TypeBox vs JSON Schema
**Decision:** Use TypeBox for all tool parameters (Pi standard).

**Rationale:**
- TypeBox is the standard in Pi's ecosystem
- Provides runtime validation
- Integrates with Pi's tool parameter rendering

### 4. Skill vs Extension Only
**Decision:** Provide both — skill for LLM guidance, extension for tool registration.

**Rationale:**
- Skill teaches the LLM *when* and *how* to use Brandly
- Extension provides the actual tools and state management
- They complement each other: skill triggers → extension tools execute

### 5. Video Editing: Remotion Integration
**Decision:** Generate Remotion compositions as TypeScript files, render via CLI.

**Rationale:**
- Remotion provides programmatic, reproducible video editing
- Compositions are versionable and editable
- Supports all standard video operations (trim, concat, overlay, transitions, effects)
- Quality presets for different use cases

### 6. Multi-Provider Support
**Decision:** Support 6 AI generation providers with unified interface.

**Rationale:**
- Different providers excel at different tasks (Higgsfield for marketing, Kling for motion, Runway for cinematic)
- Users may have accounts with different providers
- Budget optimization across providers
- Fallback when one provider is unavailable

---

## Dependency Considerations

### Runtime Dependencies
- `@earendil-works/pi-coding-agent` — Pi's extension API (imported for types only, available at runtime)
- `typebox` — Schema definitions (available in Pi runtime)

### External Service Dependencies (via MCP or bash)
- **Higgsfield** — Image/video generation, virality prediction (via MCP tools or CLI)
- **Magnific** — Audio generation, image upscaling (via MCP tools or CLI)
- **Kling** — Video generation (via MCP tools or CLI)
- **OpenArt** — Community models (via web interface)
- **Runway** — Professional video generation (via web interface)
- **Pika** — Creative video effects (via web interface)

**Note:** The extension itself doesn't directly call these services. Agent prompts instruct the subagent to use MCP tools or bash commands to interact with them.

---

## File Count Estimate

| Directory | Files | Purpose |
|---|---|---|
| `src/` | 7 | Core modules (index, types, constants, memory, cost-tracker, retry, context) |
| `src/tools/` | 20 | One file per tool (16 original + 4 new) |
| `agents/` | 8 | Agent prompt definitions (7 original + 1 new validation agent) |
| `skills/` | 1 | Pi skill definition |
| `prompts/` | 3 | Prompt templates |
| `templates/` | 3 | Video style JSON data |
| `references/` | 1 | Higgsfield models reference |
| Root | 4 | package.json, tsconfig.json, README.md, LICENSE |
| **Total** | **~47** | |

---

## Estimated Total Effort

| Phase | Time |
|---|---|
| Phase 1: Core Foundation | ~2h |
| Phase 2: Tool Registration (20 tools) | ~4h |
| Phase 3: Agent Dispatch | ~3h |
| Phase 4: UI & Commands | ~1.5h |
| Phase 5: Skills, Prompts, Templates | ~1h |
| Phase 6: Cost Tracking & Memory | ~1h |
| Phase 7: Video Editing System | ~2h |
| Phase 8: Advanced Features | ~2h |
| Phase 9: Testing & Polish | ~1.5h |
| **Total** | **~18h** |

---

## Success Criteria

1. [ ] `pi -e ./src/index.ts` loads without errors
2. [ ] All 20 `brandly_*` tools are registered and callable by the LLM
3. [ ] Full pipeline works: start → approve → run through all phases
4. [ ] Agent subprocess spawning works with abort support
5. [ ] Cost tracking enforces budget limits
6. [ ] Memory persists across sessions
7. [ ] Skill triggers correctly on product video requests
8. [ ] `/brandly` commands work in interactive mode
9. [ ] Project state survives session restarts
10. [ ] Video editing operations generate valid Remotion compositions
11. [ ] Provider selection shows all 6 providers with usage guides
12. [ ] Download tool saves media to correct project folders
13. [ ] Documentation is complete and accurate
