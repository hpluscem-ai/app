# 앱·웹 로그인, 지도, 공통 알림 구현 계획과 실행 결과

작성일: 2026-09-10. 승인된 코드를 반영하고 로컬 검증을 수행했다. **네이버 Client ID와 TMAP AppKey 발급 후 실제 지도·모바일 앱 호출 검증이 남아 있다.** 새 브랜치·커밋·하위 에이전트는 사용하지 않았다.

## 승인된 범위와 결과

| 항목 | 구현 결과 | 남은 확인 |
| --- | --- | --- |
| 웹 로그인 | 기존 기사 세션을 HttpOnly 쿠키로 발급, `/auth/me` 후 인증 상태 변경 | 실제 운영 도메인·Safari |
| 네이티브 로그인 | SecureStore·Bearer 계약 유지, 저장 책임만 플랫폼 파일로 이동 | iOS·Android 실기기 복원 |
| 공통 웹 폭 | `app/_layout.tsx` 한 곳에서 100%·maxWidth 640·가운데 정렬 | 없음 |
| 일반 알림 | 기존 NoticeModal 사용, 기존 문구·확인 콜백 유지 | 실제 SMS 가입 성공 후 확인 이동 |
| 웹 사진 선택 | 업로드 카드에서 브라우저 기본 파일 선택창을 즉시 열고 기존 ImagePicker 검증·미리보기 사용 | 파일 선택창 취소·Safari·모바일 실기기 |
| 웹 지도 | 네이버 JS SDK·기존 마커·Supercluster·StationSheet 연결 | Client ID 발급 후 지도 표시·마커·클러스터·위치 |
| 웹 길안내 | 데스크톱은 네이버, 모바일은 TMAP AppKey가 있으면 TMAP Invoke; 키가 없으면 네이버 | AppKey 발급·휴대폰 설치/미설치 |
| 네이티브 지도 | 현재 react-native-maps·티맵 유지 | 실기기 회귀 |

사용자는 한 장의 Desktop/Mobile 와이어프레임을 승인하고 웹 최대 폭 640px을 지정했다. 이후 기존 모달의 촬영·갤러리·취소와 모바일 웹 티맵 연결 준비를 승인했다. 사진 선택은 후속 요청과 새 와이어프레임 승인에 따라 웹에서 기본 파일 선택창을 바로 여는 방식으로 변경했다. 실제 주유소 API, 사진 서버 업로드·OCR, 운영 배포와 SDK 일괄 업데이트는 이번 범위가 아니다.

## 구현 순서

- [x] 기존 변경·컴포넌트·서버 계약 검토와 와이어프레임 승인
- [x] 웹 로그인·쿠키 인증·Origin/CORS 검사와 Swagger·서버 회귀 검사
- [x] 플랫폼별 세션 처리와 공통 AuthProvider 연결
- [x] 기존 NoticeModal 연결, 사진 선택 확장, 루트 640px 적용
- [x] 웹 지도와 네이티브 import 분리, 길안내 URL 연결
- [x] 타입·앱 테스트·서버 검사·세 플랫폼 export·Chrome의 실제 쿠키 흐름 검증
- [ ] 네이버/티맵 키를 설정하고 실제 지도·모바일 앱 호출 검증
- [ ] Safari와 iOS·Android 실기기 확인

## 웹 인증 계약

모든 경로는 `/api/v1` 아래다. 기존 AuthService와 기사 세션 테이블을 재사용한다.

| 요청 | 동작 |
| --- | --- |
| `POST /auth/login` | 기존 네이티브 `{ token, expiresAt }` 유지 |
| `POST /auth/web/login` | 허용 Origin 필수, `{ expiresAt }`와 HttpOnly 쿠키, JSON 토큰 없음 |
| `GET /auth/me` | 기존 Bearer 또는 기사 세션 쿠키로 현재 사용자 확인 |
| `POST /auth/logout` | 현재 세션만 폐기, 쿠키 인증이면 쿠키 삭제 |

- 쿠키: `hpluseco_driver_session`, HttpOnly, SameSite=Lax, Path=/api/v1, Domain 생략, 기존 세션 만료 시각 사용. 운영 Secure=true, NODE_ENV=development/test만 false.
- 브라우저의 로그인·본인 조회는 `credentials: include`; 공개 가입/SMS 계약과 네이티브 Bearer는 기존대로 유지한다. 비밀번호·인증번호·증명·웹 토큰을 JS 저장소에 보관하지 않는다.
- Authorization이 있으면 Bearer만 검증하며 잘못된 Bearer를 쿠키로 보완하지 않는다. 같은 이름의 쿠키 중복과 잘못된 토큰 형식을 거부한다.
- `WEB_ORIGINS`는 정확한 HTTP(S) Origin 목록이다. 와일드카드를 허용하지 않는다. 웹 로그인과 쿠키 인증 변경 요청은 Origin을 검사하고 누락·null·미허용은 `403 WEB_ORIGIN_NOT_ALLOWED`로 거부한다.
- `401 INVALID_SESSION`만 세션을 정리한다. 네트워크·DB·500 오류에는 세션을 보존하고 재시도 안내를 표시한다. 기존 30일/미사용 7일·다중 기기·비활성 소속·전체 세션 폐기 정책을 유지한다.
- 웹/API는 같은 사이트를 사용한다. 다른 사이트의 배포는 실제 도메인·쿠키·CSRF 계약을 다시 검토해야 한다. 쿠키는 포트별로 격리되지 않는다.

## 로컬 실행과 키 설정

서버의 Git 제외 `.env`에 비어 있던 `NODE_ENV=development`와 `WEB_ORIGINS`를 추가했다. 허용 대상은 localhost:8081, 127.0.0.1:8081, 기존 앱 API LAN 호스트의 :8081이다. 기존 비밀 값과 앱 `.env.local`은 보존했다. 기존 서버를 임의로 종료하지 않았으므로 이미 실행 중인 서버에는 재시작이 필요할 수 있다.

```sh
# 서버 디렉터리
pnpm start:dev

# 앱 디렉터리
pnpm web
```

현재 앱 API가 LAN IP를 사용하므로 **웹도 같은 LAN IP의 8081 포트로 접속한다.** localhost 웹과 LAN API를 섞으면 SameSite=Lax 쿠키가 정상 전달되지 않는다. 포트를 변경하면 서버 허용 Origin도 맞춘다.

앱 `.env.local`에 실제 발급값을 추가한다. 예시 키 이름은 `.env.example`에 있다.

```dotenv
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=
EXPO_PUBLIC_TMAP_APP_KEY=
```

네이버 신규 Maps의 Web Dynamic Map을 선택하고 실제 웹 서비스 URL을 등록한다. Client ID는 SDK의 `ncpKeyId`에 전달하며 Client Secret은 앱에 넣지 않는다. TMAP AppKey가 있으면 모바일 브라우저에서 공식 `https://apis.openapi.sk.com/tmap/app/routes`로 연결한다. 앱 설치 여부를 타이머나 `canOpenURL` 성공값으로 추측하지 않는다. 키 미설정 시에는 목적지 좌표·이름을 포함한 네이버 길찾기 URL을 사용한다. 기존 임시 좌표의 길안내 차단은 유지한다.

[네이버 JS 시작 가이드](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html), [TMAP 공식 모바일 웹 호출](https://tmapapi.tmapmobility.com/main.html#webv2/sample/webSample61)

## 실제 검증 결과

- 앱: 최종 `pnpm typecheck`, `node --experimental-strip-types --test tests/authApi.test.mjs tests/mapDirections.test.mjs` 8개, `git diff --check` 통과. 테스트 수에는 병행 작업에서 추가한 복구 계약 검사도 포함된다.
- 서버: TypeScript·변경 파일 ESLint 통과. 전체 e2e 489개 중 Swagger의 새 403 기대값 한 건을 보완했고, 해당 파일 84개를 재실행해 통과했다. 웹 로그인·세션 대상 검사 82개도 통과했다.
- Expo: public config와 web/iOS/Android `expo export --platform all` 통과. `expo install --check`는 기존 10개 패키지의 권장 패치 차이로 실패했다. Sentry 조직/프로젝트 미설정과 기존 웹 그림자 경고가 남아 있다.
- Chrome + 실제 NestJS + 임시 메모리 DB: `/map` 미인증 접근의 로그인 이동, 잘못된 비밀번호의 기존 입력 오류, 서버 소속 목록, 정상 쿠키 로그인과 실제 사용자 이름, 새로고침 후 인증 유지 확인.
- 공통 폭: 1920px 뷰포트에서 루트 폭 640px·왼쪽 640px, 390px 뷰포트에서 루트 폭 390px·왼쪽 0px 확인. 로그인·회원가입·지도에서 공통 경계가 적용됐다.
- 초기 모달 검증: 당시 사진 세 선택지, Tab 포커스 순환, 갤러리 테스트 PNG의 실제 미리보기, 취소, 사진 누락 검증 안내를 확인했다. 사진 선택 모달은 후속 사용자 요청으로 제거했으므로 이 결과를 변경 후 직접 파일 선택 검증으로 간주하지 않는다. 실제 개인 사진·SMS·메일은 전송하지 않았다.
- 2026-09-11 직접 파일 선택 검증: 타입·diff 검사·웹 export와 웹/네이티브 선택 분기 검사가 통과했다. 사용자가 승인한 임시 메모리 DB 계정으로 Chrome에서 두 업로드 카드의 기본 파일 선택 이벤트, 선택 모달 없음, PNG 미리보기·삭제와 사진 누락 시 단일 확인 모달을 확인했다. 390px에서 가로 넘침이 없었다. 자동화의 file chooser는 빈 파일 배열을 허용하지 않아 실제 취소는 미검증이다. 검증 서버·탭을 종료하고 뷰포트를 복원했다.
- 지도: 키 미설정 시 기존 모달 안내와 무한 로딩 방지 확인. 실제 네이버 페이지에서 이름·좌표가 입력된 자동차 길찾기 링크의 리다이렉트를 확인했다. 네이버 타일·클러스터 클릭·위치 마커·TMAP 앱 실행은 미검증이다.
- 검증 환경: SDK 57 개발용 가상 env 모듈이 `.env.local` 값을 셸 변수 위에 덮는 것을 확인했다. 사용자 파일을 바꾸지 않고 `EXPO_NO_DOTENV=1`, 검증 주소, `expo export --clear`로 만든 정적 빌드와 메모리 API를 한 주소에서 사용했다. CORS·Origin 분기는 서버 e2e로 확인했으며 브라우저 검증은 동일 Origin이었다. JS 저장소 내용은 브라우저 도구에서 읽을 수 없었으며, 토큰 비노출은 코드와 서버 응답 테스트로 확인했다.
- 검증용으로 실행한 서버는 모두 종료하고 Chrome의 테스트 뷰포트를 복원했다. 기존 사용자의 개발 서버는 종료하지 않았다.

## 이번 변경의 리뷰 순서

아래는 이번 웹 대응에서 변경한 파일이다. 기존 네이티브 인증·회원가입의 선행 변경과 새로 발견된 다른 작업 파일은 되돌리지 않았다.

| 순서 | 파일 | 확인할 책임 |
| --- | --- | --- |
| 1 | 서버 `src/auth/auth-web-session.ts`, `src/auth/auth-session.guard.ts`, `src/app.setup.ts` | 쿠키 옵션·Origin·CORS·Bearer 우선순위·실패 시 삭제 조건 |
| 2 | 서버 `src/auth/auth.controller.ts`, `src/auth/auth-login.dto.ts`, `src/auth/index.ts`, `src/users/users.controller.ts`, `src/stations/stations.controller.ts` | 웹 로그인 응답·현재 세션 로그아웃·Swagger 보안 계약 |
| 3 | 앱 `utils/authApi.ts`, `utils/authSession.ts`, `utils/authSession.web.ts`, `components/AuthProvider.tsx` | 쿠키/보안 저장 분리·본인 조회 후 인증·네이티브 서버 주소 격리 |
| 4 | `app/_layout.tsx`, `components/NoticeProvider.tsx`, `components/NoticeModal.tsx`, `utils/alerts.ts` | 루트 640px·공통 알림·취소/확인·콜백 1회 |
| 5 | `components/map/MapCanvas.tsx`, `MapCanvas.web.tsx`, `types.ts`, `index.ts`, `StationMarker.tsx`, `StationMarkerContent.tsx` | 네이티브 import 분리·SDK 수명·마커 DOM·bounds·resize |
| 6 | `app/map.tsx`, `components/map/StationSheet.tsx`, `utils/mapDirections.ts` | 공통 선택 상태·길안내 분기·기존 좌표 차단 |
| 7 | `components/mileage/MileagePhotoForm.tsx`, `components/mileage/UploadCard.tsx` | 웹 기본 파일 선택·네이티브 촬영 요청·기존 파일 검증·플랫폼별 접근성 안내 |
| 8 | `app/login.tsx`, `app/sign-up.tsx`, `app/find-email.tsx`, `app/find-password.tsx`, `app/reset-password.tsx`, `app/mypage.tsx`, `app/mileage/apply.tsx`, `app/mileage/[status].tsx` | 기존 알림 호출의 Hook 연결·기존 폼/대기 계약 보존 |
| 9 | 앱 `tests/authApi.test.mjs`, `tests/mapDirections.test.mjs`; 서버 `test/login.e2e-spec.ts`, `auth-session.e2e-spec.ts`, `change-password.e2e-spec.ts`, `stations.e2e-spec.ts`, `users.e2e-spec.ts`, `password-reset-email.e2e-spec.ts`, `phone-verification.e2e-spec.ts` | 새 쿠키 계약·보안 회귀·길안내 인코딩·Swagger 검사 |
| 10 | 앱/서버 `.env.example`, 서버 Git 제외 `.env`, 앱 `package.json`, `pnpm-lock.yaml`, `AGENTS.md`, `docs/development-notes.md`, 이 계획 | 로컬 설정·두 지도 키·개발 타입 의존성·승인 및 검증 기록 |

## 비용 비교 기록

### 지도 비용 비교

2026-09-10 확인한 일반 종량제 기준이다. 웹의 동적 지도 표시만 비교하며, 아래 사용량은 예상 트래픽이 아닌 계산 예시다.

| 웹 지도 | 월 무료 이용량 | 월 10만 건 이용 예시 |
| --- | --- | --- |
| 네이버 신규 Maps의 Dynamic Map | 대표 계정 1개에 월 600만 건 | 무료 이용량이 남아 있으면 **0원** |
| Google Maps JavaScript의 Dynamic Maps | 월 1만 건 | **US$630** |

Google 계산: `(100,000 - 10,000) / 1,000 × US$7 = US$630`. 첫 유료 구간은 월 총 10만 건까지 1,000건당 US$7이며 이후 구간 할인은 별도다. [Google 공식 요금](https://developers.google.com/maps/billing-and-pricing/pricing)

네이버 무료량은 **신규 Maps 상품의 대표 계정 조건**을 확인해야 한다. 기존 AI NAVER API 안의 지도 상품은 무료량이 없으므로 혼동하지 않는다. 동일 계정의 다른 사용량도 확인한다. 공개 상품 페이지에서 초과 구간의 숫자 단가가 표시되지 않아, 600만 건을 넘는 견적은 콘솔에서 실제 적용 단가를 확인한 뒤 계산한다. [네이버 공식 상품·요금](https://www.ncloud.com/api-cms/service-product/static/maps)

두 서비스 모두 무료량 안에서는 지도 표시 비용이 0이다. 위 조건에서 웹 사용량이 커질 때는 네이버가 유리하므로 추천한다. 환율·세금·주소 검색·경로 계산 등 별도 API 비용은 계산에 포함하지 않았다. Google의 기본 모바일 Maps SDK는 무료 사용량이 무제한으로 표기되어 있으며, 웹 JavaScript 요금과 구분해야 한다. [Google SDK 요금](https://developers.google.com/maps/billing-and-pricing/pricing)

웹은 네이버, 네이티브 앱은 현재 플랫폼 지도를 유지하는 구성을 확정했다. 공급자 선택 기능을 추가하지 않는다.
