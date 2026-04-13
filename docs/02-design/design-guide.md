# FConline Manual — 디자인 가이드
> 기준 버전: v15.3 | 소스: `src/app/globals.css`

---

## 1. 디자인 원칙

| 원칙 | 설명 |
|------|------|
| **모바일 퍼스트** | PWA 기반, 한 손 조작을 고려한 하단 네비 구조 |
| **정보 밀도** | 게임 중 빠른 참조 → 작은 화면에 핵심 정보 집중 |
| **라이트/다크 동등** | 두 모드 모두 완성도 있게 유지 (전환 180ms) |
| **일관된 토큰** | `--app-*` CSS 변수 체계로 컴포넌트 전체 통일 |

---

## 2. 색상 시스템

### 2.1 배경 레이어 (라이트 / 다크)

| 토큰 | 라이트 | 다크 | 용도 |
|------|--------|------|------|
| `--app-body-bg` | #f0f3f5 | #121318 | 전체 앱 배경 |
| `--app-card-bg` | #ffffff | #1a1b21 | 카드 배경 |
| `--app-card-border` | #f0f3f5 | #24252d | 카드 테두리 |
| `--app-surface-soft` | #f3f6f8 | #202229 | 보조 서페이스 |
| `--app-surface-strong` | #eef2f6 | #23262d | 강조 서페이스 |
| `--app-modal-bg` | #ffffff | #1a1b21 | 모달 배경 |

### 2.2 텍스트 계층

| 토큰 | 라이트 | 다크 | 용도 |
|------|--------|------|------|
| `--app-title` | #1e2124 | #f3f4f6 | 제목, 강조 텍스트 |
| `--app-body-text` | #5f6b76 | #b2b5be | 본문 텍스트 |
| `--app-muted-text` | #96a0aa | #8d919c | 보조/힌트 텍스트 |
| `--app-footer-text` | #b5bec8 | #6f7380 | 푸터 텍스트 |

### 2.3 액센트 컬러

| 토큰 | 라이트 | 다크 | 용도 |
|------|--------|------|------|
| `--app-accent-blue` | #256ef4 | #6ea2ff | 주요 액션, 링크 |
| `--app-accent-red` | #d14343 | #ff8e97 | 경고, FW 포지션 |
| `--app-accent-green` | #2f8f57 | #7dd8a0 | 성공, MF 포지션 |
| `--app-volta-accent-fg` | #7a4ce3 | #bda2ff | 볼타 전용 퍼플 |

### 2.4 포지션 컬러

| 포지션 | 배경 (라이트) | 텍스트 (라이트) | 배경 (다크) | 텍스트 (다크) |
|--------|------------|--------------|-----------|-------------|
| **FW** | #fdecec | #d14343 | #26191d | #ff9aa3 |
| **MF** | #eaf6ee | #2f8f57 | #18241d | #86dba6 |
| **DF** | #e8f1ff | #457ae5 | #172132 | #93bcff |

### 2.5 경기 결과 컬러

| 결과 | 소프트 배경 (라이트) | 배지 배경 (라이트) |
|------|-----------------|----------------|
| **승 (WIN)** | #f4f8ff | #dfeeff |
| **패 (LOSS)** | #fff5f5 | #ffe6e9 |
| **무 (DRAW)** | #eef2f5 | #dde4ea |

### 2.6 배지/액션 컬러

| 토큰 | 라이트 | 다크 | 용도 |
|------|--------|------|------|
| `--app-badge-bg` | #f3f6f8 | #262833 | 일반 배지 배경 |
| `--app-action-badge-bg` | #e8f1ff | #163768 | 액션 배지 배경 |
| `--app-action-badge-fg` | #457ae5 | #5e9cff | 액션 배지 텍스트 |

---

## 3. 타이포그래피

### 폰트 패밀리

```css
--font-sans: 'Pretendard', -apple-system, sans-serif
--font-mono: Geist Mono
```

> **Pretendard** 사용. 한국어 최적화 폰트, 가독성 우선.

### 사용 패턴

| 역할 | 클래스/스타일 | 예시 |
|------|------------|------|
| 페이지 제목 | `app-theme-title` + `text-lg font-semibold` | 선수 이름 |
| 본문 | `app-theme-body` + `text-sm` | 능력치 수치 |
| 보조 | `app-theme-muted` + `text-xs` | 포지션, 태그 |
| 배지 | `text-[11px] font-medium` | 시즌 배지 |

---

## 4. 간격 & 라운딩

### Border Radius

| 토큰 | 계산값 | 용도 |
|------|--------|------|
| `--radius` (base) | `1rem` (16px) | 기준값 |
| `--radius-sm` | `≈ 9.6px` | 소형 배지 |
| `--radius-md` | `≈ 12.8px` | 인풋, 칩 |
| `--radius-lg` | `16px` | 기본 카드 |
| `--radius-xl` | `≈ 22.4px` | 강조 카드 |
| `--radius-2xl` | `≈ 28.8px` | 바텀시트 상단 |
| `--radius-3xl` | `≈ 35.2px` | 모달 |
| `--radius-4xl` | `≈ 41.6px` | 최대 라운딩 |

### 간격 패턴

| 용도 | 값 |
|------|-----|
| 카드 내부 패딩 | `p-4` (16px) |
| 섹션 간격 | `space-y-3` ~ `space-y-4` |
| 페이지 상단 여백 | `pt-5` |
| 인라인 요소 간격 | `gap-2` ~ `gap-3` |

---

## 5. 컴포넌트 패턴

### 5.1 카드

```html
<!-- 기본 카드 -->
<div class="app-theme-card rounded-xl border p-4">
  ...
</div>

<!-- 선수 카드 -->
<div class="app-player-card rounded-xl p-3">
  ...
</div>
```

### 5.2 배지

```html
<!-- 일반 배지 -->
<span class="app-theme-badge rounded-full px-2 py-0.5 text-xs">
  텍스트
</span>

<!-- 포지션 배지 (FW) -->
<span class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
  style="background: var(--app-position-fw-bg); color: var(--app-position-fw-fg)">
  FW
</span>
```

### 5.3 인풋

```html
<input class="app-theme-input rounded-xl border px-3 py-2 text-sm
  placeholder:text-[--app-input-placeholder]" />
```

### 5.4 스켈레톤

```css
.home-image-shimmer {
  background: linear-gradient(90deg,
    var(--app-skeleton-start) 0%,
    var(--app-skeleton-mid) 48%,
    var(--app-skeleton-end) 100%);
  background-size: 200% 100%;
  animation: home-image-shimmer 1.2s linear infinite;
}
```

### 5.5 하단 네비게이션

| 토큰 | 설명 |
|------|------|
| `--app-nav-bg` | 네비 배경 (라이트: #ffffff, 다크: #17181e) |
| `--app-nav-border` | 네비 상단 테두리 |
| `--app-nav-active` | 활성 탭 아이콘/텍스트 |
| `--app-nav-icon` | 비활성 아이콘 |
| `--app-nav-label` | 비활성 레이블 |

---

## 6. 다크모드 적용 방법

### 클래스 기반 토글

```html
<html class="app-dark-mode">
```

### 컴포넌트에서 사용

```tsx
// CSS 변수 방식 (권장)
<div style={{ color: 'var(--app-title)' }} />

// Tailwind 유틸리티 클래스 방식
<div className="app-theme-title" />
```

### 테마 전환 트랜지션

```css
transition: background-color var(--app-theme-transition),  /* 180ms ease */
            color var(--app-theme-transition),
            border-color var(--app-theme-transition);
```

---

## 7. 애니메이션

| 클래스 | 동작 | 시간 |
|-------|------|------|
| `.weather-svg-spin` | 360° 회전 | 10s linear |
| `.weather-svg-pulse` | scale 1→1.08 | 2.8s ease-in-out |
| `.weather-svg-float` | Y축 float | 2.8s ease-in-out |
| `.home-image-shimmer` | 스켈레톤 shimmer | 1.2s linear |

---

## 8. 아이콘

- **@phosphor-icons/react** — 주 아이콘 라이브러리
- **lucide-react** — 보조 아이콘
- **@bybas/weather-icons** — 홈 날씨 아이콘

---

## 9. 유틸리티 클래스 레퍼런스

| 클래스 | 적용 토큰 | 설명 |
|-------|---------|------|
| `.app-theme-page` | `--app-page-bg` | 페이지 배경 |
| `.app-theme-card` | `--app-card-bg`, `--app-card-border` | 카드 |
| `.app-theme-title` | `--app-title` | 제목 색상 |
| `.app-theme-body` | `--app-body-text` | 본문 색상 |
| `.app-theme-muted` | `--app-muted-text` | 보조 색상 |
| `.app-theme-badge` | `--app-badge-bg`, `--app-badge-fg` | 배지 |
| `.app-theme-soft` | `--app-surface-soft` | 소프트 서페이스 |
| `.app-theme-strong` | `--app-surface-strong` | 강조 서페이스 |
| `.app-theme-divider` | `--app-divider` | 구분선 |
| `.app-theme-input` | `--app-input-bg`, `--app-input-border` | 인풋 |
| `.app-theme-modal` | `--app-modal-bg` | 모달 |
| `.app-theme-nav` | `--app-nav-bg`, `--app-nav-border` | 네비 |
| `.app-player-card` | `--app-player-card-bg` | 선수 카드 |
| `.app-player-title` | `--app-player-title` | 선수 카드 제목 |
| `.app-player-body` | `--app-player-body` | 선수 카드 본문 |
| `.app-player-muted` | `--app-player-muted` | 선수 카드 보조 |
| `.home-scrollbar-hidden` | — | 스크롤바 숨김 |

---

## 10. 신규 컴포넌트 체크리스트

새 컴포넌트 작성 시 확인 사항:

- [ ] `--app-*` CSS 변수 사용 (하드코딩 금지)
- [ ] 라이트/다크 두 모드에서 시각 확인
- [ ] `app-theme-*` 유틸리티 클래스 우선 활용
- [ ] 트랜지션 포함 여부 확인 (`var(--app-theme-transition)`)
- [ ] border-radius는 `--radius-*` 변수 또는 Tailwind `rounded-*` 사용
- [ ] 폰트는 Pretendard 기본값 유지 (별도 지정 불필요)
