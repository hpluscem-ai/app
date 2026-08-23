# 확정 로그인 디자인 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 러프 로그인 레이아웃을 Figma 확정안의 HAYAN100 브랜드, 라벨형 캡슐 입력, 브랜드 버튼과 정확한 타이포그래피를 사용하는 React Native 로그인 화면으로 전환한다.

**Architecture:** 로그인 라우트는 기존 `AppScreen`의 Safe Area·키보드 회피·스크롤·푸터 경계를 재사용하되, 이전 인증 공용 브랜드가 자동 삽입되지 않도록 `plain` 변형 안에서 확정 본문을 직접 조합한다. 기존 인증·마일리지 화면의 시각 회귀를 막기 위해 `FormTextField`, `PrimaryButton`, `AppBar`는 확정 스타일을 선택한 로그인에만 적용하고 기본 모양은 유지한다. Figma에서 공용 컴포넌트로 확인된 푸터는 한 곳에서 최종 폰트를 적용한다.

**Tech Stack:** Expo SDK 57.0.13, React Native 0.86.2, React 19.2.3, TypeScript 6, Expo Router 57, React Hook Form 7.83, React Native Paper 5.15, `StyleSheet`, `expo-font`, `expo-splash-screen`

**Spec:** [Figma 로그인 노드 154:634](https://www.figma.com/design/w9EEtYG5p4KoaVNlApRG0l/%EC%97%90%EC%9D%B4%EC%B9%98%ED%94%8C%EB%9F%AC%EC%8A%A4%EC%97%90%EC%BD%94_design?node-id=154-634&m=dev). 이 문서는 로그인 시각 규격에 한해 이전 계획 `docs/superpowers/plans/2026-08-13-login-screen.md`를 대체한다. 기존 입력 검증, 라우팅과 서버 경계는 현재 코드를 기준으로 유지한다.

## Global Constraints

- 구현 전 Expo SDK 57 문서만 기준으로 확인한다: <https://docs.expo.dev/versions/v57.0.0/>.
- 기준 Figma 노드는 `154:634`, 전체 프레임은 `390 × 1144`이다.
- WebView, HTML, Tailwind, SVG transformer와 두 번째 앱바 라이브러리를 추가하지 않는다.
- Figma의 iOS 상태 표시줄 48px과 홈 인디케이터 34px은 운영체제가 그리므로 앱 JSX로 복제하지 않는다.
- Figma 캔버스의 바깥 1px 테두리는 기기 프레임 표현이므로 앱 화면에 추가하지 않는다.
- 뒤로가기는 실제 이전 화면이 있을 때만 기존 `BackIcon`으로 표시한다.
- 헤더 오른쪽 `arrow-right` 노드는 사용자 동작이 정의되지 않았고 화면 캡처에도 노출되지 않으므로 기존 빈 정렬 슬롯을 유지한다.
- 로그인 성공, 세션, Token과 `/mileage` 이동을 흉내 내지 않는다. 제출은 현재 `showLoginServerPendingAlert` 경계를 유지한다.
- 이메일·비밀번호 검증 규칙, React Hook Form 제출 시점, 입력 포커스 이동과 세 계정 메뉴의 라우팅은 바꾸지 않는다.
- 기존 공용 컴포넌트의 기본 스타일은 유지한다. 새 확정 스타일은 로그인에서 명시적으로 선택한다.
- Figma 고정 높이는 390pt 기준 시각 목표다. 입력·버튼은 `minHeight`와 세로 패딩을 사용해 접근성 글자 확대 시 잘리지 않게 한다.
- 원격 Figma 에셋 URL은 만료되므로 런타임에서 참조하지 않고 원본 바이트를 저장소에 포함한다.
- 폰트는 SUIT v2.0.5와 Inter v4.1 공식 배포본을 사용하고 각 SIL Open Font License 원문을 함께 보관한다.
- 새 Expo 의존성은 `pnpm exec expo install`로 설치하고 SDK 호환 검사를 실행한다.
- 자동 UI 테스트 기반은 이 스타일 전환만을 위해 새로 만들지 않는다. 타입 검사, 번들 검사와 iOS·Android 시각·상호작용 확인으로 검증한다.
- 사용자가 명시적으로 요청한 실행 세션에서만 커밋한다.

---

## 1. 확정안 해석

### 화면 구조

| 영역 | Figma 기준 | React Native 적용 |
|---|---|---|
| 전체 프레임 | `390 × 1144` | 세로 길이는 콘텐츠 흐름과 Safe Area가 결정하며 고정하지 않음 |
| 상태 표시줄 | 높이 48 | `expo-status-bar`와 운영체제에 위임 |
| 앱바 | 높이 52, 좌우 16 | 기존 Stack `AppBar` 재사용 |
| 본문 | 높이 580, 좌우 20, 위아래 104 | `AppScreen variant="plain"` 안의 전용 본문 `View` |
| 브랜드 | 로고 `216 × 32`, 설명과 간격 8 | Figma 노드 `154:687`의 단일 PNG와 `하얀100 로그인` |
| 브랜드와 폼 | 간격 40 | 본문 `gap: 40` |
| 폼 | 기준 너비 350 | `width: '100%'`; 390pt에서는 좌우 20을 제외한 350pt |
| 입력 두 개 | 각 블록 80, 블록 간격 16 | 라벨 20 + 간격 8 + 입력 최소 52 |
| 입력과 동작 | 간격 16 | 폼 `gap: 16` |
| 로그인 동작 | 버튼 52 + 간격 8 + 링크 20 | 기존 제출·라우팅 유지 |
| 푸터 | 높이 428 | 기존 `AppFooter`의 유연한 콘텐츠 높이 유지 |
| 홈 인디케이터 | 높이 34 | 하단 Safe Area에 위임 |

### 색상과 타이포그래피

| 용도 | 확정 값 |
|---|---|
| 기본 본문 | `#262C3A` (`gray_800`) |
| 흰색 | `#FFFFFF` (`gray_00`) |
| 입력 배경 | `#F6F7FA` (`gray_100`) |
| 입력 힌트 | `#A9B1C1` (`gray_400`) |
| 푸터 선 | `#E9ECF2` (`gray_200`) |
| 푸터 배경 | `#FCFCFD` (`gray_50`) |
| 로그인 버튼 | `#000047` (`brand_500`) |
| 브랜드 설명 | `#040648` |
| 앱바 제목 | SUIT SemiBold, 16/24, letter spacing `-0.4` |
| 라벨·입력·브랜드 설명·링크 | SUIT Medium, 14/20, letter spacing `-0.35` |
| 버튼 | SUIT SemiBold, 14/20, letter spacing `-0.35` |
| 푸터 일반 | Inter Medium, 12/16 |
| 푸터 강조 | Inter Bold, 12/16 |

### 컴포넌트별 시각 규격

#### 앱바

- 흰색 배경과 52pt 기본 높이를 사용한다.
- 제목은 `로그인`만 표시하고 브랜드 접두사를 붙이지 않는다.
- 제목은 새 `screenTitle` 토큰을 로그인 화면 옵션으로만 전달한다.
- Figma의 반투명 배경과 blur 5는 Stack 헤더 뒤로 본문이 지나가지 않는 현재 네이티브 구조에서 시각 효과가 없다. 이 효과만을 위해 `expo-blur`를 추가하지 않는다.
- 좌측은 실제 back stack이 있을 때 24 × 24 아이콘을 표시하고, 우측은 같은 정렬 폭의 빈 슬롯을 유지한다.

#### 브랜드

- Figma 노드 `154:687` 전체를 한 번에 PNG로 내보낸 `216 × 32` 투명 이미지를 사용한다.
- 기존 `hplus-eco-logo.png`는 푸터용으로 계속 사용한다.
- 로고를 세 개의 SVG 조각으로 다시 조립하거나 글자를 Text로 재현하지 않는다.
- 설명 `하얀100 로그인`은 로고 아래 8pt, 가운데 정렬로 표시한다.

#### 입력

- `이메일`, `비밀번호` 라벨을 입력 위에 표시한다.
- 라벨은 왼쪽에 8pt 내부 여백을 둔다.
- 라벨과 입력 사이 간격은 8pt, 두 입력 블록 사이는 16pt다.
- 입력은 너비 100%, `minHeight: 52`, 좌우 16pt, 세로 16pt, 반지름 26pt, 배경 `#F6F7FA`다.
- 힌트는 `#A9B1C1`, 실제 값은 `#262C3A`다.
- 오류 상태는 기존 정책을 보존해 `#D92D20` 테두리와 접근 가능한 오류 문구를 입력 아래 4pt에 표시한다. Figma에 오류 화면이 없으므로 새로운 오류 카피나 아이콘은 만들지 않는다.
- 이메일 입력의 Next, 비밀번호 입력의 Done과 secure text 동작을 유지한다.

#### 로그인 버튼과 계정 메뉴

- 버튼은 너비 100%, `minHeight: 52`, 세로 16pt, 반지름 26pt, 배경 `#000047`다.
- 버튼은 현재처럼 항상 누를 수 있고 제출 시 React Hook Form 검증을 수행한다.
- `회원가입 · 이메일 찾기 · 비밀번호 찾기`는 시각적으로 한 줄이지만 각 메뉴는 현재처럼 독립 `Pressable`과 실제 라우팅을 유지한다.
- 각 메뉴의 `hitSlop={12}`와 접근성 역할을 유지한다.

#### 푸터

- 구조, 문구, 로고 크기 `91 × 24`, 좌우 20pt, 위아래 52pt, 그룹 간격 16pt는 현재 구현과 Figma가 일치하므로 바꾸지 않는다.
- 일반 문구만 Inter Medium 12/16, 개인정보처리방침만 Inter Bold 12/16으로 정확히 적용한다.
- 푸터는 공용 컴포넌트이므로 폰트 변경이 다른 화면에도 적용된다. 로그인 외 화면에서 줄바꿈과 총 높이를 회귀 확인한다.

### 유지되는 제품 동작

```text
이메일 입력 → Next → 비밀번호 포커스
비밀번호 입력 → Done 또는 로그인 버튼 → 클라이언트 검증
검증 실패 → 기존 오류 문구와 첫 오류 필드 포커스
검증 성공 → 서버 연동 대기 안내
회원가입 → /sign-up
이메일 찾기 → /find-email
비밀번호 찾기 → /find-password
```

### 이번 전환에서 제외

- 실제 로그인 API와 오류 응답 계약
- 세션 저장·복원과 보호 라우트
- 로그인 성공 후 이동
- 아이디 저장, 자동 로그인, 소셜 로그인
- 비밀번호 표시 전환 아이콘
- 약관·개인정보처리방침 링크 연결
- 회원가입·계정 찾기 화면의 확정 디자인 전환
- 전체 앱 타이포그래피 일괄 교체
- Figma의 상태 표시줄, 홈 인디케이터와 바깥 기기 테두리 복제

---

## 2. 파일 구조와 영향 범위

### 생성

| 파일 | 책임 |
|---|---|
| `assets/hayan100-logo.png` | Figma `154:687`의 216 × 32 HAYAN100 원본 |
| `assets/fonts/SUIT-Medium.ttf` | 로그인 일반 텍스트 500 |
| `assets/fonts/SUIT-SemiBold.ttf` | 앱바·버튼 600 |
| `assets/fonts/Inter-Medium.ttf` | 푸터 일반 500 |
| `assets/fonts/Inter-Bold.ttf` | 푸터 강조 700 |
| `assets/fonts/SUIT-LICENSE.txt` | SUIT v2.0.5 OFL 원문 |
| `assets/fonts/Inter-LICENSE.txt` | Inter v4.1 OFL 원문 |

### 수정

| 파일 | 변경 책임 | 다른 화면 영향 |
|---|---|---|
| `package.json` | `expo-font`, `expo-splash-screen` 직접 의존성 | 앱 시작 자원 로딩 |
| `pnpm-lock.yaml` | SDK 57 호환 버전 고정 | 빌드 입력만 변경 |
| `app/_layout.tsx` | 네 글꼴 로딩, splash 해제, 로그인 제목 토큰 전달 | 모든 화면은 폰트 준비 뒤 렌더링; 제목 토큰은 로그인만 사용 |
| `constants/assets.ts` | `hayan100Logo` 등록 | 기존 에셋 값 유지 |
| `constants/theme.ts` | `brand500`과 확정 타이포그래피 토큰 추가 | 기존 토큰 값 유지 |
| `components/AppBar.tsx` | 화면별 `titleStyle` 전달 허용 | 기본 제목 스타일 유지 |
| `components/auth/FormTextField.tsx` | 라벨과 `finalAuth` 변형 추가 | 기본 변형 유지 |
| `components/auth/PrimaryButton.tsx` | `brandPill` 변형 추가 | 기본 변형 유지 |
| `components/auth/AppFooter.tsx` | Inter 토큰 적용 | 모든 푸터의 폰트만 최종안으로 변경 |
| `app/login.tsx` | 확정 브랜드·레이아웃과 새 변형 조합 | 로그인만 변경 |
| `docs/development-notes.md` | 최종 디자인 전환 판단·검증 기록 | 문서만 변경 |

### 수정하지 않음

- `components/AppScreen.tsx`: `plain` 변형과 공용 푸터 배치만 그대로 재사용한다.
- `utils/validation.ts`: 확정 디자인이 검증 정책을 바꾸지 않는다.
- `utils/alerts.ts`: 서버 경계가 그대로다.
- `app/sign-up.tsx`, `app/find-email.tsx`, `app/find-password.tsx`, `app/reset-password.tsx`: 다음 확정 화면 작업 전까지 이전 레이아웃을 유지한다.

---

### Task 1: 확정 에셋과 폰트 토큰 준비

**Files:**
- Create: `assets/hayan100-logo.png`
- Create: `assets/fonts/SUIT-Medium.ttf`
- Create: `assets/fonts/SUIT-SemiBold.ttf`
- Create: `assets/fonts/Inter-Medium.ttf`
- Create: `assets/fonts/Inter-Bold.ttf`
- Create: `assets/fonts/SUIT-LICENSE.txt`
- Create: `assets/fonts/Inter-LICENSE.txt`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `constants/assets.ts`
- Modify: `constants/theme.ts`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: Figma 파일 `w9EEtYG5p4KoaVNlApRG0l`, 노드 `154:687`; SUIT v2.0.5; Inter v4.1; Expo SDK 57 font and splash APIs.
- Produces: `imageSources.hayan100Logo`, `colors.brand500`, `typography.screenTitle`, `typography.authBody`, `typography.authAction`, `typography.footer`, `typography.footerStrong`; 앱 렌더 전에 등록된 네 font family.

- [ ] **Step 1: Expo SDK 57 호환 폰트·splash 의존성을 직접 등록한다**

Run:

```bash
pnpm exec expo install expo-font expo-splash-screen
```

Expected manifest entries:

```json
{
  "expo-font": "~57.0.1",
  "expo-splash-screen": "~57.0.7"
}
```

실제 패치 버전은 실행 시 SDK 57이 선택한 값을 사용한다. 두 패키지는 원격 폰트나 API를 사용하기 위한 것이 아니라 저장소에 포함한 정적 폰트를 첫 화면 전에 로드하기 위해 사용한다.

- [ ] **Step 2: 공식 원본 파일을 정확한 경로에 저장한다**

Source mapping:

```text
Figma node 154:687 export (PNG, 216 × 32, transparent)
  → assets/hayan100-logo.png

https://github.com/sun-typeface/SUIT/tree/v2.0.5/fonts/static/ttf
  SUIT-Medium.ttf   → assets/fonts/SUIT-Medium.ttf
  SUIT-SemiBold.ttf → assets/fonts/SUIT-SemiBold.ttf
https://github.com/sun-typeface/SUIT/blob/v2.0.5/LICENSE
  LICENSE           → assets/fonts/SUIT-LICENSE.txt

https://github.com/rsms/inter/releases/tag/v4.1
  extras/ttf/Inter-Medium.ttf → assets/fonts/Inter-Medium.ttf
  extras/ttf/Inter-Bold.ttf   → assets/fonts/Inter-Bold.ttf
  LICENSE.txt                  → assets/fonts/Inter-LICENSE.txt
```

Figma asset URL은 짧게 유지되므로 구현 시 `download_assets(fileKey: "w9EEtYG5p4KoaVNlApRG0l", nodeId: "154:687")`를 다시 호출하고 반환된 export 바이트를 즉시 저장한다.

- [ ] **Step 3: 에셋 형식과 치수를 검증한다**

Run:

```bash
file assets/hayan100-logo.png assets/fonts/*.ttf
sips -g pixelWidth -g pixelHeight assets/hayan100-logo.png
```

Expected:

```text
assets/hayan100-logo.png: PNG image data, 216 x 32, RGBA
pixelWidth: 216
pixelHeight: 32
각 폰트: TrueType font data
```

- [ ] **Step 4: 이미지와 디자인 토큰을 등록한다**

`constants/assets.ts`에 기존 값을 바꾸지 않고 추가한다.

```ts
export const imageSources = {
  hayan100Logo: require('../assets/hayan100-logo.png'),
  hplusEcoLogo: require('../assets/hplus-eco-logo.png'),
  mileageWaterJug: require('../assets/mileage-water-jug.png'),
} as const;
```

`constants/theme.ts`에 다음 값을 추가한다. 정적 font face 자체가 굵기를 가지므로 새 토큰에 별도 `fontWeight`를 중복 지정하지 않는다.

```ts
export const fontFamilies = {
  interBold: 'Inter-Bold',
  interMedium: 'Inter-Medium',
  suitMedium: 'SUIT-Medium',
  suitSemiBold: 'SUIT-SemiBold',
} as const;
```

기존 `colors` 객체 안에는 다음 항목만 추가한다.

```ts
brand500: '#000047',
```

기존 `typography` 객체 안에는 다음 다섯 항목을 추가한다.

```ts
  screenTitle: {
    fontFamily: fontFamilies.suitSemiBold,
    fontSize: 16,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  authBody: {
    fontFamily: fontFamilies.suitMedium,
    fontSize: 14,
    letterSpacing: -0.35,
    lineHeight: 20,
  },
  authAction: {
    fontFamily: fontFamilies.suitSemiBold,
    fontSize: 14,
    letterSpacing: -0.35,
    lineHeight: 20,
  },
  footer: {
    fontFamily: fontFamilies.interMedium,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
  },
  footerStrong: {
    fontFamily: fontFamilies.interBold,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
  },
```

- [ ] **Step 5: 첫 화면 전에 로컬 폰트를 로드한다**

`app/_layout.tsx`의 모듈 범위에서 splash 자동 해제를 막고, `RootLayout`에서 다음 map을 로드한다.

```ts
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

const [fontsLoaded, fontError] = useFonts({
  'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
  'SUIT-Medium': require('../assets/fonts/SUIT-Medium.ttf'),
  'SUIT-SemiBold': require('../assets/fonts/SUIT-SemiBold.ttf'),
});

useEffect(() => {
  if (fontsLoaded || fontError) {
    SplashScreen.hide();
  }
}, [fontError, fontsLoaded]);

if (!fontsLoaded && !fontError) {
  return null;
}
```

폰트 로딩 실패 시 앱을 splash에 영구 고정하지 않고 기존 시스템 폰트로 렌더링한다. 시각 QA에서는 개발 로그와 실제 글꼴 모양을 함께 확인해 실패를 통과로 오인하지 않는다.

- [ ] **Step 6: 의존성과 타입을 검증한다**

Run:

```bash
pnpm typecheck
pnpm exec expo install --check
pnpm exec expo config --type public
```

Expected:

- TypeScript 오류가 없다.
- Expo 의존성 불일치가 없다.
- public config가 SDK `57.0.0`과 기존 Router·Location·ImagePicker plugin을 유지한다.

- [ ] **Step 7: 승인된 경우에만 자원 변경을 커밋한다**

```bash
git add package.json pnpm-lock.yaml app/_layout.tsx constants/assets.ts constants/theme.ts assets/hayan100-logo.png assets/fonts
git commit -m "feat(ui): add finalized login assets"
```

---

### Task 2: 확정 스타일을 공용 경계에 선택형으로 추가

**Files:**
- Modify: `components/AppBar.tsx`
- Modify: `components/auth/FormTextField.tsx`
- Modify: `components/auth/PrimaryButton.tsx`
- Modify: `components/auth/AppFooter.tsx`

**Interfaces:**
- Consumes: Task 1의 `colors.brand500`과 새 typography tokens.
- Produces: `AppBar.titleStyle`, `FormTextField.label`, `FormTextField.variant = 'finalAuth'`, `PrimaryButton.variant = 'brandPill'`; 최종 Inter 푸터.

- [ ] **Step 1: 앱바가 화면별 제목 스타일을 받게 한다**

```ts
import type { StyleProp, TextStyle } from 'react-native';

type AppBarProps = {
  title: string;
  onBack?: () => void;
  titleStyle?: StyleProp<TextStyle>;
};

export function AppBar({ title, onBack, titleStyle }: AppBarProps) {
  return (
    <Appbar.Header mode="center-aligned" style={styles.bar}>
      {onBack ? (
        <Appbar.Action
          accessibilityLabel="뒤로가기"
          color={colors.gray800}
          icon={BackIcon}
          isLeading
          onPress={onBack}
          size={24}
          style={styles.action}
        />
      ) : (
        <View style={styles.actionSlot} />
      )}

      <Appbar.Content title={title} titleStyle={[styles.title, titleStyle]} />
      <View style={styles.actionSlot} />
    </Appbar.Header>
  );
}
```

기존 화면은 `titleStyle`을 전달하지 않으므로 현재 14/20 제목을 유지한다.

- [ ] **Step 2: 입력에 라벨과 확정 인증 변형을 추가한다**

```ts
type FormTextFieldVariant = 'default' | 'finalAuth';

type FormTextFieldProps = Omit<
  TextInputProps,
  'accessibilityLabel' | 'autoCorrect' | 'ref' | 'style'
> & {
  accessibilityLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
  error?: string;
  inputRef: Ref<TextInput>;
  label?: string;
  onChangeText: NonNullable<TextInputProps['onChangeText']>;
  value: string;
  variant?: FormTextFieldVariant;
};
```

구조는 라벨과 오류 간격을 분리한다. 기존 입력 속성과 접근성 오류 표시는 아래처럼 모두 유지한다.

```tsx
export function FormTextField({
  accessibilityLabel,
  autoCapitalize = 'none',
  containerStyle,
  error,
  inputRef,
  keyboardType = 'default',
  label,
  onChangeText,
  returnKeyType = 'next',
  secureTextEntry = false,
  value,
  variant = 'default',
  ...inputProps
}: FormTextFieldProps) {
  const isFinalAuth = variant === 'finalAuth';

  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      {label ? <Text style={styles.finalLabel}>{label}</Text> : null}
      <View style={styles.inputFeedback}>
        <TextInput
          {...inputProps}
          accessibilityLabel={accessibilityLabel}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholderTextColor={isFinalAuth ? colors.gray400 : colors.gray800}
          ref={inputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          selectionColor={colors.gray800}
          style={[
            styles.input,
            isFinalAuth && styles.finalInput,
            error && styles.inputError,
          ]}
          value={value}
        />
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.errorText}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
```

Styles:

```ts
fieldContainer: {
  width: '100%',
},
finalLabel: {
  ...typography.authBody,
  color: colors.black,
  marginBottom: 8,
  paddingHorizontal: 8,
},
inputFeedback: {
  width: '100%',
  gap: 4,
},
finalInput: {
  ...typography.authBody,
  minHeight: 52,
  height: 'auto',
  borderRadius: 26,
  paddingHorizontal: 16,
  paddingVertical: 16,
},
```

기존 `styles.input`의 높이와 패딩은 default 변형에 남겨 다른 화면을 바꾸지 않는다. `finalInput`이 배열 뒤에서 확정 인증 값만 덮어쓴다.

- [ ] **Step 3: 로그인용 브랜드 캡슐 버튼 변형을 추가한다**

```ts
type PrimaryButtonVariant = 'default' | 'brandPill';

type PrimaryButtonProps = {
  label: string;
  onPress: NonNullable<PressableProps['onPress']>;
  disabled?: boolean;
  variant?: PrimaryButtonVariant;
  width?: DimensionValue;
};
```

```tsx
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'default',
  width = '100%',
}: PrimaryButtonProps) {
  const isBrandPill = variant === 'brandPill';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width },
        isBrandPill && styles.brandPill,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isBrandPill && styles.brandPillLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}
```

```ts
brandPill: {
  minHeight: 52,
  height: 'auto',
  borderRadius: 26,
  backgroundColor: colors.brand500,
  paddingVertical: 16,
},
brandPillLabel: {
  ...typography.authAction,
},
```

기존 기본 버튼의 `#262C3A`, 직각 모양과 typography는 유지한다.

- [ ] **Step 4: 공용 푸터에 확정 Inter 토큰을 적용한다**

```ts
footerText: {
  ...typography.footer,
  color: colors.gray800,
},
footerTextStrong: {
  ...typography.footerStrong,
  color: colors.gray800,
},
```

푸터의 JSX, 문구, 간격, 선과 이미지 스타일은 수정하지 않는다.

- [ ] **Step 5: 기본 변형의 비회귀를 정적으로 확인한다**

Run:

```bash
pnpm typecheck
rg -n "variant=\"finalAuth\"|variant=\"brandPill\"" app components
git diff --check
```

Expected at this checkpoint:

- TypeScript 오류가 없다.
- Task 3 전에는 새 변형 사용처가 없거나 로그인 한 곳만 준비 중이다.
- 기존 호출부는 새 필수 prop 없이 그대로 컴파일된다.
- 공백 오류가 없다.

- [ ] **Step 6: 승인된 경우에만 선택형 컴포넌트 변경을 커밋한다**

```bash
git add components/AppBar.tsx components/auth/FormTextField.tsx components/auth/PrimaryButton.tsx components/auth/AppFooter.tsx
git commit -m "feat(auth): add finalized login variants"
```

---

### Task 3: 로그인 라우트를 확정 레이아웃으로 조합

**Files:**
- Modify: `app/login.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `imageSources.hayan100Logo`, `typography.screenTitle`, `typography.authBody`, `FormTextField variant="finalAuth"`, `PrimaryButton variant="brandPill"`, 기존 `AppScreen variant="plain"`.
- Produces: Figma `154:634`와 일치하는 `/login`; 기존 폼 검증·서버 경계·세 계정 라우팅.

- [ ] **Step 1: 로그인 전용 브랜드 블록을 같은 라우트 파일에 둔다**

`app/login.tsx`에 `Image` import와 다음 비공개 컴포넌트를 추가한다.

```tsx
function LoginBrand() {
  return (
    <View style={styles.brandBlock}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="하얀100 로고"
        resizeMode="contain"
        source={imageSources.hayan100Logo}
        style={styles.brandLogo}
      />
      <Text style={styles.brandTitle}>하얀100 로그인</Text>
    </View>
  );
}
```

한 화면에서만 쓰므로 새 브랜드 컴포넌트 파일이나 범용 logo prop을 만들지 않는다.

- [ ] **Step 2: 기존 폼 동작은 그대로 두고 입력 표면만 확정안으로 바꾼다**

두 `FormTextField`에 다음 prop만 추가한다.

```tsx
label="이메일"
variant="finalAuth"
```

```tsx
label="비밀번호"
variant="finalAuth"
```

다음 항목은 그대로 둔다.

```text
Controller name
validateEmail / validatePassword
autoComplete / textContentType / keyboardType
onBlur / onChangeText / value / ref
이메일 Next → setFocus('password')
비밀번호 Done → submitForm
secureTextEntry
오류 메시지
```

- [ ] **Step 3: 버튼과 링크에 확정 토큰을 적용한다**

```tsx
<PrimaryButton
  label="로그인"
  onPress={submitForm}
  variant="brandPill"
/>
```

링크 JSX와 라우팅은 유지하고 `styles.linkText`만 `typography.authBody`로 바꾼다.

- [ ] **Step 4: 이전 인증 브랜드를 제거하고 plain 화면 안에서 본문을 조합한다**

```tsx
return (
  <AppScreen variant="plain">
    <View style={styles.screenContent}>
      <LoginBrand />

      <View style={styles.form}>
        <View style={styles.fields}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="이메일"
                autoComplete="email"
                error={errors.email?.message}
                inputRef={ref}
                keyboardType="email-address"
                label="이메일"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => setFocus('password')}
                placeholder="이메일을 입력해주세요."
                returnKeyType="next"
                textContentType="username"
                value={value}
                variant="finalAuth"
              />
            )}
            rules={{ validate: validateEmail }}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="비밀번호"
                autoComplete="current-password"
                error={errors.password?.message}
                inputRef={ref}
                label="비밀번호"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={submitForm}
                placeholder="비밀번호를 입력해주세요."
                returnKeyType="done"
                secureTextEntry
                textContentType="password"
                value={value}
                variant="finalAuth"
              />
            )}
            rules={{ validate: validatePassword }}
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="로그인"
            onPress={submitForm}
            variant="brandPill"
          />

          <View accessibilityLabel="계정 관련 메뉴" style={styles.linkRow}>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/sign-up')}
            >
              <Text style={styles.linkText}>회원가입</Text>
            </Pressable>
            <Text style={styles.linkText}> · </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/find-email')}
            >
              <Text style={styles.linkText}>이메일 찾기</Text>
            </Pressable>
            <Text style={styles.linkText}> · </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/find-password')}
            >
              <Text style={styles.linkText}>비밀번호 찾기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  </AppScreen>
);
```

`AppScreen`은 ScrollView 뒤에 기존 `AppFooter`를 계속 렌더링한다.

- [ ] **Step 5: Figma 수치를 라우트 스타일에 적용한다**

```ts
screenContent: {
  width: '100%',
  alignItems: 'center',
  gap: 40,
  paddingHorizontal: 20,
  paddingVertical: 104,
},
brandBlock: {
  alignItems: 'center',
  gap: 8,
},
brandLogo: {
  width: 216,
  height: 32,
},
brandTitle: {
  ...typography.authBody,
  color: colors.brand,
},
form: {
  width: '100%',
  gap: 16,
},
fields: {
  gap: 16,
},
actions: {
  width: '100%',
  alignItems: 'center',
  gap: 8,
},
linkRow: {
  minHeight: 20,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
},
linkText: {
  ...typography.authBody,
  color: colors.black,
},
```

`flexWrap: 'wrap'`은 기본 글자 크기에서 한 줄을 유지하면서 320pt 폭이나 큰 글자에서 잘리는 대신 자연스럽게 다음 줄로 내려가게 한다.

- [ ] **Step 6: 로그인 앱바에만 확정 제목 토큰을 전달한다**

공용 header callback이 React Navigation screen option을 실제 `AppBar`에 전달하게 한다.

```tsx
<AppBar
  onBack={back ? () => navigation.goBack() : undefined}
  title={options.title ?? ''}
  titleStyle={options.headerTitleStyle}
/>
```

로그인 화면 옵션만 다음처럼 바꾼다.

```tsx
<Stack.Screen
  name="login"
  options={{
    headerTitleStyle: typography.screenTitle,
    title: '로그인',
  }}
/>
```

`app/_layout.tsx`에 `typography` import를 추가한다. 다른 Stack 화면은 현재 제목 스타일을 유지한다.

- [ ] **Step 7: 타입과 로그인 동작을 확인한다**

Run:

```bash
pnpm typecheck
git diff --check
```

Manual flow:

```text
1. /login을 직접 열면 뒤로가기 없이 제목이 가운데 정렬된다.
2. 다른 화면에서 /login으로 이동하면 뒤로가기가 보이고 이전 화면으로 돌아간다.
3. 이메일 Next가 비밀번호로 포커스를 이동한다.
4. 빈 입력 제출은 기존 두 오류를 표시한다.
5. 잘못된 이메일은 기존 이메일 오류를 표시한다.
6. 정책에 맞지 않는 비밀번호는 기존 비밀번호 오류를 표시한다.
7. 유효 입력 제출은 서버 연동 대기 안내만 표시한다.
8. 세 계정 메뉴가 각각 기존 경로로 이동한다.
```

- [ ] **Step 8: 승인된 경우에만 로그인 조합을 커밋한다**

```bash
git add app/login.tsx app/_layout.tsx
git commit -m "feat(auth): apply finalized login design"
```

---

### Task 4: 시각 회귀 검증과 개발 기록

**Files:**
- Modify: `docs/development-notes.md`

**Interfaces:**
- Consumes: Task 1~3의 완성 화면과 실제 실행 결과.
- Produces: Figma 대비 시각 판정, iOS·Android 확인 범위, 공용 푸터 회귀 결과와 사실 기반 개발 기록.

- [ ] **Step 1: Expo 구성과 양 플랫폼 번들을 검사한다**

Run:

```bash
pnpm typecheck
pnpm exec expo install --check
pnpm exec expo config --type public
pnpm exec expo export --platform ios --output-dir /private/tmp/hpluseco-login-ios
pnpm exec expo export --platform android --output-dir /private/tmp/hpluseco-login-android
git diff --check
```

Expected:

- 타입·의존성·public config 오류가 없다.
- iOS와 Android Metro export가 네 로컬 폰트와 두 로고를 포함해 완료된다.
- 공백 오류가 없다.

- [ ] **Step 2: 390pt 기준 화면을 Figma와 비교한다**

시뮬레이터나 실기기에서 390pt에 가까운 iOS 화면을 열고 다음 기준으로 캡처를 비교한다.

```text
앱바: 52pt, 로그인 16/24 SemiBold, 조건부 24pt back icon
본문 시작: 앱바 아래 104pt
브랜드: 216 × 32, 설명까지 60pt
브랜드→폼: 40pt
라벨: 좌측 8pt, 입력까지 8pt
입력: 350 × 52 기준, radius 26, gray100, gray400 placeholder
입력 블록 사이: 16pt
입력→동작: 16pt
버튼: 350 × 52 기준, radius 26, #000047
버튼→링크: 8pt
본문 총 기준 높이: 580pt
푸터: 기존 문구·선·91 × 24 로고, Inter 굵기와 줄바꿈
```

1~2pt의 플랫폼 글꼴 래스터 차이는 허용하되 잘못된 font family, 굵기, 색상, 간격이나 크기는 통과시키지 않는다.

- [ ] **Step 3: 작은 화면·키보드·접근성 확대를 확인한다**

```text
Android 360dp 이하: 입력과 버튼이 좌우를 넘지 않음
키보드 열림: 본문이 스크롤되고 Done·로그인 버튼에 접근 가능
동적 글자 확대: 라벨·입력값·버튼·링크가 세로로 잘리지 않음
긴 계정 메뉴: 화면 밖으로 잘리지 않고 줄바꿈
오류 2개 동시 표시: 푸터를 덮지 않고 전체 화면 스크롤 가능
```

- [ ] **Step 4: 공용 컴포넌트 회귀를 확인한다**

다음 화면을 한 번씩 열어 로그인 선택형 스타일이 새어 나오지 않았는지 확인한다.

```text
/sign-up: 기존 직각 입력·기본 버튼 유지
/find-email: 기존 폼 구조 유지
/find-password: 기존 이메일·휴대폰 폼 구조 유지
/reset-password: 기존 입력·기본 버튼 유지
/mileage/apply: 기존 PrimaryButton 기본 색·모양 유지
/mileage: 기존 colors.brand 값 #040648 유지
모든 AppFooter 사용 화면: Inter 적용 후 문구 잘림이나 겹침 없음
```

- [ ] **Step 5: 실제 검증 결과를 개발 기록에 추가한다**

`docs/development-notes.md`의 서버 백로그 앞에 다음 형식으로 기록한다. 괄호의 선택 문장은 실제 실행 결과에 맞춰 하나만 남긴다.

```md
## 2026-08-23 — 확정 로그인 디자인 전환

- 디자인 전환: Figma `154:634`를 기준으로 이전 러프 로그인 본문을 HAYAN100 로고, 외부 라벨이 있는 캡슐 입력, 브랜드 네이비 버튼과 확정 타이포그래피로 교체했다.
- React Native 구성: 상태 표시줄과 홈 인디케이터는 운영체제에 맡기고, 기존 `AppScreen`의 Safe Area·키보드 회피·ScrollView·푸터를 재사용했다. 390pt 고정 프레임을 복제하지 않고 좌우 너비와 콘텐츠 높이는 유연하게 유지했다.
- 폰트와 에셋: Figma에서 내보낸 216 × 32 HAYAN100 PNG와 공식 SUIT v2.0.5·Inter v4.1 정적 TTF를 로컬 자원으로 포함했다. Expo Font로 앱 첫 렌더 전에 로드하고 라이선스 원문을 함께 보관했다.
- 공용 경계: 로그인만 `finalAuth` 입력, `brandPill` 버튼과 확정 앱바 제목을 선택한다. 기존 인증·마일리지 화면의 기본 모양은 유지하고, 공용 푸터만 Figma 컴포넌트에 맞춰 Inter를 적용했다.
- 서버 경계: 이메일·비밀번호 검증과 서버 연동 대기 안내를 유지했으며 가짜 세션, Token, 성공 이동을 추가하지 않았다.
- AI 지원: 확정 Figma 노드의 구조·치수·색·폰트·에셋을 현재 React Native 코드와 대조하고 영향 범위, 선택형 컴포넌트 API와 검증 기준을 정리했다.
- 개발자 판단: 로그인부터 순차 전환하기 위해 이전 인증 공용 브랜드를 전역 교체하지 않고 로그인 본문만 `plain` 화면으로 조합했다. 동작 없는 오른쪽 헤더 아이콘과 시각 효과가 없는 blur 의존성은 추가하지 않았다.
- 성능 및 생산성 수치: `[측정 필요]`.
```

위 기록에 `검증 결과` 항목을 반드시 추가하되 실행 범위에 맞는 완성 문장을 사용한다.

모든 검증을 수행한 경우:

```md
- 검증 결과: `pnpm typecheck`, `pnpm exec expo install --check`, `pnpm exec expo config --type public`, iOS·Android Metro export와 `git diff --check`를 통과했다. 390pt iOS 시뮬레이터와 360dp Android 기기에서 기본·오류·키보드·글자 확대 상태 및 공용 푸터 회귀를 확인했다.
```

Android 기기 확인을 수행하지 못한 경우:

```md
- 검증 결과: `pnpm typecheck`, `pnpm exec expo install --check`, `pnpm exec expo config --type public`, iOS·Android Metro export와 `git diff --check`를 통과했다. 390pt iOS 시뮬레이터에서 기본·오류·키보드·글자 확대 상태 및 공용 푸터 회귀를 확인했다. Android 실기기 상호작용과 시각 비교는 이번 검증에서 확인하지 않았다.
```

다른 항목이 미실행 또는 실패했다면 위 문장을 복사하지 않고 해당 결과와 미확인 범위를 정확히 기록한다.

서버 요구사항 백로그는 이번 시각 전환으로 바뀌지 않으므로 AUTH-001 내용을 수정하지 않는다.

- [ ] **Step 6: 최종 범위를 점검한다**

Run:

```bash
git status --short
git diff --stat
git diff --check
rg -n "hayan100Logo|finalAuth|brandPill|screenTitle|authBody|authAction|footerStrong" app components constants
```

Expected:

- 변경 파일이 이 계획의 생성·수정 목록과 일치한다.
- 로그인만 확정 입력·버튼·앱바 스타일을 선택한다.
- 기존 `hplusEcoLogo`, `colors.brand`, 기존 typography token이 삭제되거나 값이 바뀌지 않는다.
- 서버 API, 세션 Provider, Token 저장소와 새 전역 상태가 없다.

- [ ] **Step 7: 승인된 경우에만 검증 기록을 커밋한다**

```bash
git add docs/development-notes.md
git commit -m "docs(auth): record finalized login design"
```

---

## 3. 완료 조건

- `/login`이 Figma `154:634`의 브랜드, 앱바, 본문, 입력, 버튼, 링크와 푸터를 재현한다.
- 390pt에서 로고 216 × 32, 입력·버튼 350 × 52 기준과 모든 간격이 일치한다.
- SUIT와 Inter가 iOS·Android에서 로컬 자원으로 렌더링되고 원격 URL에 의존하지 않는다.
- 직접 `/login` 진입 시 불필요한 뒤로가기나 오른쪽 아이콘이 없다.
- 이메일·비밀번호 검증, 포커스 이동, 세 링크와 서버 연동 대기 안내가 현재와 동일하게 동작한다.
- 오류, 작은 화면, 키보드와 글자 확대에서 콘텐츠가 잘리거나 푸터를 덮지 않는다.
- 회원가입·계정 찾기·비밀번호 재설정·마일리지 버튼은 이전 기본 스타일을 유지한다.
- 공용 푸터는 모든 사용 화면에서 Inter 적용 후에도 문구가 겹치거나 잘리지 않는다.
- `pnpm typecheck`, `pnpm exec expo install --check`, `pnpm exec expo config --type public`, iOS·Android Metro export와 `git diff --check`가 통과한다.
- 실제로 수행하지 않은 기기·상호작용 검증을 완료했다고 기록하지 않는다.

## 4. 리뷰 순서

1. `app/login.tsx`: 확정 화면 구조와 기존 폼 동작 보존
2. `components/auth/FormTextField.tsx`, `components/auth/PrimaryButton.tsx`: 로그인 선택형 스타일과 기본 변형 비회귀
3. `app/_layout.tsx`, `components/AppBar.tsx`: 폰트 준비와 로그인 전용 앱바 제목
4. `constants/theme.ts`, `constants/assets.ts`, `assets/`: 디자인 토큰과 원본 자원
5. `components/auth/AppFooter.tsx`: 공용 푸터의 최종 타이포그래피
6. `package.json`, `pnpm-lock.yaml`: Expo SDK 57 의존성
7. `docs/development-notes.md`: 실제 판단과 검증 증거
