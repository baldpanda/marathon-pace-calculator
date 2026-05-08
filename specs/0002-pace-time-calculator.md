# Spec 0002 — Pace ↔ Time Calculator (MVP)

**Status:** Proposed
**Serves:** Manifesto §3 (simplicity first), §4 (pace calculator), §7 (mobile-first, tested, fast)

## Context

Manifesto §4 commits to a pace/split calculator; spec 0001 deferred the math and UI. Rather than ship the full §4 surface in one go, this spec carves out the smallest useful slice: a bidirectional converter between **pace per km** and **total marathon finish time**. Splits, pacing strategies, and reference markers (5K / 10K / half / 30K) are deliberately out of scope and will land in subsequent specs (0003+). Each spec stays narrow and reviewable against the manifesto.

## Locked decisions

| Concern | Choice | Why |
|---|---|---|
| Direction | **Bidirectional** — edit either field, the other recalculates | §4 covers both common questions ("what time at X pace?" / "what pace for sub-3?") |
| Pace input | **Single `mm:ss` text field** (e.g. `4:30`) | §3 minimal inputs; matches how runners think about pace |
| Time input | **Single `hh:mm:ss` text field** (e.g. `3:09:39`) | §3 minimal inputs |
| Persistence | **Ephemeral** — refresh clears both fields | §3 no configuration; §5-adjacent (no accounts), keeps surface area minimal |
| Distance | Fixed constant `42.195 km` | §4 |
| Units | Metric only — `min/km`, `hh:mm:ss` | §4, §5 |
| Conflict policy | "Last edited wins" — typing in one field updates the other | §3 instant results |
| Display rounding | Round to the nearest whole second; internal math uses exact float seconds | §7 trustworthy splits; runners race off whole seconds |

## Behaviour

- On load, both fields are empty; no derived output is shown.
- Valid input in either field instantly populates the other (within one frame; no debounce).
- Invalid or empty input silently clears the counterpart. No error toast. An optional inline hint (`enter as mm:ss`) is allowed but not required for v1.
- Re-formatting must not fight the user's caret: only the *non-edited* field is rewritten on each keystroke.

## Math

```
MARATHON_KM = 42.195
total_seconds        = pace_seconds_per_km * MARATHON_KM
pace_seconds_per_km  = total_seconds / MARATHON_KM
```

Canonical examples (rounded display):

| Input | Output |
|---|---|
| pace `4:00` | total `02:48:47` |
| pace `5:00` | total `03:30:58` |
| total `3:30:00` | pace `4:59` |
| total `4:00:00` | pace `5:41` |

## Module shape

`src/lib/pace.ts` — pure, framework-free, no I/O:

| Export | Signature | Notes |
|---|---|---|
| `MARATHON_KM` | `42.195` | constant |
| `parsePace` | `(input: string) => number \| null` | returns seconds/km, or `null` for invalid/empty |
| `formatPace` | `(secondsPerKm: number) => string` | `mm:ss` |
| `parseTime` | `(input: string) => number \| null` | returns total seconds; accepts `hh:mm:ss` and `mm:ss` |
| `formatTime` | `(totalSeconds: number) => string` | `hh:mm:ss` |
| `paceToTotalSeconds` | `(secondsPerKm: number) => number` | exact |
| `totalSecondsToPace` | `(totalSeconds: number) => number` | exact |

UI lives in `src/App.svelte`; the component owns the two `<input>`s plus a `lastEdited: 'pace' \| 'time'` flag and calls into `pace.ts` only.

## Repo layout (delta from spec 0001)

```
src/
├── App.svelte            # replaced: two-field calculator UI
├── app.css               # minor additions for layout / inputs
└── lib/
    └── pace.ts           # NEW — pure pace math
tests/
└── pace.test.ts          # NEW — unit + round-trip tests
specs/
└── 0002-pace-time-calculator.md   # this spec
```

`tests/smoke.test.ts` may stay or be removed; it is not load-bearing once `pace.test.ts` lands.

## Out of scope

- Per-km splits table — **spec 0003**.
- Reference splits at 5K / 10K / half / 30K / finish — **spec 0003**.
- Pacing strategies (even / negative / custom bands) — **spec 0004**.
- URL-shareable inputs, localStorage — re-evaluate after MVP.
- Imperial units, race-time prediction, GPX, weather — blocked by Manifesto §5.
- Hosting / deployment — future spec.

## Acceptance criteria

1. `pnpm test` includes coverage for: `mm:ss` parse/format, `hh:mm:ss` parse/format, both conversion directions, and at least one round-trip property test (`format(parse(x)) === x` for canonical inputs).
2. `pnpm dev` renders two labeled fields; editing one updates the other within one frame.
3. Empty or invalid input in one field leaves the other blank — no thrown errors, no console noise.
4. Mobile viewport at 320 px: fields stack vertically, no horizontal scroll, tap targets ≥ 44 px.
5. `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass; bundle stays well under the 25 kB soft gate from spec 0001.
