# Login Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Figma의 로그인 화면을 Expo SDK 57 기반 React Native 화면으로 구현하고, 서버 없이도 레이아웃·입력·클라이언트 검증을 확인할 수 있게 한다.

**Architecture:** Expo Router는 앱 진입점과 `/login` 경로에만 사용한다. 화면 전용 UI, 상태, 유효성 검증, 스타일은 `app/login.tsx` 한 파일에 함께 두며, 동일한 구현이 두 번째 화면에서 실제로 재사용될 때만 별도 컴포넌트 파일로 추출한다.

**Tech Stack:** Expo SDK 57.0.12, React Native 0.86.2, React 19.2.3, TypeScript 6, Expo Router 57, `StyleSheet`, `react-native-safe-area-context`

## Global Constraints

- 구현 전후에 Expo SDK 57 문서만 기준으로 확인한다: <https://docs.expo.dev/versions/v57.0.0/>.
- Figma 기준 노드는 로그인 섹션 `30:3036`, 실제 모바일 화면 `5:104`이다.
- WebView, HTML, DOM API, Tailwind, UI 키트는 사용하지 않는다.
- 서버 기술은 아직 결정하지 않으며 API 클라이언트, 인증 SDK, 토큰 저장소를 만들지 않는다.
- 새 런타임 의존성은 추가하지 않는다. 현재 설치된 Expo Router 의존성만 사용한다.
- 코드 리뷰를 위해 화면 로직은 한 파일에서 위에서 아래로 읽을 수 있게 유지한다.
- 사용자 작업으로 보이는 현재 미커밋 변경을 보존하고 `.claude/` 또는 `CLAUDE.md`를 복원하지 않는다.
- 구현하지 않은 서버 성공 응답, 토큰, 마일리지 이동을 가짜로 만들지 않는다.
- 자동화 테스트 기반을 새로 추가하지 않는다. 이 단계에서는 TypeScript 검사와 iOS·Android 수동 시나리오 검증을 사용한다.

---

## 1. 구현 범위

### 포함

- `/` 진입 시 `/login`으로 이동
- 안전 영역을 반영한 52px 헤더
- 이전 앱 화면이 있을 때만 나타나는 뒤로가기
- 로고와 로그인 제목
- 이메일·비밀번호 입력
- 이메일 및 비밀번호 클라이언트 유효성 검증
- 오류 테두리, 오류 문구, 최초 오류 입력으로 포커스 이동
- 52px 로그인 버튼
- 회원가입·이메일 찾기·비밀번호 찾기 링크 모양
- 작은 화면과 키보드가 열린 상태에서도 전체 콘텐츠 스크롤
- Figma 푸터 정보
- 구현 과정의 RN 학습 내용과 서버 요구사항 기록

### 이번 단계에서 제외

- 실제 로그인 요청
- Access/Refresh Token 발급·저장·갱신
- 로그인 성공 후 마일리지 화면 이동
- 회원가입, 이메일 찾기, 비밀번호 찾기 목적 화면
- 로그인 실패 계정 판별
- 법적 문서 링크 연결
- 다크 모드
- 웹 전용 레이아웃
- 별도 디자인 시스템 또는 공용 컴포넌트 디렉터리

## 2. Figma에서 확인한 화면 규격

| 영역 | 구현 기준 |
|---|---|
| 기준 프레임 | 390 × 1006 |
| 헤더 | 높이 52, 좌우 패딩 16, 24 × 24 아이콘 슬롯 |
| 헤더 제목 | `에이치플러스에코 로그인`, 14/20 |
| 본문 | 좌우 패딩 20, 위아래 패딩 104 |
| 본문 로고 | 152 × 40 |
| 로고 하단 제목 | 위 간격 8, 색상 `#040648`, 14/20 |
| 로고와 폼 | 간격 40 |
| 입력 | 높이 52, 좌우 패딩 16, 배경 `#F6F7FA` |
| 입력 간격 | 8 |
| 폼과 버튼 | 간격 16 |
| 로그인 버튼 | 높이 52, 배경 `#262C3A`, 글자 `#FFFFFF` |
| 버튼과 보조 링크 | 간격 8 |
| 푸터 | 배경 `#FCFCFD`, 상단선 `#E9ECF2`, 좌우 20, 위아래 52 |
| 기본 본문 색 | `#262C3A` |
| 오류 색 | Figma에 토큰이 없으므로 접근 가능한 진한 빨강 `#D92D20` 사용 |

Figma의 우측 화살표는 실제 캡처에서 보이지 않고 동작 설명도 없다. 중앙 제목 정렬을 위한 24px 빈 슬롯으로 구현하며 새로운 동작을 만들지 않는다.

## 3. 최소 파일 구조

구현 완료 후 코드 파일은 다음 네 개만 사용한다. 앱 바는 대부분의 화면에서 재사용된다는 요구가 확인되어 예외적으로 분리한다.

```text
app/
  _layout.tsx       # SafeAreaProvider, StatusBar, 공용 AppBar를 쓰는 Stack
  index.tsx         # /login Redirect만 담당
  login.tsx         # 로그인 UI, 상태, 검증, 로컬 컴포넌트, StyleSheet
components/
  AppBar.tsx        # 모든 Stack 화면의 52px 상단 앱 바
```

추가되는 비코드 파일은 다음과 같다.

```text
assets/
  hplus-eco-logo.png
docs/
  development-notes.md
```

기존 `App.tsx`와 `index.ts`는 Expo Router 진입점 전환 후 삭제한다.

### 파일별 책임

| 파일 | 책임 | 넣지 않을 것 |
|---|---|---|
| `app/_layout.tsx` | 전역 안전 영역, PaperProvider, 상태 표시줄, Stack과 화면별 앱 바 제목 | 인증 상태, 화면 본문 |
| `app/index.tsx` | `/login` 리다이렉트 | 조건 분기, 로딩, 비즈니스 로직 |
| `app/login.tsx` | 화면 전체 구현 | 서버 요청, 토큰 저장, 다른 화면 구현 |
| `components/AppBar.tsx` | 공통 제목·선택적 뒤로가기·52px 시각 규칙 | 화면별 제목 결정, 라우팅 정책 |
| `docs/development-notes.md` | RN 학습·AI 활용·서버 요구사항 증거 | 확정되지 않은 API 명세, 가짜 성과 수치 |

## 4. `login.tsx` 내부 컴포넌트 경계

별도 파일로 나누지 않고 아래 순서로 같은 파일에 둔다.

```text
색상·정규식·타입
→ LoginField
→ LoginForm
→ AppFooter
→ LoginRoute(default export)
→ StyleSheet
```

### `AppBar`

- `components/AppBar.tsx`에서 Paper의 `Appbar.Header`, `Appbar.Content`, `Appbar.Action`을 조합한다.
- Expo Router의 Stack `header` 슬롯에 한 번 연결하고, 각 화면은 `options.title`만 지정한다.
- Stack에 이전 화면이 있을 때만 Figma의 왼쪽 화살표와 뒤로가기 동작을 노출한다.
- 직접 `/login`으로 진입하거나 이전 경로가 없으면 좌우 48px 영역을 동일하게 유지해 제목 중앙 정렬을 보장한다.
- Paper의 기본 64px 대신 Figma의 52px 높이와 14/20 제목 스타일을 적용한다.
- 뒤로가기는 Paper의 기본 아이콘 대신 제공된 SVG를 `Appbar.Action`의 커스텀 아이콘으로 렌더링한다.

### `LoginField`

```ts
type LoginFieldProps = {
  value: string;
  placeholder: string;
  error?: string;
  inputRef: React.RefObject<TextInput | null>;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  returnKeyType: 'next' | 'done';
  onChangeText: (value: string) => void;
  onSubmitEditing: () => void;
};
```

- 두 입력의 공통 높이, 패딩, 오류 테두리, 오류 메시지만 담당한다.
- 상태와 검증 규칙은 가지지 않는다.
- `forwardRef`를 도입하지 않고 명시적인 `inputRef` prop을 사용해 초보 리뷰 시 흐름을 단순하게 유지한다.

### `LoginForm`

- 이메일·비밀번호·오류 상태와 두 입력 ref를 가진다.
- 검증 실패 시 첫 번째 오류 필드에 포커스한다.
- 이메일 키보드의 다음 버튼은 비밀번호로 이동한다.
- 비밀번호 완료 버튼은 로그인 검증을 실행한다.
- 서버가 없는 상태에서 입력값이 유효하면 다음 안내만 표시한다.

```ts
Alert.alert(
  '로그인 입력 확인 완료',
  '서버 연동 전이라 로그인 요청은 전송하지 않습니다.',
);
```

- 회원가입·이메일 찾기·비밀번호 찾기는 각각 `Pressable`로 렌더링하되, 목적 화면이 생기기 전까지 `disabled`와 `accessibilityState={{ disabled: true }}`를 적용한다. 존재하지 않는 경로로 이동시키거나 임시 화면을 만들지 않는다.

### `AppFooter`

- 현재 Figma의 고정 회사·고객센터·법률 문구를 표시한다.
- 같은 푸터를 사용하는 두 번째 화면을 구현할 때 `components/AppFooter.tsx`로 이동한다.
- 회사 정보가 운영 중 변경 가능하다는 요구가 확인될 때만 서버 또는 원격 설정 대상으로 전환한다.

### `LoginRoute`

다음 네이티브 레이아웃만 조합한다.

```tsx
<SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
  <KeyboardAvoidingView style={styles.keyboardArea} behavior={keyboardBehavior}>
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.mainContent}>
        <Image source={logoSource} style={styles.mainLogo} />
        <Text style={styles.loginTitle}>에이치플러스에코 로그인</Text>
        <LoginForm />
      </View>
      <AppFooter />
    </ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>
```

`KeyboardAvoidingView`의 `behavior`는 iOS에서 `padding`, Android에서 `height`를 사용한다. 고정 좌표로 화면 전체를 배치하지 않고, Figma의 고정 높이와 간격만 보존한다.

## 5. 파일 추출 기준

파일 수를 줄이기 위해 다음 조건 전에는 추출하지 않는다.

| 후보 | 추출 시점 |
|---|---|
| `AppFooter` | 두 번째 실제 화면에서 동일한 푸터를 사용 |
| `LoginField` | 회원가입 또는 계정 찾기 화면에서 동일한 오류·포커스 UI를 사용 |
| `theme.ts` | 두 화면 이상에서 같은 색상·간격 토큰이 반복 |
| `auth.service.ts` | 서버가 결정되고 로그인 계약이 확정 |
| `useLogin.ts` | 상태·네트워크·오류 매핑 때문에 화면 파일을 읽기 어려울 정도로 커짐 |

다음 파일은 만들지 않는다.

```text
components/index.ts
styles.ts
constants.ts
hooks/useLogin.ts
services/auth.ts
types/auth.ts
```

한 화면에서만 사용되는 코드를 기술 계층별 파일로 흩뜨리지 않는다.

---

### Task 1: Expo Router 진입점 완성

**Files:**
- Modify: `package.json`
- Preserve and include current Router setup: `app.json`
- Preserve and include current dependency lock: `pnpm-lock.yaml`
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `app/login.tsx`
- Create: `components/AppBar.tsx`
- Delete: `App.tsx`
- Delete: `index.ts`

**Interfaces:**
- Produces: `/`, `/login`, `RootLayout`, `AppBar`, `LoginRoute`
- Consumes: `expo-router`, `expo-status-bar`, `react-native-paper`, `react-native-safe-area-context`, `react-native-svg`

- [ ] **Step 1: 기존 미커밋 변경을 확인하고 Claude 관련 삭제를 보존한다**

Run:

```bash
git status --short
git diff -- package.json app.json pnpm-lock.yaml
```

Expected: Expo Router 패키지와 config plugin은 존재하지만 `package.json`의 `main`은 아직 `index.ts`이다.

- [ ] **Step 2: Expo Router를 실제 진입점으로 지정한다**

`package.json`에서 다음 값을 사용한다.

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  }
}
```

현재 추가된 Expo Router 관련 의존성과 `app.json`의 plugin 설정은 유지한다.

- [ ] **Step 3: 루트 레이아웃을 만든다**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          header: ({ back, navigation, options }) => (
            <AppBar
              onBack={back ? () => navigation.goBack() : undefined}
              title={options.title ?? ''}
            />
          ),
        }}
      />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: 루트 경로를 로그인으로 교체 이동한다**

`app/index.tsx`:

```tsx
import { Redirect } from 'expo-router';

export default function IndexRoute() {
  return <Redirect href="/login" />;
}
```

- [ ] **Step 5: 공용 앱 바와 `/login` 화면 셸을 만든다**

`components/AppBar.tsx`에 52px 앱 바를 만들고 Stack의 `header`에 연결한다. `app/login.tsx`에는 흰색 `SafeAreaView`만 둔다. 입력 폼이 생기기 전에는 효력이 없는 키보드·스크롤 래퍼를 추가하지 않는다.

- [ ] **Step 6: 더 이상 실행되지 않는 레거시 진입 파일을 삭제한다**

Delete: `App.tsx`, `index.ts`

- [ ] **Step 7: 설정과 타입을 검증한다**

Run:

```bash
pnpm typecheck
pnpm exec expo config --type public
```

Expected: 타입 오류가 없고 public config의 plugin 목록에 `expo-router`가 표시된다.

- [ ] **Step 8: 첫 번째 리뷰 체크포인트를 만든다**

Review scope:

```text
package.json
app/_layout.tsx
app/index.tsx
app/login.tsx의 화면 셸
components/AppBar.tsx
App.tsx/index.ts 삭제
```

Recommended commit after approval:

```bash
git add package.json app.json pnpm-lock.yaml app components/AppBar.tsx App.tsx index.ts
git commit -m "feat(app): configure expo router entry"
```

---

### Task 2: Figma 로그인 정적 레이아웃 구현

**Files:**
- Create: `assets/hplus-eco-logo.png`
- Modify: `app/login.tsx`

**Interfaces:**
- Consumes: Figma `5:104`, 로고 `5:14`
- Produces: `LoginField`, `LoginForm`, `AppFooter`, `LoginRoute`

- [ ] **Step 1: Figma 원본 에셋을 저장한다**

Figma에서 로고 노드 `5:14`를 PNG로 내보내 다음 경로에 저장한다.

```text
assets/hplus-eco-logo.png
```

임의로 다시 그리거나 7일 후 만료되는 Figma URL을 런타임 코드에 남기지 않는다.

- [ ] **Step 2: 화면 상수를 파일 상단에 정의한다**

```ts
const colors = {
  white: '#FFFFFF',
  gray50: '#FCFCFD',
  gray100: '#F6F7FA',
  gray200: '#E9ECF2',
  gray800: '#262C3A',
  brand: '#040648',
  error: '#D92D20',
} as const;

const logoSource = require('../assets/hplus-eco-logo.png');
```

이 상수는 다른 화면이 생기기 전까지 별도 `theme.ts`로 이동하지 않는다.

- [ ] **Step 3: 본문 로고와 폼을 구현한다**

- 본문 가로 패딩 20
- 로고 152 × 40, `resizeMode="contain"`
- 로그인 제목과 로고 간격 8
- 로고 블록과 폼 간격 40
- 입력 2개: 높이 52, 배경 `#F6F7FA`, 좌우 패딩 16
- 입력 간격 8
- 버튼 위 간격 16
- 버튼 52, 배경 `#262C3A`
- 보조 링크 행 위 간격 8

- [ ] **Step 4: 푸터를 구현한다**

아래 문구를 Figma 순서대로 표시한다.

```text
이용약관
개인정보처리방침

고객센터
전화번호 : 010-0000-0000
주중 09~18시 (점심시간 12~13시 30분 / 주말 및 공휴일 제외)

에이치플러스에코
사업자등록번호 : 220-86-00404
대표 : 홍길동
개인정보처리담당자 : 홍길동
주소 : 서울시 송파구 석촌호수로 222 6~8층 (석촌동, 제이타워)
Copyright © 2021 H-Plus Eco. All Rights Reserved.
```

메인 로고와 같은 에셋을 91 × 24로 재사용한다.

- [ ] **Step 5: 반응형 스크롤을 확인한다**

Figma의 390px 너비에서는 좌우 20px를 제외한 350px 폼이 되어야 한다. 320px·360px 너비에서는 고정 `width: 350`을 사용하지 않고 `width: '100%'`로 축소되어야 한다. 세로가 짧으면 푸터까지 스크롤되어야 한다.

- [ ] **Step 6: 타입 검사와 시각 검증을 실행한다**

Run:

```bash
pnpm typecheck
pnpm ios
pnpm android
```

Visual checks:

```text
390px 기준 간격과 높이
노치 및 Android edge-to-edge 안전 영역
작은 화면에서 가로 잘림 없음
푸터 마지막 줄까지 스크롤 가능
뒤로갈 화면이 없으면 아이콘 숨김
```

- [ ] **Step 7: 두 번째 리뷰 체크포인트를 만든다**

사용자는 `app/login.tsx`와 로고 에셋만 집중 리뷰한다.

Recommended commit after approval:

```bash
git add app/login.tsx assets/hplus-eco-logo.png
git commit -m "feat(auth): add login screen layout"
```

---

### Task 3: 입력과 클라이언트 검증 구현

**Files:**
- Modify: `app/login.tsx`

**Interfaces:**
- Produces: `validateLogin(email, password): LoginErrors`
- Consumes: `LoginField`, email/password refs

- [ ] **Step 1: 검증 타입과 규칙을 추가한다**

```ts
type LoginErrors = {
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/;

function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    errors.email = '이메일을 입력해주세요.';
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = '올바른 이메일 형식을 입력해주세요.';
  }

  if (!password) {
    errors.password = '비밀번호를 입력해주세요.';
  } else if (!PASSWORD_PATTERN.test(password)) {
    errors.password = '영문, 숫자, 특수문자를 포함하여 8자 이상 입력해주세요.';
  }

  return errors;
}
```

- [ ] **Step 2: 네이티브 입력 속성을 설정한다**

Email:

```tsx
autoCapitalize="none"
autoCorrect={false}
keyboardType="email-address"
returnKeyType="next"
textContentType="username"
```

Password:

```tsx
autoCapitalize="none"
autoCorrect={false}
secureTextEntry
returnKeyType="done"
textContentType="password"
```

- [ ] **Step 3: 오류 표시와 포커스 이동을 구현한다**

Submit order:

```ts
const nextErrors = validateLogin(email, password);
setErrors(nextErrors);

if (nextErrors.email) {
  emailRef.current?.focus();
  return;
}

if (nextErrors.password) {
  passwordRef.current?.focus();
  return;
}

Alert.alert(
  '로그인 입력 확인 완료',
  '서버 연동 전이라 로그인 요청은 전송하지 않습니다.',
);
```

사용자가 값을 다시 입력하면 해당 필드 오류만 제거한다. 서버 오류 문구는 서버 연동 전에는 화면에서 생성하지 않는다.

- [ ] **Step 4: 접근성 속성을 추가한다**

- 입력에 명시적인 `accessibilityLabel`
- 오류 문구에 `accessibilityLiveRegion="polite"`
- 로그인과 뒤로가기에 `accessibilityRole="button"`
- 보조 링크는 목적 화면이 생기기 전까지 disabled 상태를 명시
- 주요 Pressable의 터치 영역 최소 44px

- [ ] **Step 5: 수동 검증 매트릭스를 실행한다**

| 입력 | 기대 결과 |
|---|---|
| 둘 다 비움 | 이메일 오류 표시, 이메일 포커스 |
| `user` / 유효 비밀번호 | 이메일 형식 오류, 이메일 포커스 |
| `user@example.com` / 비움 | 비밀번호 필수 오류, 비밀번호 포커스 |
| 유효 이메일 / `password` | 비밀번호 조건 오류, 비밀번호 포커스 |
| 유효 이메일 / `Passw0rd!` | 서버 미연동 안내 Alert |
| 오류 후 값 수정 | 수정한 필드의 오류 제거 |
| 이메일 키보드 Next | 비밀번호 입력으로 포커스 이동 |
| 비밀번호 키보드 Done | 로그인 검증 실행 |

- [ ] **Step 6: 타입 검사와 기기 검증을 실행한다**

Run:

```bash
pnpm typecheck
```

Device checks:

```text
iOS: 키보드가 폼과 버튼을 가리지 않음
Android: 키보드가 열린 상태에서 버튼과 푸터로 스크롤 가능
두 플랫폼: 비밀번호 마스킹, 오류 포커스, Done 동작
```

- [ ] **Step 7: 세 번째 리뷰 체크포인트를 만든다**

이 단계의 diff는 `app/login.tsx` 한 파일에만 존재해야 한다.

Recommended commit after approval:

```bash
git add app/login.tsx
git commit -m "feat(auth): validate login inputs"
```

---

### Task 4: RN 학습 기록과 서버 요구사항 정리

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/development-notes.md`

**Interfaces:**
- Produces: 이후 작업에서 계속 갱신할 단일 기록 문서
- Consumes: 로그인 구현 결과와 실제 검증 결과

- [ ] **Step 1: AGENTS.md에 최소 기록 규칙을 추가한다**

```md
## Development Evidence

After a meaningful React Native implementation, append to `docs/development-notes.md` in Korean.

- Record the React Native or Expo concepts used and how they differ from web development.
- Separate AI assistance from developer decisions, corrections, and verification.
- Record only tests and device checks that were actually run.
- Add newly discovered server capabilities without assuming a backend technology or final API shape.
- Do not invent metrics or outcomes; write `[측정 필요]` when evidence is unavailable.
```

- [ ] **Step 2: 하나의 개발 기록 문서를 만든다**

`docs/development-notes.md`는 파일 수를 줄이기 위해 학습 기록과 서버 백로그를 함께 관리한다.

```md
# React Native 개발 기록

## 2026-08-13 — 로그인 레이아웃

- 목표: Figma 로그인 화면을 WebView 없이 React Native 컴포넌트로 구현
- 사용한 개념: Expo Router, Safe Area, KeyboardAvoidingView, ScrollView, TextInput, Pressable
- 웹 개발과 달랐던 점: DOM/CSS 대신 네이티브 컴포넌트와 StyleSheet 사용, 키보드·노치·플랫폼 차이 처리
- AI 지원: Figma 구조 분석, Expo 57 문서 확인, 구현 초안 및 검증 시나리오 제안
- 개발자 판단: 최소 파일 구조 선택, 컴포넌트 추출 시점 결정, 화면 및 오류 동작 리뷰
- 검증 결과: 실제 수행한 플랫폼과 결과만 구현 후 기록
- 이력서 근거: React Native/Expo 기반 크로스플랫폼 로그인 UI와 네이티브 입력 UX 구현

# 서버 요구사항 백로그

## AUTH-001 로그인

- 상태: 서버 기술 미정
- 입력: 이메일, 비밀번호
- 성공 결과: 인증 세션 발급 후 마일리지 화면 이동
- 실패 결과: 계정 불일치와 일시적 서버 오류를 구분 가능한 사용자 메시지
- 정책: 브라우저/앱 재시작 후 로그인 유지, 만료 시 로그인 이동, 다중 기기 로그인 허용
- 결정 필요: Access/Refresh Token 구성, 유효기간, 갱신·폐기 정책, 네이티브 보안 저장소

## AUTH-002 회원가입

- 상태: 목적 화면 구현 시 상세화
- 필요 기능: 계정 생성, 이메일 중복 검사, 비밀번호 정책 검증

## AUTH-003 이메일 찾기

- 상태: 목적 화면 구현 시 상세화
- 필요 기능: 본인 확인 방식과 이메일 안내 정책

## AUTH-004 비밀번호 재설정

- 상태: 서버 기술 미정
- 필요 기능: 재설정 Token 발급, 이메일 링크 발송, Token 만료·일회성 사용, 새 비밀번호 저장
```

- [ ] **Step 3: 검증 결과를 사실대로 완성한다**

`검증 결과`에는 실행한 항목만 기록한다. 한 플랫폼을 실행하지 못했으면 성공으로 추정하지 않고 이유를 적는다.

- [ ] **Step 4: 마지막 리뷰 체크포인트를 만든다**

Review scope:

```text
AGENTS.md의 기록 규칙
docs/development-notes.md의 RN 학습 내용
AUTH-001~004 서버 백로그
```

Recommended commit after approval:

```bash
git add AGENTS.md docs/development-notes.md
git commit -m "docs(app): record rn learnings and server needs"
```

---

## 6. 최종 검증 기준

### 자동 검사

```bash
pnpm typecheck
pnpm exec expo config --type public
node -p "require('./package.json').main"
```

Expected:

- TypeScript 오류 없음
- SDK version `57.0.0`
- `expo-router` plugin 확인
- 마지막 명령의 출력이 `expo-router/entry`

### 사용자 흐름

```text
앱 시작
→ /login 표시
→ 이메일 입력 후 Next
→ 비밀번호 입력
→ Done 또는 로그인 버튼
→ 잘못된 입력이면 오류와 포커스
→ 올바른 입력이면 서버 미연동 안내
```

### 시각 비교

- 390px 기준 헤더, 로고, 입력, 버튼, 푸터의 크기와 간격이 Figma와 일치
- 320px·360px에서 가로 잘림 없음
- 긴 푸터가 작은 화면에서도 스크롤 가능
- 키보드가 로그인 버튼을 영구적으로 가리지 않음
- 안전 영역이 노치·상태 표시줄·홈 인디케이터와 겹치지 않음

### 완료 조건

- 코드 로직은 `app/login.tsx` 한 파일에서 전체 흐름을 리뷰할 수 있음
- 공용 컴포넌트·훅·서비스 파일이 생기지 않음
- 실제 서버 요청이나 가짜 Token이 없음
- 로그인에서 발견된 서버 기능이 문서에 기록됨
- 실행하지 않은 검증을 실행했다고 기록하지 않음

## 7. 리뷰 진행 방식

각 Task를 한 번에 합치지 않고 다음 순서로 사용자 리뷰를 받는다.

1. Router 진입점과 3개 파일 구조
2. `login.tsx` 정적 레이아웃
3. 같은 파일의 입력·유효성 검증
4. RN 학습 및 서버 요구사항 문서

리뷰 중 파일이 너무 길다고 느껴지더라도 먼저 책임 경계를 확인한다. 단순히 줄 수를 줄이기 위해 분리하지 않고, 재사용 또는 독립 변경 이유가 생긴 컴포넌트만 추출한다.
