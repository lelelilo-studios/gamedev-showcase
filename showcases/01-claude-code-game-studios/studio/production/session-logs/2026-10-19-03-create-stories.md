# Session log: /create-stories

> **Date**: 2026-10-19, 22:41 (UTC−3)
> **Skill**: `.claude/skills/create-stories/SKILL.md`, the `minimal` branch
> **Roles**: producer (the plan), qa-lead (story types and evidence)
> **Kept by**: the builder. The skill's output is the epic folder.

```
- [x] Phase 1: epic found, tier resolved
- [x] Phase 2: inputs loaded (the brief only, at minimal)
- [x] Phase 3-4: stories drafted, typed, Ready or Blocked
- [x] Phase 5: QA lead review skipped — Solo mode
- [x] Phase 6: story list shown, one ask to write
- [x] Phase 7: stories and EPIC.md written; index.md absent
- [x] Phase 8: next step asked, closing block printed
```

## Phase 1

Nothing typed after the skill name, at `workflow: minimal`: this tier needs no `/create-epics` epic.
The slug is the brief's working title, slugified: `hold-the-cold`. Granularity `coarse` (rigor
minimal): 5 to 10 acceptance criteria per story. Density `terse`. Settings read by hand from
`project.yaml` (the `resolve_config` line was not run).

## Phase 2

Read `design/game-brief.md` in full. No `production/epics/hold-the-cold/EPIC.md` yet: drafted from
the brief (goal = pitch, scope = MVP list, order = build order). No GDD, ADR, TR registry or control
manifest is read at this tier. One story per MVP feature, in build order.

## Phase 6: the list

```
## Stories for Epic: Hold the Cold

Story 001: The vault and the keeper — Visual/Feel — Ready — Estimate M
  Covers: Brief MVP feature 1
  Evidence required: retained screenshot + sign-off in production/qa/evidence/story-001-vault-and-keeper-evidence.md

Story 002: Bay cooling and scraping — Logic — Ready — Estimate M
  Covers: Brief MVP feature 2
  Test required: tests/unit/bays/story-002-bay-cooling_test.js (waived at qa.level minimal)

Story 003: The fuel run — Integration — Ready — Estimate M
  Covers: Brief MVP feature 3
  Test required: tests/integration/generator/story-003-fuel-run_test.js or a playtest doc (waived)

Story 004: The storm night — Logic — Ready — Estimate L
  Covers: Brief MVP feature 4
  Test required: tests/unit/storm/story-004-storm-night_test.js (waived)

Story 005: Losses and the end of the night — Logic — Ready — Estimate S
  Covers: Brief MVP feature 5
  Test required: tests/unit/collection/story-005-end-of-night_test.js (waived)

Story 006: Screens, settings and HUD — UI — Ready — Estimate M
  Covers: Brief MVP feature 6
  Evidence required: a retained screenshot of each screen touched

Story 007: Sound and feedback — Visual/Feel — Ready — Estimate M
  Covers: Brief MVP feature 7
  Evidence required: retained screenshot + sign-off in production/qa/evidence/story-007-sound-and-feedback-evidence.md

[7 stories: 3 Logic, 1 Integration, 2 Visual/Feel, 1 UI, 0 Config/Data; 0 Blocked]
QL-STORY-READY: skipped — Solo mode
```

Typing calls, where a story mixes kinds (the type with the highest implementation risk wins):
001 is Visual/Feel because how the keeper moves is the risk, not the drawing; 004 is Logic
because the schedule and the crank's state machine are the risk; 005 is Logic with an end screen
on top.

**Studio:** May I write these 7 stories to `production/epics/hold-the-cold/` and create
`production/epics/hold-the-cold/EPIC.md`? (`production/epics/index.md` does not exist and is left out.)

**Human:** Yes, write all 7.

## Phase 8

No other epic exists. **Studio:** 7 stories written to `production/epics/hold-the-cold/`. What next?
Start implementing (recommended) · Stop here.

**Human:** Start implementing.

```
Verdict: COMPLETE — 7 stories written to production/epics/hold-the-cold/ (7 Ready, 0 Blocked)
Review: QL-STORY-READY skipped — Solo mode
Index: Epics index not updated: production/epics/index.md absent
Next step: /dev-story production/epics/hold-the-cold/story-001-vault-and-keeper.md
```
