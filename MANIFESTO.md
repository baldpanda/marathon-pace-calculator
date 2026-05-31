# Marathon Pace Calculator — Manifesto

### 1. Mission
A minimal, fast, reliable web tool that helps **competitive amateur road racers preparing for a target marathon** generate trustworthy pace plans for race day — including the tune-up races (5K, 10K, half) along the way. Nothing more.

### 2. Primary user
A competitive amateur runner — someone targeting a specific finish time, who cares about splits and pacing strategy, but who is not a coach managing athletes and not a beginner needing hand-holding.

### 3. Guiding philosophy: Simplicity first
- One screen, minimal inputs, instant results.
- Every feature must justify its existence against the simplicity bar.
- When in doubt, leave it out.
- The default path should require no configuration.

### 4. In scope (launch)
- **Pace / split calculator** — given a goal finish time and a target distance (5 km, 10 km, half marathon, marathon), produce per-km splits over the chosen distance.
- **Pacing strategies:**
  - Even splits (default)
  - Negative splits (configurable second-half speedup)
  - Custom pace bands (user-defined per-segment paces)
- **Units:** kilometers and min/km only.
- **Display:** per-km splits plus reference splits at 5K / 10K / half / 30K / finish.

### 5. Explicit non-goals
The project will **not** add:
- User accounts, login, or any persistence requiring a backend identity.
- Training plan generation or coaching content.
- Social, sharing, leaderboard, or community features.
- GPS, wearable, Strava, or Garmin integration — manual inputs only.
- Imperial units (miles / min/mile) at launch. Metric only.
- Race-time prediction from shorter races, course-adjusted pacing (GPX), weather adjustment — these are deliberately deferred.

If a future need arises, it must be re-justified against this manifesto.

### 6. Technical stance
A **lightweight web app**. Modern framework acceptable (React / Svelte / similar). Backend optional and only if a future feature genuinely requires it — not assumed. Stack choice itself is deferred to a later spec; the manifesto only commits to "lightweight."

### 7. Quality bar (non-negotiable)
- **Mobile-first responsive** — the phone is the device runners use; desktop is secondary.
- **Tested calculations** — all pace math is covered by unit tests; splits must be provably correct.
- **Fast load** — under 1 second on a 4G connection; minimal bundle, minimal dependencies.

### 8. How to use this manifesto
- Every new feature spec must cite which section of the manifesto it serves.
- Any proposal that conflicts with §5 (non-goals) requires an explicit manifesto amendment first — not a quiet exception.
- The manifesto is short on purpose. Keep it that way.
