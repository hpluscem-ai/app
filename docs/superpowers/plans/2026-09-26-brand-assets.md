# 파비콘·OG·앱 아이콘 적용 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after explicit user approval. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제공된 Figma 원본을 사용자 웹의 파비콘·공유 미리보기와 iOS·Android 설치 앱 아이콘에 적용한다.

**Architecture:** 현재 Expo 설정과 SPA 웹 출력을 유지한다. 기존 파비콘·앱 아이콘 파일을 교체하고, OG 이미지와 초기 HTML 메타데이터만 추가한다. 새 React 컴포넌트나 의존성은 필요하지 않다.

**Tech Stack:** Expo `~57.0.13`, Expo Router `~57.0.13`, React Native `0.86.2`, Metro web.

**Spec:** 사용자 지정 순서에 따른 [파비콘 182:1668](https://www.figma.com/design/w9EEtYG5p4KoaVNlApRG0l/?node-id=182-1668), [OG 182:1669](https://www.figma.com/design/w9EEtYG5p4KoaVNlApRG0l/?node-id=182-1669), [앱 아이콘 182:2213](https://www.figma.com/design/w9EEtYG5p4KoaVNlApRG0l/?node-id=182-2213), 저장소 `AGENTS.md`.

## Global Constraints

- 2026-09-26 사용자가 와이어프레임·기본 적용안을 검토하고 구현을 승인했으며 `https://www.hayan100.kr/`를 전달했다.
- 기존 작업 변경은 사용자 소유로 보존한다. 새 브랜치·커밋·배포는 이번 요청에 포함하지 않는다.
- 로고를 다시 그리거나 색·비율·여백·테두리·문구를 임의 변경하지 않는다. 이미지 생성 모델과 참조 스크린샷을 제품 에셋 제작에 사용하지 않는다.
- 사용자 앱 웹·iOS·Android를 기본 범위로 제안한다. 어드민 웹 포함 여부는 확인 항목이다.
- 앱 이름·화면 UI·스플래시·스토어 등록 이미지·PWA 설치 아이콘·별도 다크/단색 아이콘은 이 계획에 추가하지 않는다.

## 확인한 원본과 현재 연결

| 구분 | Figma 원본 | 현재 상태 | 적용안 |
| --- | --- | --- | --- |
| 파비콘 | 48×48px | `assets/favicon.png` 48×48, `app.json`의 `expo.web.favicon`에 연결됨 | 같은 경로의 PNG 교체, 설정 재사용 |
| OG | 300×200px, 3:2 | OG 에셋·메타태그 없음. 웹은 기본 `single` 출력 | 전체 프레임을 `public/og.png`로 내보내고 `public/index.html`의 초기 `<head>`에 연결 |
| 앱 아이콘 | 1024×1024px | `assets/icon.png`가 `expo.icon`에 연결됨 | 같은 경로의 불투명 PNG 교체 |
| Android 별도 설정 | 제공된 별도 adaptive/단색 시안 없음 | `android.adaptiveIcon`이 공통 아이콘보다 우선하며 기존 전경·배경·단색 에셋 참조 | 기존 override를 제거하고 공통 아이콘 사용 제안 |

OG의 배경은 `#000047`, 테두리는 흰색 0.5px이고 프레임 안쪽 2px에 위치한다. 로고는 약 91.1914×92.3302px, 위치는 left 약 104.642px·top 약 54.3009px다. 이 수치는 확인용이며, 구현에서는 재조립하지 않고 **전체 Figma 프레임을 그대로 export**한다.

## 승인한 적용 범위와 문구

1. **적용 범위:** 승인된 기본안인 사용자 웹·iOS·Android. 어드민 웹 변경은 포함하지 않는다.
2. **공유 정보:** 대표 주소는 `https://www.hayan100.kr/`, 이미지 주소는 `https://www.hayan100.kr/og.png`. 공유 제목은 기존 앱 서비스명 `하얀100`을 재사용한다. 지정되지 않은 설명은 생략하고 브라우저 제목은 기존 Expo 값을 유지한다.
3. **OG 출력:** 승인된 4배 export인 **1200×800 PNG**. Figma 원본은 300×200이고 3:2 구도를 유지한다.
4. **Android:** 승인된 공통 정사각형 아이콘을 사용하며 기존 adaptive override를 해제한다. 새 전경·배경·단색 시안은 만들지 않는다.

## Review Focus

- 작은 탭 아이콘에서 원본의 얇은 테두리·문자가 어떻게 보이는지 브라우저에서 확인한다. 가독성을 이유로 원본을 임의 수정하지 않는다. → Task 1.
- Android override가 남아 이전 아이콘을 표시하거나, 런처의 마스크가 로고를 가리는지 확인한다. → Task 2.
- JavaScript를 실행하지 않는 공유 크롤러도 초기 HTML에서 OG를 읽을 수 있어야 한다. → Task 3.
- 공개 OG 이미지가 인증·리디렉션 없이 이미지로 응답하고, 3:2 원본이 대상 공유 서비스에서 어떻게 잘리는지 확인한다. → Task 3.
- 재설정 링크의 쿼리 토큰이나 로그인 사용자 정보가 OG에 포함되지 않아야 한다. → Task 3.

## Task 1: 웹 파비콘 교체

**Files:** Modify `assets/favicon.png`. 기존 `app.json`의 파비콘 경로는 유지한다.

**Interfaces:** Figma `182:1668` → 48×48 PNG → `expo.web.favicon` → Expo가 생성하는 favicon 링크.

- [x] 구현 승인과 최신 diff를 확인한다.
- [x] Figma 파비콘 전체 프레임을 1배 PNG로 export하여 기존 파일을 교체한다. 제공된 배경·테두리를 포함한다.
- [x] `pnpm exec expo export --platform web --output-dir /tmp/hpluseco-brand-assets-web`로 별도 출력 경로를 생성하고 실제 favicon 응답과 링크를 확인한다. 기존 서버나 산출물을 덮어쓰지 않도록 실행 전 경로를 확인한다.
- [ ] 브라우저 탭에서 이전 아이콘 캐시와 새 응답을 구분해 확인한다. 모바일의 표시 위치·크기는 브라우저별로 확인하며 화면 안에 새 아이콘 UI를 추가하지 않는다.

## Task 2: iOS·Android 설치 앱 아이콘 교체

**Files:** Modify `assets/icon.png`, `app.json`의 `expo.android.adaptiveIcon` 설정만.

**Interfaces:** Figma `182:2213` → 1024×1024 불투명 PNG → 기존 `expo.icon` → 네이티브 빌드 아이콘.

- [x] Figma 전체 프레임을 1024×1024 PNG로 export한다. 원본의 정사각형·배경을 유지하며 둥근 모서리를 이미지에 굽지 않는다.
- [x] Android 기본안 승인 후 `adaptiveIcon` 객체를 제거해 공통 `icon`이 사용되도록 한다. 기존 Android 에셋 파일은 이 작업에서 불필요하게 삭제하지 않는다.
- [x] `pnpm exec expo config --type public`에서 공통 아이콘 경로와 Android 별도 override 해제를 확인한다.
- [ ] 새 iOS·Android 빌드를 설치해 홈 화면 아이콘·모서리·로고 잘림을 확인한다. Expo Go나 OTA 업데이트 확인을 설치 앱 아이콘 검증으로 대체하지 않는다.
- [ ] 런처 마스크 때문에 로고가 잘리면 결과를 제시하고 별도 적응형 시안을 확인한다. 임의 여백·축소·단색 디자인은 추가하지 않는다.

## Task 3: OG 이미지와 초기 HTML 연결

**Files:** Create `public/og.png`, `public/index.html`. `app/_layout.tsx`, 라우트, `web.output`, `vercel.json`은 변경할 필요가 없다.

**Interfaces:** Figma `182:1669` 전체 프레임과 확정된 제목·설명·대표 URL → SPA HTML의 공통 OG. `og:image`는 승인된 공개 웹 origin의 `/og.png` 절대 URL을 사용한다.

- [x] 출력 배율·제목·설명·대표 URL을 확정한다. 제목·설명은 확인된 문자열만 사용하고 설명을 원치 않으면 `og:description`을 생략한다.
- [x] OG **전체 프레임**을 PNG로 export한다. Figma가 제공한 내부 로고 SVG만 저장해 배경과 테두리를 잃지 않도록 확인한다.
- [x] 설치된 Expo SDK 57의 기본 HTML 템플릿을 바탕으로 `public/index.html`을 추가한다. root·viewport·기존 기본 스타일·번들 삽입 구조를 유지한다.
- [x] `<head>`에 `og:title`, `og:type=website`, `og:url`, `og:image`, `og:image:type=image/png`, 실제 출력 크기의 `og:image:width`·`og:image:height`, 확정된 `og:description`을 넣는다. 브라우저 `<title>`·기존 메타정보의 별도 변경이나 Twitter 전용 태그는 추가 요구가 있을 때 다룬다.
- [x] `pnpm exec expo export --platform web --output-dir /tmp/hpluseco-brand-assets-web` 후 `index.html` 원문에 각 OG 태그가 한 번씩 존재하고 `og.png`가 실제 이미지인지 확인한다. 현재 `single` 출력에서는 `app/+html.tsx`나 클라이언트에서만 실행되는 메타태그 처리를 사용하지 않는다.
- [x] 로컬 HTTP에서 `/`, `/login`, `/reset-password?token=local-metadata-check`의 초기 HTML을 확인한다. 공통 OG의 대표 URL은 고정하며 요청의 토큰·사용자 데이터가 OG에 들어가지 않아야 한다. 검증 문자열을 실제 재설정 토큰처럼 사용하지 않는다.
- [ ] 사용자 승인 후 공개 배포 환경에서 비로그인 HTML·OG 이미지가 HTTP 200으로 응답하는지 확인한다. 대상 공유 서비스의 미리보기 검사 도구에서 캐시 갱신·비율·테두리·로고 잘림을 확인한다. 로컬 확인을 실제 공유 검증 완료로 보고하지 않는다.

## 공통 검증과 완료 기준

- [x] `pnpm typecheck`, `git diff --check` 통과.
- [x] 앱 설정 변경에 대해 `pnpm exec expo install --check`, `pnpm exec expo config --type public` 확인. 의존성 자동 업데이트는 실행하지 않는다.
- [ ] 이미지 크기·투명도·Figma 대비 구도, 웹 빌드와 초기 HTML, 설치 앱 아이콘을 각각 검증한다. 정적 에셋 교체를 위한 새 테스트 프레임워크는 추가하지 않는다.
- [x] 웹·네이티브·공개 공유의 실제 검증 결과와 미검증 항목을 구분한다. 이번에 띄운 검증 서버만 종료한다.
- [x] 최종 diff에서 작업 대상 외 변경을 건드리지 않았는지 확인한다. 커밋은 별도 요청 시 수행한다.

## 근거

- [Expo SDK 57 문서](https://docs.expo.dev/versions/v57.0.0/)와 [app config](https://docs.expo.dev/versions/v57.0.0/config/app/): `icon`, `web.favicon`, `android.adaptiveIcon`의 적용 관계.
- [Expo Metro의 static files](https://docs.expo.dev/guides/customizing-metro/#static-files): `public/` 정적 파일과 SPA의 `public/index.html` 템플릿 지원. 로컬 설치 CLI의 `webTemplate.js`·`exportApp.js`에서도 확인했다.
- [Expo 앱 아이콘 안내](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/#app-icon): PNG·정사각형·불투명 배경과 네이티브 마스크. 로컬 `withAndroidIcons.js`에서 adaptive 설정 없는 공통 아이콘 사용 경로를 확인했다.
- [Open Graph protocol](https://ogp.me/): 초기 문서 `<head>`의 기본 메타정보와 이미지 속성.

## 2026-09-26 실행 결과

- Figma 전체 프레임 export 원본으로 파비콘 48×48, OG 1200×800, 앱 아이콘 1024×1024를 저장했다. 세 파일 모두 불투명 이미지임을 확인했다.
- `pnpm typecheck`, `git diff --check`, Expo public config 검사와 웹 export가 통과했다. 산출물은 별도 임시 디렉터리를 사용했다.
- 초기 HTML에 OG 태그 7개·고정 HTTPS 주소·favicon 링크 1개가 존재한다. 생성 ICO는 16/32/48px 3개 크기를 포함한다.
- 임시 HTTP 서버에서 `/`, `/login`, `/reset-password?token=local-metadata-check`의 초기 OG를 확인했다. URL 쿼리를 메타정보에 복사하지 않는다. `/og.png`와 `/favicon.ico`는 비로그인 HTTP 200·정상 이미지 MIME·빌드 파일과 동일한 바이트로 응답했다.
- 브라우저에서 메타태그·파비콘 링크·OG 및 ICO 이미지 표시를 확인했다. 브라우저의 탭 크롬·모바일 브라우저별 표시·실제 공유 서비스 미리보기는 별도 확인이 남는다. 임시 origin의 세션 확인 오류로 앱 본문은 인증 오류 안내였으며, 인증 흐름 검증으로 보고하지 않는다.
- `pnpm exec expo install --check`는 기존 설치 패키지 15개의 권장 버전 차이로 실패했다. 이 작업에서 패키지·잠금파일을 변경하지 않았다.
- 독립 코드 리뷰에서 수정이 필요한 결함은 발견되지 않았다.
- iOS 시뮬레이터 목록은 확인했으나 로컬 Xcode 16.4가 SDK 57 문서의 Xcode 26.4+ 요구보다 낮고, 연결된 Android 기기도 없어 설치 앱 검증은 수행하지 않았다. 네이티브 홈 화면·마스크는 새 빌드 후 확인해야 한다.
- 임시 HTTP 서버·검증 탭·이번에 시작된 ADB 데몬은 종료했다. 운영 배포·공유 서비스 캐시 갱신·커밋은 수행하지 않았다.
