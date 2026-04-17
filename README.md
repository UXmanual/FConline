# FConline

FC Online 매뉴얼 웹앱과 공용 패키지를 함께 관리하는 모노레포입니다.

## 구성

- `apps/fconline`: 메인 Next.js 웹앱 (`fconlinemanual`)
- `packages/core`: 공용 코어 패키지
- `packages/supabase`: 공용 Supabase 패키지

## 문서 역할

- `README.md`는 사람용 문서입니다. 저장소 구조, 실행 방법, 공통 명령을 설명합니다.
- `AGENTS.md`는 에이전트용 문서입니다. 작업 규칙, 주의사항, 릴리스 흐름을 설명합니다.

## 개발 환경

- 현재 워크스페이스 락파일과 Next.js 도구 체인에 맞는 Node.js
- npm workspaces

## 자주 쓰는 명령

저장소 루트에서 실행:

```bash
npm install
npm run dev --workspace apps/fconline
npm run build --workspace apps/fconline
npm run lint --workspace apps/fconline
```

`apps/fconline` 폴더에서 직접 실행:

```bash
npm run dev
npm run build
npm run lint
```

## 개발 서버 문제 해결

- Windows에서는 PowerShell에서 `npm.cmd run dev --workspace apps/fconline` 실행을 권장합니다.
- 개발 서버 시작 전에 `NexonLauncher64`, `AnySign4PC`, `AnySign4PCLauncher`가 실행 중이면 앱이 멈추거나 프리징될 수 있습니다.
- 이제 `apps/fconline`의 `dev` 실행 전 프리체크가 자동으로 돌아가며, 충돌 프로세스나 `4000` 포트 점유를 발견하면 서버 시작을 막고 안내 메시지를 출력합니다.
- 프로세스가 자동으로 다시 뜨면 Windows 시작 프로그램이나 서비스에서 NEXON Launcher 자동 시작을 꺼두고 재부팅한 뒤 다시 시도합니다.

## 버전과 릴리스

- 실제 서비스 버전은 `apps/fconline/package.json`에서 관리합니다.
- 릴리스 노트는 `apps/fconline/src/lib/appVersion.ts`에서 관리합니다.
- 운영 배포 전에는 버전과 릴리스 노트 항목을 함께 맞춰두는 것을 권장합니다.

## Android TWA

- Android TWA 프로젝트는 `android/twa`에 있습니다.
- Play Console 업로드용 번들은 로컬에서 `android/twa/app-release-bundle.aab`로 생성합니다.
- TWA 작업 상세 문서는 `docs/twa-setup.md`를 기준으로 봅니다.

## 다른 PC에서 이어서 작업할 때

- 이 저장소를 받은 뒤 먼저 `npm install`을 실행합니다.
- JDK 17과 Android command-line tools를 설치합니다.
- `docs/twa-setup.md`의 경로를 기준으로 Bubblewrap 환경을 다시 맞춥니다.
- 가장 중요하게는 기존 배포에 사용한 키스토어를 새 PC로 안전하게 복사해야 합니다.
  - 키스토어가 바뀌면 같은 앱 패키지명으로 업데이트를 이어갈 수 없습니다.
- 현재 릴리스 키스토어 파일은 Git에 포함되지 않으며 별도로 안전하게 보관해야 합니다.
- 새 PC에서는 `android/twa/local.properties`를 로컬 환경에 맞게 다시 만들어야 합니다.
- 웹 운영 도메인과 `assetlinks.json` 값은 그대로 유지해야 TWA 검증이 이어집니다.

## 문서 운영 원칙

- 에이전트에게 코드 수정, 배포, 개발 서버 실행을 요청할 때는 먼저 `AGENTS.md`를 기준으로 봅니다.
- 사람을 위한 프로젝트 안내는 `README.md`에 유지합니다.
- 에이전트 작업 규칙은 `AGENTS.md`에만 두어 자동화 규칙의 기준 문서를 하나로 유지합니다.

## 배포 요청 방식

- 로컬 확인이 끝난 뒤 에이전트에게 `최종배포`라고 요청하면, 버전 정리, 릴리스 노트 정리, 검증, 커밋, 푸시, 운영 배포, 라이브 확인 안내까지 한 흐름으로 진행할 수 있습니다.
- 실제 실행 전에는 에이전트가 현재 변경 기준의 진행 단계를 짧게 보여주고 `최종배포 진행할까요?`라고 한 번 확인합니다.
