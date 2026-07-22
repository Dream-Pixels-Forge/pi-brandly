# Changelog

All notable changes to pi-brandly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-07-22

### Added
- **`brandly_mmx_video` tool** — MiniMax mmx CLI integration for video generation:
  - T2V (Text-to-Video) via Hailuo-2.3
  - I2V (Image-to-Video) via Hailuo-2.3 / Hailuo-2.3-Fast
  - SEF (Start-End Frame interpolation) via Hailuo-02
  - **S2V (Subject-to-Video) via S2V-01** — character/product consistency across shots
- **MMX S2V consistency workflow** — Director auto-configures mmx S2V for shot-to-shot identity lock
- **Updated agent prompts** — `director_agent.md` and `script_agent.md` now reference mmx S2V for consistency

### Changed
- Director `next` action includes mmx S2V instructions when subject reference images are available
- SKILL.md and README.md updated with mmx video tool documentation

## [0.2.0] - 2025-07-21

### Added
- **Runtime parameter validation** via `validate-utils.ts` — all tools now validate inputs with descriptive error messages
- **Error context** — every error includes tool name and project ID prefix for debugging
- **File locking** in `CostTracker` — prevents race conditions on concurrent credit operations
- **Auto-render support** — `brandly_assemble` and `brandly_director(assemble)` can now invoke Remotion CLI automatically when `autoRender=true`
- **Unit tests** — test suite for `CostTracker`, `parseMarkdownScript`, `buildPlan`, `getNextShot`, and validation utilities
- **Modular motion graphics** — types extracted to `motion-graphics-types.ts`, presets to `motion-graphics-presets.ts`
- **CHANGELOG.md** — this file

### Fixed
- **Director clip matching** — `locateClip` now uses exact regex anchoring (`^shot-1$`) to prevent `shot-1` matching `shot-10`
- **CostTracker race condition** — added lock file pattern with retry logic for concurrent writes
- **Memory.ts** — replaced `require("node:fs").readFileSync` with proper async `readFile` import
- **Peer dependencies** — pinned from `"*"` to `"^0.1.0"` to prevent breaking changes

### Changed
- **index.ts** — extracted `registerBrandlyTool()` helper, reducing registration code by ~70%
- **motion-graphics.ts** — split into 3 modules (types, presets, generator) for maintainability

## [0.1.0] - 2025-07-11

### Added
- Initial release with 27 tools, 9 agents, and full pipeline support
- Superproduction Director for multi-shot orchestration
- Multi-provider support (Higgsfield, Kling, OpenArt, Magnific, Runway, Pika)
- Remotion-based video editing and assembly
- Brand kits, batch variations, auto-captions, scene consistency
- Cost tracking and budget enforcement
- User memory/preferences system
