
# pi-brandly
<img width="2172" height="724" alt="pi-brandly-banner" src="https://github.com/user-attachments/assets/b92d4435-11f3-4dd9-ade8-e870ea3acad0" />
AI product video orchestrator for [Pi](https://github.com/earendil-works/pi-coding-agent). Turns product ideas into platform-ready marketing videos using a multi-agent pipeline.

## Install

```bash
pi extension install pi-brandly
```

Or manually add to your Pi extensions:

```bash
# In your project root
mkdir -p .pi/extensions
cd .pi/extensions
git clone https://github.com/Dream-Pixels-Forge/pi-brandly.git
```

## Features

- **27 tools** for complete video production pipeline (incl. assembly, motion graphics, brand kits, batch variations, auto-captions, scene consistency, and the **Superproduction Director**)
- **9 specialized agents** (trends, concept, script, asset, audio, publish, image analyzer, validation, **director**)
- **Multi-provider support** — Higgsfield, Kling, OpenArt, Magnific, Runway, Pika
- **Video editing** — Remotion-based trimming, concatenation, overlays, transitions
- **Quality validation** — Higgsfield Virality Predictor integration
- **Cost tracking** — Budget enforcement and credit monitoring
- **Memory system** — Remember user preferences across sessions

## Tools

| Tool | Description |
|---|---|
| `brandly_start` | Start a new video project |
| `brandly_analyze_image` | Deep-analyze any image (12 dimensions) |
| `brandly_run_project` | Run the next pipeline phase |
| `brandly_approve` | Approve phase & advance |
| `brandly_status` | Check project status |
| `brandly_estimate` | Estimate costs before starting |
| `brandly_re_edit` | Re-edit a specific shot |
| `brandly_validate` | Score video for virality |
| `brandly_record_cost` | Track credit spend |
| `brandly_save_artifact` | Save agent output |
| `brandly_memory` | View/update preferences |
| `brandly_templates` | List video style templates |
| `brandly_cancel` | Pause/cancel/resume project |
| `brandly_progress` | Get pipeline progress |
| `brandly_export` | Export all artifacts |
| `brandly_list_projects` | List all projects |
| `brandly_download` | Download generated media |
| `brandly_select_provider` | Choose AI provider |
| `brandly_video_edit` | Edit video with Remotion |
| `brandly_render_video` | Render final video |
| `brandly_assemble` | Assemble clips into a montage (Remotion) |
| `brandly_brand_kit` | Create / apply brand kits |
| `brandly_batch_variations` | Generate A/B concept variations |
| `brandly_auto_caption` | Generate word-level captions (SRT) |
| `brandly_scene_consistency` | Lock character/product references |
| `brandly_motion_graphics` | Create Remotion motion graphics |
| `brandly_director` | **Superproduction Director** — orchestrate a multi-shot script into one final film |

**Slash command:** `/brandly_director` — quick launcher for the Director loop (init / next / status / assemble / deliver).

## Superproduction Director

When the user supplies a **script with multiple shots**, the Director turns it into a single delivered film:

```
brandly_director(action="init", projectID, scriptText="""
### Shot 1 — Hook\nProduct slams onto marble...\n### Shot 2 — Reveal\nLiquid pours in slow-mo...\n""")            # plan the production (N shots)
loop:
  brandly_director(action="next", projectID)   # get next shot brief
  <generate that shot with the video tools>
  brandly_director(action="complete", projectID, shotId, clipPath)
brandly_director(action="assemble", projectID)         # cut all shots into one film
brandly_director(action="deliver", projectID)          # validate + export
```

State lives in `.pi/brandly/projects/{id}/production.json` — pause/resume anytime, and rework any shot via `action="rework"`.

**Auto identity-lock:** at `init`, the Director auto-creates `brandly_scene_consistency` references for every unique subject/product in the script (reusing any product image as a reference) and assigns each shot to its character. Each `next` brief then tells the generator to call `generate_consistent_prompt` so the product/character stays identical shot-to-shot. Disable with `lockConsistency=false`.

The `shots[]` JSON emitted by the **script_agent** is Director-ready: pass it straight in via
`scriptJson={shots:[...]}` (see `references/shots-schema.json` for the full contract).

## Pipeline

```
init → trends → concept → script → asset → audio → validate → publish → done
```

## Quick Start

```
"Make a product video for MatchaQuick — organic matcha that froths instantly"
```

Pi will:
1. Start a project with `brandly_start`
2. Analyze any product images
3. Research viral trends
4. Generate 3 video concepts
5. Create shot-by-shot scripts
6. Generate images and videos
7. Add audio (music, voiceover)
8. Validate for virality
9. Prepare publishing assets

## Folder Structure

```
.pi/brandly/
  projects/{id}/         Project state, artifacts, history
    analysis/            Image analysis, trends
    script/              Concept, shot-by-shot script
    storyboard/          Visual storyboard
    assets/              Asset generation plan
    audio/               Audio plan
  user-preferences.json  Your liked hooks, preferred style

imagen/{id}/             Generated images
videgen/{id}/            Generated videos
audgen/{id}/             Generated audio
assembly/{id}/           Remotion montage projects
motion-graphics/{id}/    Remotion motion-graphics projects
captions/{id}/           Auto-caption SRT + overlay component
consistency/{id}/        Scene-consistency plans
variations/{projectID}/  Batch concept variations
.pi/brandly/brand-kits/  Saved brand kits
```

## MCP Dependencies

Brandly agents use these MCP tools:

- `higgsfield_generate_image` — Image generation
- `higgsfield_generate_video` — Video generation
- `higgsfield_upscale_video` — Video upscaling
- `higgsfield_virality_predictor` — Virality scoring
- `magnific_audio_music_generate` — Music generation
- `magnific_audio_tts` — Voiceover generation

## Video Styles

| Style | Cost | Best For |
|---|---|---|
| Cinematic | 250 cr | Premium products, brand campaigns |
| UGC | 150 cr | Social media, testimonials |
| Montage | 200 cr | Product showcases, feature highlights |
| Multi-Shot | 300 cr | Storytelling, tutorials |
| Continuous | 200 cr | Satisfying content, ASMR |
| Unboxing | 180 cr | New products, reveals |
| Lifestyle | 170 cr | Consumer products, fashion |

## Providers

| Provider | Type | Best For |
|---|---|---|
| Higgsfield AI | Multi | Comprehensive platform |
| Kling AI | Video | Strong motion, budget-friendly |
| OpenArt | Image | Community models |
| Magnific AI | Upscale | Image enhancement, audio |
| Runway ML | Video | Professional cinematic |
| Pika Labs | Video | Creative stylized |

## Development

```bash
bun install
bun build src/index.ts --outdir dist --target bun
```

## License

MIT
