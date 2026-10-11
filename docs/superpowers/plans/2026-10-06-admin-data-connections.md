# 어드민 누적 집계·문서 연결·반려 사유 확인 Implementation Plan

> **실행 방식:** 와이어프레임과 아래 해석을 사용자가 승인한 뒤 현재 대화에서 직접 순서대로 구현한다. 이 사이드 대화에서는 서브에이전트를 사용하지 않는다. 실행 시 `superpowers:executing-plans`를 따른다.

**Goal:** 기사 목록의 두 누적값을 서버에 연결하고, 푸터 문서 연결·반려 사유 조회·OCR 두 상태의 0 표시를 적용한다.

**Architecture:** 기존 기사 조회 API에 숫자 두 개를 추가한다. 영수 목록과 공용 푸터는 기존 컴포넌트를 확장하며 신규 API·라이브러리·DB 열을 만들지 않는다.

**Tech Stack:** React 19 / TypeScript / Vite, NestJS 11 / Drizzle / PostgreSQL, 기존 Node test / Jest·Supertest.

**Spec:** 2026-10-06 이 대화의 사용자 요구사항. [어드민 작업 규칙](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/AGENTS.md), [앱 작업 규칙](/Users/sangkun/nocoders/hpluseco/hpluseco-app/AGENTS.md), [검토용 와이어프레임](/Users/sangkun/.codex/visualizations/2026/10/06/01a10ffa-0514-7e43-88f2-f493530bec4a/admin-data-connections-wireframe.png).

## Global Constraints

- 2026-10-06 계획·와이어프레임·해석 승인 뒤 구현을 완료했다. 실행 근거는 아래 기록을 따른다.
- 어드민은 데스크톱만 지원한다. 와이어프레임의 Mobile 칸은 지원 제외 표시다.
- 기사 두 누적값은 정산 여부와 관계없이 표시한다. 최종 금액은 천 단위 콤마, 미적립 마일리지는 `0`이다.
- OCR 실패·중복 의심의 일치여부 표시만 `-`에서 `0`으로 바꾼다. 서버 상태값은 바꾸지 않는다.
- 관리자 로그아웃은 그대로 둔다. 복수 기기 편집·주유소 및 기기 운영 상태 변경도 계속 보류한다.
- 기존 사용자 변경을 보존한다. 현재 앱의 `app.json`·`eas.json`, 서버의 `.DS_Store`는 이번 대상이 아니다.
- 새 브랜치·커밋·푸시·배포를 자동으로 수행하지 않는다. 기존 색·크기·표 열·가로 스크롤과 승인/정산 계약을 보존한다.
- 링크 밑줄을 추가하지 않는다. 새로운 hover/focus 효과나 새 UI 라이브러리를 추가하지 않는다.

## 승인된 요구와 해석

| 항목 | 계획 |
|---|---|
| 최종 금액 | 동일 기사 ID의 현재 승인된 신청 `final_amount`를 전체 기간 합산한다. 정산 대기·완료를 모두 포함하고 신청이 없으면 `0`을 표시한다. 승인 확정 금액 기준과 무거래 금액 `0`을 승인받았다. |
| 적립 마일리지 | 동일 기사 ID의 현재 승인된 신청 `mileage_amount`를 전체 기간 합산한다. 정산 대기·완료를 모두 포함하며 적립이 없으면 `0`이다. |
| 날짜 필터 | 기존 기사 가입일 필터를 유지한다. 금액·마일리지 합계에는 기간 제한을 추가하지 않는다. `누적`은 전체 기간으로 승인받았다. |
| 이용약관·개인정보 | 기존 공개 문서를 새 탭으로 연결하는 방식을 승인받아 적용했다. 원문을 복사하거나 수정하지 않는다. |
| 반려 사유 | 반려 행의 기존 승인여부 칸 아래에 `사유 보기` 텍스트 버튼을 승인받았다. 기존 `text-button`과 `NoticeDialog`를 재사용하고 새 열을 추가하지 않는다. |
| OCR 두 상태 | `ocr_failed`, `duplicate_suspected`는 `0`; `pending`은 기존 `-`; `matched`는 `일치`; `mismatched`는 `불일치`를 유지한다. |

공개 문서는 2026-10-06 브라우저에서 본문을 확인했다. [이용약관](https://www.hayan100.kr/term)과 [개인정보처리방침](https://www.hayan100.kr/privacy)의 현행 초안·회사 정보·문구를 임의로 고치지 않는다. 약관의 기사 앱 미정산 잔액 설명은 관리자 기사 목록의 전체 누적 통계와 구분한다.

## Review Focus

1. 정산 완료 후 기사 누적값이 감소하지 않는지 — Task 1의 완료 전후 같은 합계 검사.
2. 같은 소속·동명이인·탈퇴 후 재가입 계정의 이력이 섞이지 않는지 — Task 1의 기사 ID 분리 검사.
3. 정상 0과 API 실패·잘못된 숫자를 구분하는지 — Task 1·2의 범위 및 실패 검사.
4. 사유 조회가 승인/반려 요청을 보내거나 다른 행의 사유를 보여주지 않는지 — Task 3의 클릭·선택 변경 검사.
5. OCR 표시 변경이 정상 일치/불일치 및 판독 대기를 바꾸지 않는지 — Task 4의 다섯 상태 검사.

## 변경 파일과 책임

| 작업 | 파일 |
|---|---|
| 서버 집계·계약 | [users.repository.ts](/Users/sangkun/nocoders/hpluseco/hpluseco-server/src/users/users.repository.ts), [users.service.ts](/Users/sangkun/nocoders/hpluseco/hpluseco-server/src/users/users.service.ts), [admin-driver.dto.ts](/Users/sangkun/nocoders/hpluseco/hpluseco-server/src/users/admin-driver.dto.ts), [admin-drivers.controller.ts](/Users/sangkun/nocoders/hpluseco/hpluseco-server/src/users/admin-drivers.controller.ts) |
| 기사 화면·응답 검사 | [drivers.ts](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/src/drivers.ts), [DriverDataPage.tsx](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/src/pages/DriverDataPage.tsx) |
| 반려 사유·OCR 표시 | [ReceiptDataPage.tsx](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/src/pages/ReceiptDataPage.tsx), [App.css](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/src/App.css)의 해당 행 내부 배치만. 공용 `NoticeDialog`는 기본 사용 방식 유지. |
| 문서 링크 | [Footer.tsx](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/src/components/Footer.tsx), 필요한 경우 같은 `App.css`의 푸터 링크 밑줄 제거만 |
| 검사·기록 | [admin-drivers.e2e-spec.ts](/Users/sangkun/nocoders/hpluseco/hpluseco-server/test/admin-drivers.e2e-spec.ts), [drivers.test.mjs](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/tests/drivers.test.mjs), [receipts.test.mjs](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/tests/receipts.test.mjs), [admin-qa.md](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/admin-qa.md), [development-notes.md](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/development-notes.md)와 해당 저장소의 승인 정책 |

## Task 1: 기사 누적값을 서버에서 반환

**Interfaces:** `GET /api/v1/admin/drivers`의 기존 기사 객체에 `totalAmount: number`, `mileage: number`를 추가한다. 두 값은 0 이상 안전 정수다. 기존 `UsersService.findDrivers(query)`와 목록 응답 형태를 유지한다.

- [x] 기존 서버 테스트의 기본 응답에 두 숫자를 추가하고 아래 집계 사례를 먼저 작성한다.
- [x] 기존 `UsersRepository.findDrivers(query)`에서 승인 신청을 `user_id`별로 한 번 집계해 기사 목록에 LEFT JOIN한다. 정산 ID/상태 필터는 넣지 않는다. 없는 합계는 SQL에서 0으로 처리하고 큰 합계는 문자열 등 정밀도가 유지되는 형태로 서비스에 전달한다. 기사별 추가 쿼리는 만들지 않는다.
- [x] `UsersService.findDrivers`에서 두 합계를 `Number.isSafeInteger` 및 0 이상 조건으로 검사한다. 범위를 넘으면 오류로 처리하고 잘라내거나 반올림하지 않는다. DTO·Swagger에서 누적 의미와 가입일 필터의 의미를 명시한다.
- [x] 격리된 테스트 DB에서 기존 기사 API 테스트를 실행한다. 명령: 서버 디렉터리에서 `pnpm exec jest --config ./test/jest-e2e.json --runInBand test/admin-drivers.e2e-spec.ts`. `TEST_DATABASE_URL`은 전용 로컬 PostgreSQL이어야 하며 운영 DB를 지정하지 않는다.

검사 기대값:

| 사례 | 기대값 |
|---|---|
| 같은 기사: 정산 완료 승인 10,000원/200마일 + 미정산 승인 5,000원/100마일 | `totalAmount = 15000`, `mileage = 300` |
| 위 미정산 건도 정산 완료로 변경 | 동일하게 `15000`, `300` |
| 대기·반려 신청만 있거나 신청 0건 | `0`, `0` |
| 다른 기사·같은 회사·동명이인·탈퇴 뒤 새 ID | 각 기사 ID의 이력만 합산 |
| 가입일 검색 범위를 변경해 같은 기사가 계속 조회됨 | 그 기사의 전체 기간 합계 유지 |
| 합계가 안전 정수 범위를 넘음 | 정상 숫자로 반환하지 않음 |

## Task 2: 기사 목록의 기존 두 열에 값 표시

**Interfaces:** Task 1의 응답을 `getDrivers(query?: DriverQuery): Promise<Driver[]>`가 읽고, `Driver`에 `totalAmount: number`, `mileage: number`를 추가한다.

- [x] 기존 기사 fixture와 `-` 고정 기대값을 숫자 응답·렌더링 검사로 교체한다. `15000 → 15,000`, `300 → 300`, `0 → 0`을 확인한다.
- [x] `drivers.ts`에서 두 숫자를 응답 검증·필드 선택에 포함한다. 누락·null·음수·소수·안전 정수 초과를 정상 응답으로 받지 않는다.
- [x] `DriverDataPage`의 두 기존 열에서 `toLocaleString('ko-KR')`로 표시한다. 표 구조·가입일 필터·소속·검색·탈퇴 동작은 유지한다.
- [x] `node --test tests/drivers.test.mjs`를 실행한다. API 실패 시 정상 0을 만들지 않고 기존 성공 목록과 오류 팝업을 유지하는 회귀를 포함한다.

## Task 3: 기존 반려 사유를 조회하는 팝업

**Interfaces:** 기존 `Receipt.rejectionReason: string | null`과 `status`를 사용한다. 새 조회/수정 API는 만들지 않는다.

- [x] 와이어프레임의 `사유 보기` 위치와 `gap: 4px` 제안을 사용자에게 승인받는다. 표 셀의 기존 52px 높이·중앙 정렬을 유지한다.
- [x] 반려 상태이며 사유가 비어 있지 않은 행의 승인여부 칸 아래에 기존 `.text-button` 방식의 `사유 보기`를 추가한다. 정산 편입 여부는 사유 조회를 막는 조건으로 사용하지 않는다.
- [x] 선택한 행의 사유를 `NoticeDialog`의 `message`로 그대로 전달한다. 버튼은 기존 `확인`만 사용한다. 사유 입력·저장·심사 팝업과 조회 팝업이 겹치지 않도록 해당 페이지의 상태만 조정한다.
- [x] `receipts.test.mjs`에서 사유 확인 클릭이 새 HTTP 요청을 만들지 않음, 선택한 행의 정확한 사유, 닫기·다른 행 선택, 사유 없는 행의 버튼 부재, 조회/검색 변경 뒤 이전 팝업 재노출 방지를 검사한다. 기존 새 사유 입력·반려 요청 회귀도 통과시킨다.

## Task 4: OCR 표시와 푸터 문서 연결

**Interfaces:** 기존 `Receipt.matchStatus`를 유지한다. 푸터 링크 대상은 `https://www.hayan100.kr/term`, `https://www.hayan100.kr/privacy`다.

- [x] 일치여부 렌더링의 다섯 상태를 검사한다: `ocr_failed → 0`, `duplicate_suspected → 0`, `pending → -`, `matched → 일치`, `mismatched → 불일치`. 다른 금액의 null 표시와 승인/정산 로직은 변경하지 않는다.
- [x] 사용자에게 요청한 문서 연결 방식의 답변을 반영한다. 새 탭 방식이 승인되면 푸터의 기존 두 문구만 `<a target="_blank" rel="noopener noreferrer">`로 전환하고 원래 URL을 그대로 사용한다. 내부 페이지 방식이 선택되면 본문 복사·페이지 배치 계획부터 수정하고 승인받는다.
- [x] 문구·글자 크기·굵기·간격을 유지하고 링크 밑줄을 제거한다. 새 문서를 작성하거나 현재 초안의 법률 내용을 수정하지 않는다.
- [x] 데스크톱 브라우저에서 로그인/관리자 화면의 두 문서 클릭, 올바른 본문과 URL, 관리자 화면의 조회 조건 유지, 밑줄 부재를 확인한다. 이 단순 링크 변경만을 위한 테스트 프레임워크는 추가하지 않는다.

## Task 5: 최종 확인과 완료 기록

- [x] 어드민에서 `node --test tests/drivers.test.mjs tests/receipts.test.mjs`, `pnpm build`, `pnpm lint`를 실행한다. 서버에서 `pnpm exec tsc --noEmit`과 `pnpm exec eslint src/users/admin-driver.dto.ts src/users/admin-drivers.controller.ts src/users/users.repository.ts src/users/users.service.ts test/admin-drivers.e2e-spec.ts`를 실행한다. 서버의 `pnpm lint`는 `--fix`를 포함하므로 자동 수정 용도로 실행하지 않는다.
- [x] 기사 누적 표시·반려 사유 팝업·OCR 두 상태·문서 이동을 데스크톱 브라우저에서 확인한다. 새 반려 사유 저장과 정산 완료 전후 누적값을 격리 데이터로 비교한다. 실제 사용자 반려·송금·운영 DB를 사용하지 않는다.
- [x] 기존 QA의 DR-02와 이번 영수/푸터 기대값, 승인된 집계·표시 정책을 갱신한다. 자동 검사와 실제 브라우저 확인을 구분하고 미실행 항목을 통과로 바꾸지 않는다.
- [x] 세 저장소의 최종 diff를 확인해 대상 밖 변경과 기존 사용자 변경의 보존을 확인한다. 실행 증거에 따라 완료 처리하고 기존 전체 검사 실패는 별도 기록한다.

## 구현 전 승인 완료

1. 승인 확정 금액·마일리지의 **전체 기간 누적** 해석과 신청 0건의 최종 금액 `0`.
2. 푸터 문서의 **기존 공개 문서 새 탭 연결 / 어드민 내부 본문** 선택.
3. **기존 승인여부 칸 아래 사유 보기 → 공용 조회 팝업**, 신규 버튼 간격 `gap: 4px` 제안 승인.

위 세 항목은 사용자 `ㄱㄱㄱ`로 승인받았다. 구현 체크는 아래 실행·검증 결과로 완료 처리한다.

## 실행 기록

- 2026-10-06 사용자 `ㄱㄱㄱ`로 계획·와이어프레임·해석을 승인했다. 기존 문서 새 탭 연결을 적용한다.
- Pre-flight: Task 1 응답 `totalAmount`·`mileage`를 Task 2가 같은 이름으로 소비한다. Task 3·4는 기존 `Receipt` 계약을 유지한다.
- Ruling: 기존 main에서 승인 범위만 수정하고 서브에이전트·브랜치·커밋·별도 실행 문서를 만들지 않는다 — 사용자 작업 규칙과 사이드 대화 범위가 스킬 기본 절차보다 우선한다. 진행 증거는 이 계획에 남긴다.


### 완료 및 검증

| 단계 | 실행 근거 |
|---|---|
| Task 1 | 서버 기사 HTTP 테스트 21/21. 정산 완료+미정산 승인 합계와 이후 모두 정산 완료의 같은 15,000/300, 가입일 필터, 동명·재가입 ID, 범위 초과 500, Swagger를 확인했다. 최종 TypeScript·변경 파일 ESLint도 종료 코드 0이다. |
| Task 2 | 기사 응답 검사·콤마·정상 0·잘못된 값·마지막 성공 목록 유지 회귀가 통과했다. 실제 로컬 API 화면에서도 15,000/300·0/0을 확인했다. |
| Task 3 | 저장된 사유 조회·HTTP 요청 부재·빈 사유·다른 행·팝업 배타성·기존 새 사유 저장을 자동/브라우저에서 확인했다. 직접 리뷰에서 늦은 목록 교체의 이전 사유를 발견해 실패 재현→한 줄 수정→42개 통과를 확인했다. |
| Task 4 | 다섯 OCR 상태를 자동/브라우저에서 확인했다. Chrome에서 로그인·기사 목록의 각 푸터 링크가 정확한 URL/원문을 새 탭으로 열고 밑줄이 없으며 기존 조회 조건을 유지했다. |
| Task 5 | 관련 어드민 42/42+서버 21/21, 어드민 빌드·Oxlint, 서버 타입·대상 ESLint, diff 검사 통과. 정책·QA·개발 기록과 캡처를 갱신했다. 전체 검사에서 기존 실패 7개는 HEAD 복사본에서도 재현해 별도 기록했다. |

- 전체 검사: 어드민 105/111, 서버 단위 178/179. 기존 물류사 fixture 누락 6개와 migration journal 테스트 1개는 이번 변경과 분리했다. 실패 이름·원인·로그는 [개발 기록](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/development-notes.md)에 모두 남겼다.
- QA 문서 테스트는 기존 어드민 `UP-139` 중복으로 실행 준비 단계에서 실패했다. HEAD에도 같은 중복이 있다. 신규 4개 ID의 단일 존재와 기존 중복을 메모리에서 제외한 전체 문서 렌더를 별도로 확인했다. 임시 API·Vite·자체 QA DB를 정리했다.
- 직접 최종 리뷰에서 추가 수정 필요 사항은 발견하지 않았다. 사이드 대화 규칙에 따라 독립 에이전트 리뷰는 하지 않았다.
- [기사 누적 화면](/Users/sangkun/.codex/visualizations/2026/10/06/01a10ffa-0514-7e43-88f2-f493530bec4a/admin-driver-totals-qa.jpg), [반려 사유 화면](/Users/sangkun/.codex/visualizations/2026/10/06/01a10ffa-0514-7e43-88f2-f493530bec4a/admin-rejection-reason-qa.jpg): 실제 로컬 서버의 격리 가상 데이터.
- 배포 순서: 서버 → 어드민. 새 계약을 읽는 어드민보다 서버를 먼저 반영한다. 커밋·푸시·배포는 이번 실행에 포함하지 않았다.
