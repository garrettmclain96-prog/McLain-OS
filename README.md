# McLain OS

McLain OS is the independent McLain Systems control plane.

It owns the operator experience, project state, platform registry, and orchestration surface. ECC and Aurora Core are providers connected to McLain OS; they are not the parent application.

## Architecture

- **McLain OS** — product/control plane, iPhone-first PWA, operator state, integration registry.
- **ECC** — execution/diagnostics provider reached over a narrow HTTP bridge.
- **Aurora Core** — intelligence/capability provider registered independently.
- **OpsPost and future systems** — independent products/modules that can register with McLain OS without being copied into this repository.

See `platform.json` and `docs/ARCHITECTURE.md`.

## Run locally

Requires Node 18+.

```bash
npm start
```

Default URL: http://localhost:8787

Set `ECC_BASE_URL` to point at another ECC deployment. If omitted, the current hosted ECC endpoint is used.

## Deploy to Vercel

Framework preset: **Other**. No build command or output directory is required.

The static PWA is served from the repository root. The Vercel bridge forwards only the allowlisted McLain OS API routes to the configured ECC provider.

Optional environment variable:

- `ECC_BASE_URL` — ECC service origin. Defaults to `https://ecc-kappa-hazel.vercel.app`.

## iPhone

Open the production HTTPS URL in Safari → Share → Add to Home Screen.

## Security boundary

The browser does not receive arbitrary proxy access. The bridge allowlists the exact ECC routes used by McLain OS. ECC remains responsible for its own command allowlist, authorization, and execution controls.

## Source-of-truth rule

This codebase is the McLain OS source of truth. ECC integrations should be consumed across an API/package boundary instead of reaching into ECC's filesystem.
