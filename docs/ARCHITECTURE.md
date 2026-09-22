# McLain OS architecture

## Ownership boundary

McLain OS is the parent control plane. It should never require the ECC repository to be checked out beside it.

### McLain OS owns
- mobile/PWA operator UX
- local operator/project state
- provider registry
- orchestration contracts
- product/module discovery
- integration health and future authentication boundary

### ECC owns
- execution harness
- diagnostic commands
- skill/agent catalogs
- command safety and execution limits

McLain OS reaches ECC through the bridge. The bridge exposes only the API paths the current UI needs.

### Aurora Core owns
- intelligence/capability services
- model-facing workflows that belong in Aurora rather than the OS shell

Aurora is registered in `platform.json` and should expose versioned provider APIs before McLain OS begins depending on Aurora internals.

## Integration rule

Depend on **contracts**, not repository folders.

Bad:
`require('../ecc/scripts/...')`

Good:
`McLain OS -> provider contract -> ECC/Aurora endpoint`

## Product expansion

OpsPost, Brainchild, genealogy tooling, ParcelForge, TurnBot tooling, and future products should stay independently deployable. McLain OS can surface them through a module registry, shared auth, notifications, and deep links without turning the OS repository into another monolith.

## Migration

The initial extraction keeps the existing PWA UI intact and replaces the filesystem dependency on ECC with a narrow HTTP provider bridge. Once the standalone repository is established, provider contracts can be versioned and individual capabilities can migrate from ECC into purpose-built services without changing the McLain OS ownership model.
