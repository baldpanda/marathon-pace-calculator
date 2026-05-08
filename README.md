# Marathon Pace Calculator

A minimal, fast, reliable web tool for competitive amateur marathoners to generate race-day pace plans. Goal-time in, per-km splits out — nothing more.

Scope, philosophy, and non-goals are locked in [`MANIFESTO.md`](./MANIFESTO.md).
The toolchain is locked in [`specs/0001-skeleton.md`](./specs/0001-skeleton.md).

## Quick start

```bash
pnpm install
pnpm dev
```

Requires Node 20+ and pnpm 10+ (pinned via `packageManager` in `package.json`). If you don't have pnpm: `corepack enable`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Build the production bundle |
| `pnpm preview` | Preview the built bundle locally |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm typecheck` | Type-check `.ts` and `.svelte` (svelte-check) |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |

## Stack

Vite + Svelte 5 + TypeScript, vanilla CSS, Vitest, Biome, pnpm. CI on GitHub Actions runs typecheck → lint → test → build on every PR and push to `main`.
