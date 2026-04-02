@AGENTS.md

## Deployment Rule

- When deploying the web app, bump the version in `apps/fconline/package.json` first.
- Deploy only after the version bump is included so the home/header version text matches the live release.
- Treat version bump + production deploy as one paired step.
- After each production deploy, immediately point `https://fconlinemanual.vercel.app` to the latest deployment as part of the same flow without asking separately.
