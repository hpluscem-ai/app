# OCR 자동 승인·적립 마무리 에이전트 계획과 프롬프트

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 구현된 CLOVA·Luna 판독과 SQLite 작업 처리를 재사용해 정상 신청의 자동 승인·마일리지 적립까지 연결한다. 현재 요청의 산출물은 계획과 프롬프트이며 구현은 시작하지 않는다.

**Architecture:** 메인 B가 기존 `finishOcrJob` 트랜잭션의 자동 승인 분기를 담당한다. A는 판독 근거 검증·십진 계산·평가 도구만 보완하고, C는 결과를 읽기 전용으로 검토한다. 관리자 수동 승인 API는 기존 담당 영역으로 유지한다.

**Tech Stack:** 기존 NestJS, Drizzle/SQLite, Node fetch, Jest, 비공개 R2, CLOVA General OCR V2, 계기판 `gpt-5.6-luna`. 개발 에이전트는 현재 세션의 모델·추론 설정을 상속한다. 제품에서 호출하는 Luna 모델과 개발 에이전트 모델은 별개다.

**Spec:** [최신 앱 정책](/Users/sangkun/nocoders/hpluseco/hpluseco-app/AGENTS.md), [개발 기록](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/development-notes.md), [기존 OCR 계획](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/superpowers/plans/2026-09-23-luna-mileage-ocr.md), [기존 OCR 프롬프트](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/superpowers/plans/2026-09-23-ocr-agent-prompts.md). 과거 계획의 ‘OCR·재등록 API 없음’, ‘영수증 수량 비교 필요’ 같은 전제는 아래 최신 상태로 대체한다.

## Global Constraints

- 서버 루트: `/Users/sangkun/nocoders/hpluseco/hpluseco-server`.
- 앱 루트: `/Users/sangkun/nocoders/hpluseco/hpluseco-app`. 앱 코드는 수정하지 않고 주 작업자가 확정 정책·결과만 기존 기록에 반영한다.
- **UI 변경 없음.** 이 범위에는 와이어프레임·새 버튼·반려 사유 입력·관리자 수동 보정 UI가 필요 없다.
- 주유량은 **계기판의 명시적인 리터 값만** 사용한다. 영수증 수량·단위를 필수로 비교하지 않고 금액/단가로 리터를 추정하지 않는다.
- 마일리지는 **리터 × 20을 반올림**, 1마일리지는 1원이다. 십진 문자열과 정수 연산을 사용한다.
- 영수증은 CLOVA General V2, 계기판은 기존 Luna 호출을 유지한다. 영수증을 Luna에 보내거나 다른 사진의 판독값을 상대 모델 입력에 넣지 않는다.
- 불명확·불일치·중복 의심은 pending으로 남긴다. 자동 반려·임의 금액 보정·추정 사유를 추가하지 않는다.
- 기존 사진·세션·제출 버전·재등록 멱등성·정산 잠금을 유지한다. 사용자가 확정한 최초 신청일 유지·동일 사진 재선택 허용도 유지한다.
- 주유소 운영 상태 변경은 개발 범위에서 제외됐다. 여러 기기 편집은 보류다. 잔액 카드·사진 확대·정산 지급일·정산 파일 처리를 이 작업에서 변경하지 않는다.
- 별도 수동 QA 캠페인·QA 보드 확장·실기기 검증·출시 준비는 제외한다. 금액·상태·과금 경로에 필요한 좁은 자동 검사만 수행한다.
- 실제 사용자 DB·실제 환경 파일을 변경하지 않는다. 필요한 경우 마이그레이션 소스와 격리 DB 검사만 허용하며, 현재 `result_json`을 먼저 재사용한다.
- 모든 기존 변경은 사용자 소유다. 시작 전후 diff를 확인하고 공유 파일은 한 명만 수정한다. 새 브랜치·별도 Codex 작업·커밋·푸시·배포를 임의로 하지 않는다.
- 새 OCR 공급자, Redis, 범용 큐, 공급자 팩토리, 공용 `ApprovalService`를 선제적으로 만들지 않는다. 지금 실제로 필요한 작은 함수만 기존 파일에 둔다.
- 실제 키·사진·전체 공급자 응답을 Git·일반 로그에 남기지 않는다. 기존 유료 호출 승인의 사용량을 확인하고 남은 범위만 사용한다. 확인되지 않은 과거 예산을 새 예산으로 간주하지 않는다.

## Review Focus

1. 거래 시각이 없거나 불가능한 날짜인데 금액만 같아 자동 적립되는 경우 — A의 시각 검사, B의 승인 차단 검사.
2. `0.025 L`, 영수증 `11개`, 같은 틀린 금액을 양쪽에서 읽은 경우 — A의 정확 계산·평가 정답 검사.
3. 서로 다른 회원의 동일 거래가 거의 동시에 끝나 두 번 적립되는 경우 — B의 immediate 트랜잭션·중복 검사.
4. 재등록·반려·수동 승인·정산 편입 뒤 늦은 OCR이 결과를 덮어쓰는 경우 — B의 버전·상태·재적용 검사.
5. 재시작·결과 유실·재검토 과정에서 유료 호출이 다시 발생하는 경우 — 기존 worker 경계를 보존하고 B/C가 호출 수를 확인.

---

## 1. 확인한 현재 상태

2026-09-24 소스를 기준으로 했으며 실행 시 해당 부분의 최신 변경만 다시 확인한다.

| 항목 | 현재 상태 | 이번 작업 |
| --- | --- | --- |
| 공급자·파서 | `mileage-ocr.service.ts`의 CLOVA·Luna 호출, 금액/리터 파서가 존재 | 새로 만들지 않고 승인 근거의 빠진 검증만 보완 |
| 작업 처리 | `mileage-ocr-worker.service.ts`와 SQLite job, 공급자별 예약·일별 한도·재시작 unknown 처리가 존재 | 재사용 |
| 결과 저장 | `finishOcrJob`가 금액·거래 시각·matchStatus와 `result_json`을 저장 | 같은 트랜잭션 안에 조건부 자동 승인 추가 |
| 리터 증거 | `result_json.meter.litersText`에 이미 저장 | 누락됐다고 새 DB 열을 만들지 않음 |
| 시각 | `transactionAt`은 초와 시간대가 있는 값만 처리. 시간대 없는 일반 표본은 `receiptAt=null`이어도 matched 가능 | matched와 자동 승인 자격을 구분, 시각 정책 확인 및 엄격 검증 |
| 재등록 | API·앱 연결과 v10 소스가 존재. 사진 버전 변경·파생값 초기화·새 작업 등록 구현 | 재작성하지 않고 이전 OCR 차단 유지 |
| 관리자 심사 | 반려·UI 연결 완료, reviewVersion에 현재 OCR 근거 포함. approve 서버 API는 미구현 | 수동 승인 구현을 가져오지 않고 기존 담당과 계산 계약만 공유 |
| 평가 도구 | `scripts/benchmark-mileage-ocr.ts` 존재 | 잘못된 자동 승인 후보를 잡는 정답 항목 보완 |

**관리자 승인 API가 없어도 정상 일치 건의 자동 승인은 기존 OCR 저장 트랜잭션에서 구현할 수 있다.** 불일치 최종 금액·수동 보정 정책은 해당 수동 심사 작업에서 결정하며, 이 계획에서는 그러한 건을 pending으로 유지한다.

## 2. 에이전트 구성·소유권

총 **3명: 메인 B + 하위 A + 하위 C**. 구현 중 A와 B가 병렬로 독립 파일을 다루고, C는 결과가 나온 뒤 호출한다.

| 역할 | 책임 | 쓰기 소유권 |
| --- | --- | --- |
| A — 판독 근거·계산 | 시각/금액/리터 검증, 정확 계산, 기존 평가 도구의 정답 비교 | 서버 `src/mileage/mileage-ocr.service.ts`, 해당 spec, `scripts/benchmark-mileage-ocr.ts` |
| B — 메인·자동 승인 | 정책·공유 파일 조정, 원자적 적립, 버전/중복/정산 보호, 구성 안내 | 서버 `src/mileage/mileage.repository.ts`, worker와 worker spec, `src/mileage/index.ts`가 필요할 때, `test/mileage.e2e-spec.ts`, `test/settlements.e2e-spec.ts`, `.env.example`, `README.md`; 앱 AGENTS·개발 기록의 해당 정책 |
| C — 읽기 전용 검토 | 자동 승인 조건, 경합, 재처리, 과금·민감정보 검토 | 구현 파일 쓰기 없음. 결함은 A/B에게 반환 |

- `.env.example`와 앱 문서에는 이미 사용자 변경이 있다. 겹치는 줄은 조율하고 기존 변경을 보존한다.
- `src/admin-mileage/**`와 어드민 웹은 기존 관리자 심사 담당이 소유한다. C가 읽어 회귀를 검토하는 것은 가능하다.
- 다른 담당이 공용 승인 함수를 실제로 추가했으면 그 구현을 먼저 읽고 정확히 맞는 범위만 재사용한다. HTTP API를 서버 내부에서 호출하거나 트랜잭션을 중첩하지 않는다.
- 새 정책 모듈·DB 열·마이그레이션은 기본 계획에 없다. 기존 경계로 해결하지 못하는 구체적 이유가 확인된 경우에만 메인이 범위를 조정한다.

## 3. 순서와 완료 기준

### Task 1 — 최신 계약 확인 및 판독 근거 보완 (A, 메인 B 조정)

**파일:** A 소유 파일. B는 repository의 기존 시각 함수를 인계 후 제거/교체한다.

**제안할 작은 함수 계약:** 기존 동등 함수가 생겼으면 그 이름·형식을 우선한다.

```ts
// mileage-ocr.service.ts에 둔다. 기존 ReceiptReading/MeterReading을 재사용한다.
export function transactionAt(receipt: ReceiptReading | null): string | null;
export function mileageFromLiters(raw: string | null): number | null;
export function automaticApprovalAmounts(
  receipt: ReceiptReading | null,
  meter: MeterReading | null,
  receiptAt: string | null,
): { finalAmount: number; mileageAmount: number } | null;
```

`automaticApprovalAmounts`는 근거의 값 검증만 담당한다. DB 상태·현재 사진/판독기 버전·중복·활성화 여부·공급자 실패 검사는 B가 트랜잭션 안에서 추가한다. 이 함수의 성공만으로 승인하지 않는다.

- [ ] B는 최신 정책·diff·진행 중인 파일 작성자를 확인하고 A에게 확정 사항과 함수 계약을 전달한다. A는 기존 공급자 구현을 재작성하지 않는다.
- [ ] **시각의 남은 결정만 한 번 확인한다.** 제안은 시간대가 없는 한국 거래를 Asia/Seoul로 해석하고, 초가 생략된 값은 초를 만들어 넣지 않은 채 자동 승인에서 제외하는 것이다. 최신 대화에 답이 있으면 재질문하지 않는다. 미답 상태에서는 명시 시간대·초가 있는 유효 입력만 처리하고 나머지는 pending으로 남긴다.
- [ ] 거래 날짜·시각은 실제 달력과 시/분/초/오프셋 범위를 검증한다. 잘못된 날짜 자동 보정, 업로드·촬영 시각 대입, 모호한 값의 임의 선택을 금지한다. 같은 순간의 지원 형식은 동일 UTC 값으로 정규화한다.
- [ ] 파서가 확인할 수 있는 취소·재출력·외상·문서 혼재·불확실한 필수값을 issues에 남긴다. 신뢰도 임계값이나 문서별 고정 좌표를 근거 없이 추가하지 않는다. 모호한 영수증을 판매 완료로 간주하지 않는다.
- [ ] 기존 `litersValue` 허용 범위를 그대로 쓰고, 다음 정수 계산을 구현한다. 새 최대/최소 주유량 정책은 추가하지 않는다.

```ts
export function mileageFromLiters(raw: string | null): number | null {
  const liters = litersValue(raw);
  if (liters === null) return null;
  const [whole, fraction = ''] = liters.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole + fraction) * 20n;
  const rounded = (numerator * 2n + scale) / (scale * 2n);
  return rounded <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rounded) : null;
}
```

- [ ] `automaticApprovalAmounts`는 양쪽 결과·확실한 판매 문서·빈 issues·유효 거래 시각·두 전체 금액의 일치·계기판 리터 계산 성공을 모두 요구한다. 최종 금액은 일치한 표시 금액을 사용한다. 영수증 수량이 `11개`이거나 없어도 그것만으로 거부하지 않는다.
- [ ] 기존 service spec에 아래 경계와 유효 날짜/불가능한 날짜/초 누락/시간대 정책 사례를 추가한다. A는 좁은 검사를 실행한 후 반환 타입과 결과를 B에게 전달한다.

```ts
it.each<[string, number | null]>([
  ['0.025 L', 1], ['0.024 L', 0], ['11.000 L', 220],
  ['11개', null], ['11', null], ['-1 L', null],
])('calculates mileage from %s', (raw, expected) => {
  expect(mileageFromLiters(raw)).toBe(expected);
});
```

**완료 기준:** 현재 raw OCR 근거를 입력으로 금액·정확한 적립값 또는 승인 불가를 재현할 수 있다. 미확정 시각을 정상값으로 채우지 않는다.

### Task 2 — 기존 트랜잭션에 자동 승인 연결 (B)

**파일:** `mileage.repository.ts`, 필요할 때 worker, worker spec·관련 기존 e2e. A의 함수 인계 후 쓰기 작업을 시작한다.

**입력:** 기존 `finishOcrJob(job: OcrJob, result: OcrResult, errorCode?: string): void` 계약 유지.

- [ ] A가 작업하는 동안 B는 현재 `finishOcrJob`의 job/state/sourceVersion 검사를 읽는다. 완료된 job 재적용이 아무것도 바꾸지 않는 경계를 유지한다.
- [ ] 판독 활성화와 자동 승인을 구분한다. 기존 설정이 없으면 `.env.example`에 `MILEAGE_OCR_AUTO_APPROVE_ENABLED=false` 한 개를 제안한다. 실제 `.env`는 수정하지 않는다. 설정 누락·오타는 비활성이다.
- [ ] 기존 immediate 트랜잭션 안에서 running job, 현재 extractor/source version, 두 사진 존재, pending, settlementId=null, 공급자/작업 오류 없음, 승인 활성화와 A의 근거 검사를 모두 확인한다. 외부 호출을 트랜잭션 안으로 옮기지 않는다.
- [ ] 기존 타 회원·탈퇴 이전 이력까지 포함한 중복 검사와 재등록 자기 신청 제외를 유지한다. 세 비교값은 영수증 금액·계기판 금액·정규화한 실제 거래 시각이다. 현재 제출 버전만 비교하고 최초 요청 해시/과거 제출의 결과를 현재 사진으로 취급하지 않는다. 기존 동일 사진쌍 의심 처리는 약화하지 않는다.
- [ ] 새 정규화 방식과 기존 현재 제출 기록의 날짜 표기 차이가 중복 검사를 우회하지 않게 한다. 비교 시 현재 job의 원문 근거를 같은 함수로 읽을 수 있으며, 사용자 DB 일괄 백필·재판독은 실행하지 않는다.
- [ ] 조건 충족 시 판독 결과 저장·job 완료·application 승인과 적립을 같은 트랜잭션에서 반영한다. 기존 update에 필요한 값만 더하고 상태 조건을 유지한다.

```sql
-- 값은 서버가 검증한 근거에서만 만든다. 동일 immediate 트랜잭션 내부 변경이다.
UPDATE mileage_applications
SET approval_status = 'approved', final_amount = :matching_amount,
    mileage_amount = :exact_rounded_mileage,
    decided_at = :now, updated_at = :now
WHERE id = :application_id
  AND approval_status = 'pending' AND settlement_id IS NULL;
```

- [ ] 이미 끝난 심사·정산·재등록·오래된 job·비활성 상태에서는 금액과 decidedAt을 바꾸지 않는다. 조회 합계는 기존 summary와 정산 SQL이 승인 레코드를 합산하게 둔다. 별도 잔액 테이블·증감 요청·앱 폴링을 추가하지 않는다.
- [ ] 과거 completed job을 자동 재실행하거나 pending 전체를 소급 승인하지 않는다. 재등록으로 만들어지는 새 제출 작업은 기존 버전 규칙을 따른다.
- [ ] 기존 worker spec에 활성/비활성, 날짜 불명, 불일치, 중복 두 건, 소수 경계, 재등록/반려/수동 승인/정산 편입 뒤 늦은 결과, 같은 job 재반영을 추가한다. 성공 시 finalAmount·mileageAmount·decidedAt과 summary 증가가 한 번뿐인지 검증한다.
- [ ] 기존 재시작 unknown·일별 호출 예약·유료 재시도 없음 검사를 유지한다. 실패/타임아웃을 자동으로 다시 과금하는 기능은 추가하지 않는다.

**완료 기준:** 격리 DB에서 승인 조건을 만족하는 최신 신청만 한 번 적립된다. 미충족 신청은 pending이며 실패가 사진 접수 성공을 취소하지 않는다. 관리자 HTTP 승인 API가 없는 상태도 이 자동 분기 구현을 막지 않는다.

### Task 3 — 평가 근거 확인 및 독립 검토 (A → B → C)

**파일:** A의 기존 benchmark script, B의 관련 자동 검사·README. C는 읽기 전용.

- [ ] 기존 benchmark 정답에 거래 시각·판매 여부/불확실성·사람이 판정한 자동 승인 가능 여부를 포함한다. 기존 금액·리터 정답은 유지하고, 알 수 없는 정답을 성공으로 세지 않는다.
- [ ] 생산 코드의 동일 근거 함수를 평가 도구에서도 사용한다. 사진쌍의 금액끼리만 같다고 통과시키지 않는다. 예컨대 실제 양쪽 금액이 11,700원인데 모델이 양쪽 모두 12,000원으로 읽으면 잘못된 승인 후보로 집계한다. 틀린 리터·거래 시각도 같은 방식으로 잡는다.
- [ ] 기존 결과가 있으면 먼저 재사용한다. 유료 평가 전 manifest dry-run으로 샘플·중복·공급자별 호출 수를 확인한다. 이전의 ‘CLOVA 최대 11회·Luna 최대 11회’는 기존 승인 전체의 상한이며 이번 작업마다 초기화되는 예산이 아니다. 사용 여부·남은 범위를 확인할 수 없으면 추가 호출의 수·목적을 확인받는다.
- [ ] 제공 사진과 정답 자료가 없으면 필요한 원본/정답만 요청하고 코드·모의 검사는 계속한다. 평가를 위해 운영 DB나 R2 전체를 훑지 않는다. 작은 표본 통과를 전체 운영 정확도로 보고하지 않는다.
- [ ] 실제 호출 시 성공·실패를 모두 호출 수에 포함한다. 기존 스크립트의 고정 단가로 현재 비용을 단정하지 말고 사용량과 실제 확인 가능한 청구 근거를 구분한다. C가 같은 사진을 다시 유료 판독하지 않는다.
- [ ] C는 diff·자동 검사 결과·사용한 정답과 평가 결과를 읽고 Review Focus 다섯 항목을 확인한다. 결함은 파일 담당자만 수정하고 관련 검사만 다시 수행한다.
- [ ] B는 코드 구현 완료, 격리 자동 검사, 실제 샘플 평가, 자동 승인 활성 여부를 각각 보고한다. 시각 정책·평가 기준·예산/활성화 승인이 남았으면 그 항목만 남긴다. 미검증 상태에서 실제 환경의 자동 승인을 켜거나 전체 완료라고 보고하지 않는다.

**완료 기준:** 자동 승인 코드의 정확성과 실제 판독의 근거를 구분해 보고한다. 검증·정책이 충족되면 기존 승인 범위 내에서 활성화할 준비가 끝나며, 실제 사용자 DB 적용·운영 설정 변경·배포는 마지막 단계로 남는다.

## 4. 구현 시 최소 검사 명령

서버 루트에서 담당 범위에 맞게 실행한다. 이 문서 작성 중에는 실행하지 않았다. 테스트는 기존 메모리 DB/저장소/공급자 대역을 사용한다.

```sh
pnpm exec jest --watchman=false --runInBand --runTestsByPath src/mileage/mileage-ocr.service.spec.ts src/mileage/mileage-ocr-worker.service.spec.ts
pnpm exec jest --watchman=false --config test/jest-e2e.json --runInBand --runTestsByPath test/mileage.e2e-spec.ts test/admin-mileage.e2e-spec.ts test/settlements.e2e-spec.ts
pnpm exec tsc --noEmit --incremental false
git diff --check
```

기존 `test/admin-mileage.e2e-spec.ts`는 승인 HTTP API 부재도 검사한다. OCR 작업이 그 API를 추가하는 것으로 검사를 무력화하지 않는다. 실행 시 기존 담당이 승인 API를 완성했으면 최신 계약으로 인계받는다.

## 5. 새 대화에 복사할 실행 프롬프트

```text
H Plus Eco의 기존 OCR을 정상 신청 자동 승인·마일리지 적립까지 마무리해줘.

서버: /Users/sangkun/nocoders/hpluseco/hpluseco-server
앱 정책/계획: /Users/sangkun/nocoders/hpluseco/hpluseco-app
먼저 최신 AGENTS.md와 다음 계획을 읽어줘.
/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/superpowers/plans/2026-09-24-ocr-completion-agent-prompt.md

총 3개 역할로 진행해줘.
- 너는 메인 B: 계약 조정, 기존 finishOcrJob의 원자적 자동 승인·적립과 관련 검사 담당.
- 하위 A: 기존 OCR의 근거 검증·거래 시각·정확 계산·평가 도구 보완 담당.
- 하위 C: 구현 후 읽기 전용으로 조건·경합·재처리·과금을 검토.
개발 에이전트는 현재 모델 설정을 상속한다. 제품 계기판 판독은 기존 Luna 모델을 유지한다.
계획의 파일 소유권을 전달하고 모두에게 다른 작업자가 있으니 기존 변경을 보존하라고 알려줘.

이미 CLOVA/Luna 호출, SQLite job/worker, 호출 예약·일별 한도, OCR 결과 저장,
반려 재등록과 앱 잔액 연결은 있다. 새로 만들지 말고 최신 코드를 재사용해줘.
관리자 승인 API는 별도 담당 범위이며 아직 미완성일 수 있다.
정상 일치 건의 자동 승인은 기존 OCR 트랜잭션에서 진행하고,
금액 불일치·수동 보정 정책을 기다리는 신청은 pending으로 남겨줘.
이미 공용 승인 코드가 추가됐다면 담당자와 조율해 중복을 피하되 선제 ApprovalService는 만들지 마.

확정 정책:
- 영수증은 CLOVA General V2, 계기판은 기존 gpt-5.6-luna.
- 주유량은 계기판의 명시적인 리터만 사용한다. 영수증 수량 비교와 금액으로 리터 역산은 금지.
- 리터×20을 정확한 십진 정수 연산으로 반올림한다.
- 정상 판매, 명확한 필수값, 유효 거래 시각, 양쪽 전체 금액 일치, 중복 없음일 때만 자동 승인한다.
- 불명확·불일치·중복 의심은 관리자 검토 대기이며 자동 반려하지 않는다.

현재 matched만 믿으면 안 된다. 거래 시각이 null인 matched도 있으므로
거래 시각과 실제 근거를 별도로 검사해줘. 한국 거래 시간대와 초 생략 처리의
기존 답변을 먼저 찾고, 없으면 계획의 최소안을 한 번 확인해줘.
답변 전에는 초·시간대가 명시된 유효값만 처리하고 다른 값은 지어내지 마.
누락된 결정에 의존하지 않는 구현은 계속해줘.

기존 result_json에 리터 근거가 있으니 새 DB 열부터 만들지 마.
running job·현재 판독기/사진 버전·두 사진·pending·정산 미편입·오류 없음·중복 검사를
기존 immediate 트랜잭션에서 확인하고, 결과 저장·job 완료·승인·적립을 함께 반영해줘.
finalAmount는 일치한 금액, mileageAmount는 정확한 리터 계산값으로 저장해줘.
같은 결과 재반영, 동시 중복, 재등록·반려·수동 승인·정산 뒤 늦은 결과가
금액이나 결정 시각을 덮어쓰거나 이중 적립하면 안 된다.
현재 sourceVersion과 reviewVersion 보호를 유지해줘.

기존 평가 도구를 보완해 실제 정답 금액·리터·거래 시각·승인 가능 여부를 비교해줘.
양쪽에서 같은 틀린 숫자를 읽은 경우도 실패로 잡아야 한다.
기존 평가 결과와 유료 호출 사용량을 먼저 확인하고 승인된 남은 범위만 사용해줘.
예전 11회씩의 상한을 새 예산으로 초기화하거나 자동 재시도·상위 모델 전환하지 마.
자료/승인이 부족하면 필요한 항목만 요청하고 모의 검사와 코드 구현은 마쳐줘.

실제 자동 승인 활성화는 확정 정책과 판독 근거를 갖춘 뒤 기존 승인 범위에서만 한다.
기본 비활성 설정을 두고 실제 .env·사용자 DB·운영 배포는 변경하지 마.
관련 최소 자동 검사·타입 검사와 독립 검토를 수행해줘.
UI·반려 사유 입력·관리자 수동 승인 API·주유소 운영 상태·여러 기기 편집·정산 정책은 수정하지 마.
별도 QA 캠페인·QA 보드 확장·출시 준비·새 브랜치·커밋·푸시·배포는 제외해줘.

완료 보고는 변경 파일, 코드 구현, 자동 검사, 실제 판독 평가,
자동 승인 활성 여부, 남은 사용자 결정/외부 설정을 나눠서 작성해줘.
```

## 작성 상태

- 현재 산출물은 이 계획·프롬프트 한 개다. 구현·테스트·샘플 호출·DB 변경은 하지 않았다.
- `subagent-driven-development` 스킬이 실제로 없으면 존재한다고 가정하지 않는다. 사용 가능한 `superpowers:executing-plans`와 collaboration 도구로 위 소유권을 지킨다.
