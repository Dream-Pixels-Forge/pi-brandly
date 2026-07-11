# pi-brandly Installation & Usage

## Installation

### From Git (Recommended - Auto-updates)

```bash
pi install git:github.com/Dream-Pixels-Forge/pi-brandly
```

### From npm (When published)

```bash
pi install npm:pi-brandly
```

### Local Development

```bash
pi install ./path/to/pi-brandly
```

### Quick Test (No install)

```bash
pi -e git:github.com/Dream-Pixels-Forge/pi-brandly
```

---

## Installed Location

```
C:\Users\Patrick\.pi\agent\git\github.com\Dream-Pixels-Forge\pi-brandly
```

---

## Update Commands

```bash
# Update pi-brandly to latest
pi update git:github.com/Dream-Pixels-Forge/pi-brandly

# Update all extensions
pi update --all

# List installed packages
pi list
```

---

## Development Workflow

```bash
# Source directory
cd C:/Users/Patrick/Documents/DREAM-PIXELS-FORGE/plugins/pi-brandly

# Make changes, then:
git add -A && git commit -m "feat: description" && git push

# Update installed version
pi update git:github.com/Dream-Pixels-Forge/pi-brandly
```

---

## Repository

**GitHub:** https://github.com/Dream-Pixels-Forge/pi-brandly

---

## Quick Commands

```bash
# List projects
pi -p --no-session "List brandly projects"

# Create project
pi -p --no-session 'Create brandly project for "Product Name" with idea'

# Check status
pi -p --no-session "Check brandly project status"

# List templates
pi -p --no-session "List brandly templates"

# List providers
pi -p --no-session "List brandly providers"
```

---

## Tools Available (20)

| Tool | Description |
|------|-------------|
| `brandly_start` | Create new project |
| `brandly_analyze_image` | Deep image analysis |
| `brandly_run_project` | Run pipeline phase |
| `brandly_approve` | Approve & advance |
| `brandly_status` | Project status |
| `brandly_estimate` | Cost estimation |
| `brandly_re_edit` | Re-edit shot |
| `brandly_validate` | Virality scoring |
| `brandly_record_cost` | Track credits |
| `brandly_save_artifact` | Save output |
| `brandly_memory` | Preferences |
| `brandly_templates` | Style templates |
| `brandly_cancel` | Pause/cancel |
| `brandly_progress` | Progress % |
| `brandly_export` | Export artifacts |
| `brandly_list_projects` | List projects |
| `brandly_download` | Download media |
| `brandly_select_provider` | Choose provider |
| `brandly_video_edit` | Edit video |
| `brandly_render_video` | Render video |

---

## Pipeline

```
init → trends → concept → script → asset → audio → validate → publish → done
```

---

## Video Styles

| Style | Cost | Best For |
|-------|------|----------|
| cinematic | 250 cr | Premium products |
| ugc | 150 cr | Social media |
| montage | 200 cr | Product showcases |
| multi_shot | 300 cr | Storytelling |
| continuous | 200 cr | Satisfying content |
| unboxing | 180 cr | New products |
| lifestyle | 170 cr | Consumer products |

---

## Providers

| Provider | Type | Best For |
|----------|------|----------|
| Higgsfield AI | Multi | Comprehensive platform |
| Kling AI | Video | Strong motion, budget |
| OpenArt | Image | Community models |
| Magnific AI | Upscale | Enhancement, audio |
| Runway ML | Video | Professional cinematic |
| Pika Labs | Video | Creative stylized |
