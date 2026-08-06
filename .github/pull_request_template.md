## Summary

<!-- What changed and why? -->

## Test plan

- [ ] `npm run test:all` passes locally (or note any intentional skips)
- [ ] Desktop E2E exercised the affected flows

### Version label

Each merge to `main` gets a new footer version automatically (`v{major}.{minor}.{run_number}` from CI). No manual version bump is required for routine PRs. Update `major`/`minor` in `package.json` only when starting a new release line.

### Mobile Safari E2E

Mobile Safari tests are the **CI source of truth** (Ubuntu + Playwright WebKit). On macOS 26+, local mobile E2E may **skip** when WebKit cannot reach the preview server — that is an environment limitation, not a product failure.

Before merging, confirm the GitHub Actions **Deploy to GitHub Pages** workflow is green, including **20/20 E2E** (12 desktop + 8 mobile).
