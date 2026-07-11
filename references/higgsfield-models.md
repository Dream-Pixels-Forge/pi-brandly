# Higgsfield Model Reference — Cost & Prompt Guide

## Credit Costs (Image Generation)

| Model | Credits | Speed | Quality | Best For |
|---|---|---|---|---|
| **Z Image** | ~0.25 | 1-3s | D-tier | Fast drafts, iteration, LoRA work |
| **Nano Banana** | ~1 | 4-6s | B-tier | Budget-friendly realistic output |
| **Nano Banana 2** | ~2 | 4-6s | A-tier | Character, cartoon, everyday default |
| **Seedream 5.0 Lite** | ~2 | Fast | A-tier | Visual reasoning, instruction edits |
| **Soul 2.0** | ~2-3 | Moderate | S-tier | Fashion, UGC, editorial, lifestyle |
| **Soul Cinema** | ~3 | Moderate | S-tier | Cinematic stills, film-grade lighting |
| **Soul Location** | ~2 | Moderate | S-tier | Environments, no-people scenes |
| **Nano Banana Pro** | ~2 | 10-20s | S-tier | Top fidelity, hard briefs, text rendering |
| **GPT Image 2** | ~3-5 | Moderate | S-tier | High-fidelity, graphic design, typography |
| **Seedream 4.5** | ~3 | Moderate | A-tier | Complex face edits, scene swaps |
| **Flux 2.0** | ~2-3 | Moderate | A-tier | Creative alternative, prompt adherence |
| **Recraft V4.1** | ~2 | Fast | A-tier | Logos, icons, vector-style graphics |

## Free Tier
- 10 daily credits (watermarked, 720p max)
- Enough for ~4 Z Image drafts or ~5 Nano Banana 2 outputs per day
- No commercial license

## Unlimited Passes (Plus plan and up)
- 365-Day Unlimited available for: Kling 3.0, Flux 2.0 Pro, Seedream 5.0 Lite, Nano Banana 2 (1K), Soul 2.0, Soul Cinema
- **Nano Banana Pro** unlimited only at Ultra tier ($99/mo annual)
- Unlimited = zero credit cost for those models

---

## Prompt Optimization — 2500 Character Limit

### The Realism Formula

Every prompt MUST follow this structure within 2500 chars:

```
[SUBJECT] + [ACTION] + [ENVIRONMENT] + [LIGHTING] + [CAMERA] + [STYLE] + [DETAILS]
```

### Prompt Architecture (copy this template)

```
{descriptor} {subject} {doing what}, {environment}, {lighting description}, {camera angle/movement}, {style keywords}, {mood}, {technical quality}
```

### Realism Keywords That Work

**Photography style:**
- "shot on Canon EOS R5, 85mm f/1.4"
- "studio product photography"
- "editorial lifestyle photography"
- "street photography, natural light"
- "overhead flat lay, soft diffused light"

**Lighting:**
- "golden hour warm side lighting"
- "soft diffused studio light, slight rim light"
- "dramatic chiaroscuro, single key light"
- "overcast natural light, even exposure"
- "backlit with soft fill, lens flare"

**Camera:**
- "shallow depth of field, f/1.8 bokeh"
- "wide angle, low perspective, leading lines"
- "macro close-up, tack sharp focus"
- "eye-level medium shot, rule of thirds"
- "bird's eye view, symmetrical composition"

**Quality boosters:**
- "photorealistic, 8K ultra HD"
- "hyperdetailed skin texture, subsurface scattering"
- "physically accurate reflections and shadows"
- "film grain, Kodak Portra 400 color science"
- "commercial product photography, clean background"

**Mood/atmosphere:**
- "warm and inviting, cozy ambiance"
- "sleek and modern, minimal"
- "luxurious, premium feel"
- "energetic, vibrant, bold"

### Example Prompts (under 2500 chars)

**Product hero shot:**
```
Studio product photography of a matte black wireless earbud case, centered on a polished marble surface, soft diffused overhead studio light with subtle rim light, shallow depth of field f/2.0, clean minimal background with gentle gradient, photorealistic 8K, commercial advertising quality, subtle reflections on the marble, warm neutral color palette
```

**Lifestyle shot:**
```
Editorial lifestyle photography of a young woman smiling while holding a ceramic matcha bowl, sitting by a sunlit window in a cozy Japanese cafe, golden hour warm side lighting with soft shadows, shot on Canon EOS R5 85mm f/1.4, shallow depth of field with bokeh background, natural skin texture, relaxed candid pose, warm earthy tones, inviting atmosphere
```

**Fashion/beauty:**
```
Fashion editorial portrait, confident woman wearing oversized gold hoop earrings and silk blouse, urban rooftop at sunset, dramatic golden hour backlight with soft fill light, wind in hair, shot from slightly below eye level, Vogue editorial style, rich warm color grading, cinematic depth, skin detail with natural texture, aspirational luxury mood
```

**Food/beverage:**
```
Overhead flat lay of artisanal sourdough bread on a rustic wooden cutting board, scattered flour and wheat stalks, fresh rosemary sprigs, soft natural window light from left side, shallow depth of field, food photography styling, warm golden tones, cozy kitchen atmosphere, shot on Phase One IQ4 150MP, tack sharp detail on bread crust texture
```

**Tech product:**
```
Close-up product shot of a sleek wireless headphone on a reflective black surface, dramatic side lighting creating strong highlights and shadows, dark moody background with subtle blue accent light, commercial tech advertising style, physically accurate reflections, premium materials visible, brushed aluminum texture detail, 8K photorealistic rendering
```

### Prompt Do's and Don'ts

**DO:**
- Start with the subject, not the style
- Include specific camera/lens references for realism
- Mention lighting direction and quality
- Add one mood/atmosphere descriptor
- Specify material textures when visible
- Use "photorealistic" or "commercial photography" as quality anchors

**DON'T:**
- Waste chars on "a beautiful" or "a stunning" (the model knows)
- List more than 3 style keywords (diminishing returns)
- Use negative prompts in the main prompt (save for negative_prompt field)
- Repeat the same concept twice
- Use vague terms like "nice" or "good quality"

### Model-Specific Prompt Adjustments

**Z Image / Nano Banana (cheap):**
- Keep prompts SHORT (under 800 chars) — they work better with less
- Focus on subject + style, skip complex scene descriptions
- Great for iteration: generate 4-5 variants quickly

**Nano Banana 2 / Seedream 5.0 Lite:**
- Full 2500 char prompts work well
- Can handle complex multi-element scenes
- Good at following specific instructions

**Soul 2.0 / Soul Cinema:**
- Emphasize mood, aesthetic, and fashion keywords
- "editorial", "lifestyle", "magazine cover" work great
- Supports reference images for consistency

**GPT Image 2:**
- Best for text-on-image (brand names, labels)
- Handles complex compositions well
- Use for anything needing typography

**Nano Banana Pro:**
- The "thinking" model — follows logic better
- Best for hard briefs that need precision
- Great text rendering in multiple languages
