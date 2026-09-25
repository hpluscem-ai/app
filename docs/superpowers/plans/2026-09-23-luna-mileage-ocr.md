# CLOVA OCR·Luna 마일리지 사진 판독 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 사진 신청·관리자 심사 흐름에 영수증 CLOVA OCR, 계기판 GPT-5.6 Luna 판독을 연결한다. 실제 샘플로 정확도와 비용을 먼저 측정하고, 불명확한 결과는 관리자 검토로 남긴다.

**Architecture:** 기존 사진 정규화·R2 저장 → SQLite에 판독 작업 등록 → 서버에서 영수증·계기판 독립 판독 → 서버 검증 → 기존 심사 필드 반영. 자동 승인은 판독 검증과 승인 정책 확정 이후에 연결한다.

**Tech Stack:** 기존 NestJS, Node.js 내장 `fetch`, `sharp`, Drizzle·SQLite, R2, Jest. 영수증은 CLOVA OCR REST API, 계기판은 `gpt-5.6-luna`의 Responses API와 Structured Outputs를 사용한다.

**Spec:** 사용자 지시인 “UI는 절대 바꾸지 않음”, “루나로 한다는 가정으로 계획 작성”, 후속 결정 “영수증은 CLOVA OCR, 계기판만 Luna”, 앱 `AGENTS.md`의 마일리지·심사 정책, 제공한 Figma 사진 11개. 작성일: 2026-09-23.

## Global Constraints

- 이 문서는 계획이다. 구현·유료 API 실행·환경 설정·배포·커밋을 수행한 상태가 아니다.
- 앱·관리자 화면의 디자인, 문구, 사진 선택 방식과 상태 표시 UI를 변경하지 않는다. UI 작업이 없으므로 와이어프레임도 만들지 않는다.
- **영수증은 CLOVA OCR, 계기판은 Luna**로 확정한다. 영수증 판독 실패를 Luna에 다시 보내거나 공급자를 자동 전환하지 않는다.
- 기존 작업 트리 변경은 보존한다. 새 브랜치를 만들지 않는다. 공용 DB 파일은 다른 심사·정산 세션과 담당자를 정한 뒤 한 명만 수정한다.
- 새 OCR 공급자 추상화, SDK, Redis, 범용 작업 큐, 자동 상위 모델 전환은 추가하지 않는다.
- OCR 결과는 증거 후보이다. JSON 형식 통과나 모델이 말하는 자신감만으로 승인하지 않는다.
- 현재 신청 성공은 사진 접수 성공이다. OCR 실패 때문에 저장된 신청을 접수 실패로 응답하거나 자동 반려하지 않는다.

## Review Focus

1. 계기판 옆 영수증의 숫자를 복사해 두 금액이 일치한 것처럼 만드는 오류.
2. 소수점·단위·거래 일시·취소 거래 오판독에 따른 잘못된 적립.
3. 요청 재전송, 재시작과 타임아웃으로 발생하는 중복 유료 호출.
4. 관리자 심사·사진 재등록 이후 도착한 OCR 결과의 덮어쓰기.
5. 기존 신청·심사·정산 계약과 다른 세션의 DB 변경 충돌.

---

## 1. 현재 코드에서 확인한 범위

아래 경로는 `/Users/sangkun/nocoders/hpluseco/hpluseco-server` 기준이다. 구현 전에 다른 세션의 최신 변경을 다시 확인한다.

| 현재 경계 | 확인한 동작 | 연결 방법 |
| --- | --- | --- |
| `src/mileage/mileage.service.ts` | 두 사진 처리·R2 저장 후 신청 접수, 같은 멱등 키 재요청 처리 | 접수 응답에서 OCR 완료를 기다리지 않음 |
| `src/mileage/mileage.repository.ts` | 신청·사진을 한 트랜잭션에서 저장 | 같은 트랜잭션에 판독 작업 등록 |
| `src/mileage/photo-worker.cjs` | 방향 보정·최대 긴 변 4096px·JPEG 정규화 | 기존 결과 재사용 |
| `src/mileage/photo-storage.service.ts` | 비공개 저장 사진을 서버에서 읽음 | 비동기 작업은 저장 키로 다시 읽음 |
| `src/admin-mileage/admin-mileage.service.ts` | 목록·상세·사진·반려 및 `reviewVersion` 검사 | 기존 nullable 판독 필드를 채움 |
| `src/database/schema.ts`, `schema.sql` | 금액·거래 일시·판독 상태·심사 상태 존재 | 주유량 근거와 작업 상태 저장만 보완 |

현재 소스에서 OCR, 자동 승인, 관리자 승인 API, 반려 재등록 API는 확인되지 않았다. 다른 세션에서 구현되면 해당 경계를 재사용한다. 소스 존재와 실제 운영 검증 완료는 구분한다.

에이전트 프롬프트 작성 시 재확인한 서버에는 DB 버전 8·진행 중인 `008-settlement-snapshots.sql`과 `/mileage/summary`가 존재한다. 정산 스냅샷 잠금과 공용 파일 변경을 보존하고 실행 시 최신 상태를 다시 확인한다.

임시 사진 경로는 요청 종료 전에 삭제된다. 작업에 임시 `path`를 넘기지 않는다. 또한 현재 관리자 `reviewVersion`에는 OCR 필드가 포함되므로 사진 버전을 식별하는 값으로 재사용하지 않는다.

## 2. 판독 방식과 비용 상한

### 우선 검증할 가장 작은 방식

1. 영수증 사진을 CLOVA OCR에 보내 거래 금액·거래 일시·명시된 수량과 단위를 읽는다.
2. 계기판 사진을 Luna에 보내 표시 금액·리터·표시 단가를 읽는다.
3. 두 응답을 서버에서 비교한다. 한쪽 판독값을 다른 쪽 프롬프트에 넣지 않는다.

**기본 신청당 CLOVA 1회 + Luna 1회, 총 2회**다. 샘플 한 사진 안에 영수증과 계기판이 함께 있어도 역할별 독립 요청으로 읽고, 상대 영역 숫자를 가져오는지를 평가한다. 프롬프트만으로 이 문제가 해결됐다고 가정하지 않는다.

두 영역 혼동이 재현되면 그때만 같은 샘플로 계기판 영역·회전 판별을 추가하는 안을 비교한다: Luna 영역 판별 1회 → 기존 `sharp`로 계기판 자르기 → Luna 판독 1회, 영수증은 별도 CLOVA 1회. 이 안은 **총 3회**이며 정확도 개선과 비용을 함께 측정한 뒤 채택한다. 고정 좌표 자르기나 무조건 추가 호출은 사용하지 않는다. 영역 좌표·회전이 유효하지 않거나 대상이 잘리면 관리자 검토로 남긴다.

CLOVA는 비용을 우선해 **General OCR V2의 일반 글자 추출부터 검증**한다. 반환된 글자·위치로 서버에서 영수증 금액과 일시를 찾는다. 별도 LLM으로 영수증을 해석하지 않는다. 영수증 전용 Document OCR은 구조화된 필드가 있지만 월 기본료가 있으므로 초기 구현에서 제외한다. General 방식의 정확도·파싱 유지비가 문제가 될 때만 별도 비교한다. [General OCR 계약](https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocr), [영수증 전용 계약](https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocrdocumentocr-receipt)

### 최초 평가 설정 제안

| 항목 | 시작값·원칙 |
| --- | --- |
| 영수증 | CLOVA General OCR V2, `lang: ko`, 표 추출 비활성, 실제 발급된 Invoke URL·`X-OCR-SECRET` 사용 |
| 계기판 | `gpt-5.6-luna` 고정, 기존 정규화 사진, 이미지 `detail: high`부터 측정 |
| Luna 추론·출력 | `reasoning.effort: none`, 짧은 strict JSON Schema, 출력 상한 800 tokens부터 측정 |
| 요청 | 서버 전용 키·이미지 바이트 전송, Luna `store: false`, 호출당 타임아웃 20초부터 측정 |
| 재시도 | 첫 구현은 자동 재호출 없음. 429·5xx·타임아웃·불완전 출력은 기록 후 관리자 검토 |
| 전체 상한 | 공급자별 일별 호출 수 상한을 DB에서 예약 후 호출. 상한 미설정 시 실서비스 OCR 비활성 |
| 기록 | 공급자·상품/모델·판독기 버전, 각 호출 수, Luna 실제 token usage, 지연 시간, 실패 원인 |

위 숫자는 검증용 시작값이며 정확도·속도 보장값이 아니다. 요청 상한과 출력 상한을 함께 적용하되, 일별 호출 제한을 정확한 청구액 제한이라고 표현하지 않는다. 응답을 받지 못한 호출도 예약 수에서 차감한다.

확인한 공개 요금상 General 글자 추출은 월 100건 무료 이후 건당 3원이다. 영수증 전용 Document Basic은 월 18,000원에 300건 포함, 초과 건당 100원으로 기본료가 있다. VAT·API Gateway 등 별도 비용을 포함해 운영 예산을 계산한다. [공식 요금](https://m.ncloud.com/charge/price/ko), [과금 안내](https://guide.ncloud-docs.com/docs/clovaocr-spec)

전체 비용은 **CLOVA 실제 과금 건수 + API Gateway 등 부대 비용 + Luna의 실제 입력·출력 토큰 비용**으로 계산한다. 원화·달러를 합칠 때는 환율 기준을 명시한다. 2회안·3회안의 신청당 평균과 최대 비용, 예상 월 신청 수에 따른 합계를 보고한다. 3원을 두 사진 전체의 신청당 최종 비용이라고 표현하지 않는다.

## 3. 반환값과 서버 판단

판독 서비스는 승인 여부 대신 다음 내부 결과를 반환한다. CLOVA 응답을 서버에서 이 형태로 매핑하고, Luna에는 계기판 필드만 JSON Schema로 요청한다. 금액·리터는 문자열 또는 `null`로 보존한다.

| 대상 | 필요한 필드 |
| --- | --- |
| 영수증 | `amountText`, `transactionDateText`, `transactionTimeText`, `quantityText`, `quantityUnit` (`L`/`count`/`unknown`), `unitPriceText`, `documentKind` (`sale`/`cancel`/`mixed`/`unknown`), `issues` |
| 계기판 | `amountText`, `litersText`, `unitPriceText`, `issues` |
| 내부 근거 | 원본 사진 식별자·버전, 공급자·판독기 버전, CLOVA 필드의 위치·신뢰도, 필요 시 자른 영역·회전, 검증 실패 사유 |

Luna 필드는 모두 required로 정의하고 모르는 값은 `null`로 반환한다. `additionalProperties: false`를 사용한다. 불명확·가림·반사·단위 불명·대상 혼동은 고정된 `issues` 코드로 받는다. 사진 속 지시문은 데이터로만 취급한다. CLOVA가 돌려주는 카드번호·연락처 등 불필요한 필드는 저장·로그에서 제외한다.

CLOVA General 응답은 `images[].fields[]`의 `inferText`, `boundingPoly`, `inferConfidence`, `lineBreak`를 읽는다. HTTP 성공과 별도로 `inferResult`도 검사한다. 필요한 결과만 남기고 전체 응답을 영속 저장하지 않는다. [General OCR 응답 계약](https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocr)

영수증 파서는 같은 서비스 파일의 작은 함수로 시작한다. 좌표로 줄·문서 영역을 구분하고, 원본 샘플에서 확인한 합계/결제 금액 라벨 옆 숫자와 거래 일시 라벨 옆 값을 찾는다. 가장 큰 숫자나 마지막 숫자를 금액으로 선택하지 않는다. 여러 거래·서로 다른 후보가 남거나 계기판 영역과 구분할 근거가 부족하면 `null`로 둔다. 취소·재출력 등 표식도 해당 영수증 영역 안에서 확인하며, 판매 거래임을 확인할 수 없으면 `documentKind: unknown`이다. 단위가 없는 수량은 L로 바꾸지 않는다. 신뢰도 경계와 줄 묶음 기준은 샘플로 검증하고, 레이아웃별 고정 좌표 목록은 만들지 않는다.

서버는 다음 규칙을 적용한다.

- 원 금액은 전체 값을 비교한다. 소수 금액을 임의 반올림하거나 끝자리만 비교하지 않는다.
- `11.000 L`와 `11개`를 구분한다. 금액을 단가로 나누어 주유량을 만들지 않는다.
- 적립은 실제 판독된 리터 × 20의 정수 반올림이다. 십진 문자열의 정수 분자·분모로 계산해 부동소수점 경계 오류를 막는다. 허용 자릿수·범위를 벗어난 값은 승인하지 않는다.
- 단가 × 리터는 보조 검증이다. 계기판 자체의 반올림 가능성이 있어 별도 정책 없이 완전 일치나 임의 허용 오차를 필수 규칙으로 만들지 않는다.
- 거래 일시는 영수증의 실제 거래 일시다. 사진 촬영 시각·EXIF·업로드 시각을 대신 넣지 않는다. 빠진 초를 `00`으로 채우거나 불가능한 날짜를 자동 보정하지 않는다.
- 취소·재출력·외상·다중 거래 영수증은 해당 거래의 유효성을 판별하는 정책이 확정되지 않으면 관리자 검토로 남긴다.
- 중복 의심은 영수증 금액·계기판 금액·거래 일시가 모두 같은 다른 신청을 조회한다. 다른 회원·탈퇴 이전 이력을 포함하고, 재등록 시 자기 신청은 제외한다.
- 필요한 필드 누락·판독 실패는 `ocr_failed`, 확실한 금액 불일치는 `mismatched`, 중복 의심은 `duplicate_suspected`로 구분한다. `matched`는 비교 성공을 뜻하며 그 자체로 승인 명령이 아니다. 판독에 성공한 근거는 보존한다.

### 자동 승인 전에 확정할 항목

| 항목 | 현재 상태·제안 |
| --- | --- |
| CLOVA 설정 | 영수증 공급자는 확정. General V2를 구현 시작안으로 선택하며 실제 도메인·Invoke URL·Secret·청구 조건 확인 필요 |
| 적립 리터의 기준 | 명시적으로 L가 표시된 계기판 값을 기준으로 하는 안. 영수증에도 L가 있으면 비교; 필수 비교 범위는 승인 전에 확정 |
| 거래 시각 | 한국 거래의 `Asia/Seoul` 해석과 초 생략 영수증 처리 방식 확정 필요 |
| 취소·외상·재출력 | 자동 승인 대상에서 제외한 채 검토 대상으로 시작하는 안 |
| 불일치 신청의 최종 금액 | 관리자 심사 작업에서 정책 확정. OCR이 임의 선택하지 않음 |
| 예산·정확도 | 실제 계정 모델 접근, 공급자별 일별 호출 상한, 추가 검증 표본과 자동 승인 허용 기준 확정 필요 |

미정 항목은 샘플 평가와 추출 구현을 막지 않는다. 해당 결정에 의존하는 자동 승인만 활성화하지 않는다.

## 4. 구현 순서

### Task 1 — 샘플 정답과 CLOVA·Luna 평가 도구

**파일:** 서버에 `scripts/benchmark-mileage-ocr.ts`, `src/mileage/mileage-ocr.service.ts`, `src/mileage/mileage-ocr.service.spec.ts` 추가. 실제 사진·정답 원문·유료 응답은 Git 밖의 지정 경로에 보관한다.

- [ ] 제공된 Figma 11개를 원본 기준으로 확인하고 사람이 금액·리터·단위·거래 일시를 판독한다. 사람이 확인할 수 없는 값은 정답도 `null`로 둔다.
- [ ] 시각상 같은 `56149/56153`, `56150/56159`를 해시와 거래 기준으로 확인한다. 약 9개의 고유 사례이며 중복 사진을 독립 표본으로 세지 않는다.
- [ ] 합성 입력으로 CLOVA 성공/실패·좌표 기반 줄 묶음·금액/일시 라벨 후보 충돌·취소 표식·수량 단위 매핑, Luna strict JSON 파싱·refusal·incomplete, 날짜·금액·십진수 검증을 먼저 구현한다. 네이티브 `fetch` 응답의 `output`에서 텍스트를 읽으며 SDK 전용 `output_text` 편의 속성을 가정하지 않는다.
- [ ] CLOVA 실제 Invoke URL·Secret과 OpenAI 키를 서버 환경에서만 읽는다. URL은 사용자 요청에서 받지 않는다. R2 사진을 공개하지 않고 base64 또는 multipart 바이트로 전송한다.
- [ ] 평가 도구는 명시적인 입력 manifest·결과 경로·공급자별 호출 상한을 받는다. dry-run에서 대상 건수와 최대 호출 수를 먼저 출력하고, 명시적 live 실행에서만 API를 호출한다.
- [ ] CLOVA 1회·Luna 1회 독립 판독으로 평가한다. 계기판 영역 혼동이 발생할 때만 추가 영역 판별안을 비교하고, 좌표 검증·회전 후 좌표계·단위 라벨 포함을 함께 검사한다. 영수증을 Luna로 재판독하지 않는다.
- [ ] 필드별 정확 일치, 잘못 일치로 판정한 건수, 관리자 검토 비율, 공급자별 호출·Luna 토큰・총비용·지연 시간을 기록한다. API 오류도 실패 집계에 포함하고 공급자의 과금 기준에 맞춰 비용을 확인한다.

**반드시 포함할 사례:** `56150/56159`의 계기판 7,356원과 옆 영수증 12,650원, `56156`의 11,700원/13,000원 불일치, `56155`의 444원과 다른 취소 금액, `56154`의 180° 회전, `56152`의 `CLOSE`, `56151`의 촬영 시각과 거래 시각 구분, `개`/`L` 구분. 숫자는 원본으로 재확인한 뒤 정답 파일에 확정한다.

**검증:** 서버에서 `pnpm test -- mileage-ocr.service.spec.ts --runInBand`. live 평가 명령의 계약은 `pnpm exec ts-node scripts/benchmark-mileage-ocr.ts --manifest <Git 밖 경로> --output <Git 밖 경로> --max-clova-calls <상한> --max-luna-calls <상한> --live`로 구현한다. 이 계획 작성 시에는 실행하지 않는다.

**완료 기준:** **어떤 입력과 호출 방식이 얼마에 어느 필드를 틀리는지** 재현할 수 있다. 9개 수준의 사례 통과를 운영 정확도 보장으로 해석하지 않는다. 결과가 나쁘면 자동 승인 구현보다 판독 범위 축소·관리자 검토 유지 여부를 먼저 판단한다.

### Task 2 — 저장된 신청에 비동기 판독 연결

**파일:** `src/mileage/mileage-ocr-worker.service.ts`와 해당 spec 추가. 기존 `mileage.repository.ts`, `mileage.service.ts`, `mileage/index.ts`, `src/app.module.ts` 수정. DB 담당자가 `schema.ts`, `schema.sql`, `database.service.ts`와 다음 마이그레이션을 함께 관리한다. 현재 버전을 기준으로 마이그레이션 번호를 미리 예약하지 않는다.

- [ ] OCR 활성 상태의 신규 신청은 기존 저장 트랜잭션에 작업 등록을 넣는다. OCR 비활성·예산 부족이어도 사진 신청은 기존처럼 접수하고 대기 상태를 유지한다. 비활성 기간의 신청을 활성화 시 자동으로 소급 판독하지 않는다.
- [ ] `sourceVersion`은 사진 종류별 ID·정규화/원본 저장 키·신청 `requestHash`를 고정 순서로 해시한다. 관리자 `reviewVersion`과 구분한다.
- [ ] 최소 작업 테이블 하나에 신청 ID, 사진 버전, 판독기 버전, 상태, 공급자별 호출 예약·사용량·처리 상태, 추출 근거 JSON, 오류 코드, 처리 시각을 저장한다. 신청·사진 버전·판독기 버전 조합을 유일하게 만든다.
- [ ] 첫 버전은 `queued → running → completed/failed/unknown`만 둔다. 판독 불명확 여부는 결과에 기록하고 작업 상태를 도메인 심사 상태로 사용하지 않는다.
- [ ] 기존 단일 프로세스 SQLite 운영 범위에서 worker 하나가 원자적으로 작업을 가져간다. DB 트랜잭션을 연 채 이미지 다운로드나 모델 응답을 기다리지 않는다.
- [ ] 현재 저장된 R2 사진을 읽고 호출 전에도 사진 버전·대기·정산 미연결 상태를 확인한다. 같은 멱등 요청 재전송은 작업·유료 호출을 추가하지 않는다.
- [ ] 공급자별 일별 호출 예약을 트랜잭션으로 처리한다. 재시작 시 미실행 `queued`는 재개하되, 결과 수신 여부가 불명확한 `running`은 `unknown`으로 남겨 자동 재과금을 피한다. 한쪽 성공·다른 쪽 실패 시 성공한 추출 근거는 보존하고 작업 전체를 자동 재실행하지 않는다.
- [ ] 타임아웃·통신 실패·응답 유실·잔여 예산 부족은 대기와 실패 근거를 남긴다. 첫 구현에 자동 재시도나 새 재실행 UI/API는 포함하지 않는다.

**검증:** worker spec에서 중복 접수, 동시에 작업을 가져가는 경우, 예산 소진, 프로세스 재시작 상태와 타임아웃을 재현한다. `test/mileage.e2e-spec.ts`에서 모델 장애여도 저장된 신청을 실패로 응답하지 않는지 확인한다.

### Task 3 — 기존 관리자 심사 데이터에 안전하게 반영

**파일:** `mileage.repository.ts`, worker와 관련 spec, `test/admin-mileage.e2e-spec.ts`. 관리자 서비스 변경이 필요하면 해당 세션 담당자와 경계를 먼저 맞춘다. 관리자 프런트 파일은 수정하지 않는다.

- [ ] 결과 반영 시 같은 사진 버전이고 여전히 `pending`이며 `settlementId = null`인지 트랜잭션 안에서 다시 검사한다. 조건이 바뀌면 결과를 폐기하고 현재 심사 결정을 유지한다.
- [ ] 기존 `receiptAmount`, `meterAmount`, `receiptAt`, `matchStatus`에 검증된 값만 반영한다. 작업 결과 JSON에는 리터 원문·단위·출처를 보존한다. 동일 값을 여러 새 테이블에 복제하지 않는다.
- [ ] 추출 결과가 바뀌면 현재 `reviewVersion` 계산에도 반영돼 열린 관리자 화면의 오래된 요청을 거부하는지 확인한다. 리터 근거가 승인 입력에 포함되면 그 근거 버전도 심사 버전에 포함하도록 담당자와 맞춘다.
- [ ] OCR 완료 직전 관리자 반려, 미래 승인·정산 연결, 사진 교체가 발생하는 테스트를 추가한다. 반려 재등록 API가 생기면 교체와 새 사진 버전 작업 등록을 같은 트랜잭션에 연결한다.
- [ ] 판독 서비스가 `approvalStatus`, `rejectionReason`, `settlementId`를 임의 변경하지 않도록 한다.

**완료 기준:** 기존 관리자 UI에서 현재 nullable 판독 필드가 실제 데이터로 채워진다. 값이 없으면 기존 표시 방식을 유지한다. 판독 실패·지연으로 이미 끝난 심사가 바뀌지 않는다.

### Task 4 — 자동 승인 조건 검증과 연결

**선행 조건:** Task 1의 추가 실거래 검증, 미정 정책 확정, 관리자 승인 경계 구현. 조건이 충족되기 전에는 자동 승인 비활성으로 운영한다.

- [ ] 사람이 정답을 확인한 추가 거래를 별도 평가 세트로 사용한다. 같은 거래·재출력·중복 사진은 같은 그룹에 둬 프롬프트 조정 표본과 검증 표본에 나누어 넣지 않는다.
- [ ] 알려진 불일치·누락·취소·단위 불명 사례가 자동 승인 후보로 통과하지 않는지 확인한다. 모델의 자신감 점수는 승인 조건으로 쓰지 않는다.
- [ ] 관리자 승인 담당자가 만든 단일 승인 트랜잭션을 재사용한다. 아직 없으면 해당 담당자와 함께 최소 승인 경계를 먼저 확정하며 OCR 전용 승인 경로를 복제하지 않는다.
- [ ] 사진 버전 확인, 필수 필드·단위 검증, 승인된 비교 조건, 전체 금액·거래 일시 중복 조회와 상태 변경을 같은 트랜잭션에서 처리한다. 외부 API 호출은 이미 끝난 뒤여야 한다.
- [ ] 정확한 리터 근거로 마일리지 계산·최종 금액·결정 시각을 저장한다. 누적 마일리지·정산 계산은 기존 계약을 사용하고 OCR이 직접 잔액을 가산하지 않는다.
- [ ] 리터 `0.025`와 `0.024`가 각각 1과 0 마일리지로 반올림되는 경계, 중복 두 건의 동시 완료, 동일 작업 재반영을 검증한다. 이미지 판독 불확실성이 숫자 계산 통과로 해소됐다고 판단하지 않는다.

**완료 기준:** 승인 조건을 충족한 신청만 기존 승인 흐름을 거친다. 불명확·불일치·중복 의심은 관리자 대기이며 자동 반려하지 않는다. 공개 운영 전 자동 승인 허용 기준과 예산을 사용자가 확정한다.

### Task 5 — 통합 QA와 인계

**파일:** 서버 `.env.example`, README와 기존 테스트. 실제 검증 후 앱 `docs/admin-qa.md`, `docs/development-notes.md`의 관련 항목만 각 파일 담당자와 조정해 갱신한다.

- [ ] CLOVA URL/Secret 또는 OpenAI 키 없음·OCR 비활성·공급자별 상한 초과에도 정상 사진 접수가 유지되는지 확인한다. 실제 키·R2 URL·원본 이미지·전체 영수증·공급자 원문 응답을 로그나 Git에 남기지 않는다.
- [ ] 정상 판독, 불일치, 읽기 실패, 중복, 타임아웃, 중복 요청, 재시작, 심사 경쟁 조건을 기존 테스트 환경에서 확인한다. CI는 외부 유료 API를 호출하지 않는다.
- [ ] `pnpm test -- mileage-ocr --runInBand`, `pnpm test:e2e -- mileage.e2e-spec.ts admin-mileage.e2e-spec.ts --runInBand`, `pnpm build`를 실행한다. DB 변경 시 `database.service.spec.ts`도 실행한다.
- [ ] 변경 파일에 `pnpm exec eslint`를 실행한다. 기존 `pnpm lint`는 `--fix`이므로 다른 작업을 수정할 수 있어 사용하지 않는다.
- [ ] 기존 앱 신청 → 대기 조회 → 관리자 판독 값 조회를 실제 연결에서 확인한다. 자동 승인을 활성화한 경우에만 적립·누적 합계까지 검증한다. 디자인·레이아웃이 유지되는지도 확인한다.
- [ ] 보고에는 완료한 코드, 모의 테스트, 실제 API 평가, 실제 R2·기기 확인을 구분하고 정확도·비용·미확정 정책을 남긴다. 미실행 QA를 통과로 표시하지 않는다.

## 5. 에이전트 분담과 실행 순서

상시 다수를 돌리지 않는다. **메인 서버 통합 담당 1명·OCR 구현자 1명·최종 검증자 1명**, 총 3개 역할로 진행한다. 권장 개발 모델·추론은 구현 두 역할에 GPT-5.6 Sol high, 독립 검증에 GPT-5.6 Sol xhigh다. 제품의 계기판 판독 API는 Luna를 유지한다.

복사용 메인·역할별 프롬프트와 정확한 파일 소유권은 [에이전트 실행 계획](/Users/sangkun/nocoders/hpluseco/hpluseco-app/docs/superpowers/plans/2026-09-23-ocr-agent-prompts.md)에 정리했다.

| 역할 | 소유 범위 | 실행 시점 |
| --- | --- | --- |
| OCR 담당 | `mileage-ocr.service.ts`의 CLOVA·Luna 호출과 결과 매핑, 해당 spec, 평가 스크립트 | Task 1 먼저. 비용·정확도 결과로 호출 방식을 결정 |
| 서버 통합·DB 조정 담당 | repository·worker·AppModule·마이그레이션·심사 연결 | 추출 반환 계약이 고정된 뒤 Task 2~4. 다른 심사 세션의 DB 담당자와 겸임 또는 단일 소유자 지정 |
| 독립 검증 담당 | 판독 오류·과금 중복·상태 경쟁 검토와 최종 QA | 각 구현 결과가 나온 뒤 읽기 전용 리뷰, Task 5 검증 |

모든 작업자는 다른 세션의 변경을 되돌리지 않는다. 공용 파일에 중복 작성자를 두지 않는다. 첫 착수 범위는 **Task 1의 판독 구현·샘플 평가**이며, 추출 계약과 오프라인 검증이 성립하기 전에 작업 큐부터 구현하지 않는다. 실제 키·원본이 없으면 OCR 비활성 상태의 통합·모의 검증은 계속하되, live 정확도와 자동 승인은 검증 완료로 처리하지 않는다.

## 6. 참고 문서

2026-09-23 공식 문서 확인 기준이다. 실제 계정의 CLOVA 상품·요금과 Luna 호출 가능 여부·실제 이미지 사용량은 아직 검증하지 않았다.

- [GPT-5.6 Luna 모델·이미지 입력·Structured Outputs 지원](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [이미지 입력, detail과 이미지 token 계산](https://developers.openai.com/api/docs/guides/images-vision)
- [Responses API의 strict JSON Schema와 거절·불완전 응답 처리](https://developers.openai.com/api/docs/guides/structured-outputs)
- [CLOVA OCR Invoke URL·인증 헤더](https://api.ncloud-docs.com/docs/ai-application-service-ocr)
- [CLOVA Document OCR 영수증](https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocrdocumentocr-receipt)
- [CLOVA General OCR](https://api.ncloud-docs.com/docs/ai-application-service-ocr-ocr)
- [CLOVA OCR 공식 요금](https://m.ncloud.com/charge/price/ko), [과금 안내](https://guide.ncloud-docs.com/docs/clovaocr-spec)
- [Figma 원본 사진 묶음의 시작 노드](https://www.figma.com/design/w9EEtYG5p4KoaVNlApRG0l/?node-id=481-56149): `481:56149`~`481:56159`. 사용자 제공 11개 노드를 판독 샘플로 사용하며 화면 구현 요청으로 확대하지 않는다.
