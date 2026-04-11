# AGENTS.md

This file is the single agent-instructions document for this repository.
이 파일은 이 저장소의 단일 에이전트 작업 지침 문서입니다.

Do not create or maintain additional `AGENTS.md` files in subdirectories unless the team explicitly changes that decision.
팀이 명시적으로 방향을 바꾸지 않는 한, 하위 디렉터리에 추가 `AGENTS.md` 파일을 만들거나 유지하지 않습니다.

## Scope

- Applies to the entire repository rooted at `C:\Users\Rich\FConline`.
- 저장소 루트 `C:\Users\Rich\FConline` 이하 전체에 적용합니다.
- When working inside `apps/fconline`, still use this file as the source of truth for repo and app rules.
- `apps/fconline`에서 작업하더라도 이 파일을 저장소와 앱 규칙의 단일 기준 문서로 사용합니다.

## Repo Overview

- Workspace manager: npm workspaces
- 워크스페이스 관리는 npm workspaces를 사용합니다.
- Task runner: Turbo (`turbo`)
- 작업 실행기는 Turbo(`turbo`)입니다.
- Main app: `apps/fconline`
- 주요 제품 앱은 `apps/fconline`입니다.
- Shared packages: `packages/core`, `packages/supabase`
- 공용 패키지는 `packages/core`, `packages/supabase`입니다.

## Human Vs Agent Docs

- `README.md` is for people: repo overview, structure, setup, and common commands.
- `README.md`는 사람용 문서이며 저장소 개요, 구조, 실행 방법, 공통 명령을 설명합니다.
- `AGENTS.md` is for agents: execution rules, safety constraints, release workflow, and verification expectations.
- `AGENTS.md`는 에이전트용 문서이며 실행 규칙, 안전 제약, 릴리스 흐름, 검증 기준을 설명합니다.
- If a rule appears in both places, keep the operational version here and simplify the human explanation in `README.md`.
- 같은 규칙이 두 문서에 모두 언급될 경우, 실제 운영 규칙은 여기 두고 `README.md`에는 사람 친화적인 요약만 남깁니다.

## High-Priority Framework Rule

- The app uses a modern Next.js version with behavior that may differ from older defaults.
- 이 앱은 최신 계열 Next.js를 사용하므로 과거 기본 동작과 다를 수 있습니다.
- Before changing unfamiliar Next.js APIs, conventions, or file structure, read the relevant guide in `node_modules/next/dist/docs/`.
- 익숙하지 않은 Next.js API, 규칙, 파일 구조를 수정하기 전에는 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인합니다.
- Pay attention to deprecations before introducing framework changes.
- 프레임워크 관련 변경을 넣기 전에 deprecation 경고를 확인합니다.

## Working Targets

- Primary product work happens in `apps/fconline`.
- 주요 제품 개발 작업은 `apps/fconline`에서 이뤄집니다.
- `apps/fconline/package.json` is the version source for the shipped web app.
- 배포되는 웹앱의 버전 기준은 `apps/fconline/package.json`입니다.
- `apps/fconline/src/lib/appVersion.ts` stores release notes that are surfaced in the app.
- 앱에 노출되는 릴리스 노트는 `apps/fconline/src/lib/appVersion.ts`에서 관리합니다.

## Commands

From repo root:
저장소 루트에서 실행:

```bash
npm install
npm run dev --workspace apps/fconline
npm run build --workspace apps/fconline
npm run lint --workspace apps/fconline
```

From `apps/fconline`:
`apps/fconline` 폴더에서 실행:

```bash
npm run dev
npm run build
npm run lint
```

## Dev Server Rules

- Start the app with PowerShell, not Cygwin bash, because the Windows setup is more reliable for the local Node.js dev server.
- Windows 환경에서는 로컬 Node.js 개발 서버 실행 안정성을 위해 Cygwin bash보다 PowerShell로 앱을 시작합니다.
- Preferred command from the repo root: `npm run dev --workspace apps/fconline`
- 저장소 루트 기준 권장 명령은 `npm run dev --workspace apps/fconline`입니다.
- If PowerShell execution policy blocks `npm`, use `npm.cmd run dev --workspace apps/fconline` instead of assuming the app is broken.
- PowerShell 실행 정책 때문에 `npm`이 막히면 앱 문제로 단정하지 말고 `npm.cmd run dev --workspace apps/fconline`을 사용합니다.
- The default local dev address for `apps/fconline` is `http://localhost:4000`.
- `apps/fconline`의 기본 로컬 개발 주소는 `http://localhost:4000`입니다.
- Before blaming the app, check whether port `4000` is already in use by an existing `node` process and stop the stale process if needed.
- 앱 문제로 단정하기 전에 `4000` 포트를 기존 `node` 프로세스가 점유 중인지 확인하고 필요하면 남아 있는 프로세스를 정리합니다.
- The agent should try to start the dev server directly first before assuming a local environment issue.
- 에이전트는 로컬 환경 문제라고 가정하기 전에 먼저 개발 서버를 직접 실행해 봅니다.
- If the agent cannot start the dev server, it should tell the user that the attempt failed and provide a direct local shell command for `cmd` or PowerShell.
- 에이전트가 개발 서버를 시작하지 못하면, 실행 시도가 실패했다는 점을 알리고 사용자가 직접 실행할 수 있도록 `cmd` 또는 PowerShell용 명령을 바로 안내합니다.
- Recommended fallback for `cmd`: `cd /d C:\Users\Rich\FConline && npm run dev --workspace apps/fconline`
- `cmd` 기준 권장 대체 명령: `cd /d C:\Users\Rich\FConline && npm run dev --workspace apps/fconline`
- Recommended fallback for PowerShell: `Set-Location 'C:\Users\Rich\FConline'; npm run dev --workspace apps/fconline`
- PowerShell 기준 권장 대체 명령: `Set-Location 'C:\Users\Rich\FConline'; npm run dev --workspace apps/fconline`
- Before starting the dev server, make sure NEXON Launcher and AnySign4PC-related processes are not running.
- 개발 서버를 시작하기 전에 NEXON Launcher와 AnySign4PC 관련 프로세스가 실행 중이 아닌지 확인합니다.
- Do not rely only on Windows Startup Apps: NEXON-related interference may come from Windows services or background processes even when no startup entry is visible.
- Windows 시작 프로그램 목록만으로 판단하지 않습니다. 시작 항목이 보여도 보이지 않아도 NEXON 관련 서비스나 백그라운드 프로세스가 개발 서버에 간섭할 수 있습니다.
- If the user reports Themida or WinLicense errors, debugger detection warnings, missing `SHLWAPI.dll`, or freezes when starting the dev server, suspect NEXON Launcher auto-start and advise disabling it from Windows startup apps.
- 개발 서버 시작 시 Themida/WinLicense 오류, 디버거 감지 경고, `SHLWAPI.dll` 관련 오류, 프리징이 발생하면 NEXON Launcher 자동 시작을 의심하고 Windows 시작 프로그램에서 비활성화하도록 안내합니다.

## Editing Rules

- Preserve the existing UI and information architecture unless the user asks for a redesign.
- 사용자가 재디자인을 요청하지 않는 한 기존 UI와 정보 구조를 유지합니다.
- Prefer small targeted edits over broad refactors.
- 넓은 리팩터링보다 작고 목적이 분명한 수정이 우선입니다.
- Do not remove or rewrite release-note history unless the user explicitly asks for it.
- 사용자가 명시적으로 요청하지 않는 한 릴리스 노트 이력을 삭제하거나 다시 쓰지 않습니다.
- Keep documentation changes separate from runtime behavior changes unless the task clearly requires both.
- 작업 요구사항이 명확히 둘 다 필요로 하지 않는 한, 문서 변경과 런타임 동작 변경은 분리합니다.

## Release Rules

- Follow the project versioning convention: after `13.9`, the next release is `14.0` rather than `13.10`.
- 이 프로젝트 버전 관례에서는 `13.9` 다음 릴리스를 `13.10`이 아니라 `14.0`으로 올립니다.

- Before production deployment, bump the version in `apps/fconline/package.json`.
- 운영 배포 전에는 `apps/fconline/package.json`의 버전을 먼저 올립니다.
- Add a matching release-note entry in `apps/fconline/src/lib/appVersion.ts`.
- 같은 버전에 맞는 릴리스 노트를 `apps/fconline/src/lib/appVersion.ts`에 추가합니다.
- Treat version bump and production deployment as one paired workflow.
- 버전 업데이트와 운영 배포는 하나의 연속된 흐름으로 취급합니다.
- After a production deploy, make sure the live app points at the latest deployment as part of the same release flow.
- 운영 배포 후에는 같은 릴리스 흐름 안에서 라이브 앱이 최신 배포를 가리키는지 확인합니다.
- If the user says `최종배포`, interpret it as a request to handle the full release flow end-to-end.
- 사용자가 `최종배포`라고 말하면 전체 릴리스 흐름을 처음부터 끝까지 처리해 달라는 요청으로 해석합니다.
- The full release flow includes version update, release-note update, validation, commit, push, production deployment, and live verification guidance.
- 전체 릴리스 흐름에는 버전 업데이트, 릴리스 노트 정리, 검증, 커밋, 푸시, 운영 배포, 라이브 확인 안내가 포함됩니다.
- Before executing the release flow, briefly show the planned steps for the current change and ask `최종배포 진행할까요?`
- 실제 릴리스 흐름을 실행하기 전에는 현재 변경 기준의 진행 단계를 짧게 보여주고 `최종배포 진행할까요?`라고 확인합니다.
- After the user confirms, proceed through the full release flow without asking the user to restate each step.
- 사용자가 확인하면 각 단계를 다시 하나씩 되묻지 말고 전체 릴리스 흐름을 이어서 진행합니다.

## Verification Expectations

- Run `npm run build --workspace apps/fconline` after changes that affect routing, config, or shared layout.
- 라우팅, 설정, 공용 레이아웃에 영향을 주는 변경 후에는 `npm run build --workspace apps/fconline`을 실행합니다.
- Run `npm run lint --workspace apps/fconline` after non-trivial code edits when practical.
- 의미 있는 코드 변경이 있었다면 가능할 때 `npm run lint --workspace apps/fconline`을 실행합니다.
- If a version is changed, verify that the app surfaces the updated version text where expected.
- 버전을 변경했다면 앱에서 버전 텍스트가 예상 위치에 반영되는지 확인합니다.
- If only documentation files changed, do not run unnecessary app commands.
- 문서만 바뀐 경우에는 불필요한 앱 명령을 실행하지 않습니다.

## Documentation Maintenance

- Keep agent instructions in this file only.
- 에이전트 작업 규칙은 이 파일에만 유지합니다.
- Update `README.md` when the human onboarding story changes.
- 사람용 온보딩 흐름이 바뀌면 `README.md`를 업데이트합니다.
- Update this file when workflow rules, release steps, or automation guardrails change.
- 작업 흐름, 릴리스 절차, 자동화 가드레일이 바뀌면 이 파일을 업데이트합니다.
- Keep this document in paired English and Korean lines when editing or extending it.
- 이 문서를 수정하거나 확장할 때는 영어와 한국어를 짝지은 형식을 유지합니다.
