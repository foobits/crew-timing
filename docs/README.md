# Engineering documentation

Detailed docs for contributors and maintainers. The root [README](../README.md) covers quick start, race-day workflow, and field input formats for operators.

## Contents

| Document | What you'll learn |
|----------|-------------------|
| [Project overview](project-overview.md) | Problem domain, CrewTimer workflow, design constraints |
| [Tech stack](tech-stack.md) | Languages, tools, dependencies, why no UI framework |
| [Architecture](architecture.md) | Layers, state, rendering, events, persistence |
| [Codebase guide](codebase-guide.md) | Directory layout, modules, extension points |
| [Domain & computation](domain-and-computation.md) | Race model, parsing, timestamp math |
| [Testing](testing.md) | Unit tests, E2E, fixtures, coverage, CI |
| [Deployment & versioning](deployment-and-versioning.md) | GitHub Pages, branch/PR workflow, CI pipeline, build labels |
| [Copied lane feedback](copied-lane-feedback.md) | Results copy checklist UX spec |

## Recommended reading order

1. **Project overview** — confirm you understand the finish-line use case.
2. **Architecture** — how data flows from input → state → DOM.
3. **Codebase guide** — where to change things safely.
4. **Domain & computation** — if you touch parsing or results math.
5. **Testing** — before opening a PR.
6. **Deployment & versioning** — branch from `main`, merge via PR; never push routine work directly to `main`.

## Conventions

- **TypeScript strict mode** throughout `src/`.
- **No runtime UI framework** — plain DOM, string templates, scoped patches.
- **Domain logic stays pure** in `src/lib/` (no DOM, no `localStorage`).
- **Mobile-first** — touch targets, input commit behavior, and E2E on WebKit matter.
