# Spec 0001 — Skeleton

**Status:** Approved
**Serves:** Manifesto §6 (technical stance), §7 (quality bar)

## Context
Manifesto §6 deferred the stack choice ("lightweight; framework choice deferred to a later spec"). This spec closes that gap. It locks the toolchain and minimal repo layout so the next spec (pace math) builds on a known foundation, and §7 quality bars (mobile-first, tested, <1s on 4G, minimal deps) are wired into CI from commit #1.

## Locked decisions

| Concern | Choice | Why |
|---|---|---|
| Framework + build | **Vite + Svelte 5 + TypeScript** | §6 lightweight, §7 small bundle |
| Styling | **Vanilla CSS + custom properties** | §3 simplicity, §7 minimal deps |
| Testing | **Vitest** (unit only) | §7 tested calculations |
| Lint + format | **Biome** (single tool) | §7 minimal deps |
| Package manager | **pnpm** | fast, strict, small lockfile |
| CI | **GitHub Actions** — typecheck + lint + test + build on PR & push to `main` | §7 enforced from day one |
| Hosting | **Deferred** to a future spec | per decision on 2026-05-08 |

## Repo layout

```
.
├── MANIFESTO.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json             # strict: true, noUncheckedIndexedAccess: true
├── vite.config.ts            # Vite + Vitest config
├── svelte.config.js
├── biome.json
├── index.html
├── src/
│   ├── main.ts               # mount entry
│   ├── App.svelte            # placeholder shell
│   ├── app.css               # global vars + base styles
│   ├── lib/                  # (empty — pace math lands in spec 0002)
│   └── vite-env.d.ts
├── tests/
│   └── smoke.test.ts         # one passing assertion to prove the harness
├── specs/
│   └── 0001-skeleton.md      # this spec
└── .github/
    └── workflows/
        └── ci.yml
```

## Scripts (`package.json`)

| Script | Command |
|---|---|
| `dev` | `vite` |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `test` | `vitest run` |
| `typecheck` | `svelte-check --tsconfig ./tsconfig.json` |
| `lint` | `biome check .` |
| `format` | `biome format --write .` |

## CI (`.github/workflows/ci.yml`)

- Triggers: `pull_request`, `push` to `main`.
- Single job, Node 20, `pnpm/action-setup`.
- Steps: `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`.

## Out of scope

- Pace math (per-km splits, pacing strategies) — **spec 0002**.
- Real UI for inputs/outputs — spec 0002+.
- Hosting / deployment — future spec.
- e2e, component, or visual-regression tests — defer until needed.
- Imperial units, training plans, integrations — blocked by Manifesto §5.

## Acceptance criteria

1. `pnpm install` runs clean and a `pnpm-lock.yaml` is committed.
2. `pnpm dev` serves a placeholder page with no console errors; mobile viewport has no horizontal scroll.
3. `pnpm build && pnpm preview` succeeds; gzipped shell JS ≤ 25 kB (soft gate).
4. `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass locally.
5. A no-op PR shows the CI workflow running typecheck + lint + test + build, all green.
