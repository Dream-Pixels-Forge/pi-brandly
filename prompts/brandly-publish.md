# Publishing Checklist

Prepare **{{productName}}** for publishing across platforms.

## Platforms
{{#each platforms}}
- **{{this}}**: {{lookup ../specs this}}
{{/each}}

## Required Outputs
1. Platform-specific captions (unique per platform)
2. Hashtag sets (trending + niche + branded)
3. Posting time recommendations
4. A/B test hook variations
5. Alt text for accessibility
6. Video specs per platform

## Publishing Order
1. TikTok (first — fastest feedback loop)
2. Instagram (2 hours later — cross-post while TikTok peaks)
3. YouTube (same day or next day — longer shelf life)

## Command
```
brandly_run_project(projectID="{{projectID}}")  // dispatches publish_agent
```
