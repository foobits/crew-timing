## Summary

<!-- What changed and why? -->

## Test plan

- [ ] `npm run test:all` passes locally (or note any intentional skips)
- [ ] Desktop E2E exercised the affected flows

### Mobile Safari E2E

Mobile Safari tests are the **CI source of truth** (Ubuntu + Playwright WebKit). On macOS 26+, local mobile E2E may **skip** when WebKit cannot reach the preview server — that is an environment limitation, not a product failure.

Before merging, confirm the GitHub Actions **Deploy to GitHub Pages** workflow is green, including **6/6 E2E** (3 desktop + 3 mobile).
