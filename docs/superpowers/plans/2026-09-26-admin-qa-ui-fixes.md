# 어드민 QA 수정 Implementation Plan — DR-02 제외

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ERD 페이지를 제거하고, 대시보드 미확정 마일리지·인프라 좌표 입력·영수 승인여부의 네 가지 QA 지적을 수정한다. DR-02 기사별 집계는 이 계획에 포함하지 않는다.

**Architecture:** 기존 어드민 React 화면과 API 호출을 유지하며 화면별 최소 변경을 한다. ERD 전용 코드와 의존성을 제거하고, 영수 심사는 기존 확인 팝업과 서버 응답 경계를 재사용한다. 서버 계약은 이 계획에서 변경하지 않는다.

**Tech Stack:** React 19, TypeScript, Vite, 기존 HTML `select`, Node 테스트, pnpm.

**Spec:** 2026-09-26 사용자 QA 수정 요청, [어드민 QA](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/admin-qa.md), [어드민 작업 규칙](/Users/sangkun/nocoders/hpluseco/hpluseco-admin/AGENTS.md), [앱 작업 규칙](/Users/sangkun/nocoders/hpluseco/hpluseco-app/AGENTS.md). 최신 사용자 요청이 기존 QA의 음수 좌표 입력·대기 행 버튼 기대보다 우선한다.

## Global Constraints

- 구현 코드를 수정하기 전에 요구사항·관련 컴포넌트·기존 디자인을 확인하고 **러프 와이어프레임 이미지 정확히 한 장**을 제시한다. 한 이미지에 ERD 메뉴 제거, 최근 영수 금액, 좌표 입력, 대기 상태 선택 위치를 구분해 표시한다. 2026-09-26 후속 사용자 지시로 어드민은 Desktop만 대상이며 모바일 설계·구현·QA를 제외한다. 사용자 승인 후에만 UI 코드를 수정한다. 이 계획 문서는 와이어프레임 승인이 아니다.
- 기존 색상·간격·크기·포커스·호버 스타일을 새로 만들지 않는다. 승인여부 셀은 기존 `.approval-status`와 확인 팝업을 사용한다.
- 새 브랜치·커밋·배포를 임의로 하지 않는다. 작업 전후 diff를 확인하고 사용자 소유 변경을 보존한다. 앱의 `docs/user-auth-qa.md`, `tests/qa.test.mjs`와 서버의 `src/auth/auth.service.ts`에 현재 변경이 있으므로 덮어쓰지 않는다.
- DR-02의 `-` 표기와 기사 목록 API는 이 계획에서 변경하지 않는다. 계획 작성 후 사용자가 별도로 수동 승인 팝업의 확정 금액·주유량 입력과 서버 approve API를 승인했다. Task 4는 해당 승인 계약과 함께 연결한다.
- 위도·경도 요청은 **폼에서 새로 입력하는 문자**를 숫자와 `.`로 제한한다. 서버가 허용하는 기존 음수 좌표의 조회·보존 계약과 지도 데이터는 바꾸지 않는다.
- QA 문서의 기존 완료 체크를 새 동작의 통과로 승계하지 않는다. 변경된 기대 결과를 업데이트하고 수동 확인은 별도로 수행한다.

## Review Focus

1. 대기·반려의 `null` 마일리지는 `-`, 승인된 실제 `0`은 `+0마일`인가 — Task 2 검사.
2. `/erd` 직접 접근·새로고침 뒤 제거된 화면이 렌더링되지 않는가 — Task 1 검사.
3. 좌표에 붙여넣은 `-`, 문자, 두 번째 `.`이 남지 않고 기존 음수 좌표는 다른 필드 수정 중 보존되는가 — Task 3 검사.
4. 드롭다운에서 승인·반려를 골라도 확인 전·취소 후·API 실패 후에는 `대기`로 남는가 — Task 4 검사.
5. 오래된 심사 버전의 409와 화면 이탈 뒤 응답이 새 상태를 만들지 않는가 — Task 4 기존 회귀 검사.

---

## 파일 구조

| 작업 | 변경 파일과 책임 |
|---|---|
| ERD 제거 | 어드민 `src/App.tsx`, `src/components/Sidebar.tsx`, `src/App.css`, `package.json`, `pnpm-lock.yaml`; 전용 `src/pages/ErdPage.tsx`, `src/data/databaseErdData.ts`, `tests/databaseErd.test.mjs` 제거. `tests/adminAuth.test.mjs`의 경로 기대 수정. |
| 마일리지 표기 | 어드민 `src/pages/DashboardPage.tsx`; `tests/settlementsDashboard.test.mjs`에서 상태별 출력 확인. |
| 좌표 입력 | 어드민 `src/components/InfrastructureForm.tsx`; `tests/stations.test.mjs`에서 등록·수정 폼 입력 확인. 서버 좌표 DTO와 `src/stations.ts`의 기존 음수 데이터 처리 유지. |
| 영수 드롭다운 | 어드민 `src/pages/ReceiptDataPage.tsx`; `tests/receipts.test.mjs`의 조작 경로 수정. 기존 `.approval-status select` 스타일과 `ConfirmationDialog` 재사용. |
| QA 반영 | 앱 `docs/admin-qa.md`, `tests/qa.test.mjs`. `tests/qa.test.mjs`의 현재 사용자 변경을 먼저 확인하고 해당 어드민 줄만 좁게 수정. |

### Task 1: ERD 전용 화면과 QA 항목 제거

**Interfaces:** `/erd`는 삭제 후 기존 미등록 경로 처리에 따라 대시보드로 열린다. 새 404 화면이나 리다이렉트 정책은 만들지 않는다.

- [ ] `rg -n 'ErdPage|databaseErdData|/erd|\.erd-|@xyflow/react'`로 전용 참조를 다시 확인한다.
- [ ] `App.tsx`의 `ErdPage` import·`'/erd'` route와 `Sidebar.tsx` 메뉴 한 줄을 지운다. `App.css`의 `.erd-` 전용 블록, 두 전용 소스와 전용 테스트를 삭제한다. 다른 사용처가 없음을 확인한 뒤 `pnpm remove @xyflow/react`로 manifest와 lockfile을 함께 갱신한다.
- [ ] `tests/adminAuth.test.mjs`에서 `/erd`를 보호 경로 대표값으로 쓰는 두 사례는 `/receipts`로 바꾼다. 제거 경로 확인은 다음처럼 추가한다.

  ```js
  const page = mount('/erd')
  await page.respond(0)
  assert.equal(page.render().props.children.type, 'DashboardPage')
  ```

- [ ] `docs/admin-qa.md`의 ERD 연동 현황·AC-01/03 언급·`ER-01`~`ER-09` 장을 제거하고 뒤 장 번호를 맞춘다. 앱 `tests/qa.test.mjs`의 관리자 사례 수 `232 → 223`과 경로 목록에서 `/erd`만 바꾼다. 기존 사용자 영역 수정은 보존한다.
- [ ] `node --test tests/adminAuth.test.mjs`(어드민), `node --test tests/qa.test.mjs`(앱), `pnpm build`(어드민)를 실행하고, 로그인 후 메뉴에 ERD가 없으며 `/erd` 직접 접근에 ERD가 표시되지 않는지 브라우저에서 확인한다.

### Task 2: 대시보드의 미확정 마일리지 표기

**Interfaces:** `DashboardReceipt.mileage: number | null`은 유지한다. 숫자 `0`과 `null`을 구분한다.

- [ ] `tests/settlementsDashboard.test.mjs`에 `RecentReceiptCard`의 대기·반려 `null`과 승인 `0` 렌더링 검사를 추가해 실패를 확인한다.

  ```js
  const card = nodes(h.render(), 'RecentReceiptCard')[0]
  const view = card.type({ receipts: [
    { id: 'a', driverName: 'A', date: '2026-09-26', status: '대기', mileage: null },
    { id: 'b', driverName: 'B', date: '2026-09-26', status: '반려', mileage: null },
    { id: 'c', driverName: 'C', date: '2026-09-26', status: '적립', mileage: 0 },
  ] })
  assert.deepEqual(nodes(view, 'p').filter((node) => node.props.className === 'recent-card__mileage')
    .map((node) => node.props.children), ['-', '-', '+0마일'])
  ```

- [ ] `DashboardPage.tsx`의 한 표시식만 다음처럼 고친다. 데이터 파싱·대시보드 집계·카드 스타일은 유지한다.

  ```tsx
  {receipt.mileage === null ? '-' : `+${numberFormatter.format(receipt.mileage)}마일`}
  ```

- [ ] `node --test tests/settlementsDashboard.test.mjs`와 `pnpm build`를 실행하고 대시보드 최근 내역에서 세 상태의 표기를 확인한다. `docs/admin-qa.md`의 AD-110 예상 결과에 정확한 `-` 표기를 기록한다.

### Task 3: 인프라 등록·수정 좌표의 새 입력 제한

**Interfaces:** 등록·수정은 같은 `InfrastructureForm`을 쓴다. 기존 음수 좌표가 서버에서 채워진 경우 다른 필드만 수정해도 원래 값이 전송돼야 한다.

- [ ] `tests/stations.test.mjs`의 폼 입력 검사에 키 입력/붙여넣기 `-12a.5.. → 12.5`와 `.`만 입력한 제출 실패를 추가한다. 현재 `-12.5`를 폼에서 입력해 보존한다고 기대하는 검사는 새 요청에 맞게 바꾸되, 음수 좌표 **조회·기존 값 보존** 검사는 유지한다.

  ```js
  changeInput(render, 'latitude', '-12a.5..')
  assert.equal(all(render(), 'TextField').find(({ props }) => props.name === 'latitude').props.value, '12.5')
  ```

- [ ] `InfrastructureForm.tsx`의 `formatCoordinate()`가 맨 앞 `-`를 다시 붙이는 부분만 제거한다. 기존 숫자·소수점 필터와 두 번째 점 제거, `inputMode="decimal"`을 재사용한다. 사전 로드된 음수에 대한 검증은 유지해 다른 필드 수정 시 값을 손상시키지 않는다.
- [ ] `docs/admin-qa.md`의 IC-04·IC-11·IE-04를 새 입력 규칙으로 수정한다. IC-11의 음수 *직접 입력 허용* 기대는 지우고, 기존 음수 데이터의 조회·보존과 서버 범위 검증을 구분한다.
- [ ] `node --test tests/stations.test.mjs`와 `pnpm build`를 실행한다. 브라우저에서 등록·수정 두 폼 모두 타이핑·붙여넣기·소수점·빈 값·범위 초과를 확인한다.

### Task 4: 영수 대기 상태의 승인여부 드롭다운

**상태:** 2026-09-26 별도 드롭다운 와이어프레임 승인 후 완료. 영수 회귀 16개·빌드·린트와 격리 실제 API의 데스크톱 브라우저 흐름을 확인했다. 사용자가 모바일은 제외하도록 확정했다. Task 1~3은 아직 구현하지 않았다.

**Interfaces:** 대기·정산 미편입 행만 선택할 수 있다. 승인 확정은 `reviewReceipt(receipt, 'approve', { finalAmount, liters })`, 반려는 `reviewReceipt(receipt, 'reject')`와 기존 `ConfirmationDialog`를 사용한다. 승인·반려 완료 행 및 정산 편입 행의 표시·잠금은 유지한다.

- [x] `tests/receipts.test.mjs`의 `page.review()` 보조 함수를 버튼 클릭에서 대기 행의 `select.onChange`로 맞춘다. `value='대기'` 표시, 선택 후 확인 팝업, 취소·실패·409·성공·화면 이탈의 기존 검사를 실행해 실패를 확인한다.

  ```js
  const select = find(page.status(row('a')), 'select')
  assert.equal(select.props.value, '대기')
  select.props.onChange({ target: { value: '반려' } })
  assert.equal(page.modal().title, '반려하시겠습니까?')
  assert.equal(page.calls.length, 1)
  ```

- [x] `ReceiptDataPage.tsx`의 대기 셀에서 버튼 두 개를 기존 StatusSelect의 제어된 `<select value="대기">`로 교체한다. 대기는 disabled·hidden 표시 옵션이며 승인·반려만 선택할 수 있다. 승인/반려 선택 시 현재 `onReview`를 호출한다. 화살표 이미지는 기존 `chevronDownIcon`과 `.approval-status__icon`을 쓴다. 취소나 요청 실패로 값이 먼저 바뀌지 않으며, 성공 응답과 재조회 뒤에만 상태가 달라진다.

  ```tsx
  onChange={(event) => {
    const action = event.target.value === '승인' ? 'approve'
      : event.target.value === '반려' ? 'reject' : null
    if (action) onReview({ receipt: row, action })
  }}
  ```

- [x] `StatusSelect.tsx`의 화면 로컬 상태를 심사 결과로 사용하지 않는다. `docs/admin-qa.md`의 RC-115·RC-224 조작 설명을 드롭다운 기준으로 수정한다. RC-217은 새 수동 승인 입력과 실제 approve API를 기준으로 검증한다.
- [x] `node --test tests/receipts.test.mjs`와 `pnpm build`를 실행한다. 브라우저에서 대기 셀의 표시와 승인/반려 선택→기존 팝업→취소/확정 흐름, 승인 성공 뒤 확정 금액·계산 마일리지 반영을 확인한다.

## 최종 확인

- [ ] 어드민 `node --test tests/*.test.mjs`, `pnpm build`, `pnpm lint`; 앱 `node --test tests/qa.test.mjs`를 실행한다.
- [ ] `rg -n 'ErdPage|databaseErdData|/erd|@xyflow/react'`에 런타임/QA 참조가 남지 않았는지 확인한다. 과거 개발 기록은 이 검색의 삭제 대상이 아니다.
- [ ] 세 저장소의 최종 diff를 확인하고 기존 사용자 변경과 DR-02가 그대로인지 확인한다. 완료 보고에는 실제 수행한 브라우저/자동 검사와 미구현 항목을 구분한다.
