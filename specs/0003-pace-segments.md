# Spec 0003 — Per-segment Pace Bands

**Status:** Proposed
**Serves:** Manifesto §3 (simplicity first), §4 (custom pace bands), §7 (mobile-first, tested, fast)

## Context

Manifesto §4 commits to "custom pace bands (user-defined per-segment paces)" alongside even and negative splits. Spec 0002 shipped the bidirectional pace ↔ time MVP and tentatively mapped per-km splits to spec 0003 and pacing strategies to spec 0004. We are reordering: custom pace bands are the highest-leverage feature for the primary user (a runner planning a non-uniform race — cautious first half + faster second half, hill-aware segments, etc.), so they take spec 0003. Per-km split tables, reference markers (5K / 10K / half / 30K), and the auto-fill pacing strategies (even / negative) move to a later spec.

Spec 0002's "Out of scope" pointers are updated in this commit to keep the roadmap internally consistent.

## Locked decisions

| Concern | Choice | Why |
|---|---|---|
| Segment boundary editing | **Drag handles on the horizontal timeline** | §3 direct manipulation; one screen; matches the runner's mental model of a course laid out in front of them |
| Add / remove segments | **Dedicated `+` / `−` buttons beside the timeline** | §3 unambiguous on mobile; no learned gestures |
| Pace input per segment | **Persistent `mm:ss` text input below each segment's pace label** | §3 minimal indirection; matches the input style of spec 0002 |
| Total distance | **Must sum to exactly 42.195 km** — last segment auto-rebalances | §4 fixed marathon distance; eliminates a class of invalid states |
| Timeline labels | Cumulative km at each split marker, cumulative time at each split, pace inside each segment, total finish time prominently displayed | §4 splits + §3 instant results — every number a runner needs is visible without a click |
| Page layout | **New section below the existing two-field calculator** | §3 one screen; the simple calculator stays the entry point |
| Default state on load | **Single segment = whole marathon at 5:00 /km** | §3 minimal configuration; demonstrates total time immediately |

## Behaviour

- On first load: one segment of `42.195` km at `5:00 /km`. Total finish time is rendered immediately.
- `+` button splits the **longest** segment into two equal halves; both halves inherit the original segment's pace. Deterministic — no prompts, no positioning choice.
- `−` button removes the **last** segment; its distance is added to the previous segment. The surviving segment's pace is unchanged. Disabled when only one segment remains.
- Dragging a boundary handle adjusts the two adjacent segments' distances; the rest of the timeline is untouched. Handles snap to **0.05 km (50 m)** granularity for tidy numbers and forgiving touch input.
- A handle cannot cross its neighbours; it clamps at the previous and next boundaries (or `0` / `42.195`).
- Editing a segment's `mm:ss` pace updates that segment's split time and the total within one frame; no debounce.
- Invalid pace input leaves the segment's contribution unchanged and renders the input with a warn-coloured border. No toast, no thrown error.
- Distance invariant: at all times, `Σ segments[i].km === 42.195`.

## Math

```
segmentSeconds(segment)            = segment.km * segment.paceSecondsPerKm
totalSeconds(segments)             = Σ segmentSeconds(segments[i])
cumulativeKm(segments, i)          = Σ_{k=0..i} segments[k].km
cumulativeSeconds(segments, i)     = Σ_{k=0..i} segmentSeconds(segments[k])
```

Display rounding: cumulative and total times round to the nearest whole second; internal math uses exact float seconds (consistent with spec 0002).

Canonical example:

| Segments | Total |
|---|---|
| `[{ 21.0975 km @ 5:00 }, { 21.0975 km @ 4:30 }]` | `03:20:18` |
| `[{ 10 km @ 4:30 }, { 10 km @ 4:25 }, { 10 km @ 4:20 }, { 12.195 km @ 4:15 }]` | `03:01:53` |

## Module shape

`src/lib/segments.ts` — pure, framework-free, re-uses `MARATHON_KM`, `parsePace`, `formatPace`, `formatTime` from `src/lib/pace.ts`:

| Export | Signature | Notes |
|---|---|---|
| `Segment` | `{ km: number; paceSecondsPerKm: number }` | type |
| `defaultSegments` | `() => Segment[]` | single `42.195` km @ `300` s/km |
| `addSegment` | `(segments: Segment[]) => Segment[]` | splits longest segment in half; both halves keep its pace |
| `removeLastSegment` | `(segments: Segment[]) => Segment[]` | last segment's distance merges into the previous; no-op if `length === 1` |
| `setBoundary` | `(segments: Segment[], index: number, km: number) => Segment[]` | sets the cumulative km at the boundary between segment `index` and `index+1`; clamps to neighbouring boundaries |
| `segmentTotalSeconds` | `(segments: Segment[]) => number` | exact |
| `splitMarkers` | `(segments: Segment[]) => Array<{ km: number; seconds: number }>` | one entry per boundary including the final `42.195` km marker |

UI lives in a new `src/lib/SegmentTimeline.svelte` component. It owns the `Segment[]` `$state`, all pointer / touch handlers for the drag interaction, and the `+` / `−` buttons. It calls into `segments.ts` only. `src/App.svelte` mounts it below the existing two-field calculator.

## Repo layout (delta from spec 0002)

```
src/
├── App.svelte                  # mount SegmentTimeline below existing fields
└── lib/
    ├── pace.ts                 # unchanged
    ├── segments.ts             # NEW — pure segment math
    └── SegmentTimeline.svelte  # NEW — timeline UI
tests/
└── segments.test.ts            # NEW — segment math + invariants
specs/
└── 0003-pace-segments.md       # this spec
```

## Out of scope

- Per-km split table — later spec.
- Reference markers at 5K / 10K / half / 30K / finish — later spec.
- Auto-fill pacing strategies (even / negative second-half speedup) — later spec.
- URL-shareable inputs, localStorage — re-evaluate after this lands.
- Imperial units, race-time prediction, GPX, weather — blocked by Manifesto §5.
- Per-segment elevation or terrain inputs — blocked by Manifesto §5.

## Acceptance criteria

1. `pnpm test` covers: distance invariant after every `addSegment` / `removeLastSegment` / `setBoundary`, total-seconds correctness for the canonical examples above, `setBoundary` clamping at both neighbours and at `0` / `42.195`, and a round-trip property test on `splitMarkers` (last entry's km equals `MARATHON_KM`, last entry's seconds equals `segmentTotalSeconds`).
2. `pnpm dev` renders the timeline below the existing calculator; default load shows a single 42.195 km segment @ 5:00 with total time `03:30:59`.
3. Adding, removing, and dragging segments updates the rendered total finish time within one frame.
4. Mobile viewport at 320 px: timeline scales without horizontal scroll, drag handles are ≥ 44 px tap targets, pace inputs stack vertically beneath the timeline.
5. Invalid pace input visually marks the offending input and leaves the rest of the calculation untouched — no thrown errors, no console noise.
6. `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass; bundle stays under the 25 kB soft gate from spec 0001.
