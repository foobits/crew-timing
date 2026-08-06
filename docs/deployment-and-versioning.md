# Deployment & versioning

## Hosting

The app deploys to **GitHub Pages** at:

https://foobits.github.io/crew-timing/

Repository: `foobits/crew-timing`. Pages source: **GitHub Actions** (not `gh-pages` branch).

## Branch and merge workflow

**Do not push routine changes directly to `main`.** Every production change must go through a pull request, even when `main` is not branch-protected.

`main` is the release branch: merging (or pushing) to `main` triggers the **Deploy to GitHub Pages** workflow and updates the live site at the URL above. There is no staging environment, so a direct push skips review and ships immediately.

### Required flow

1. Branch from `main` (e.g. `favicon/luc-oar`, `fix/input-validation`).
2. Commit on the feature branch.
3. Push and open a PR using the [pull request template](../.github/pull_request_template.md).
4. Wait for the **Deploy to GitHub Pages** workflow to pass on the PR branch if CI runs there, or confirm checks are green before merge (see [Testing](testing.md)).
5. **Merge the PR into `main`** — deploy runs automatically on merge.

### Do not

- Commit and push directly to `main` for feature work, fixes, or assets (including favicons and config).
- Merge without a green CI run when tests apply to the change.

### Exceptions

Direct commits to `main` are only for emergencies agreed out of band (e.g. revert of a broken deploy). Prefer revert PRs when possible.

Contributors and automation should default to **feature branch → PR → merge**, not **commit → push `main` → deploy**.

## CI workflow

File: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

**Triggers:**

- Push to `main`
- Manual `workflow_dispatch`

**Concurrency:** `group: pages` with `cancel-in-progress: true` — a new push cancels an in-flight deploy.

### Build job

1. Node.js 22 (`actions/setup-node`)
2. `npm ci`
2. Install Playwright browsers (Chromium + WebKit)
3. `npm run test:coverage`
4. `npm run test:e2e`
5. `npm run build` with `APP_BUILD_NUMBER: ${{ github.run_number }}`
6. Upload `dist/` as Pages artifact

### Deploy job

- `actions/deploy-pages@v5` → production GitHub Pages environment.

**A failed test blocks deploy.** There is no separate staging environment.

## Build version label

Footer shows: `v{major}.{minor}.{run} · YYYY-MM-DD`

| Part | Source |
|------|--------|
| major.minor | `package.json` version (`1.0.x` → `1.0`) |
| run | GitHub Actions `github.run_number` at build time |
| date | UTC date at build (`__BUILD_DATE__`) |

Local dev builds show `v1.0.0-dev · …` (no `APP_BUILD_NUMBER`).

Implementation:

- `src/app/resolve-app-version.ts` — semver logic
- `vite.config.ts` — injects `__APP_VERSION__`
- `.github/workflows/deploy.yml` — sets env var on build step

Bump `major`/`minor` in `package.json` when starting a new release line; routine PRs do not need manual version bumps.

## PWA updates

- Service worker precaches hashed assets from `dist/`.
- `registerType: "autoUpdate"` — clients pick up new SW when online.
- Operators confirm deploy via footer build label (hard refresh or reopen PWA if cached).

## Fork setup

Enable **Settings → Pages → Source: GitHub Actions** and run the workflow on your default branch.

## Re-running a failed/cancelled deploy

If a run is cancelled (concurrency or manual):

```bash
gh workflow run deploy.yml --ref main
```

Verify at `gh run list --branch main`.

## Related docs

- [Testing](testing.md) — what CI runs before build
- [Tech stack](tech-stack.md) — Vite build details
