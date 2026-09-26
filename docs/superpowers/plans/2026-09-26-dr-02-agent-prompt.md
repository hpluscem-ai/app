# DR-02 구현 에이전트와 복사용 프롬프트

이 문서는 기사 목록의 `최종 금액`·`적립 마일리지` 두 열을 실제 서버 값으로 연결할 담당 에이전트를 정의한다. [어드민 QA 수정 계획](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/superpowers/plans/2026-09-26-admin-qa-ui-fixes.md)의 실행 범위에는 포함되지 않는다. 이 문서만으로 집계 정책이나 UI 구현이 승인된 것은 아니다.

## 에이전트 배치

| 항목 | 지정 |
|---|---|
| 역할 | DR-02 전담 풀스택 구현 에이전트 1명 (`worker`). 기존 기사 조회 API부터 어드민 두 열까지 순서대로 담당한다. |
| 모델 | 실행하는 세션의 모델·추론 설정을 상속한다. |
| 서버 소유 | `src/users/admin-drivers.controller.ts`, `admin-driver.dto.ts`, `users.repository.ts`, `users.service.ts`, `test/admin-drivers.e2e-spec.ts`와 직접 필요한 테스트. |
| 어드민 소유 | `src/drivers.ts`, `src/pages/DriverDataPage.tsx`, `tests/drivers.test.mjs`. 기존 두 열과 `DataTable`을 유지한다. |
| 문서 소유 | 집계 정책 확정 뒤 앱 `docs/admin-qa.md`의 DR-02와 필요한 개발 기록. 다른 담당자의 변경을 보존한다. |

현재 `GET /api/v1/admin/drivers`는 기사 기본 정보만 반환하고 어드민 두 열은 `-`로 고정돼 있다. 영수 신청에는 `user_id`, `final_amount`, `mileage_amount`, `approval_status`, `decided_at`, `settlement_id`가 있다. 기사 목록의 날짜 필터는 현재 **가입일** 필터다. [서버 응답](/Users/sangkun/nocoders/hpluseco/hpluseco-server/src/users/admin-driver.dto.ts), [기사 목록](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/src/pages/DriverDataPage.tsx), [개발 기록](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/development-notes.md).

## 구현 전 결정할 집계 기준

에이전트는 다음 세 결정을 실제 예시와 함께 사용자에게 확인한다. 승인 전에는 합계 SQL·응답 의미·화면 숫자를 임의로 확정하지 않는다.

1. `최종 금액`은 기사별 **승인된 영수의 `final_amount` 합계**인가? 다른 상태나 OCR만 끝난 대기 건을 포함하는가?
2. `적립 마일리지`는 기사별 **누적 승인 마일리지**인가, **현재 미정산 잔액**인가? 정산 완료 건을 포함하는가?
3. 기사 목록의 기존 기간 필터는 가입일 기준이다. 두 합계도 기간 제한을 받는다면 승인일·신청일 중 어떤 날짜를 쓸 것인가? 기간 제한이 없다면 기사 필터와 집계 범위가 다름을 QA에 명시한다.

숫자가 확정됐지만 해당 기사의 대상 신청이 0건일 때 `0`을 표시할지, 아직 산출할 수 없어 `-`를 표시할지를 위 결정의 결과와 함께 구분한다. 예시 데이터: 승인 영수 10,000원·200마일리지 1건이 정산 완료되고, 대기 영수 5,000원 1건이 있는 기사. 위 세 결정에 따른 두 열의 기대값을 먼저 제시한다.

## 복사용 실행 프롬프트

```text
DR-02를 구현해줘. 목표는 어드민 소속 기사 목록의 기존 `최종 금액`과 `적립 마일리지` 두 열에 실제 서버 집계값을 표시하는 것이다.

서버: /Users/sangkun/nocoders/hpluseco/hpluseco-server
어드민: /Users/sangkun/nocoders/hpluseco/hpluseco-admin
앱 QA·개발 기록: /Users/sangkun/nocoders/hpluseco/hpluseco-app
먼저 세 저장소의 AGENTS.md, working-tree diff, 앱 docs/admin-qa.md의 DR-02, docs/development-notes.md의 기사 목록·정산 정책을 읽어라.

너는 DR-02 전담 풀스택 구현 에이전트다. 서버의 admin/drivers 조회 계약부터 어드민 두 열까지 소유한다. 혼자 작업하는 것이 아니며 다른 사람의 수정 내용을 되돌리거나 덮어쓰지 마라. 새 브랜치·커밋·배포를 임의로 하지 마라. 다른 담당자가 같은 파일을 고치고 있으면 충돌 부분을 먼저 조정해라.

현재 서버 GET /api/v1/admin/drivers와 AdminDriverResponseDto는 기사 기본 정보만 반환하고, 어드민 DriverDataPage.tsx의 두 열은 `-`로 고정돼 있다. 먼저 `users.repository.ts`의 기사 조회와 `mileage_applications`의 user_id/final_amount/mileage_amount/approval_status/decided_at/settlement_id, 정산 집계, 기사 본인 잔액을 끝까지 추적해라. 다른 기사·소속의 금액이 섞이지 않아야 한다.

집계 정책은 아직 미정이다. 구현 전에 사용자에게 아래 세 가지를 예시와 함께 확인해라.
1) 최종 금액에 승인 영수만 포함하는지.
2) 적립 마일리지가 누적 승인액인지 미정산 잔액인지, 정산 완료 건을 포함하는지.
3) 기사 목록의 가입일 기간 필터가 금액 집계에도 적용되는지. 적용된다면 승인일과 신청일 중 무엇을 기준으로 할지.
승인 완료·정산 완료 영수 10,000원/200마일리지 한 건과 대기 영수 5,000원 한 건으로 기대 화면값을 보여줘. 결정을 기다리는 동안 현재 코드·계약·테스트를 조사하되 합계 의미를 임의로 확정한 구현은 하지 마라.

정책이 확정되면 기존 GET /api/v1/admin/drivers 응답에 필요한 두 숫자만 추가하고 어드민의 기존 열에 연결해라. 별도 엔드포인트·클라이언트 전체 영수 조회·기사당 한 번씩 쿼리하는 N+1·가짜 합계는 만들지 마라. 서버에서 기사 ID로 집계하고 안전 정수 범위를 확인해라. 정상 0과 미조회/실패를 구분하고 API 실패를 0으로 표시하지 마라. 기존 기사 검색·소속·가입일 필터, 탈퇴 제외, 비활성 물류사 조회, 정렬, 세션 처리를 보존해라. 서버 승인 API가 아직 없어도 격리 테스트 데이터로 집계를 검증하고 실제 승인 흐름이 완료됐다고 보고하지 마라.

화면의 열·레이아웃·문구·색·간격은 유지해라. 어드민 UI 코드를 수정하기 전에 app AGENTS.md 형식의 러프 와이어프레임 이미지 정확히 한 장을 제시하고 사용자 승인을 받아라. QA 문서는 확정 계약에 맞춰 DR-02만 갱신하고 기존 완료 체크를 통과로 승계하지 마라.

서버 test/admin-drivers.e2e-spec.ts에 기사 분리, 승인/대기/반려, 정산 완료, 기간 경계, 대상 0건, 큰 합계의 최소 사례를 검증해라. 어드민 tests/drivers.test.mjs에는 실제 응답 두 숫자와 정상 0, 잘못된 응답·서버 실패를 검증해라. 서버 인증·권한과 기존 기사 목록 회귀도 실행해라. 정책 결정, 변경 파일, 실제 테스트 결과, 남은 제한을 짧게 보고해라.
```

이 프롬프트는 **작성만** 했다. 에이전트를 아직 실행하지 않았고 정책도 확정하지 않았다.
