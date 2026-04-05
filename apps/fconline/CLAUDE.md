@AGENTS.md

## Dev Server Rule

- To start the dev server, always run via PowerShell in background (Cygwin bash cannot fork Node.js):
  ```bash
  powershell -Command "cd 'C:\Users\llama109\fconline\apps\fconline'; npm run dev"
  ```
  Use `run_in_background: true` and confirm "Ready" via TaskOutput before reporting success.
- PowerShell execution policy is already set to `CurrentUser: RemoteSigned` — no need to set it again.

- Before starting the dev server, ensure NEXON Launcher is NOT running.
- If the user reports Themida/WinLicense errors ("A debugger has been found", "Cannot find SHLWAPI.dll", or PC freeze when running `npm run dev`), the cause is NEXON Launcher auto-starting at boot and its anti-tamper protection detecting Node.js as a debugger.
- Fix: Disable NEXON Launcher from Windows startup programs (Task Manager → Startup tab). The user can launch it manually when gaming.

## Deployment Rule

- When deploying the web app, bump the version in `apps/fconline/package.json` first.
- Deploy only after the version bump is included so the home/header version text matches the live release.
- Treat version bump + production deploy as one paired step.
- After each production deploy, immediately point `https://fconlinemanual.vercel.app` to the latest deployment as part of the same flow without asking separately.
