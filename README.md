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

## 버전과 릴리스

- 실제 서비스 버전은 `apps/fconline/package.json`에서 관리합니다.
- 릴리스 노트는 `apps/fconline/src/lib/appVersion.ts`에서 관리합니다.
- 운영 배포 전에는 버전과 릴리스 노트 항목을 함께 맞춰두는 것을 권장합니다.

## 문서 운영 원칙

- 에이전트에게 코드 수정, 배포, 개발 서버 실행을 요청할 때는 먼저 `AGENTS.md`를 기준으로 봅니다.
- 사람을 위한 프로젝트 안내는 `README.md`에 유지합니다.
- 에이전트 작업 규칙은 `AGENTS.md`에만 두어 자동화 규칙의 기준 문서를 하나로 유지합니다.

## 배포 요청 방식

- 로컬 확인이 끝난 뒤 에이전트에게 `최종배포`라고 요청하면, 버전 정리, 릴리스 노트 정리, 검증, 커밋, 푸시, 운영 배포, 라이브 확인 안내까지 한 흐름으로 진행할 수 있습니다.
- 실제 실행 전에는 에이전트가 현재 변경 기준의 진행 단계를 짧게 보여주고 `최종배포 진행할까요?`라고 한 번 확인합니다.
