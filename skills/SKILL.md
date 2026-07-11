---
name: brandly
description: Generate viral-ready product marketing videos from a single idea or image. Orchestrates trend research, concept development, AI video generation, quality scoring, and multi-platform publishing — all with strict cost control.
---

# Brandly — AI Product Video Generator

## What This Does
Brandly turns a product idea + optional image into a complete, platform-ready marketing video. It orchestrates specialized AI agents through a pipeline: trend research → concept → script → asset generation → quality validation → publishing.

## When To Use
Trigger on: "make a product video", "create a marketing video for [product]", "generate a TikTok ad", "make a viral product clip", "Brandly this product", "turn my product into a video"

## The Director's Vision

### The STAMP Framework
Evaluate every video against these principles:
- **S**hot Intentionality — Does each shot have a reason to exist?
- **T**emporal Logic — Does one moment cause or lead to the next?
- **A**uthorial Vision — Is there a direction across time?
- **M**ontage Intelligence — Does the edit create meaning?
- **P**remise — Can you state your film's reason in one sentence?

### The Three-Act Structure
- **Act 1 (0-3s)**: The Hook — Grab them by the throat
- **Act 2 (3-12s)**: The Journey — Build desire, show transformation
- **Act 3 (12s+)**: The Payoff — Deliver emotional resolution

### The 8-Layer Prompt Framework
1. **SUBJECT** — Who/what is the focus?
2. **EMOTION** — What feeling should it evoke?
3. **OPTICS** — Lens, depth of field, FOV
4. **MOTION** — How does subject/camera move?
5. **LIGHTING** — Atmosphere, mood, direction
6. **STYLE** — Genre, era, aesthetic
7. **AUDIO** — Dialogue, SFX, music
8. **CONTINUITY** — What connects this to other shots?

## How To Use

### Step 0: Select Provider (Optional)
```bash
brandly_select_provider(providerId="higgsfield")
brandly_select_provider(listOnly=true)  # List all providers
```

### Step 1: Analyze Image (Optional but Recommended)
```bash
brandly_analyze_image(imagePath="product.jpg", context="Premium wireless earbuds")
```

### Step 2: Start a Project
```bash
brandly_start(
  idea="Organic matcha latte powder that froths instantly",
  productName="MatchaQuick",
  targetPlatforms=["tiktok", "instagram"],
  budgetCredits=300
)
```

### Step 3: Run the Pipeline
```bash
brandly_run_project(projectID="<uuid>")
```
This returns dispatch instructions. The agent (or you) runs the subagent.

### Step 4: Approve & Advance
```bash
brandly_approve(projectID="<uuid>", phase="trends")
```

### Step 5: Check Status
```bash
brandly_status(projectID="<uuid>")
brandly_progress(projectID="<uuid>")
```

### Step 6: Validate
```bash
brandly_validate(projectID="<uuid>", videoPath="final-cut.mp4")
```

### Step 7: Download & Export
```bash
brandly_download(projectID="<uuid>", mediaType="video", mediaUrl="...", filename="final.mp4")
brandly_export(projectID="<uuid>")
```

## Video Editing (Remotion)
```bash
# Trim
brandly_video_edit(projectID="...", operation="trim", inputFiles=["shot-1.mp4"], params={startTime: 2, duration: 5})

# Concat
brandly_video_edit(projectID="...", operation="concat", inputFiles=["shot-1.mp4", "shot-2.mp4"])

# Render
brandly_render_video(projectID="...", compositionPath="./composition.tsx", quality="high")
```

## Advanced Tools (New)
Beyond the core pipeline, Brandly ships power-user tools ported from the brandly-plugin:

### brandly_assemble — Montage assembly
Discovers all generated clips/images/audio and builds a complete Remotion montage project.
```bash
brandly_assemble(projectID="...", style="montage", transitionType="fade")
```

### brandly_motion_graphics — Kinetic typography & motion design
Generates Remotion motion graphics (title reveals, product showcases, stat counters, kinetic text).
```bash
brandly_motion_graphics(projectID="...", preset="title-reveal")
brandly_motion_graphics(projectID="...", preset="stats-counter")
```

### brandly_brand_kit — Consistent branding
Store and apply brand colors, fonts, logo, tone, voiceover & music preferences.
```bash
brandly_brand_kit(action="create", name="Acme", colors={primary:"#0a0a0a", accent:"#6c63ff"})
brandly_brand_kit(action="apply", brandKitId="bk-...", projectID="...")
brandly_brand_kit(action="list")
```

### brandly_batch_variations — A/B concept testing
Spin up N variations of a project with different hooks, styles, CTAs, and tones.
```bash
brandly_batch_variations(projectID="...", variations=3)
```

### brandly_auto_caption — Word-level subtitles
Generate an SRT file + Remotion overlay component with word-level highlighting.
```bash
brandly_auto_caption(projectID="...", style="tiktok", exportSrt=true)
```

### brandly_scene_consistency — Lock characters/products
Define characters/products and keep them visually consistent across shots.
```bash
brandly_scene_consistency(action="create_character", projectID="...", name="Hero", type="person")
brandly_scene_consistency(action="generate_consistent_prompt", projectID="...", sceneCount=5)
```

## Abstract Background Generator
For premium, text-free abstract backdrops (usable as `backgroundImage` in `brandly_motion_graphics` or as standalone 8K wallpapers), use the bundled Python generator:
```bash
cd scripts
python generator.py --abstract-background      # one random premium background prompt
python generator.py                            # a general cinematic prompt
```
- `references/abstract-backgrounds.md` — curated signature + variation prompts
- `scripts/data/*.json` — prompt building blocks (styles, materials, lighting, color palettes, …)
- `scripts/presets/*.json` — ready-made looks (geometric, glass, luxury, organic, paper)

## Pipeline Phases
0. **init** — Setup project
1. **trends** — Research viral formats
2. **concept** — Generate 3 video concepts
3. **script** — Break into shots with AI prompts
4. **asset** — Generate images and videos
5. **audio** — Music, voiceover, SFX
6. **validate** — Score for virality
7. **publish** — Platform-specific captions and hashtags

## Cost Control
- Every project has a credit budget (default 500)
- Check with `brandly_status` to see remaining budget
- Use `brandly_estimate` before starting

## Tips
- Run image analysis first — it feeds every downstream agent
- Start with preview mode for cheaper iteration
- After validation, re-edit specific shots if score is low
- The plugin remembers your preferences across projects
