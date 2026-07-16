# Superproduction: Multi-Shot Director

Run a **multi-shot superproduction** for: **{{productName}}**

## The Script

{{script}}

## Orchestration

Treat yourself as the **Director** (see `agents/director_agent.md`). Execute the orchestration loop:

1. **INIT** — plan the production from the script:
   ```
   brandly_director(action="init", projectID="{{projectID}}", scriptText="{{script}}")
   ```
2. **LOOP** — for each shot until `all_done`:
   - `brandly_director(action="next", projectID="{{projectID}}")` → get the shot brief
   - Generate that shot's clip with the project's video tools (honor `continuityClip`)
   - `brandly_director(action="complete", projectID="{{projectID}}", shotId="<shotId>", clipPath="<path>", credits=<n>)`
3. **ASSEMBLE** — cut all shots into one film:
   ```
   brandly_director(action="assemble", projectID="{{projectID}}", transitionType="fade", showTitles=true)
   ```
   Then render: `cd <assemblyDir> && npm install && bash build.sh`
4. **DELIVER** — validate + export:
   ```
   brandly_director(action="deliver", projectID="{{projectID}}")
   ```

## Guardrails

- Keep visual continuity between consecutive shots (use each shot's `continuityClip`).
- Respect the project budget — call `brandly_record_cost` after each generation.
- If a shot scores low, `brandly_director(action="rework", ...)` then regenerate.

Deliver ONE final film with all shots assembled, plus the virality score and export package.
