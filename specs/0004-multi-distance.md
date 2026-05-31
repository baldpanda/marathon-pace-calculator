# Spec 0004 — Multi-distance pace bands

**Status:** Proposed
**Serves:** Manifesto §1, §4 (both proposed for amendment — see "Manifesto amendment" below), §3 (simplicity), §7 (mobile-first, tested, fast)

## Context

Specs 0002 and 0003 are hard-wired to `MARATHON_KM = 42.195`. The primary user — a competitive amateur marathoner — paces **tune-up races** (5K, 10K, half marathon) throughout the build-up to a target marathon. Forcing them out of the tool for those sessions contradicts §3 ("instant results") and leaves the calculator useful for one date in their season instead of the whole block.

This spec extends both the bidirectional pace ↔ time calculator (Spec 0002) and the segment timeline (Spec 0003) from marathon-only to a fixed set of four distances, page-wide.

## Manifesto amendment (required, lands in same PR as implementation)

This spec cannot be implemented under the current manifesto. The following edits are proposed and must be approved before code lands:

- **§1 Mission** — "competitive amateur marathoners" → "competitive amateur road racers preparing for a target marathon".
- **§4 In scope (launch)** — replace the marathon-only "Pace / split calculator" bullet with: "Pace / split calculator — given a goal finish time and a target distance (5 km, 10 km, half marathon, marathon), produce per-km splits over the chosen distance."
- **§4 Reference splits** bullet — remains marathon-specific (5K / 10K / half / 30K / finish are marathon checkpoints). Per-distance reference markers are not committed.
- **§5 Non-goals** — no changes. "Race-time prediction from shorter races" stays a non-goal (still out: deriving a marathon time *from* a 10K).

## Locked decisions

| Concern | Choice | Why |
|---|---|---|
| Distance set | Fixed enum: `5K (5.000 km)`, `10K (10.000 km)`, `Half (21.0975 km)`, `Marathon (42.195 km)` | §3 minimal inputs; matches how runners enter races |
| Picker UI | Single `<select>` inside the "Pace bands" section header — `Distance: [ Half ▾ ]` | §3 one screen; native control = mobile keyboard parity + accessibility for free |
| Scope of selection | Page-wide — both the top pace ↔ time calculator and the segment timeline use the selected distance | §3 one source of truth; avoids two distance pickers contradicting each other |
| Default distance | `Marathon` | Preserves existing behaviour from Specs 0002 / 0003 |
| Persistence | Ephemeral — refresh returns to `Marathon` | §3 no configuration; matches Spec 0002 |
| Switch behaviour | Reset segments to a single full-distance band at the previous first-band pace | §3 deterministic, no prompts; proportional rescale was rejected as surprising on small distances |
| Distance invariant | `Σ segments[i].km === distanceKm` for the active distance | Generalises Spec 0003's `MARATHON_KM` invariant |
| Snap / min segment | Unchanged at 0.05 km — applies to every distance | §3 tidy numbers; touch-friendly drag |
| Per-distance default pace | Unchanged — `5:00 /km` for every distance | §3 no configuration; avoids judgement about "what is a normal 5K pace" |
| Reference splits per distance | Out of scope — still a later spec | Keeps this spec narrow |

## Behaviour

- On first load: distance = `Marathon`; segment timeline shows a single 42.195 km @ 5:00 /km band (unchanged from Spec 0003).
- Changing the dropdown:
  - Rewrites `segments` to `[{ km: distanceKm, paceSecondsPerKm: previousFirstSegmentPace }]`.
  - Top pace ↔ time calculator re-derives against the new distance: if the pace field has a value, the time field updates; if the time field has a value, the pace field updates; if both are empty, both stay empty. Last-edited wins, matching Spec 0002.
- The `+`, `−`, drag-handle, and per-segment pace-input behaviours from Spec 0003 are unchanged — they operate against the active `distanceKm`.
- The dropdown is a native `<select>` element (no custom widget).

## Math

```
DISTANCES = { '5K': 5, '10K': 10, 'Half': 21.0975, 'Marathon': 42.195 }
paceToTotalSeconds(secondsPerKm, distanceKm) = secondsPerKm * distanceKm
totalSecondsToPace(totalSeconds, distanceKm)  = totalSeconds / distanceKm
```

Canonical examples (rounded display):

| Distance | Input | Output |
|---|---|---|
| 5K | pace `4:00` | total `00:20:00` |
| 10K | pace `3:45` | total `00:37:30` |
| Half | pace `4:30` | total `01:34:56` |
| Marathon | pace `5:00` | total `03:30:59` (unchanged) |

## Module shape

`src/lib/distance.ts` — **NEW**, pure:

| Export | Signature | Notes |
|---|---|---|
| `DistanceKey` | `'5K' \| '10K' \| 'Half' \| 'Marathon'` | type |
| `DISTANCES` | `Record<DistanceKey, number>` | km values; `Marathon` reads `MARATHON_KM` from `pace.ts` |
| `DEFAULT_DISTANCE` | `'Marathon'` | constant |

`src/lib/pace.ts` — refactor:
- `paceToTotalSeconds(secondsPerKm, distanceKm = MARATHON_KM)` — add second param; default preserves the Spec 0002 call sites.
- `totalSecondsToPace(totalSeconds, distanceKm = MARATHON_KM)` — same shape.
- `MARATHON_KM` stays (used by `DISTANCES.Marathon`).

`src/lib/segments.ts` — refactor:
- `defaultSegments(distanceKm = MARATHON_KM): Segment[]` — single segment at the requested distance.
- `addSegment`, `removeLastSegment`, `setBoundary`, `setSegmentPace`, `segmentTotalSeconds`, `splitMarkers` — unchanged. `setBoundary` already derives `cumNext` from the local segment sums, so it generalises without a signature change.

`src/lib/SegmentTimeline.svelte` — accept `distanceKey` + `distanceKm` as props; render the `<select>` in the section header; on change, call `defaultSegments(distanceKm)` and emit a callback to `App.svelte`.

`src/App.svelte` — owns `distanceKey: $state<DistanceKey>('Marathon')`; top pace ↔ time inputs use `DISTANCES[distanceKey]` instead of the hard-coded marathon constant; passes `distanceKey` + `onDistanceChange` into `SegmentTimeline`.

## Repo layout (delta from Spec 0003)

```
src/
├── App.svelte                  # distance state + page-wide wiring
└── lib/
    ├── distance.ts             # NEW — fixed distance enum
    ├── pace.ts                 # paceToTotalSeconds / totalSecondsToPace accept distanceKm
    ├── segments.ts             # defaultSegments accepts distanceKm
    └── SegmentTimeline.svelte  # dropdown in header; props for distance
tests/
├── pace.test.ts                # extend with non-marathon distance cases
├── segments.test.ts            # extend with non-marathon distance invariant
└── distance.test.ts            # NEW — DISTANCES map sanity
specs/
└── 0004-multi-distance.md      # this spec
MANIFESTO.md                    # §1, §4 amendment (same PR as implementation)
```

## Out of scope

- Per-distance reference markers (5K / 10K split for a marathon, etc.) — later spec.
- Imperial units, race-time prediction, GPX, weather — blocked by Manifesto §5.
- Persisting the selected distance across reloads — re-evaluate after this lands.
- Custom / free-form km distances — explicitly rejected to keep §3.
- Per-distance default paces — defaults stay `5:00 /km` regardless of distance.

## Acceptance criteria

1. `pnpm test` covers: `paceToTotalSeconds` / `totalSecondsToPace` for all four distances; `defaultSegments(distanceKm)` produces a single segment summing to the requested distance; `setBoundary` clamps to the active `distanceKm` (not `MARATHON_KM`) for non-marathon distances; `addSegment` → `removeLastSegment` preserves `Σ km === distanceKm` for 5K, 10K, Half.
2. `pnpm dev` renders the dropdown inside the pace-bands header; default load is `Marathon` with the existing `03:30:59` total (regression against Spec 0003).
3. Switching the dropdown from `Marathon` to any other distance: segment timeline collapses to one segment of the new distance at the previously-shown first-band pace; total finish recalculates within one frame.
4. Switching distance while the top pace field has a value: the time field re-derives against the new distance within one frame (and vice-versa).
5. Mobile viewport at 320 px: the header `Distance:` label + `<select>` fit on one line above the timeline; tap target ≥ 44 px.
6. `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass; bundle stays under the 25 kB soft gate from Spec 0001.
