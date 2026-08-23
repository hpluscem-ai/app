# 확정 인증 UI 공용 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인에 먼저 적용한 확정 HAYAN100 UI 규칙을 회원가입, 이메일 찾기, 비밀번호 찾기, 비밀번호 재설정, 마이페이지와 실제 공용 컴포넌트 사용처에 일관되게 적용한다.

**Architecture:** `FormTextField`, `PrimaryButton`, `AppBar`, `AppScreen`을 확정 디자인의 기본 공용 경계로 승격한다. 화면별 React Hook Form 상태, 검증, 이동과 서버 대기 콜백은 각 라우트에 유지하고, 반복되는 연락처 인증 UI만 `PhoneVerificationSection`이 담당한다. Figma에서 화면마다 다른 브랜드·푸터·상단 로고 노출은 `AppScreen`의 작은 옵션으로 표현한다.

**Tech Stack:** Expo SDK 57.0.13, React Native 0.86.2, React 19.2.3, TypeScript 6, Expo Router 57, React Hook Form 7.83, React Native Paper 5.15, `StyleSheet`

**Spec:** [Figma 확정 디자인 파일](https://www.figma.com/design/w9EEtYG5p4KoaVNlApRG0l/%EC%97%90%EC%9D%B4%EC%B9%98%ED%94%8C%EB%9F%AC%EC%8A%A4%EC%97%90%EC%BD%94_design?node-id=154-634&m=dev), 회원가입 `154:1245`, 이메일 찾기 입력·결과 `154:4291`·`154:5550`, 비밀번호 찾기 입력·결과 `154:6178`·`154:6754`, 비밀번호 재설정 입력·완료 팝업 `154:7994`·`154:9200`, 마이페이지 `154:11042`. 로그인 기준과 자산 준비는 `docs/superpowers/plans/2026-08-23-final-login-design-refresh.md`를 이어서 사용한다.

## 적용 원칙

- 앱바 제목은 모든 Stack 화면에서 SUIT SemiBold 16/24를 사용한다.
- 입력과 주요 버튼은 52pt 높이, 26pt 반지름, SUIT 14/20을 공용 기본값으로 사용한다.
- 입력 배경은 `gray100`, 힌트는 `gray400`, 주요 버튼은 `brand500`을 사용한다.
- 찾기·재설정 화면은 216 × 32 HAYAN100 브랜드와 104pt 본문 상단 여백을 사용하고 푸터를 표시하지 않는다.
- 회원가입은 브랜드와 푸터 없이 32pt 본문 여백을 사용한다.
- 마이페이지를 포함한 로그인 이후 화면의 로고 앱바는 HAYAN100 135 × 20을 사용한다.
- 로그인, 마이페이지와 기존 메인 화면의 푸터 정책은 유지하되 Figma에 없는 회원가입·찾기·재설정 푸터는 숨긴다.
- 서버 응답 없이 성공 상태, 사용자 정보, 인증 증명, 타이머나 세션을 만들지 않는다.
- 결과 화면과 완료 팝업은 UI를 구현하되 실제 서버 성공 결과를 화면 상태로 전달받았을 때만 표시한다. 현재 서버 대기 어댑터는 성공 데이터나 완료 여부를 만들지 않는다.
- 비밀번호는 Figma 예시의 6자리 문구 대신 승인된 영문·숫자·특수문자 포함 8자 이상 정책을 유지한다.
- 연락처 인증은 발송 성공 뒤에만 6자리 입력을 자동 확인한다. 이는 Figma의 별도 확인 버튼 없는 UI와 서버의 별도 확인 요청·`verificationProof` 정책을 함께 만족시키기 위한 네이티브 상호작용이다.
- 상태 표시줄, 홈 인디케이터와 Figma 캔버스 테두리는 운영체제에 맡긴다.

---

### Task 1: 확정 스타일을 공용 기본값으로 승격

**Files:**
- Modify: `constants/theme.ts`
- Modify: `components/auth/FormTextField.tsx`
- Modify: `components/auth/PrimaryButton.tsx`
- Modify: `app/_layout.tsx`

- [x] **Step 1: 필요한 확정 토큰을 보완한다**

`gray600`, SUIT Medium 12/16 등 Figma에서 반복되는 값만 `constants/theme.ts`에 추가한다.

- [x] **Step 2: 공용 입력의 기본 모양을 확정안으로 바꾼다**

`FormTextField`의 별도 로그인 변형을 제거하고 라벨, 캡슐 배경, 힌트 색상, 오류 표시를 기본 동작으로 만든다.

- [x] **Step 3: 공용 주요 버튼의 기본 모양을 확정안으로 바꾼다**

`PrimaryButton`의 별도 로그인 변형을 제거하고 브랜드 캡슐 버튼을 모든 사용처의 기본값으로 만든다.

- [x] **Step 4: Stack 제목 타이포그래피를 전역 적용한다**

`app/_layout.tsx`의 `screenOptions`에 `typography.screenTitle`을 지정하고 로그인 전용 중복 옵션을 제거한다.

Expected: 로그인뿐 아니라 공용 입력·버튼·앱바를 사용하는 화면이 별도 variant 없이 확정 토큰을 사용한다.

---

### Task 2: 화면 틀과 휴대폰 인증 UI를 확정 구조로 변경

**Files:**
- Modify: `components/AppScreen.tsx`
- Modify: `components/auth/PhoneVerificationSection.tsx`
- Modify: `components/icons/CheckSquareIcon.tsx`

- [x] **Step 1: HAYAN100 브랜드와 화면별 푸터 정책을 지원한다**

`AppScreen` 인증 브랜드를 저장소의 HAYAN100 자산으로 교체하고 `showFooter` 옵션을 추가한다. 로그인 이후 로고 앱바도 동일 자산의 135 × 20 표현으로 바꾼다.

- [x] **Step 2: 휴대폰 인증을 최종 Figma 구조로 바꾼다**

연락처 라벨, 입력과 4pt 간격의 발송/재발송 버튼, 전체 너비 인증번호 입력을 렌더링한다. 발송 성공 전에는 확인을 시도하지 않고, 성공 뒤 6자리가 입력되면 별도 확인 콜백을 호출해 서버 증명만 저장한다.

- [x] **Step 3: 체크박스를 확정 상태 표현으로 바꾼다**

20 × 20, 반지름 8, 선택 시 브랜드/비선택 시 gray400 배경과 흰 체크를 사용한다.

Expected: 공용 컴포넌트는 화면별 최종 요청이나 세션을 소유하지 않는다.

---

### Task 3: 인증 라우트 전체 적용

**Files:**
- Modify: `app/login.tsx`
- Modify: `app/sign-up.tsx`
- Modify: `app/find-email.tsx`
- Modify: `app/find-password.tsx`
- Modify: `app/reset-password.tsx`

- [x] **Step 1: 로그인을 새 공용 인증 브랜드 경계로 단순화한다**

로그인 전용 브랜드 중복을 제거하고 `AppScreen variant="auth"`와 공용 입력·버튼을 사용한다. 기존 링크 라우팅과 검증은 유지한다.

- [x] **Step 2: 회원가입을 확정 긴 폼으로 구성한다**

각 입력의 라벨과 16pt 간격, 캡슐형 소속 선택, 연락처 인증, 24pt 반지름 약관 카드, 전체 동의와 개별 동의, `보기` 문구, 제출 버튼을 Figma 순서로 배치한다. 서버 소속 값이나 동의 결과를 만들어내지 않는다.

- [x] **Step 3: 이메일·비밀번호 찾기를 확정 인증 템플릿으로 구성한다**

104pt 인증 브랜드 여백, 필드 간격과 캡슐 버튼을 적용하고 푸터를 숨긴다. 비밀번호 찾기의 이메일 선행 조건과 인증 범위 폐기 로직은 유지한다.

- [x] **Step 4: 비밀번호 재설정을 확정 템플릿으로 구성한다**

화면·브랜드 제목을 `비밀번호 재설정`으로 일치시키고 두 비밀번호 라벨과 승인된 8자 이상 문구를 사용한다. 유효한 서버 Token 전 접근 제한 백로그는 유지한다.

Expected: 성공 화면은 추가하지 않고 모든 제출은 기존 서버 연동 대기 경계를 사용한다.

---

### Task 4: 마이페이지 확정 폼 적용

**Files:**
- Modify: `app/mypage.tsx`
- Modify: `utils/alerts.ts`

- [x] **Step 1: 샘플 사용자 상태를 제거한다**

이메일, 이름, 연락처와 마케팅 동의를 가짜 사용자 값으로 초기화하지 않는다. 서버 연결 전에는 빈/대기 표현만 사용한다.

- [x] **Step 2: 이메일·재설정·이름·연락처·마케팅 UI를 Figma 순서로 배치한다**

읽기 전용 이메일 캡슐, 테두리형 비밀번호 재설정 버튼, 라벨형 이름 입력, 공용 휴대폰 인증, 마케팅 카드와 주요 버튼을 적용한다. Figma에 없는 하단 dock은 이 화면에서 숨기고 공용 푸터는 유지한다.

- [x] **Step 3: 인증 증명 없이 정보 변경을 차단한다**

새 연락처가 입력된 레이아웃에서 서버 발급 `verificationProof`가 없으면 최종 저장 요청을 진행하지 않는다.
기존 마이페이지 전용 연락처 변경 대기 안내는 공용 카카오톡 인증 대기 경계로 대체되므로 사용하지 않는 안내 함수를 제거한다.

Expected: 마이페이지의 폼 상태는 라우트에 남고 공용 휴대폰 컴포넌트에는 콜백만 전달한다.

---

### Task 5: 개발 기록과 검증

**Files:**
- Modify: `docs/development-notes.md`

- [x] **Step 1: 교차 화면 판단을 한국어로 기록한다**

공용 기본값 승격, 화면별 브랜드·푸터 차이, 확인 버튼 없는 인증 상호작용, 샘플 사용자 제거와 서버 경계를 기록한다.

- [x] **Step 2: 정적 검증을 실행한다**

Run:

```bash
pnpm typecheck
git diff --check
```

Expected: 두 명령 모두 exit code 0.

- [x] **Step 3: Expo 설정과 양 플랫폼 번들을 검증한다**

Run:

```bash
pnpm exec expo config --type public
pnpm exec expo export --platform ios --output-dir /private/tmp/hpluseco-auth-ios
pnpm exec expo export --platform android --output-dir /private/tmp/hpluseco-auth-android
```

Expected: 공개 설정 생성과 iOS·Android 번들이 오류 없이 완료된다.

- [x] **Step 4: 대표 화면을 Figma와 시각 비교한다**

iOS 시뮬레이터에서 로그인, 회원가입, 이메일 찾기, 비밀번호 찾기, 비밀번호 재설정, 마이페이지의 앱바·로고·라벨·입력·버튼·푸터 배치를 확인한다. Android 실기기가 없으면 번들 결과까지만 사실대로 기록한다.

- [x] **Step 5: 최종 diff를 범위 기준으로 검토한다**

Run:

```bash
git status --short
git diff --stat
git diff -- app components constants docs/development-notes.md
```

Expected: 사용자 변경을 되돌리지 않았고 서버 계약·새 상태 관리·불필요한 의존성이 추가되지 않았다.

---

### Task 6: 계정 복구 성공 결과 UI 구현

**Files:**
- Modify: `constants/theme.ts`
- Modify: `app/find-email.tsx`
- Modify: `app/find-password.tsx`
- Modify: `app/reset-password.tsx`
- Modify: `docs/development-notes.md`

**Interfaces:**
- Consumes: 서버 연결 전 안내 함수와 각 라우트의 기존 React Hook Form 검증·`verificationProof` 선행 조건
- Produces: 이메일 조회 성공 화면 모델 `{ phoneLastFour: string; maskedEmail: string }`, 재설정 링크 발송 성공 여부와 입력 이메일, 비밀번호 변경 성공 여부를 소비하는 화면 상태

- [x] **Step 1: 결과용 공용 타이포그래피를 추가한다**

두 결과 화면의 캡슐 값에 필요한 SUIT SemiBold 20/30 토큰을 `constants/theme.ts`에 추가한다. 색상과 나머지 본문·버튼 토큰은 기존 값을 재사용한다.

- [x] **Step 2: 이메일 찾기 결과 화면을 구현한다**

실제 조회 성공 결과가 있을 때만 입력 폼 대신 휴대폰 끝자리 안내, 서버가 제공한 마스킹 이메일 캡슐, `비밀번호 찾기` 테두리 버튼과 `로그인` 주요 버튼을 표시한다. 서버 대기 함수는 결과를 반환하지 않으므로 현재 런타임에서 성공을 가장하지 않는다.

- [x] **Step 3: 비밀번호 찾기 결과 화면을 구현한다**

재설정 링크 발송 성공 뒤에만 입력 폼 대신 발송 안내, 제출한 이메일을 담은 전체 너비 캡슐과 `로그인` 버튼을 표시한다. 성공 여부는 화면 가까이의 최소 콜백 경계로 받고 API 응답 형식은 정하지 않는다.

- [x] **Step 4: 비밀번호 변경 완료 팝업을 구현한다**

실제 변경 성공 뒤에만 React Native `Modal`로 350pt 이하 카드, 32pt 반지름, 20pt 패딩, 두 줄 안내와 우측 69 × 48 로그인 버튼을 표시한다. 비밀번호 입력·검증·안내 문구는 영문·숫자·특수문자 포함 8자 이상 정책을 유지한다.

- [x] **Step 5: 서버 경계와 구현 기록을 갱신한다**

기존 개발 미리보기 제거 기록이 새 구현과 모순되지 않도록, 하드코딩 결과 없이 성공 UI만 준비됐고 실제 노출에는 인증·조회·발송·변경 API 성공이 필요하다고 `docs/development-notes.md`에 기록한다.

- [x] **Step 6: 정적·시각 검증을 실행한다**

Run:

```bash
pnpm typecheck
git diff --check
```

입력 화면은 iOS 시뮬레이터에서 회귀를 확인하고, 성공 결과는 서버 성공 응답이 없어 런타임에서 임의로 열지 않는다. 결과 컴포넌트의 수치·문구·이동 조건은 Figma `154:5550`, `154:6754`, `154:9200` 컨텍스트와 코드로 대조한다.
